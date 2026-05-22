import math


def demand_fn(A, B, s, eta, A0):
    if A0 <= 0:
        return B * s
    return max(0.0, B * s * (1 + eta * math.log(1 + A / A0)))


def capacity_fn(L, I, G, rho_L_adj, rho_I, rho_G):
    return min(rho_L_adj * L, rho_I * I, rho_G * G)


def realised_revenue(D, S, F=None):
    caps = [D, S]
    if F is not None:
        caps.append(F)
    return min(caps)


def optimise_lines(lines, budget, fc):
    n = len(lines)
    x = []
    for l in lines:
        x.extend([l.get("A",0), l.get("L",0), l.get("I",0), l.get("G",0)])
    mins = []
    for l in lines:
        mins.extend([l.get("A",0)*0.2, l.get("L",0)*0.2, l.get("I",0)*0.2, l.get("G",0)*0.2])

    def clamp(v, lo, hi=1e9):
        return max(lo, min(hi, v))

    def project(x):
        total = sum(x)
        if total <= budget:
            return x
        scale = budget / total
        return [clamp(v*scale, mins[i]) for i, v in enumerate(x)]

    def compute_profit(x):
        profit = -fc
        total_cost = 0.0
        for i, l in enumerate(lines):
            A=x[i*4]; L=x[i*4+1]; I=x[i*4+2]; G=x[i*4+3]
            total_cost += A+L+I+G
            D = demand_fn(A, l["B"], l["s"], l["eta"], l["A0"])
            S = capacity_fn(L, I, G, l["rho_L_adj"], l["rho_I"], l["rho_G"])
            F = l.get("feasibility_cap")
            Y = realised_revenue(D, S, F)
            profit += l["margin"] * Y
        return profit - total_cost

    x = project([clamp(v, mins[i]) for i, v in enumerate(x)])
    best_val = compute_profit(x)
    improved = True
    iterations = 0

    while improved and iterations < 500:
        improved = False
        iterations += 1
        for j in range(len(x)):
            for delta in [0.03, 0.08, 0.15, 0.30, 0.60]:
                for sign in [1, -1]:
                    xn = list(x)
                    xn[j] = clamp(xn[j]*(1+sign*delta), mins[j])
                    xp = project(xn)
                    val = compute_profit(xp)
                    if val > best_val + 0.5:
                        best_val = val
                        x = xp
                        improved = True

    allocations = []
    total_revenue = 0.0
    total_cost = 0.0

    for i, l in enumerate(lines):
        A=x[i*4]; L=x[i*4+1]; I=x[i*4+2]; G=x[i*4+3]
        cost = A+L+I+G
        D = demand_fn(A, l["B"], l["s"], l["eta"], l["A0"])
        S = capacity_fn(L, I, G, l["rho_L_adj"], l["rho_I"], l["rho_G"])
        F = l.get("feasibility_cap")
        Y = realised_revenue(D, S, F)
        capL=l["rho_L_adj"]*L; capI=l["rho_I"]*I; capG=l["rho_G"]*G
        bottleneck = "Labour" if capL<=capI and capL<=capG else "Inventory" if capI<=capG else "Logistics"
        limited_by = "Demand" if D<=S else bottleneck
        if F is not None and F<=min(D,S):
            limited_by = "Feasibility cap"
        total_revenue += Y
        total_cost += cost
        allocations.append({
            "line_name": l.get("name", f"Line {i+1}"),
            "A":round(A,2), "L":round(L,2), "I":round(I,2), "G":round(G,2),
            "cost":round(cost,2), "demand":round(D,2), "capacity":round(S,2),
            "feasibility":round(F,2) if F else None,
            "revenue":round(Y,2), "gross_profit":round(l["margin"]*Y,2),
            "limited_by":limited_by, "bottleneck":bottleneck,
        })

    return {
        "allocations": allocations,
        "profit": round(best_val,2),
        "total_revenue": round(total_revenue,2),
        "total_cost": round(total_cost,2),
        "iterations": iterations,
    }


