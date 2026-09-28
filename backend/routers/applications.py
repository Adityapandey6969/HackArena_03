import json
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Application, LoanProduct, NotificationLog
from ..schemas import (
    ApplicationCreate,
    ApplicationResponse,
    OfficerOverrideRequest,
    GapAnalysisResponse,
    LoanProductResponse,
)
from ..services.eligibility import evaluate_eligibility
from ..services.emi import calculate_emi, evaluate_recommendation
from ..services.explanation import generate_explanation
from ..services.gap_analysis import calculate_gap_to_approval
from ..services.notifications import (
    send_simulated_notification,
    generate_submission_message,
    generate_decision_message,
)

router = APIRouter(prefix="/api/applications", tags=["Applications"])


def _format_application_response(app: Application) -> dict:
    """Helper to deserialize JSON fields for response."""
    reasons = json.loads(app.eligibility_reasons) if app.eligibility_reasons else []
    gap = json.loads(app.gap_to_approval) if app.gap_to_approval else {}
    return {
        "id": app.id,
        "app_id": app.app_id,
        "name": app.name,
        "phone": app.phone,
        "age": app.age,
        "employment_type": app.employment_type,
        "monthly_income": app.monthly_income,
        "loan_type": app.loan_type,
        "loan_amount": app.loan_amount,
        "tenure_months": app.tenure_months,
        "existing_emi": app.existing_emi,
        "credit_score": app.credit_score,
        "eligibility_status": app.eligibility_status,
        "eligibility_reasons": reasons,
        "emi_amount": app.emi_amount,
        "emi_ratio": app.emi_ratio,
        "recommendation": app.recommendation,
        "explanation_text": app.explanation_text,
        "priority_rank": app.priority_rank,
        "last_notified_status": app.last_notified_status,
        "gap_to_approval": gap,
        "officer_decision": app.officer_decision,
        "officer_decision_at": app.officer_decision_at,
        "officer_notes": app.officer_notes,
        "created_at": app.created_at,
    }


@router.get("/products", response_model=List[LoanProductResponse])
def get_loan_products(db: Session = Depends(get_db)):
    """Fetches all configurable loan products with rates and limits."""
    products = db.query(LoanProduct).all()
    return products


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def submit_application(payload: ApplicationCreate, db: Session = Depends(get_db)):
    """
    Submits a new loan application:
    1. Validates inputs using Pydantic.
    2. Generates unique application ID (APP-XXXX).
    3. Runs eligibility evaluation against product rules.
    4. Computes reducing-balance EMI and recommendation.
    5. Computes plain-language explanation and gap analysis.
    6. Logs simulated notification.
    7. Persists in SQLite and returns saved record.
    """
    # Find matching loan product
    product = db.query(LoanProduct).filter(LoanProduct.loan_type == payload.loan_type).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid loan type: {payload.loan_type}",
        )

    # Validate tenure against maximum limit (360 months)
    if payload.tenure_months > 360:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tenure of {payload.tenure_months} months exceeds the maximum allowable tenure of 360 months.",
        )

    # Generate sequential unique application ID: APP-1001, APP-1002, etc.
    last_app = db.query(Application).order_by(Application.id.desc()).first()
    next_num = 1001 if not last_app else (last_app.id + 1001)
    app_id = f"APP-{next_num}"

    # Step 1: Evaluate eligibility
    eligibility_status, rule_results = evaluate_eligibility(
        age=payload.age,
        monthly_income=payload.monthly_income,
        employment_type=payload.employment_type,
        existing_emi=payload.existing_emi,
        loan_product=product,
    )

    # Step 2: Calculate reducing-balance EMI
    emi_amount = calculate_emi(
        principal=payload.loan_amount,
        annual_rate=product.interest_rate,
        tenure_months=payload.tenure_months,
    )

    # Step 3: Evaluate risk and recommendation
    rec_result = evaluate_recommendation(
        emi_amount=emi_amount,
        existing_emi=payload.existing_emi,
        monthly_income=payload.monthly_income,
        credit_score=payload.credit_score,
        eligibility_status=eligibility_status,
    )

    recommendation = rec_result["recommendation"]
    emi_ratio = rec_result["emi_ratio"]
    priority_rank = rec_result["priority_rank"]

    # Step 4: Plain-language explanation
    explanation_text = generate_explanation(
        name=payload.name,
        monthly_income=payload.monthly_income,
        credit_score=payload.credit_score,
        emi_amount=emi_amount,
        existing_emi=payload.existing_emi,
        emi_ratio=emi_ratio,
        rule_results=rule_results,
        recommendation=recommendation,
        loan_type=payload.loan_type,
        loan_amount=payload.loan_amount,
    )

    # Step 5: Gap-to-approval calculation
    gap_result = calculate_gap_to_approval(
        loan_amount=payload.loan_amount,
        tenure_months=payload.tenure_months,
        existing_emi=payload.existing_emi,
        monthly_income=payload.monthly_income,
        credit_score=payload.credit_score,
        age=payload.age,
        employment_type=payload.employment_type,
        loan_product=product,
        current_recommendation=recommendation,
    )

    # Step 6: Initial notification message
    submission_notif = generate_submission_message(app_id, payload.name)

    new_app = Application(
        app_id=app_id,
        name=payload.name,
        phone=payload.phone,
        age=payload.age,
        employment_type=payload.employment_type,
        monthly_income=payload.monthly_income,
        loan_type=payload.loan_type,
        loan_amount=payload.loan_amount,
        tenure_months=payload.tenure_months,
        existing_emi=payload.existing_emi,
        credit_score=payload.credit_score,
        eligibility_status=eligibility_status,
        eligibility_reasons=json.dumps(rule_results),
        emi_amount=emi_amount,
        emi_ratio=emi_ratio,
        recommendation=recommendation,
        explanation_text=explanation_text,
        priority_rank=priority_rank,
        last_notified_status=submission_notif,
        gap_to_approval=json.dumps(gap_result),
        officer_decision=None,
    )

    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    # Save to notification log
    send_simulated_notification(db, app_id, payload.phone, submission_notif)

    return _format_application_response(new_app)


