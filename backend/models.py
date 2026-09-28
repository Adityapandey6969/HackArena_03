import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean
from .database import Base


class LoanProduct(Base):
    __tablename__ = "loan_products"

    id = Column(Integer, primary_key=True, index=True)
    loan_type = Column(String, unique=True, nullable=False)
    interest_rate = Column(Float, nullable=False)  # Annual interest rate in %
    min_income = Column(Float, nullable=False)     # Minimum monthly income required in INR
    max_tenure_months = Column(Integer, nullable=False)  # Maximum allowable tenure in months


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    app_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, index=True, nullable=False)
    age = Column(Integer, nullable=False)
    employment_type = Column(String, nullable=False)
    monthly_income = Column(Float, nullable=False)
    loan_type = Column(String, nullable=False)
    loan_amount = Column(Float, nullable=False)
    tenure_months = Column(Integer, nullable=False)
    existing_emi = Column(Float, nullable=False)
    credit_score = Column(Integer, nullable=False)

    # Pipeline fields
    eligibility_status = Column(String, default="Pending")  # Pass, Fail, Pending
    eligibility_reasons = Column(Text, default="[]")        # JSON string of rule checks
    emi_amount = Column(Float, default=0.0)
    emi_ratio = Column(Float, default=0.0)
    recommendation = Column(String, default="REVIEW")       # APPROVE, REVIEW, REJECT

    # Smart command center fields
    explanation_text = Column(Text, default="")
    priority_rank = Column(Integer, default=2)             # 1: Review, 2: Reject, 3: Approve
    last_notified_status = Column(String, default="")
    gap_to_approval = Column(Text, default="{}")           # JSON string of gap-to-approval scenarios

    # Officer manual override fields
    officer_decision = Column(String, nullable=True)       # APPROVE, REVIEW, REJECT
    officer_decision_at = Column(DateTime, nullable=True)
    officer_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    app_id = Column(String, index=True, nullable=False)
    phone = Column(String, index=True, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String, default="SIMULATED_SMS")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class OTPStore(Base):
    __tablename__ = "otp_stores"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    phone = Column(String, index=True, nullable=False)
    otp_code = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
