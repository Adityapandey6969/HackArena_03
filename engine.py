"""
engine.py
Core shared decision engine for Feature 5 (F5): Loan Decision & Guidance Engine.
Provides deterministic calculation for EMI, eligibility rules (F2), recommendation (F3),
explanation, counterfactual suggestions, gap-to-approval grid search, priority ranking,
and the single recompute write pathway.
"""

import json
import math
from datetime import datetime
from typing import Dict, Any, List, Optional

import config
from db import execute_query, execute_single, execute_write, get_db_connection

# -------------------------------------------------------------------------
# MATHEMATICAL HELPER FUNCTIONS (Reducing balance EMI & Inverse formula)
# -------------------------------------------------------------------------

def calculate_emi(principal: float, annual_rate: float, tenure_months: int) -> float:
    """
    Calculates reducing balance monthly EMI.
    Formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    """
    if tenure_months <= 0 or principal <= 0:
        return 0.0
    r = (annual_rate / 12.0) / 100.0
    if r == 0:
        return principal / tenure_months
    n = tenure_months
    factor = math.pow(1 + r, n)
    emi = principal * r * factor / (factor - 1)
    return round(emi, 2)

def calculate_max_loan(target_emi: float, annual_rate: float, tenure_months: int) -> float:
    """
    Inverse EMI formula: calculates maximum loan amount P for a given target EMI.
    Formula: P = EMI * ((1+r)^n - 1) / (r * (1+r)^n)
    """
    if target_emi <= 0 or tenure_months <= 0:
        return 0.0
    r = (annual_rate / 12.0) / 100.0
    if r == 0:
        return target_emi * tenure_months
    n = tenure_months
    factor = math.pow(1 + r, n)
    max_p = target_emi * (factor - 1) / (r * factor)
    return round(max_p, 2)

# -------------------------------------------------------------------------
# F2 & F3 BUSINESS RULES (STUBS / IMPLEMENTATION)
# -------------------------------------------------------------------------

def get_loan_product(loan_type: str) -> Dict[str, Any]:
    """Fetches loan product rules from DB or returns defaults."""
    product = execute_single("SELECT * FROM loan_products WHERE loan_type = ?;", (loan_type,))
    if not product:
        # Default fallback product if not found
        product = {
            "loan_type": loan_type,
            "interest_rate": 12.0,
            "min_income": 25000.0,
            "max_tenure_months": 60
        }
    return product

def check_f2_eligibility(app: Dict[str, Any], product: Dict[str, Any]) -> Dict[str, Any]:
    """
    F2 Rule Checks:
    1. Age between AGE_MIN (21) and AGE_MAX (60)
    2. Monthly income >= product min_income
    3. Employment type in ALLOWED_EMPLOYMENT_TYPES
    4. Existing EMI <= MAX_EXISTING_EMI_CAP
    """
    reasons = []
    
    # Age check
    age_ok = config.AGE_MIN <= app["age"] <= config.AGE_MAX
    if not age_ok:
        reasons.append(f"Age {app['age']} outside allowed range ({config.AGE_MIN}-{config.AGE_MAX})")

    # Income check
    income_ok = app["monthly_income"] >= product["min_income"]
    if not income_ok:
        reasons.append(f"Monthly income ₹{app['monthly_income']:,.0f} below min required ₹{product['min_income']:,.0f}")

    # Employment check
    emp_ok = app["employment_type"] in config.ALLOWED_EMPLOYMENT_TYPES
    if not emp_ok:
        reasons.append(f"Employment type '{app['employment_type']}' not in allowed list")

    # Existing EMI check
    emi_cap_ok = app["existing_emi"] <= config.MAX_EXISTING_EMI_CAP
    if not emi_cap_ok:
        reasons.append(f"Existing EMI ₹{app['existing_emi']:,.0f} exceeds cap ₹{config.MAX_EXISTING_EMI_CAP:,.0f}")

    all_passed = age_ok and income_ok and emp_ok and emi_cap_ok
    status = "PASS" if all_passed else "FAIL"

    return {
        "status": status,
        "reasons": reasons,
        "checks": {
            "age_ok": age_ok,
            "income_ok": income_ok,
            "emp_ok": emp_ok,
            "emi_cap_ok": emi_cap_ok
        }
    }

