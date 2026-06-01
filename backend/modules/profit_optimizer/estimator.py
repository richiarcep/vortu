"""
estimator.py  —  Full model selection pipeline
───────────────────────────────────────────────
Step 1  : Weighted baseline B
Step 2  : Marketing response η — full pipeline:
            1. Granger causality pre-check (VAR)
            2. STL deseasonalisation
            3. Adstock transformation (λ estimated by grid search)
            4. OLS on deseasonalised + adstocked series
            5. If no signal: Option B (campaign vs no-campaign diff)
            6. If still nothing: Option C (industry prior by business type)
Step 3  : Vacation efficiency factor v
Step 4  : Capacity multipliers ρ
Step 5  : Product demand curves (log-log vs linear, hold-out MAPE)
"""

import math
import warnings
warnings.filterwarnings("ignore")

def _ols(xs, ys):
    n = len(xs)
    if n < 2:
        return 0.0, 0.0
    mx = sum(xs)/n; my = sum(ys)/n
    num = sum((xs[i]-mx)*(ys[i]-my) for i in range(n))
    den = sum((xs[i]-mx)**2 for i in range(n))
    if abs(den) < 1e-12:
        return my, 0.0
    b = num/den
    return my - b*mx, b

def _mape(preds, actuals):
    if not preds:
        return float("inf")
    return sum(abs(p-a)/max(abs(a),1e-9) for p,a in zip(preds,actuals))/len(preds)*100

def _rolling_avg(values, weights=(0.2,0.3,0.5)):
    if len(values) < 3:
        return values[-1] if values else 0.0
    return weights[0]*values[-3]+weights[1]*values[-2]+weights[2]*values[-1]

def _mean(xs):
    return sum(xs)/len(xs) if xs else 0.0

def _std(xs):
    if len(xs) < 2: return 0.0
    m = _mean(xs)
    return math.sqrt(sum((x-m)**2 for x in xs)/(len(xs)-1))

def compute_baseline(revenue_history):
    return _rolling_avg(revenue_history)

def compute_adstock(marketing, lam):
    adstock = []; prev = 0.0
    for a in marketing:
        curr = a + lam*prev
        adstock.append(curr)
        prev = curr
    return adstock

def _stl_deseasonalise(series, period=12):
    n = len(series)
    if n < period*2:
        m = _mean(series)
        return [x-m for x in series]
    try:
        from statsmodels.tsa.seasonal import STL
        result = STL(series, period=period, robust=True).fit()
        return list(result.resid + result.trend)
    except Exception:
        seasonal_means = []
        for s in range(period):
            vals = [series[i] for i in range(s,n,period)]
            seasonal_means.append(_mean(vals))
        grand_mean = _mean(seasonal_means)
        seasonal_factors = [sm-grand_mean for sm in seasonal_means]
        return [series[i]-seasonal_factors[i%period] for i in range(n)]

def _granger_test(revenue, marketing, max_lag=2):
    n = len(revenue)
    if n < max_lag+4: return 1.0
    paired = [(revenue[t],marketing[t]) for t in range(n) if marketing[t]>0]
    if len(paired) < max_lag+4: return 1.0
    rev = [p[0] for p in paired]
    mkt = [p[1] for p in paired]
    n2  = len(rev)
    Y  = rev[max_lag:]
    XR = [[rev[t-l] for l in range(1,max_lag+1)] for t in range(max_lag,n2)]
    XU = [[rev[t-l] for l in range(1,max_lag+1)]+[mkt[t-l] for l in range(1,max_lag+1)] for t in range(max_lag,n2)]
    def ols_rss(X,y):
        k=len(X[0]); m=len(y)
        coeffs=[0.0]*k; lr=0.0001
        for _ in range(500):
            for j in range(k):
                grad=sum((sum(coeffs[kk]*X[i][kk] for kk in range(k))-y[i])*X[i][j] for i in range(m))
                coeffs[j]-=lr*grad/m
        return sum((y[i]-sum(coeffs[j]*X[i][j] for j in range(k)))**2 for i in range(m))
    try:
        rss_r=ols_rss(XR,Y); rss_u=ols_rss(XU,Y)
        m=len(Y); q=max_lag; k=max_lag*2
        if rss_u<1e-9 or rss_r<rss_u: return 1.0
        F=((rss_r-rss_u)/q)/(rss_u/(m-k-1))
        return min(1.0,max(0.0,math.exp(-F/3) if F>0 else 1.0))
    except Exception:
        return 1.0

INDUSTRY_PRIORS = {
    "fashion":0.10,"retail":0.08,"food":0.12,"hospitality":0.10,
    "ecommerce":0.15,"b2b":0.04,"saas":0.05,"services":0.06,
    "construction":0.03,"default":0.07,
}

