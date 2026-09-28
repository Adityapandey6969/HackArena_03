from typing import List, Dict, Any, Tuple
from ..models import LoanProduct

# Configurable fixed cap for applicant's existing monthly EMI
CONFIGURABLE_EXISTING_EMI_CAP = 75000.0
ALLOWED_EMPLOYMENT_TYPES = ["Salaried", "Self-employed"]


def evaluate_eligibility(
    age: int,
    monthly_income: float,
    employment_type: str,
    existing_emi: float,
    loan_product: LoanProduct,
    existing_emi_cap: float = CONFIGURABLE_EXISTING_EMI_CAP,
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Evaluates applicant against 4 distinct eligibility rules:
    1. Age between 21 and 60
    2. Monthly income meets product minimum income
    3. Employment type is in allowed list
    4. Existing EMI is below configurable fixed cap
    """
    rule_results = []

    # Rule 1: Age check (21 to 60)
    rule_age_passed = 21 <= age <= 60
    rule_results.append({
        "rule_name": "Age Requirement (21–60)",
        "passed": rule_age_passed,
        "reason": (
            f"Applicant age is {age}, which satisfies the acceptable range of 21 to 60 years."
            if rule_age_passed
            else f"Applicant age is {age}. Must be between 21 and 60 years for pre-screening qualification."
        ),
    })

    # Rule 2: Minimum income requirement for selected product
    min_income_required = loan_product.min_income if loan_product else 25000.0
    rule_income_passed = monthly_income >= min_income_required
    rule_results.append({
        "rule_name": f"Minimum Income Requirement for {loan_product.loan_type if loan_product else 'Loan'}",
        "passed": rule_income_passed,
        "reason": (
            f"Monthly income of ₹{monthly_income:,.2f} meets the minimum requirement of ₹{min_income_required:,.2f} for {loan_product.loan_type if loan_product else 'this product'}."
            if rule_income_passed
            else f"Monthly income of ₹{monthly_income:,.2f} is below the required ₹{min_income_required:,.2f} for {loan_product.loan_type if loan_product else 'this product'}."
        ),
    })

    # Rule 3: Employment type check
    rule_emp_passed = employment_type in ALLOWED_EMPLOYMENT_TYPES
    rule_results.append({
        "rule_name": "Employment Type Eligibility",
        "passed": rule_emp_passed,
        "reason": (
            f"Employment type '{employment_type}' is an approved eligible category."
            if rule_emp_passed
            else f"Employment type '{employment_type}' is not recognized. Must be one of: {', '.join(ALLOWED_EMPLOYMENT_TYPES)}."
        ),
    })

    # Rule 4: Existing EMI fixed cap check
    rule_emi_cap_passed = existing_emi <= existing_emi_cap
    rule_results.append({
        "rule_name": f"Existing EMI Cap (₹{existing_emi_cap:,.0f})",
        "passed": rule_emi_cap_passed,
        "reason": (
            f"Current monthly EMI obligation of ₹{existing_emi:,.2f} is within the policy cap of ₹{existing_emi_cap:,.2f}."
            if rule_emi_cap_passed
            else f"Current monthly EMI obligation of ₹{existing_emi:,.2f} exceeds the policy ceiling of ₹{existing_emi_cap:,.2f}."
        ),
    })

    overall_status = "Pass" if all(r["passed"] for r in rule_results) else "Fail"
    return overall_status, rule_results