def check_f3_recommendation(app: Dict[str, Any], f2_result: Dict[str, Any], emi_amount: float) -> Dict[str, Any]:
    """
    F3 Recommendation Logic:
    - Any F2 rule failed OR emi_ratio > 0.6 => Reject
    - emi_ratio < 0.4 AND credit_score > 700 => Approve
    - Else => Review
    """
    income = app["monthly_income"]
    existing_emi = app["existing_emi"]
    emi_ratio = (emi_amount + existing_emi) / income if income > 0 else 1.0
    emi_ratio = round(emi_ratio, 4)

    if f2_result["status"] == "FAIL" or emi_ratio > config.EMI_RATIO_REJECT_THRESHOLD:
        recommendation = "Reject"
    elif emi_ratio < config.EMI_RATIO_APPROVE_THRESHOLD and app["credit_score"] > config.CREDIT_SCORE_APPROVE_THRESHOLD:
        recommendation = "Approve"
    else:
        recommendation = "Review"

    return {
        "emi_amount": emi_amount,
        "emi_ratio": emi_ratio,
        "recommendation": recommendation
    }

# -------------------------------------------------------------------------
# F5 ENGINE: EXPLAIN, SUGGEST, GAP TO APPROVAL, PRIORITY
# -------------------------------------------------------------------------

