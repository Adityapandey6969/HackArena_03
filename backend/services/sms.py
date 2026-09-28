import os
import logging
import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("loanease.sms")


async def dispatch_sms_otp(phone: str, otp_code: str) -> dict:
    """
    Dispatches a real cellular SMS OTP to the user's mobile phone (+91).
    Priority 1: Twilio Verify Service (global SMS gateway, handles carrier delivery worldwide)
    Priority 2: Twilio Standard SMS (Messages.json)
    Priority 3: Fast2SMS API
    Priority 4: Simulated dev fallback
    """
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    twilio_service_sid = os.getenv("TWILIO_VERIFY_SERVICE_SID", "").strip()
    twilio_from = os.getenv("TWILIO_FROM_NUMBER", "").strip()
    fast2sms_key = os.getenv("FAST2SMS_API_KEY", "").strip()

    cleaned_phone = phone.strip().replace(" ", "").replace("-", "")
    if cleaned_phone.startswith("+91"):
        cleaned_phone = cleaned_phone[3:]
    formatted_to = f"+91{cleaned_phone}"

    # 1. Try Twilio Verify Service (Best: sends real SMS to +91 numbers without needing phone numbers)
    if twilio_sid and twilio_token and twilio_service_sid:
        try:
            url = f"https://verify.twilio.com/v2/Services/{twilio_service_sid}/Verifications"
            data = {"To": formatted_to, "Channel": "sms"}
            auth = (twilio_sid, twilio_token)
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, data=data, auth=auth)
                if res.status_code in [200, 201]:
                    logger.info(f"Twilio Verify successfully sent SMS OTP to {formatted_to}")
                    return {
                        "delivered": True,
                        "provider": "Twilio SMS",
                        "message": f"Real SMS OTP dispatched to {formatted_to} via Twilio.",
                    }
                else:
                    logger.warning(f"Twilio Verify API returned {res.status_code}: {res.text}")
        except Exception as e:
            logger.error(f"Twilio Verify error: {e}")

    # 2. Try Twilio Standard SMS if from_number is configured
    if twilio_sid and twilio_token and twilio_from and twilio_from.startswith("+1"):
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json"
            data = {
                "From": twilio_from,
                "To": formatted_to,
                "Body": f"Your LoanEase verification code is: {otp_code}. Valid for 10 minutes.",
            }
            auth = (twilio_sid, twilio_token)
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, data=data, auth=auth)
                if res.status_code in [200, 201]:
                    logger.info(f"Twilio SMS delivered OTP to {formatted_to}")
                    return {
                        "delivered": True,
                        "provider": "Twilio SMS",
                        "message": f"Real SMS sent to {formatted_to} via Twilio.",
                    }
                else:
                    logger.warning(f"Twilio SMS API returned {res.status_code}: {res.text}")
        except Exception as e:
            logger.error(f"Twilio SMS error: {e}")

    # 3. Try Fast2SMS if configured
    if fast2sms_key:
        try:
            url = "https://www.fast2sms.com/dev/bulkV2"
            headers = {"authorization": fast2sms_key}
            params = {
                "variables_values": otp_code,
                "route": "otp",
                "numbers": cleaned_phone,
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, headers=headers, params=params)
                data = res.json()
                if data.get("return") is True:
                    logger.info(f"Fast2SMS delivered OTP to {formatted_to}")
                    return {
                        "delivered": True,
                        "provider": "Fast2SMS",
                        "message": f"Real SMS sent to {formatted_to} via Fast2SMS.",
                    }
        except Exception as e:
            logger.error(f"Fast2SMS error: {e}")

    # 4. Fallback: Simulated Gateway (Hackathon dev mode)
    logger.info(f"[SMS SIMULATION] Dispatched OTP {otp_code} to {formatted_to}")
    return {
        "delivered": False,
        "provider": "Simulated Gateway",
        "message": f"OTP {otp_code} generated for {formatted_to} (Dev mode).",
    }


async def verify_sms_otp_remote(phone: str, entered_otp: str) -> bool:
    """
    Checks if entered OTP is verified with Twilio Verify Service.
    """
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    twilio_service_sid = os.getenv("TWILIO_VERIFY_SERVICE_SID", "").strip()

    if not (twilio_sid and twilio_token and twilio_service_sid):
        return False

    cleaned_phone = phone.strip().replace(" ", "").replace("-", "")
    if cleaned_phone.startswith("+91"):
        cleaned_phone = cleaned_phone[3:]
    formatted_to = f"+91{cleaned_phone}"

    try:
        url = f"https://verify.twilio.com/v2/Services/{twilio_service_sid}/VerificationCheck"
        data = {"To": formatted_to, "Code": entered_otp}
        auth = (twilio_sid, twilio_token)
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, data=data, auth=auth)
            if res.status_code in [200, 201]:
                res_data = res.json()
                if res_data.get("status") == "approved" or res_data.get("valid") is True:
                    logger.info(f"Twilio Verify confirmed valid OTP for {formatted_to}")
                    return True
    except Exception as e:
        logger.error(f"Twilio VerificationCheck error: {e}")

    return False
