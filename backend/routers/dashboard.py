from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Application
from ..schemas import DashboardStats

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Computes summary metrics and workload statistics for loan officers:
    - Total applications
    - Pending applications (no officer decision yet)
    - Automated recommendation breakdowns (Approve, Review, Reject)
    - Applications awaiting manual officer review
    - Average time from submission to officer decision (minutes)
    """
    all_apps = db.query(Application).all()

    total = len(all_apps)
    pending = sum(1 for a in all_apps if a.officer_decision is None)
    approve_count = sum(1 for a in all_apps if a.recommendation == "APPROVE")
    review_count = sum(1 for a in all_apps if a.recommendation == "REVIEW")
    reject_count = sum(1 for a in all_apps if a.recommendation == "REJECT")
    awaiting_review = sum(1 for a in all_apps if a.recommendation == "REVIEW" and a.officer_decision is None)

    # Calculate average time to decision for applications with officer_decision_at
    durations = []
    for a in all_apps:
        if a.officer_decision_at and a.created_at:
            delta = (a.officer_decision_at - a.created_at).total_seconds() / 60.0
            if delta >= 0:
                durations.append(delta)

    avg_time = round(sum(durations) / len(durations), 1) if durations else 0.0

    return DashboardStats(
        total_applications=total,
        pending_applications=pending,
        approve_recommendations=approve_count,
        review_recommendations=review_count,
        reject_recommendations=reject_count,
        awaiting_review=awaiting_review,
        avg_decision_time_minutes=avg_time,
    )
