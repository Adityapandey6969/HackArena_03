from typing import List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


# --- Auth Schemas ---
class SendOTPRequest(BaseModel):
    phone: str = Field(..., description="10-digit Indian mobile number")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = v.strip().replace(" ", "").replace("-", "")
        if cleaned.startswith("+91"):
            cleaned = cleaned[3:]
        elif cleaned.startswith("0"):
            cleaned = cleaned[1:]
        if not cleaned.isdigit() or len(cleaned) != 10:
            raise ValueError("Must be a valid 10-digit Indian mobile number")
        return cleaned


class SendOTPResponse(BaseModel):
    phone: str
    otp_code: str
    message: str
    cooldown_seconds: int = 30
    sms_delivered: bool = False
    provider: str = "Simulated Gateway"


class VerifyOTPRequest(BaseModel):
    phone: str
    otp_code: str

    @field_validator("otp_code")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be a 6-digit numeric code")
        return v


class VerifyOTPResponse(BaseModel):
    phone: str
    is_verified: bool
    message: str
    has_existing_applications: bool
    application_count: int


# --- Application Schemas ---
class ApplicationCreate(BaseModel):
    name: str = Field(..., min_length=2, description="Applicant full name")
    phone: str = Field(..., description="Verified 10-digit mobile number")
    age: int = Field(..., ge=18, le=100, description="Applicant age between 18 and 100")
    employment_type: str = Field(..., description="Salaried or Self-employed")
    monthly_income: float = Field(..., gt=0, description="Monthly income in INR")
    loan_type: str = Field(..., description="Type of loan product")
    loan_amount: float = Field(..., gt=0, description="Requested loan amount in INR")
    tenure_months: int = Field(..., gt=0, le=360, description="Loan tenure in months (1-360)")
    existing_emi: float = Field(..., ge=0, description="Current monthly EMI obligations")
    credit_score: int = Field(..., ge=300, le=900, description="Credit score between 300 and 900")
    confirmed: bool = Field(..., description="Confirmation checkbox")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Full name must have at least 2 characters")
        return v

    @field_validator("employment_type")
    @classmethod
    def validate_employment(cls, v: str) -> str:
        allowed = ["Salaried", "Self-employed"]
        if v not in allowed:
            raise ValueError(f"Employment type must be one of {allowed}")
        return v

    @field_validator("loan_type")
    @classmethod
    def validate_loan_type(cls, v: str) -> str:
        allowed = ["Personal Loan", "Home Loan", "Education Loan", "Vehicle Loan"]
        if v not in allowed:
            raise ValueError(f"Loan type must be one of {allowed}")
        return v

    @field_validator("confirmed")
    @classmethod
    def validate_confirmed(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must confirm that the information provided is accurate and complete")
        return v


class RuleCheckResult(BaseModel):
    rule_name: str
    passed: bool
    reason: str


class GapAnalysisAdjustment(BaseModel):
    tested_type: str
    revised_loan_amount: float
    revised_tenure_months: int
    revised_emi: float
    revised_emi_ratio: float
    recommendation: str
    explanation: str


class GapAnalysisResponse(BaseModel):
    app_id: str
    found_solution: bool
    message: str
    best_adjustment: Optional[GapAnalysisAdjustment] = None
    tested_scenarios_count: int


class OfficerOverrideRequest(BaseModel):
    decision: str = Field(..., description="APPROVE, REVIEW, or REJECT")
    notes: Optional[str] = None

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, v: str) -> str:
        upper = v.strip().upper()
        if upper not in ["APPROVE", "REVIEW", "REJECT"]:
            raise ValueError("Decision must be APPROVE, REVIEW, or REJECT")
        return upper


class ApplicationResponse(BaseModel):
    id: int
    app_id: str
    name: str
    phone: str
    age: int
    employment_type: str
    monthly_income: float
    loan_type: str
    loan_amount: float
    tenure_months: int
    existing_emi: float
    credit_score: int

    eligibility_status: str
    eligibility_reasons: Any
    emi_amount: float
    emi_ratio: float
    recommendation: str

    explanation_text: str
    priority_rank: int
    last_notified_status: str
    gap_to_approval: Any

    officer_decision: Optional[str] = None
    officer_decision_at: Optional[datetime] = None
    officer_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LoanProductResponse(BaseModel):
    id: int
    loan_type: str
    interest_rate: float
    min_income: float
    max_tenure_months: int

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_applications: int
    pending_applications: int
    approve_recommendations: int
    review_recommendations: int
    reject_recommendations: int
    awaiting_review: int
    avg_decision_time_minutes: float
