from datetime import date
from sqlalchemy.orm import Session
from modules.profit_optimizer.data_loader import load_line_data, load_optimizer_inputs
from modules.profit_optimizer.estimator import (
    compute_baseline, estimate_eta, estimate_demand_curve,
)
from modules.profit_optimizer.solver import (
    optimise_lines, solve_product_mix, reconcile, analyse_unharnessed_demand,
)
from models.profit_optimizer import CommercialLine, OptimizerRun


def run_optimizer(db, company_id, period_label, planning_date=None, n_months=8):
    if planning_date is None:
        planning_date = date.today()

    inputs      = load_optimizer_inputs(db, company_id, period_label)
    fc          = inputs["fixed_costs"]
    budget      = inputs["total_budget"]
    v           = inputs["vacation_factor"]

    active_lines = db.query(CommercialLine).filter(
        CommercialLine.company_id == company_id,
        CommercialLine.is_active == True,
    ).all()

    if not active_lines:
        return {"status":"error","message":"No commercial lines configured."}

    line_results = []

    for line in active_lines:
        line_data = load_line_data(db, company_id, line.id, n_months)
        if not line_data:
            continue

        rev_hist = line_data["revenue_history"]
        mkt_hist = line_data["marketing_history"]
        A0       = line_data["A0"]
        products = line_data["products"]

        B          = compute_baseline(rev_hist)
        eta_result = estimate_eta(rev_hist, mkt_hist, line.seasonality, A0)
        eta        = eta_result["eta"]
        rho_L_adj  = 10.0 * v
        rho_I      = 7.0
        rho_G      = 25.0

        product_details = []
        F_products = []

        for p in products:
            qty_hist   = [q["qty"]   for q in p["qty_history"]] if p["qty_history"] else []
            price_hist = [q["price"] for q in p["qty_history"]] if p["qty_history"] else []

            if qty_hist and price_hist:
                curve = estimate_demand_curve(price_hist, qty_hist, p["price"])
            else:
                q0 = p.get("demand_q0") or p["supply_limit"] or 10
                curve = {
                    "best_model":"stored","demand":int(q0),
                    "p0":p.get("demand_p0") or p["price"],
                    "q0":float(q0),"eps":p.get("demand_eps") or 3.0,
                    "mape":None,"all_models":[],
                    "warning":"No price-quantity history. Using stored parameters.",
                }

            q_max = min(curve["demand"], p["supply_limit"]) if p["supply_limit"] > 0 else curve["demand"]
            F_products.append(q_max * p["price"])
            product_details.append({
                **p,
                "q_demand":    curve["demand"],
                "q_max":       q_max,
                "demand_curve":curve,
                "demand_eps":  curve["eps"],
            })

        F_i = sum(F_products)
        n   = len(active_lines)

        line_results.append({
            "line_id":         line.id,
            "name":            line.name,
            "margin":          line.margin_rate,
            "B":               B,
            "s":               line.seasonality,
            "eta":             eta,
            "eta_result":      eta_result,
            "A0":              A0,
            "rho_L_adj":       rho_L_adj,
            "rho_I":           rho_I,
            "rho_G":           rho_G,
            "feasibility_cap": F_i,
            "products":        product_details,
            "A":               mkt_hist[-1] if mkt_hist else budget*0.15/n,
            "L":               budget*0.25/n,
            "I":               budget*0.35/n,
            "G":               budget*0.10/n,
        })

    opt_result  = optimise_lines(line_results, budget, fc)
    allocations = opt_result["allocations"]
    product_results = []

    for i, lr in enumerate(line_results):
        alloc            = allocations[i]
        cost_budget_line = alloc["cost"]

        if not lr["products"]:
            continue

        products_for_solver = [
            {
                "name":      p["name"],
                "price":     p["price"],
                "unit_cost": p["unit_cost"],
                "q_max":     p["q_max"],
                "demand_eps":p.get("demand_eps", 3.0),
            }
            for p in lr["products"]
        ]

        mix      = solve_product_mix(products_for_solver, lr["feasibility_cap"], cost_budget_line)
        recon    = reconcile(mix, lr["feasibility_cap"], cost_budget_line, products_for_solver)
        unharv   = analyse_unharnessed_demand(
            alloc["demand"], lr["feasibility_cap"], products_for_solver, cost_budget_line
        )

        product_results.append({
            "line_id":   lr["line_id"],
            "line_name": lr["name"],
            "step17":    mix,
            "step18":    recon,
            "step19":    unharv,
        })

    output = {
        "status":        "ok",
        "company_id":    company_id,
        "period":        period_label,
        "planning_date": str(planning_date),
        "vacation_factor":v,
        "fixed_costs":   fc,
        "total_budget":  budget,
        "line_estimates":[
            {
                "line_id":     lr["line_id"],
                "name":        lr["name"],
                "baseline_B":  round(lr["B"],2),
                "eta":         round(lr["eta"],4),
                "eta_model":   lr["eta_result"]["best_model"],
                "eta_mape":    lr["eta_result"]["best_mape"],
                "eta_warning": lr["eta_result"]["warning"],
                "feasibility": round(lr["feasibility_cap"],2),
            }
            for lr in line_results
        ],
        "optimisation":  opt_result,
        "product_plans": product_results,
        "summary": {
            "total_revenue":   opt_result["total_revenue"],
            "total_cost":      opt_result["total_cost"],
            "profit":          opt_result["profit"],
            "lines_escalated": sum(1 for pr in product_results if pr["step18"].get("status")=="escalated"),
        },
    }

    if output["summary"]["lines_escalated"] > 0:
        output["status"] = "escalated"

    try:
        run = OptimizerRun(
            company_id       = company_id,
            period_label     = period_label,
            optimised_profit = opt_result["profit"],
            result_json      = output,
            status           = output["status"],
            escalation_reason= (
                "; ".join(
                    pr["step18"]["message"]
                    for pr in product_results
                    if pr["step18"].get("status") == "escalated"
                ) or None
            ),
        )
        db.add(run)
        db.commit()
        output["run_id"] = run.id
    except Exception as e:
        output["run_save_error"] = str(e)

    return output
