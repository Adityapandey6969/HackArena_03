"""
notifier.py
Notification engine for Feature 5.
Supports Twilio WhatsApp Sandbox if env vars are present (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER).
Falls back to MOCK mode automatically.
All notifications (whatsapp or mock) are persisted to the `notifications` database table.
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, Optional
from db import execute_single, execute_write

def send_status_update(app_id: int, custom_message: Optional[str] = None) -> Dict[str, Any]:
    """
    Sends a status update notification to the applicant.
    If custom_message is provided, sends that message.
    Otherwise builds standard status update message from explanation and suggestions.
    """
    app = execute_single("SELECT * FROM applications WHERE app_id = ?;", (app_id,))
    if not app:
        raise ValueError(f"Application #{app_id} not found.")

    recommendation = app.get("recommendation", "Submitted")
    
    # Do not re-notify if status hasn't changed and no custom message was supplied
    if not custom_message and app.get("last_notified_status") == recommendation:
        return {"status": "skipped", "reason": "Status unchanged since last notification"}

    # Build message if not custom
    if custom_message:
        message_body = custom_message
    else:
        top_suggestion_text = ""
        if app.get("suggestions_json"):
            try:
                suggs = json.loads(app["suggestions_json"])
                fixables = [s for s in suggs if s.get("fixable") in ["yes", "partly"]]
                if fixables:
                    top_suggestion_text = f"\nTip: {fixables[0]['action']}."
            except Exception:
                pass
        
        message_body = (
            f"Dear {app['name']},\n"
            f"Update on Loan Application #{app['app_id']} ({app['loan_type']}):\n"
            f"Status: {recommendation.upper()}\n"
            f"{app.get('explanation_text', '')}"
            f"{top_suggestion_text}\n"
            f"Track your application status anytime on the Applicant Portal."
        )

    # Check Twilio configuration
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_number = os.environ.get("TWILIO_FROM_NUMBER", "whatsapp:+14155238886")
    to_number = os.environ.get("TWILIO_TO_NUMBER", "whatsapp:+919999999999")

    channel = "mock"
    delivery_status = "MOCK_SENT"

    if account_sid and auth_token:
        try:
            import urllib.parse
            import urllib.request
            import base64

            # Standard REST call to Twilio Messages endpoint
            url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
            data = urllib.parse.urlencode({
                "From": from_number,
                "To": to_number,
                "Body": message_body
            }).encode("utf-8")

            req = urllib.request.Request(url, data=data, method="POST")
            auth_header = base64.b64encode(f"{account_sid}:{auth_token}".encode("utf-8")).decode("utf-8")
            req.add_header("Authorization", f"Basic {auth_header}")

            with urllib.request.urlopen(req) as resp:
                if resp.status in (200, 201):
                    channel = "whatsapp"
                    delivery_status = "DELIVERED"
                    print(f"[Twilio WhatsApp] Sent status update for App #{app_id}")
        except Exception as e:
            print(f"[Twilio Error] Fallback to Mock mode: {e}")
            channel = "mock"
            delivery_status = "MOCK_FAILED_FALLBACK"

    sent_at = datetime.now().isoformat()

    # Insert into notifications table
    notif_id = execute_write("""
        INSERT INTO notifications (app_id, channel, message, sent_at, delivery_status)
        VALUES (?, ?, ?, ?, ?);
    """, (app_id, channel, message_body, sent_at, delivery_status))

    # Update last_notified_status on application
    execute_write("UPDATE applications SET last_notified_status = ? WHERE app_id = ?;", (recommendation, app_id))

    return {
        "id": notif_id,
        "app_id": app_id,
        "channel": channel,
        "message": message_body,
        "sent_at": sent_at,
        "delivery_status": delivery_status
    }
