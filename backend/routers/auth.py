import random
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import OTPStore, Application
from ..schemas import SendOTPRequest, SendOTPResponse, VerifyOTPRequest, VerifyOTPResponse

from ..services.sms import dispatch_sms_otp, verify_sms_otp_remote

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/send-otp", response_model=SendOTPResponse)
async def send_otp(payload: SendOTPRequest, db: Session = Depends(get_db)):
    """
    OTP Service:
    Generates a 6-digit OTP, stores it in SQLite, and dispatches via SMS gateway
    (Twilio Verify / Fast2SMS / Simulated).
    """
    phone = payload.phone

    # Generate 6-digit numeric OTP
    otp_code = f"{random.randint(100000, 999999)}"

    # Record in local OTP store
    record = OTPStore(phone=phone, otp_code=otp_code, is_verified=False)
    db.add(record)
    db.commit()

    # Dispatch via SMS gateway
    sms_result = await dispatch_sms_otp(phone, otp_code)

    return SendOTPResponse(
        phone=phone,
        otp_code=otp_code,
        message=sms_result.get("message", "OTP generated"),
        cooldown_seconds=30,
        sms_delivered=sms_result.get("delivered", False),
        provider=sms_result.get("provider", "Twilio SMS"),
    )


@router.post("/verify-otp", response_model=VerifyOTPResponse)
async def verify_otp(payload: VerifyOTPRequest, db: Session = Depends(get_db)):
    """
    Verifies the 6-digit OTP for the given phone number.
    Checks Twilio remote verification first, then local database, then demo master code.
    """
    phone = payload.phone
    otp_code = payload.otp_code

    # 1. Check Twilio Verify Remote Service
    remote_ok = await verify_sms_otp_remote(phone, otp_code)

    # 2. Check local database record
    record = (
        db.query(OTPStore)
        .filter(OTPStore.phone == phone, OTPStore.otp_code == otp_code)
        .order_by(OTPStore.id.desc())
        .first()
    )

    # 3. Check master demo code
    is_valid = remote_ok or (record is not None) or (otp_code == "123456")

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Please enter the 6-digit code received on your phone or request a new code.",
        )

    # Mark the latest OTP record for this phone as verified
    latest_record = (
        db.query(OTPStore)
        .filter(OTPStore.phone == phone)
        .order_by(OTPStore.id.desc())
        .first()
    )
    if latest_record:
        latest_record.is_verified = True
        db.commit()

    # Check for existing applications under this phone number
    existing_apps = db.query(Application).filter(Application.phone == phone).all()
    has_apps = len(existing_apps) > 0

    return VerifyOTPResponse(
        phone=phone,
        is_verified=True,
        message="Mobile number successfully verified.",
        has_existing_applications=has_apps,
        application_count=len(existing_apps),
    )


@router.get("/applicant/{phone}/applications")
def get_applicant_applications(phone: str, db: Session = Depends(get_db)):
    """
    Fetches all submitted applications for an existing verified applicant.
    """
    cleaned = phone.strip().replace(" ", "").replace("-", "")
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]

    apps = (
        db.query(Application)
        .filter(Application.phone == cleaned)
        .order_by(Application.created_at.desc())
        .all()
    )
    return apps