def explain(app: Dict[str, Any], product: Dict[str, Any], f2_result: Dict[str, Any], f3_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates human-readable explanation text and detailed checks array.
    """
    checks = []

    # 1. Age check
    checks.append({
        "rule": f"Age ({config.AGE_MIN}-{config.AGE_MAX} yrs)",
        "passed": f2_result["checks"]["age_ok"],
        "actual": app["age"],
        "threshold": f"{config.AGE_MIN}-{config.AGE_MAX}",
        "fixable": "no" if not f2_result["checks"]["age_ok"] else "yes"
    })

    # 2. Min Income check
    checks.append({
        "rule": f"Min Income ({app['loan_type']})",
        "passed": f2_result["checks"]["income_ok"],
        "actual": f"₹{app['monthly_income']:,.0f}",
        "threshold": f"₹{product['min_income']:,.0f}",
        "fixable": "partly" if not f2_result["checks"]["income_ok"] else "yes"
    })

    # 3. Employment type
    checks.append({
        "rule": "Employment Type",
        "passed": f2_result["checks"]["emp_ok"],
        "actual": app["employment_type"],
        "threshold": ", ".join(config.ALLOWED_EMPLOYMENT_TYPES),
        "fixable": "no" if not f2_result["checks"]["emp_ok"] else "yes"
    })

    # 4. Existing EMI Cap
    checks.append({
        "rule": "Existing EMI Cap",
        "passed": f2_result["checks"]["emi_cap_ok"],
        "actual": f"₹{app['existing_emi']:,.0f}",
        "threshold": f"₹{config.MAX_EXISTING_EMI_CAP:,.0f}",
        "fixable": "partly" if not f2_result["checks"]["emi_cap_ok"] else "yes"
    })

    # 5. EMI Ratio
    emi_ratio_pct = f3_result["emi_ratio"] * 100
    ratio_passed = f3_result["emi_ratio"] <= config.EMI_RATIO_REJECT_THRESHOLD
    checks.append({
        "rule": "EMI-to-Income Ratio",
        "passed": ratio_passed,
        "actual": f"{emi_ratio_pct:.1f}%",
        "threshold": f"≤ {config.EMI_RATIO_REJECT_THRESHOLD*100:.0f}% (Ideal < {config.EMI_RATIO_APPROVE_THRESHOLD*100:.0f}%)",
        "fixable": "yes" if not ratio_passed or f3_result["emi_ratio"] > config.EMI_RATIO_APPROVE_THRESHOLD else "yes"
    })

    # 6. Credit Score
    credit_passed = app["credit_score"] > config.CREDIT_SCORE_APPROVE_THRESHOLD
    checks.append({
        "rule": "Credit Score",
        "passed": credit_passed,
        "actual": app["credit_score"],
        "threshold": f"> {config.CREDIT_SCORE_APPROVE_THRESHOLD}",
        "fixable": "slow" if not credit_passed else "yes"
    })

    # Summary text construction
    sentences = []
    rec = f3_result["recommendation"]
    
    if rec == "Approve":
        sentences.append(f"Application is approved! EMI ratio of {emi_ratio_pct:.1f}% is well within limits and credit score ({app['credit_score']}) is strong.")
    elif rec == "Review":
        reasons_list = []
        if f3_result["emi_ratio"] >= config.EMI_RATIO_APPROVE_THRESHOLD:
            reasons_list.append(f"EMI ratio {emi_ratio_pct:.1f}% is moderate (above 40% ideal limit)")
        if app["credit_score"] <= config.CREDIT_SCORE_APPROVE_THRESHOLD:
            reasons_list.append(f"Credit score {app['credit_score']} is below 700 benchmark")
        sentences.append(f"Application marked for Officer Review. {'. '.join(reasons_list)}.")
    else:  # Reject
        if f2_result["reasons"]:
            sentences.append(f"Application rejected due to eligibility constraints: {'; '.join(f2_result['reasons'])}.")
        if f3_result["emi_ratio"] > config.EMI_RATIO_REJECT_THRESHOLD:
            sentences.append(f"EMI ratio of {emi_ratio_pct:.1f}% exceeds the maximum allowable cap of 60%.")

    explanation_text = " ".join(sentences)

    return {
        "explanation_text": explanation_text,
        "checks": checks
    }

def suggest(app: Dict[str, Any], product: Dict[str, Any], f3_result: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Generates deterministic counterfactual suggestions to improve outcome.
    """
    suggestions = []
    income = app["monthly_income"]
    existing_emi = app["existing_emi"]
    current_tenure = app["tenure_months"]
    rate = product["interest_rate"]
    max_tenure = product["max_tenure_months"]

    # 1. EMI Ratio counterfactuals
    if f3_result["emi_ratio"] > config.EMI_RATIO_APPROVE_THRESHOLD:
        target_max_emi = max(0.0, (config.EMI_RATIO_APPROVE_THRESHOLD * income) - existing_emi)
        
        # Max loan for target EMI at current tenure
        max_p_current_tenure = calculate_max_loan(target_max_emi, rate, current_tenure)
        if max_p_current_tenure > 0 and max_p_current_tenure < app["loan_amount"]:
            diff = app["loan_amount"] - max_p_current_tenure
            suggestions.append({
                "issue": f"EMI ratio ({f3_result['emi_ratio']*100:.1f}%) is higher than 40% target",
                "action": f"Reduce loan amount by ₹{diff:,.0f} (to ₹{max_p_current_tenure:,.0f})",
                "new_value": f"₹{max_p_current_tenure:,.0f}",
                "fixable": "yes",
                "impact": "Brings EMI ratio within 40% ideal approval limit"
            })

        # Longer tenure counterfactual up to max_tenure
        if current_tenure < max_tenure:
            max_p_max_tenure = calculate_max_loan(target_max_emi, rate, max_tenure)
            suggestions.append({
                "issue": f"Current tenure is {current_tenure} months (max available: {max_tenure} months)",
                "action": f"Extend tenure to {max_tenure} months (allows up to ₹{max_p_max_tenure:,.0f} loan)",
                "new_value": f"{max_tenure} months",
                "fixable": "yes",
                "impact": "Lowers monthly EMI payment substantially"
            })

    # 2. Existing EMI payoff suggestion
    if existing_emi > 0 and f3_result["emi_ratio"] > config.EMI_RATIO_APPROVE_THRESHOLD:
        suggestions.append({
            "issue": f"Existing monthly EMI obligations total ₹{existing_emi:,.0f}",
            "action": f"Close or reduce existing loans/credit card EMIs by ₹{existing_emi*0.5:,.0f}",
            "new_value": f"₹{existing_emi*0.5:,.0f}",
            "fixable": "partly",
            "impact": "Frees up monthly income capacity"
        })

    # 3. Income / Product type suggestion
    if income < product["min_income"]:
        suggestions.append({
            "issue": f"Monthly income ₹{income:,.0f} is below product requirement (₹{product['min_income']:,.0f})",
            "action": "Consider applying for Personal Loan or adding an eligible co-applicant with income",
            "new_value": "Add Co-applicant",
            "fixable": "partly",
            "impact": "Meets minimum income criteria"
        })

    # 4. Credit Score suggestion
    if app["credit_score"] <= config.CREDIT_SCORE_APPROVE_THRESHOLD:
        suggestions.append({
            "issue": f"Credit score {app['credit_score']} is below preferred 700 threshold",
            "action": "Clear active card balances, avoid new debt inquiries, and re-check in 3-6 months",
            "new_value": "700+",
            "fixable": "slow",
            "impact": "Qualifies application for instant approval"
        })

    # 5. Age / Employment eligibility suggestions
    if not (config.AGE_MIN <= app["age"] <= config.AGE_MAX):
        suggestions.append({
            "issue": f"Applicant age ({app['age']}) is outside 21-60 policy bounds",
            "action": "Apply with a primary applicant aged 21-60 or add a co-applicant",
            "new_value": "Co-applicant",
            "fixable": "no",
            "impact": "Resolves hard eligibility rejection"
        })

    if app["employment_type"] not in config.ALLOWED_EMPLOYMENT_TYPES:
        suggestions.append({
            "issue": f"Employment type '{app['employment_type']}' is not supported directly",
            "action": "Provide salaried proof or apply via business/co-applicant route",
            "new_value": "Salaried / Business",
            "fixable": "no",
            "impact": "Resolves hard employment rejection"
        })

    return suggestions

def gap_to_approval(app: Dict[str, Any], product: Dict[str, Any]) -> Dict[str, Any]:
    """
    Grid-search over loan_amount reductions (-10%, -20%, -30%) and tenure extensions (+0, +12, +24, +36 months).
    Returns smallest change yielding 'Approve', or best reachable ('Review'), or 'Not fixable by changing terms.'
    """
    # If hard rule failed (age, employment) and no term change can fix it
    f2_res = check_f2_eligibility(app, product)
    if not f2_res["checks"]["age_ok"] or not f2_res["checks"]["emp_ok"]:
        return {
            "gap_string": "Not fixable by changing terms.",
            "is_recoverable": False
        }

    orig_amount = app["loan_amount"]
    orig_tenure = app["tenure_months"]
    max_tenure = product["max_tenure_months"]
    rate = product["interest_rate"]

    best_approve = None
    best_review = None

    for red in config.GRID_AMOUNT_REDUCTIONS:
        cand_amount = round(orig_amount * (1.0 - red), 2)
        for ext in config.GRID_TENURE_EXTENSIONS:
            cand_tenure = min(orig_tenure + ext, max_tenure)

            # Evaluate candidate
            cand_emi = calculate_emi(cand_amount, rate, cand_tenure)
            cand_app = dict(app)
            cand_app["loan_amount"] = cand_amount
            cand_app["tenure_months"] = cand_tenure
            cand_f2 = check_f2_eligibility(cand_app, product)
            cand_f3 = check_f3_recommendation(cand_app, cand_f2, cand_emi)

            rec = cand_f3["recommendation"]
            cost = red * 100 + (ext / 12) * 5  # Cost heuristic to find smallest change

            eval_item = {
                "reduction_pct": int(red * 100),
                "extension_months": ext,
                "cand_amount": cand_amount,
                "cand_tenure": cand_tenure,
                "cand_emi": cand_emi,
                "cand_ratio": cand_f3["emi_ratio"],
                "recommendation": rec,
                "cost": cost
            }

            if rec == "Approve":
                if best_approve is None or eval_item["cost"] < best_approve["cost"]:
                    best_approve = eval_item
            elif rec == "Review":
                if best_review is None or eval_item["cost"] < best_review["cost"]:
                    best_review = eval_item

    # Determine string & recoverability
    if best_approve:
        parts = []
        if best_approve["reduction_pct"] > 0:
            parts.append(f"Reduce amount by {best_approve['reduction_pct']}%")
        if best_approve["extension_months"] > 0:
            parts.append(f"Extend tenure by {best_approve['extension_months']} months")
        if not parts:
            gap_str = "Meets approval terms currently."
        else:
            gap_str = " AND ".join(parts) + f" (EMI: ₹{best_approve['cand_emi']:,.0f}, Ratio: {best_approve['cand_ratio']*100:.1f}%)"
        
        return {
            "gap_string": gap_str,
            "is_recoverable": True
        }
    
    if best_review:
        blockers = []
        if app["credit_score"] <= config.CREDIT_SCORE_APPROVE_THRESHOLD:
            blockers.append(f"credit score {app['credit_score']} (needs >700)")
        if not f2_res["checks"]["income_ok"]:
            blockers.append(f"income ₹{app['monthly_income']:,.0f} below min required ₹{product['min_income']:,.0f}")
        
        blocker_str = f" Blocker: {', '.join(blockers)}." if blockers else ""
        gap_str = f"Best achievable: Review.{blocker_str}"
        
        return {
            "gap_string": gap_str,
            "is_recoverable": True
        }

    return {
        "gap_string": "Not fixable by changing terms.",
        "is_recoverable": False
    }

def calculate_priority_score(recommendation: str, is_recoverable: bool, loan_amount: float) -> float:
    """
    Priority Score encoding:
    Tier 0: Review
    Tier 1: Reject & is_recoverable
    Tier 2: Reject NOT recoverable
    Tier 3: Approve
    Within tier, higher loan_amount ranks higher (lower numeric priority_score).
    Formula: priority_score = tier * 1e12 + (1e9 - loan_amount)
    """
    if recommendation == "Review":
        tier = config.PRIORITY_TIER_WEIGHTS["Review"]
    elif recommendation == "Reject":
        tier = config.PRIORITY_TIER_WEIGHTS["Reject_Recoverable"] if is_recoverable else config.PRIORITY_TIER_WEIGHTS["Reject_Unrecoverable"]
    else:  # Approve
        tier = config.PRIORITY_TIER_WEIGHTS["Approve"]

    score = tier * 1e12 + (1e9 - loan_amount)
    return score

def recompute_priority_ranks():
    """
    Recomputes priority_rank (1..N) across all applications in the database based on priority_score ASC.
    """
    apps = execute_query("SELECT app_id, priority_score FROM applications ORDER BY priority_score ASC;")
    params_list = [(rank + 1, app["app_id"]) for rank, app in enumerate(apps)]
    
    with get_db_connection() as conn:
        conn.executemany("UPDATE applications SET priority_rank = ? WHERE app_id = ?;", params_list)
        conn.commit()

# -------------------------------------------------------------------------
# SINGLE WRITE PATHWAY: RECOMPUTE
# -------------------------------------------------------------------------

def recompute(app_id: int, overrides: Optional[Dict[str, Any]] = None, dry_run: bool = False, changed_by: str = "system") -> Dict[str, Any]:
    """
    Loads row, applies overrides in memory, runs full F2/F3/F5 engine stack.
    If dry_run=True: returns calculated dictionary, writes nothing.
    If dry_run=False: updates DB, appends status_history if changed, sends notification if status changed,
    and recomputes priority_rank for the whole table.
    """
    app = execute_single("SELECT * FROM applications WHERE app_id = ?;", (app_id,))
    if not app:
        raise ValueError(f"Application with ID {app_id} not found.")

    # Apply overrides in memory
    if overrides:
        for k, v in overrides.items():
            if k in app and v is not None:
                app[k] = v

    # Fetch Product details
    product = get_loan_product(app["loan_type"])

    # 1. Calculate EMI
    emi_amount = calculate_emi(app["loan_amount"], product["interest_rate"], app["tenure_months"])

    # 2. Check F2 Eligibility
    f2_res = check_f2_eligibility(app, product)

    # 3. Check F3 Recommendation
    f3_res = check_f3_recommendation(app, f2_res, emi_amount)

    # 4. Explain
    exp_res = explain(app, product, f2_res, f3_res)

    # 5. Counterfactual Suggestions
    suggestions = suggest(app, product, f3_res)

    # 6. Gap to Approval Grid Search
    gap_res = gap_to_approval(app, product)

    # 7. Priority Score
    p_score = calculate_priority_score(f3_res["recommendation"], gap_res["is_recoverable"], app["loan_amount"])

    result = {
        "app_id": app["app_id"],
        "name": app["name"],
        "age": app["age"],
        "employment_type": app["employment_type"],
        "monthly_income": app["monthly_income"],
        "loan_type": app["loan_type"],
        "loan_amount": app["loan_amount"],
        "tenure_months": app["tenure_months"],
        "existing_emi": app["existing_emi"],
        "credit_score": app["credit_score"],
        "eligibility_status": f2_res["status"],
        "eligibility_reasons": json.dumps(f2_res["reasons"]),
        "emi_amount": emi_amount,
        "emi_ratio": f3_res["emi_ratio"],
        "recommendation": f3_res["recommendation"],
        "explanation_text": exp_res["explanation_text"],
        "checks": exp_res["checks"],
        "gap_to_approval": gap_res["gap_string"],
        "suggestions": suggestions,
        "suggestions_json": json.dumps(suggestions),
        "priority_score": p_score,
        "is_recoverable": 1 if gap_res["is_recoverable"] else 0,
        "last_notified_status": app.get("last_notified_status")
    }

    if dry_run:
        return result

    # Save to Database if dry_run=False
    old_recommendation = app.get("recommendation")
    new_recommendation = f3_res["recommendation"]

    execute_write("""
        UPDATE applications SET
            loan_type = ?,
            loan_amount = ?,
            tenure_months = ?,
            eligibility_status = ?,
            eligibility_reasons = ?,
            emi_amount = ?,
            emi_ratio = ?,
            recommendation = ?,
            explanation_text = ?,
            gap_to_approval = ?,
            suggestions_json = ?,
            priority_score = ?,
            is_recoverable = ?
        WHERE app_id = ?;
    """, (
        app["loan_type"], app["loan_amount"], app["tenure_months"],
        f2_res["status"], json.dumps(f2_res["reasons"]),
        emi_amount, f3_res["emi_ratio"], new_recommendation,
        exp_res["explanation_text"], gap_res["gap_string"],
        json.dumps(suggestions), p_score, 1 if gap_res["is_recoverable"] else 0,
        app_id
    ))

    # Log status history if recommendation changed or initial set
    if old_recommendation != new_recommendation:
        timestamp = datetime.now().isoformat()
        execute_write("""
            INSERT INTO status_history (app_id, old_status, new_status, changed_by, timestamp)
            VALUES (?, ?, ?, ?, ?);
        """, (app_id, old_recommendation or "Submitted", new_recommendation, changed_by, timestamp))

        # Lazy import notifier to avoid circular dependency
        try:
            from notifier import send_status_update
            send_status_update(app_id)
        except Exception as e:
            print(f"Notifier trigger note: {e}")

    # Recompute priority ranks across all applications
    recompute_priority_ranks()

    # Fetch updated rank
    updated_app = execute_single("SELECT priority_rank FROM applications WHERE app_id = ?;", (app_id,))
    result["priority_rank"] = updated_app["priority_rank"] if updated_app else 1

    return result