def _get_industry_prior(line_name):
    name = line_name.lower()
    if any(k in name for k in ["ropa","moda","fashion","cloth","wear","calzado","shoe","boot","accesorio"]):
        return INDUSTRY_PRIORS["fashion"],"fashion"
    if any(k in name for k in ["food","restaurant","cafe","comida","bebida"]):
        return INDUSTRY_PRIORS["food"],"food"
    if any(k in name for k in ["software","saas","tech","digital"]):
        return INDUSTRY_PRIORS["saas"],"saas"
    if any(k in name for k in ["b2b","enterprise","corporate"]):
        return INDUSTRY_PRIORS["b2b"],"b2b"
    if any(k in name for k in ["ecommerce","online","web","tienda"]):
        return INDUSTRY_PRIORS["ecommerce"],"ecommerce"
    if any(k in name for k in ["service","consul","asesor"]):
        return INDUSTRY_PRIORS["services"],"services"
    return INDUSTRY_PRIORS["default"],"default"

def _campaign_lift(revenue_history, marketing_history, seasonality):
    n = min(len(revenue_history),len(marketing_history))
    if n < 6: return None,"insufficient data"
    with_campaign=[]; without_campaign=[]
    for t in range(3,n):
        Bt=0.5*revenue_history[t-1]+0.3*revenue_history[t-2]+0.2*revenue_history[t-3]
        if Bt<=0: continue
        ratio=revenue_history[t]/(Bt*seasonality)
        if marketing_history[t]>0: with_campaign.append(ratio)
        else: without_campaign.append(ratio)
    if not with_campaign or not without_campaign:
        return None,"no variation in campaign presence"
    avg_with=_mean(with_campaign); avg_without=_mean(without_campaign)
    if avg_without<=0: return None,"baseline is zero"
    lift=(avg_with-avg_without)/avg_without
    if not (-0.5<lift<1.0): return None,f"lift {lift:.2f} outside plausible range"
    eta_equiv=max(0.001,lift/math.log(2))
    return round(eta_equiv,4),None

def estimate_eta(revenue_history, marketing_history, seasonality, A0, holdout=2, line_name="default"):
    n = min(len(revenue_history),len(marketing_history))
    rev_clean=[]; mkt_clean=[]
    for t in range(n):
        if marketing_history[t]>0:
            rev_clean.append(revenue_history[t])
            mkt_clean.append(marketing_history[t])
    n_clean=len(rev_clean); warning=None

    if n_clean < 5:
        warning=f"Only {n_clean} months with marketing data. Using industry prior."
        prior,industry=_get_industry_prior(line_name)
        return _build_result(prior,"industry_prior",None,[],n_clean,warning,f"Industry prior ({industry}): η={prior}")

    granger_p  = _granger_test(rev_clean,mkt_clean)
    granger_ok = granger_p < 0.15
    rev_deseas = _stl_deseasonalise(rev_clean)
    mkt_deseas = _stl_deseasonalise(mkt_clean)

    best_lambda=None; best_mape=float("inf"); best_eta=None; all_lambdas=[]

    if granger_ok and n_clean >= holdout+3:
        for lam_int in range(1,10):
            lam=lam_int/10.0
            adstock=compute_adstock(mkt_deseas,lam)
            max_ads=max(max(adstock),1e-9); max_mkt=max(max(mkt_clean),1e-9)
            adstock_norm=[a/max_ads*max_mkt for a in adstock]
            tr_rev=rev_deseas[:-holdout]; tr_mkt=adstock_norm[:-holdout]
            te_rev=rev_deseas[-holdout:]; te_mkt=adstock_norm[-holdout:]
            if len(tr_rev)<2: continue
            a_coef,b_coef=_ols(tr_mkt,tr_rev)
            preds=[a_coef+b_coef*m for m in te_mkt]
            mape_val=_mape(preds,te_rev)
            all_lambdas.append({"lambda":lam,"mape":round(mape_val,2)})
            if mape_val<best_mape:
                best_mape=mape_val; best_lambda=lam
                avg_B=_mean(rev_clean); avg_A=_mean(mkt_clean)
                if avg_B>0 and avg_A>0 and b_coef>0:
                    best_eta=b_coef/max(avg_B*seasonality/max(A0,1),1e-9)
                    best_eta=max(0.001,min(best_eta,0.50))
                else:
                    best_eta=None

    MAPE_THRESHOLD=50.0
    if best_eta is not None and best_mape<MAPE_THRESHOLD:
        formula=f"STL+Adstock(λ={best_lambda}) OLS  MAPE={best_mape:.1f}%  η={best_eta:.4f}"
        return _build_result(round(best_eta,4),"stl_adstock_ols",round(best_mape,2),all_lambdas,n_clean,warning,formula,best_lambda=best_lambda)

    eta_b,err_b=_campaign_lift(revenue_history,marketing_history,seasonality)
    if eta_b is not None:
        note=(f"No reliable regression (Granger p={granger_p:.2f}, best MAPE={best_mape:.0f}%). "
              f"Campaign lift comparison: η={eta_b}. Validate with controlled experiment.")
        return _build_result(eta_b,"campaign_lift",None,all_lambdas,n_clean,note,f"Campaign lift: η={eta_b}")

    prior,industry=_get_industry_prior(line_name)
    note=(f"No detectable signal (Granger p={granger_p:.2f}). "
          f"Campaign comparison failed: {err_b}. "
          f"Using {industry} industry prior η={prior}. Recommend A/B testing.")
    return _build_result(prior,"industry_prior",None,all_lambdas,n_clean,note,f"Industry prior ({industry}): η={prior}")

