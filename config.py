"""
config.py
Central configuration file containing all business rule thresholds,
eligibility parameters, and priority tier weights for F5 engine.
"""

# Age requirements
AGE_MIN = 21
AGE_MAX = 60

# Employment types allowed
ALLOWED_EMPLOYMENT_TYPES = ["Salaried", "Self-Employed", "Business"]

# Maximum existing EMI allowed (in INR)
MAX_EXISTING_EMI_CAP = 100000.0

# EMI ratio thresholds (emi_ratio = (emi_amount + existing_emi) / monthly_income)
EMI_RATIO_REJECT_THRESHOLD = 0.60  # > 0.60 results in Reject
EMI_RATIO_APPROVE_THRESHOLD = 0.40 # < 0.40 results in Approve (if credit score > 700)

# Credit score threshold
CREDIT_SCORE_APPROVE_THRESHOLD = 700

# Priority Tiers (0 = Review, 1 = Reject & Recoverable, 2 = Reject Not Recoverable, 3 = Approve)
# Note: Lower tier numbers indicate higher urgency for officer review.
PRIORITY_TIER_WEIGHTS = {
    "Review": 0,
    "Reject_Recoverable": 1,
    "Reject_Unrecoverable": 2,
    "Approve": 3
}

# Grid Search parameters for gap_to_approval
GRID_AMOUNT_REDUCTIONS = [0.0, 0.10, 0.20, 0.30]  # 0%, 10%, 20%, 30% reduction
GRID_TENURE_EXTENSIONS = [0, 12, 24, 36]           # +0, +12, +24, +36 months extension
