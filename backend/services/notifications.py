import logging
from sqlalchemy.orm import Session
from ..models import NotificationLog

logger = logging.getLogger("loanease.notifications")


def send_simulated_notification(
    db: Session,
    app_id: str,
    phone: str,
    message: str,
    notification_type: str = "SIMULATED_SMS",
) -> NotificationLog:
    """
    Simulates sending an SMS or WhatsApp notification.
    Persists notification log to database for hackathon demonstration.
    Designed so real external SMS provider (e.g. Twilio) can be plugged in seamlessly.
    """
    logger.info(f"[{notification_type}] Dispatched to +91-{phone} for {app_id}: {message}")

    log_entry = NotificationLog(
        app_id=app_id,
        phone=phone,
        message=message,
        notification_type=notification_type,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry


def generate_submission_message(app_id: str, name: str) -> str:
    return (
        f"[SIMULATED NOTIFICATION] Dear {name}, your LoanEase application {app_id} has been successfully "
        f"submitted and is awaiting preliminary screening. Check your applicant portal for real-time status updates."
    )


def generate_screening_message(app_id: str, recommendation: str) -> str:
    return (
        f"[SIMULATED NOTIFICATION] Update for application {app_id}: Automated preliminary screening "
        f"recommendation is '{recommendation}'. Our underwriting officer will review shortly."
    )


def generate_decision_message(app_id: str, decision: str) -> str:
    return (
        f"[SIMULATED NOTIFICATION] Final decision update for application {app_id}: The loan officer "
        f"has marked your application as '{decision}'."
    )
