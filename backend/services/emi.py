from typing import Dict, Any


def calculate_emi(principal: float, annual_rate: float, tenure_months: int) -> float:
    """
    Calculates monthly reducing-balance EMI.
    Formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    where r = annual_rate / 12 / 100
    """
    if principal <= 0 or tenure_months <= 0:
        return 0.0

    if annual_rate <= 0:
        return round(principal / tenure_months, 2)

    monthly_rate = (annual_rate / 12.0) / 100.0
    factor = (1.0 + monthly_rate) ** tenure_months
    emi = principal * monthly_rate * factor / (factor - 1.0)
    return round(emi, 2)


def evaluate_recommendation(
    emi_amount: float,
    existing_emi: float,
    monthly_income: float,
    credit_score: int,
    eligibility_status: str,
) -> Dict[str, Any]:
    """
    Evaluates risk and calculates automated preliminary recommendation.
    Rules:
    - APPROVE: emi_ratio < 0.4 and credit_score > 700 and eligibility_status == 'Pass'
    - REJECT: emi_ratio > 0.6 or eligibility_status == 'Fail'
    - REVIEW: All other cases

    Returns:
    - emi_ratio
    - recommendation (APPROVE, REVIEW, REJECT)
    - priority_rank (1: REVIEW, 2: REJECT, 3: APPROVE)
    - reasoning
    """
    total_obligation = emi_amount + existing_emi
    emi_ratio = round(total_obligation / monthly_income, 4) if monthly_income > 0 else 1.0

    if eligibility_status == "Fail" or emi_ratio > 0.6:
        recommendation = "REJECT"
        priority_rank = 2
        reasons = []
        if eligibility_status == "Fail":
            reasons.append("one or more core eligibility rules failed")
        if emi_ratio > 0.6:
            reasons.append(f"total EMI-to-income ratio ({emi_ratio*100:.1f}%) exceeds the 60% risk limit")
        reasoning = f"Automated preliminary screening recommends REJECTION because {', and '.join(reasons)}."

    elif emi_ratio < 0.4 and credit_score > 700 and eligibility_status == "Pass":
        recommendation = "APPROVE"
        priority_rank = 3
        reasoning = (
            f"Automated preliminary screening recommends APPROVAL. Total EMI-to-income ratio ({emi_ratio*100:.1f}%) "
            f"is below 40%, credit score ({credit_score}) is above 700, and all eligibility criteria passed."
        )

    else:
        recommendation = "REVIEW"
        priority_rank = 1
        reasons = []
        if 0.4 <= emi_ratio <= 0.6:
            reasons.append(f"EMI-to-income ratio ({emi_ratio*100:.1f}%) falls into moderate debt burden band (40%–60%)")
        if credit_score <= 700:
            reasons.append(f"credit score ({credit_score}) requires manual underwriter assessment")
        reasoning = (
            f"Automated preliminary screening recommends MANUAL REVIEW: {'; '.join(reasons) if reasons else 'borderline risk profile'}."
        )

    return {
        "emi_amount": emi_amount,
        "emi_ratio": emi_ratio,
        "recommendation": recommendation,
        "priority_rank": priority_rank,
        "reasoning": reasoning,
    }
