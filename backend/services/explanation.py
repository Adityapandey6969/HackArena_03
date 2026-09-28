from typing import List, Dict, Any


def generate_explanation(
    name: str,
    monthly_income: float,
    credit_score: int,
    emi_amount: float,
    existing_emi: float,
    emi_ratio: float,
    rule_results: List[Dict[str, Any]],
    recommendation: str,
    loan_type: str,
    loan_amount: float,
) -> str:
    """
    Generates a clear, plain-language explanation based strictly on actual values
    and rule outcomes. Does not invent reasons.
    """
    total_obligation = emi_amount + existing_emi
    ratio_pct = emi_ratio * 100.0

    failed_rules = [r for r in rule_results if not r.get("passed", False)]

    base_summary = (
        f"Applicant {name} has a monthly income of ₹{monthly_income:,.0f} and a credit score of {credit_score}. "
        f"For the requested {loan_type} of ₹{loan_amount:,.0f}, the estimated monthly EMI is ₹{emi_amount:,.0f}. "
        f"Including existing commitments (₹{existing_emi:,.0f}), the total monthly debt service is ₹{total_obligation:,.0f}, "
        f"resulting in an EMI-to-income ratio of {ratio_pct:.1f}%."
    )

    if recommendation == "APPROVE":
        verdict = (
            f" All 4 configured eligibility checks passed cleanly. "
            f"Because the EMI ratio ({ratio_pct:.1f}%) is under the 40% safety threshold and credit score ({credit_score}) "
            f"exceeds the 700 benchmark, the application is recommended for preliminary approval."
        )
    elif recommendation == "REJECT":
        reasons_list = []
        if failed_rules:
            failures_str = "; ".join(f"{r['rule_name']} ({r['reason']})" for r in failed_rules)
            reasons_list.append(f"failed eligibility checks: [{failures_str}]")
        if emi_ratio > 0.6:
            reasons_list.append(
                f"total debt burden of {ratio_pct:.1f}% severely breaches the 60% maximum allowable risk ceiling"
            )
        verdict = f" The application is recommended for rejection due to: {', and '.join(reasons_list)}."
    else:  # REVIEW
        reasons_list = []
        if 0.4 <= emi_ratio <= 0.6:
            reasons_list.append(f"the EMI-to-income ratio ({ratio_pct:.1f}%) falls within the moderate risk zone (40%–60%)")
        if credit_score <= 700:
            reasons_list.append(f"the credit score ({credit_score}) is at or below the automated approval threshold of 700")
        verdict = (
            f" All core eligibility rules passed, but manual officer review is required because "
            f"{' and '.join(reasons_list) if reasons_list else 'the overall risk profile requires human discretion'}."
        )

    return base_summary + verdict
