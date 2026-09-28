from typing import Dict, Any, List, Optional
from ..models import LoanProduct
from .emi import calculate_emi, evaluate_recommendation
from .eligibility import evaluate_eligibility


def calculate_gap_to_approval(
    loan_amount: float,
    tenure_months: int,
    existing_emi: float,
    monthly_income: float,
    credit_score: int,
    age: int,
    employment_type: str,
    loan_product: LoanProduct,
    current_recommendation: str,
) -> Dict[str, Any]:
    """
    Calculates whether modifying loan amount or tenure can shift
    a REJECT or REVIEW recommendation to APPROVE.

    Tested loan amount reductions: 10%, 20%, 30%
    Tested tenure increases: 12 months, 24 months, 36 months
    Also tests combinations of smallest reduction + smallest tenure increase.
    """
    # If already approved
    if current_recommendation == "APPROVE":
        return {
            "found_solution": True,
            "message": "Application is already preliminarily approved with current parameters.",
            "best_adjustment": None,
            "tested_scenarios_count": 0,
        }

    # If applicant has credit_score <= 700 or fails age/employment/income rules that cannot be fixed by amount/tenure:
    # First re-evaluate eligibility
    overall_status, rule_results = evaluate_eligibility(
        age=age,
        monthly_income=monthly_income,
        employment_type=employment_type,
        existing_emi=existing_emi,
        loan_product=loan_product,
    )

    # Core disqualifiers for automated APPROVE
    if overall_status == "Fail" or credit_score <= 700:
        blockers = []
        if overall_status == "Fail":
            failed = [r["rule_name"] for r in rule_results if not r["passed"]]
            blockers.append(f"failed eligibility checks ({', '.join(failed)})")
        if credit_score <= 700:
            blockers.append(f"credit score ({credit_score}) is below the required 701 benchmark for automated approval")

        return {
            "found_solution": False,
            "message": f"No approval-changing adjustment found within the tested scenarios. Underwriter review required because: {'; '.join(blockers)}.",
            "best_adjustment": None,
            "tested_scenarios_count": 0,
        }

    # Now define test adjustments in order of preference (smallest disruption to largest)
    # 1. Tenure increases alone (+12, +24, +36 months)
    # 2. Amount reductions alone (-10%, -20%, -30%)
    # 3. Combinations of (-10% and +12m, +24m), (-20% and +12m)
    annual_rate = loan_product.interest_rate if loan_product else 10.0
    max_product_tenure = loan_product.max_tenure_months if loan_product else 360

    scenarios = []

    # Tenure increases alone
    for add_months in [12, 24, 36]:
        new_tenure = tenure_months + add_months
        if new_tenure <= max_product_tenure:
            scenarios.append({
                "type": f"Tenure Extension (+{add_months} mos)",
                "amount": loan_amount,
                "tenure": new_tenure,
                "severity_score": 10 + add_months,
            })

    # Amount reductions alone
    for red_pct in [10, 20, 30]:
        new_amount = round(loan_amount * (1.0 - red_pct / 100.0), 2)
        scenarios.append({
            "type": f"Loan Amount Reduction (-{red_pct}%)",
            "amount": new_amount,
            "tenure": tenure_months,
            "severity_score": 100 + red_pct,
        })

    # Combined adjustments
    for red_pct in [10, 20, 30]:
        for add_months in [12, 24, 36]:
            new_tenure = tenure_months + add_months
            if new_tenure <= max_product_tenure:
                new_amount = round(loan_amount * (1.0 - red_pct / 100.0), 2)
                scenarios.append({
                    "type": f"Combined (-{red_pct}% Amount, +{add_months} mos Tenure)",
                    "amount": new_amount,
                    "tenure": new_tenure,
                    "severity_score": 200 + red_pct * 10 + add_months,
                })

    approval_solutions = []

    for sc in scenarios:
        test_emi = calculate_emi(sc["amount"], annual_rate, sc["tenure"])
        res = evaluate_recommendation(
            emi_amount=test_emi,
            existing_emi=existing_emi,
            monthly_income=monthly_income,
            credit_score=credit_score,
            eligibility_status="Pass",
        )
        if res["recommendation"] == "APPROVE":
            explanation = (
                f"By adjusting loan to ₹{sc['amount']:,.0f} and tenure to {sc['tenure']} months, "
                f"the EMI lowers to ₹{test_emi:,.0f} bringing total EMI-to-income ratio down to "
                f"{res['emi_ratio']*100:.1f}%, which satisfies automated approval criteria."
            )
            approval_solutions.append({
                "tested_type": sc["type"],
                "revised_loan_amount": sc["amount"],
                "revised_tenure_months": sc["tenure"],
                "revised_emi": test_emi,
                "revised_emi_ratio": res["emi_ratio"],
                "recommendation": "APPROVE",
                "explanation": explanation,
                "severity_score": sc["severity_score"],
            })

    if approval_solutions:
        # Pick smallest tested adjustment (lowest severity score)
        best = min(approval_solutions, key=lambda x: x["severity_score"])
        return {
            "found_solution": True,
            "message": f"Found path to preliminary approval via: {best['tested_type']}",
            "best_adjustment": {
                "tested_type": best["tested_type"],
                "revised_loan_amount": best["revised_loan_amount"],
                "revised_tenure_months": best["revised_tenure_months"],
                "revised_emi": best["revised_emi"],
                "revised_emi_ratio": best["revised_emi_ratio"],
                "recommendation": best["recommendation"],
                "explanation": best["explanation"],
            },
            "tested_scenarios_count": len(scenarios),
        }
    else:
        return {
            "found_solution": False,
            "message": "No approval-changing adjustment found within the tested scenarios.",
            "best_adjustment": None,
            "tested_scenarios_count": len(scenarios),
        }