@router.get("", response_model=List[ApplicationResponse])
def get_applications(
    search: Optional[str] = Query(None, description="Search applicant name or app_id"),
    recommendation: Optional[str] = Query(None, description="Filter by APPROVE, REVIEW, REJECT"),
    loan_type: Optional[str] = Query(None, description="Filter by loan type"),
    sort_by_priority: bool = Query(True, description="Sort Review -> Reject -> Approve then created_at"),
    db: Session = Depends(get_db),
):
    """Fetches all applications with filtering, search, and priority sorting."""
    query = db.query(Application)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter((Application.name.ilike(s)) | (Application.app_id.ilike(s)))

    if recommendation:
        query = query.filter(Application.recommendation == recommendation.upper())

    if loan_type and loan_type != "All":
        query = query.filter(Application.loan_type == loan_type)

    if sort_by_priority:
        # Priority order: 1 (Review) -> 2 (Reject) -> 3 (Approve), secondary: created_at desc
        query = query.order_by(Application.priority_rank.asc(), Application.created_at.desc())
    else:
        query = query.order_by(Application.created_at.desc())

    apps = query.all()
    return [_format_application_response(a) for a in apps]


@router.get("/{app_id}", response_model=ApplicationResponse)
def get_application_by_id(app_id: str, db: Session = Depends(get_db)):
    """Fetches single application details by application ID."""
    app = db.query(Application).filter(Application.app_id == app_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Application {app_id} not found")
    return _format_application_response(app)


@router.post("/{app_id}/screen", response_model=ApplicationResponse)
def re_screen_application(app_id: str, db: Session = Depends(get_db)):
    """Triggers or recalculates automated pre-screening for an application."""
    app = db.query(Application).filter(Application.app_id == app_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    product = db.query(LoanProduct).filter(LoanProduct.loan_type == app.loan_type).first()
    if not product:
        product = db.query(LoanProduct).first()

    eligibility_status, rule_results = evaluate_eligibility(
        age=app.age,
        monthly_income=app.monthly_income,
        employment_type=app.employment_type,
        existing_emi=app.existing_emi,
        loan_product=product,
    )

    emi_amount = calculate_emi(app.loan_amount, product.interest_rate, app.tenure_months)
    rec = evaluate_recommendation(
        emi_amount=emi_amount,
        existing_emi=app.existing_emi,
        monthly_income=app.monthly_income,
        credit_score=app.credit_score,
        eligibility_status=eligibility_status,
    )

    app.eligibility_status = eligibility_status
    app.eligibility_reasons = json.dumps(rule_results)
    app.emi_amount = emi_amount
    app.emi_ratio = rec["emi_ratio"]
    app.recommendation = rec["recommendation"]
    app.priority_rank = rec["priority_rank"]
    app.explanation_text = generate_explanation(
        name=app.name,
        monthly_income=app.monthly_income,
        credit_score=app.credit_score,
        emi_amount=emi_amount,
        existing_emi=app.existing_emi,
        emi_ratio=rec["emi_ratio"],
        rule_results=rule_results,
        recommendation=rec["recommendation"],
        loan_type=app.loan_type,
        loan_amount=app.loan_amount,
    )

    gap = calculate_gap_to_approval(
        loan_amount=app.loan_amount,
        tenure_months=app.tenure_months,
        existing_emi=app.existing_emi,
        monthly_income=app.monthly_income,
        credit_score=app.credit_score,
        age=app.age,
        employment_type=app.employment_type,
        loan_product=product,
        current_recommendation=rec["recommendation"],
    )
    app.gap_to_approval = json.dumps(gap)

    db.commit()
    db.refresh(app)
    return _format_application_response(app)


@router.post("/{app_id}/override", response_model=ApplicationResponse)
def manual_override(
    app_id: str,
    payload: OfficerOverrideRequest,
    db: Session = Depends(get_db),
):
    """
    Loan Officer manual override:
    Saves officer decision (APPROVE, REVIEW, REJECT) and optional notes,
    while keeping the original automated recommendation intact.
    Logs simulated notification to applicant.
    """
    app = db.query(Application).filter(Application.app_id == app_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    app.officer_decision = payload.decision
    app.officer_decision_at = datetime.datetime.utcnow()
    if payload.notes:
        app.officer_notes = payload.notes

    # Create notification log
    decision_msg = generate_decision_message(app.app_id, payload.decision)
    app.last_notified_status = decision_msg

    send_simulated_notification(db, app.app_id, app.phone, decision_msg)

    db.commit()
    db.refresh(app)
    return _format_application_response(app)


@router.get("/{app_id}/gap-analysis", response_model=GapAnalysisResponse)
def get_gap_analysis(app_id: str, db: Session = Depends(get_db)):
    """Returns gap analysis details for an application."""
    app = db.query(Application).filter(Application.app_id == app_id).first()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    gap_data = json.loads(app.gap_to_approval) if app.gap_to_approval else {}
    if not gap_data:
        product = db.query(LoanProduct).filter(LoanProduct.loan_type == app.loan_type).first()
        gap_data = calculate_gap_to_approval(
            loan_amount=app.loan_amount,
            tenure_months=app.tenure_months,
            existing_emi=app.existing_emi,
            monthly_income=app.monthly_income,
            credit_score=app.credit_score,
            age=app.age,
            employment_type=app.employment_type,
            loan_product=product,
            current_recommendation=app.recommendation,
        )

    return GapAnalysisResponse(
        app_id=app.app_id,
        found_solution=gap_data.get("found_solution", False),
        message=gap_data.get("message", "No analysis data"),
        best_adjustment=gap_data.get("best_adjustment"),
        tested_scenarios_count=gap_data.get("tested_scenarios_count", 0),
    )


@router.get("/{app_id}/notifications")
def get_application_notifications(app_id: str, db: Session = Depends(get_db)):
    """Returns all simulated notification logs for an application."""
    logs = (
        db.query(NotificationLog)
        .filter(NotificationLog.app_id == app_id)
        .order_by(NotificationLog.created_at.desc())
        .all()
    )
    return logs