def _build_result(eta,model,mape,all_lambdas,n_obs,warning,formula,best_lambda=None):
    return {"eta":eta,"best_model":model,"best_mape":mape,"formula":formula,
            "best_lambda":best_lambda,"all_lambdas":all_lambdas,"n_obs":n_obs,"warning":warning}

def estimate_vacation_factor(rho_L_history,vacation_flags):
    if len(rho_L_history)<4 or sum(vacation_flags)==0:
        return {"v":1.0,"alpha":None,"delta":None,"warning":"Insufficient data. Using v=1.0."}
    normal=[r for r,f in zip(rho_L_history,vacation_flags) if f==0]
    vacation=[r for r,f in zip(rho_L_history,vacation_flags) if f==1]
    if not normal or not vacation:
        return {"v":1.0,"alpha":None,"delta":None,"warning":"Need both vacation and non-vacation months."}
    alpha=_mean(normal); vac_mean=_mean(vacation); delta=vac_mean-alpha
    v=max(0.5,min(1.0,vac_mean/alpha if alpha>0 else 1.0))
    return {"v":round(v,4),"alpha":round(alpha,4),"delta":round(delta,4),"warning":None}

def estimate_rho(fulfilled_revenue_history,cost_history,v=1.0):
    if not fulfilled_revenue_history or not cost_history:
        return {"rho":10.0,"rho_adj":10.0*v,"warning":"No history. Default ρ=10."}
    ratios=[rev/max(cost,1.0) for rev,cost in zip(fulfilled_revenue_history,cost_history) if cost>0]
    if not ratios:
        return {"rho":10.0,"rho_adj":10.0*v,"warning":"All costs zero. Default ρ=10."}
    rho=_rolling_avg(ratios)
    return {"rho":round(rho,4),"rho_adj":round(rho*v,4),"warning":None}

def _log_log_demand(p0,q0,eps,price):
    if price<=0 or p0<=0: return 0.0
    return max(0.0,q0*(price/p0)**(-eps))

def estimate_demand_curve(price_history,qty_history,current_price,holdout=2):
    n=min(len(price_history),len(qty_history))
    prices=price_history[:n]; qtys=qty_history[:n]
    if n<holdout+2:
        demand=max(qtys[-1] if qtys else 0,1)
        return {"best_model":"fallback","demand":demand,"p0":current_price,
                "q0":float(demand),"eps":2.0,"mape":None,"all_models":[],"warning":f"Only {n} obs."}
    tr_p,tr_q=prices[:-holdout],qtys[:-holdout]
    te_p,te_q=prices[-holdout:],qtys[-holdout:]
    candidates=[]
    a,b=_ols(tr_p,tr_q)
    preds=[max(0,a+b*p) for p in te_p]
    candidates.append({"name":"Linear","predict":lambda p,a=a,b=b:max(0.0,a+b*p),"mape":_mape(preds,te_q),"params":{"a":a,"b":b,"eps":0,"p0":current_price,"q0":max(0,a+b*current_price)}})
    valid=[(p,q) for p,q in zip(tr_p,tr_q) if p>0 and q>0]
    if len(valid)>=2:
        lp=[math.log(p) for p,q in valid]; lq=[math.log(q) for p,q in valid]
        a2,b2=_ols(lp,lq); eps=-b2; p0=tr_p[-1]; q0=max(tr_q[-1],1)
        preds2=[_log_log_demand(p0,q0,eps,p) for p in te_p]
        candidates.append({"name":"Log-log","predict":lambda p,p0=p0,q0=q0,e=eps:_log_log_demand(p0,q0,e,p),"mape":_mape(preds2,te_q),"params":{"a":a2,"b":b2,"eps":eps,"p0":p0,"q0":q0}})
    best=min(candidates,key=lambda m:m["mape"])
    demand=max(1,round(best["predict"](current_price)))
    params=best["params"]
    return {"best_model":best["name"],"demand":demand,"p0":round(params.get("p0",current_price),2),
            "q0":round(params.get("q0",float(demand)),2),"eps":round(params.get("eps",2.0),4),
            "mape":round(best["mape"],2),"all_models":[{"name":m["name"],"mape":round(m["mape"],2)} for m in candidates],"warning":None}