def solve_product_mix(products, rev_budget, cost_budget):
    ranked = sorted(
        [{"idx":i,**p} for i,p in enumerate(products)],
        key=lambda p: p["price"]/max(p["unit_cost"],0.01),
        reverse=True,
    )
    qtys_cont = [0.0]*len(products)
    rem_rev = rev_budget
    rem_cost = cost_budget

    for p in ranked:
        if rem_rev<=0 or rem_cost<=0:
            break
        by_rev  = rem_rev/p["price"]   if p["price"]>0    else p["q_max"]
        by_cost = rem_cost/p["unit_cost"] if p["unit_cost"]>0 else p["q_max"]
        q = min(p["q_max"], by_rev, by_cost)
        qtys_cont[p["idx"]] = q
        rem_rev  -= q*p["price"]
        rem_cost -= q*p["unit_cost"]

    qtys_int   = [math.floor(q) for q in qtys_cont]
    total_rev  = sum(qtys_int[i]*products[i]["price"]     for i in range(len(products)))
    total_cost = sum(qtys_int[i]*products[i]["unit_cost"] for i in range(len(products)))

    leftover = cost_budget - total_cost
    cheapest = sorted(range(len(products)), key=lambda i: products[i]["unit_cost"])
    for i in cheapest:
        p = products[i]
        cap = int(p["q_max"]) - qtys_int[i]
        if cap<=0 or leftover<p["unit_cost"]:
            continue
        can_add = min(cap, int(leftover//p["unit_cost"]))
        if can_add>0:
            qtys_int[i]+=can_add
            leftover   -=can_add*p["unit_cost"]
            total_rev  +=can_add*p["price"]
            total_cost +=can_add*p["unit_cost"]

    product_results = []
    for i,p in enumerate(products):
        q = qtys_int[i]
        binding = ("maxed out" if q==int(p["q_max"]) and q>0 else
                   "cost budget" if qtys_cont[i]<p["q_max"] and q>0 else
                   "not reached" if q==0 else "revenue budget")
        product_results.append({
            "name":p["name"], "price":p["price"], "unit_cost":p["unit_cost"],
            "q_max":p["q_max"], "qty_cont":round(qtys_cont[i],4), "qty_int":q,
            "revenue":round(q*p["price"],2), "cost":round(q*p["unit_cost"],2),
            "binding":binding,
        })

    return {
        "products": product_results,
        "total_revenue": round(total_rev,2),
        "total_cost": round(total_cost,2),
        "leftover_budget": round(cost_budget-total_cost,2),
        "rev_shortfall": round(rev_budget-total_rev,2),
    }


def reconcile(mix_result, rev_budget, cost_budget, products, tolerance_rev=0.02, tolerance_cost=0.01):
    total_rev  = mix_result["total_revenue"]
    total_cost = mix_result["total_cost"]
    products_r = mix_result["products"]
    rev_ok  = total_rev  >= rev_budget  - (tolerance_rev  * rev_budget)
    cost_ok = total_cost <= cost_budget + (tolerance_cost * cost_budget)
    rev_short  = rev_budget  - total_rev
    cost_over  = total_cost  - cost_budget
    condition  = (1 if cost_ok and rev_ok else
                  2 if cost_ok and not rev_ok else
                  3 if not cost_ok and rev_ok else 4)

    result = {
        "condition":condition, "cost_ok":cost_ok, "rev_ok":rev_ok,
        "total_revenue":round(total_rev,2), "total_cost":round(total_cost,2),
        "rev_budget":round(rev_budget,2), "cost_budget":round(cost_budget,2),
        "rev_shortfall":round(rev_short,2), "cost_overrun":round(max(0,cost_over),2),
        "products":products_r,
    }

    if condition == 1:
        result["status"] = "feasible"
        result["message"] = "Plan is self-consistent. Both constraints met."
        return result

    if condition in (3, 4):
        sorted_p = sorted(enumerate(products_r), key=lambda x: -x[1]["unit_cost"])
        qtys = [p["qty_int"] for p in products_r]
        for idx, p in sorted_p:
            while total_cost > cost_budget and qtys[idx] > 0:
                qtys[idx] -= 1
                total_cost -= products[idx]["unit_cost"]
                total_rev  -= products[idx]["price"]
        for i,p in enumerate(products_r):
            p["qty_int"] = qtys[i]
            p["revenue"] = round(qtys[i]*p["price"],2)
            p["cost"]    = round(qtys[i]*p["unit_cost"],2)
        total_rev  = sum(p["revenue"] for p in products_r)
        total_cost = sum(p["cost"]    for p in products_r)
        rev_short  = rev_budget - total_rev
        cost_ok = total_cost <= cost_budget+(tolerance_cost*cost_budget)
        rev_ok  = total_rev  >= rev_budget -(tolerance_rev *rev_budget)
        result.update({
            "products":products_r,
            "total_revenue":round(total_rev,2),
            "total_cost":round(total_cost,2),
            "rev_shortfall":round(rev_short,2),
            "cost_overrun":0.0,
        })
        if cost_ok and rev_ok:
            result["status"]  = "auto_fixed"
            result["message"] = "Cost overrun resolved. Revenue target met."
            return result

    price_fix_viable = False
    if rev_short > 0:
        worst = sorted(enumerate(products_r), key=lambda x: products[x[0]]["price"]/max(products[x[0]]["unit_cost"],0.01))[0]
        idx_w, p_w = worst
        q_w = p_w["qty_int"]
        if q_w > 0:
            needed = rev_short / q_w
            new_price = p_w["price"] + needed
            eps = products[idx_w].get("demand_eps", 3.0)
            if eps > 0 and p_w["price"] > 0:
                new_demand = q_w * (p_w["price"] / new_price) ** eps
                price_fix_viable = new_demand >= q_w * 0.9
            else:
                price_fix_viable = True

    result["price_fix_viable"] = price_fix_viable
    result["status"]  = "escalated"
    result["message"] = (
        f"Revenue shortfall of €{rev_short:.2f} could not be automatically resolved. "
        f"Price adjustment {'viable.' if price_fix_viable else 'not viable — demand would collapse.'}"
    )
    result["escalation_options"] = [
        {"option":"A","action":"Increase fulfilment budget","detail":f"Add €{max(0,total_cost-cost_budget):.2f} to cost budget.","owner":"Finance"},
        {"option":"B","action":"Renegotiate unit costs","detail":"Reduce supplier costs so more units fit the budget.","owner":"Procurement"},
        {"option":"C","action":f"Accept €{total_rev:.2f} revenue","detail":f"€{rev_short:.2f} shortfall accepted.","owner":"Commercial"},
        {"option":"D","action":"Add a cheaper product","detail":"New SKU with lower unit cost absorbs leftover budget.","owner":"Product team"},
    ]
    if price_fix_viable:
        result["escalation_options"].append({"option":"E","action":"Raise prices","detail":"Price increase viable. Re-run Step 17.","owner":"Pricing"})
    return result


def analyse_unharnessed_demand(line_demand, feasibility_cap, products, cost_budget):
    U = max(0.0, line_demand - feasibility_cap)
    U_pct = U/line_demand*100 if line_demand>0 else 0.0
    result = {
        "line_demand":round(line_demand,2),
        "feasibility_cap":round(feasibility_cap,2),
        "unharnessed":round(U,2),
        "unharnessed_pct":round(U_pct,1),
    }
    if U <= 0:
        result["message"] = "No unharnessed demand. Catalogue satisfies all estimated demand."
        result["actions"] = []
        return result

    result["message"] = (
        f"€{U:.2f} ({U_pct:.1f}% of demand) left on the table. "
        f"Supply-side constraint — not a marketing problem."
    )
    avg_ratio = sum(p["price"]/max(p["unit_cost"],0.01) for p in products)/len(products) if products else 2.0
    result["actions"] = [
        {"action":"Add a new product","max_recovery":round(min(U,feasibility_cap*0.3),2),"efficiency":round(avg_ratio,2),"owner":"Product team"},
        {"action":"Increase supply limits","max_recovery":round(min(U,cost_budget*0.1*avg_ratio),2),"efficiency":round(avg_ratio,2),"owner":"Procurement"},
        {"action":"Increase fulfilment budget","max_recovery":round(min(U*0.4,U),2),"efficiency":round(min(U*0.4,U)/max(cost_budget*0.15,1),2),"owner":"Finance"},
    ]
    result["actions"].sort(key=lambda a: -a["max_recovery"])
    result["priority_action"] = result["actions"][0]["action"]
    return result
