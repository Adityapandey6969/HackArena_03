"""
main.py
FastAPI backend server for Feature 5: Loan Decision & Guidance Engine.
Provides RESTful endpoints prefixed with /api/f5 for Officer Command Center and Applicant Portal.
Also mounts React frontend build static files for single-command serving.
"""

import os
import json
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from db import execute_query, execute_single, execute_write
from engine import recompute, get_loan_product, explain, suggest, gap_to_approval, calculate_priority_score
from notifier import send_status_update
from rag_chat import answer_chat

app = FastAPI(title="Loan Application Pre-Screening API (Feature 5)", version="1.0.0")

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------------
# PYDANTIC SCHEMAS
# -------------------------------------------------------------------------

class WhatIfRequest(BaseModel):
    loan_amount: Optional[float] = None
    tenure_months: Optional[int] = None
    loan_type: Optional[str] = None

class ApplyTermsRequest(BaseModel):
    loan_amount: Optional[float] = None
    tenure_months: Optional[int] = None
    loan_type: Optional[str] = None

class SendMessageRequest(BaseModel):
    message: str

class ChatRequest(BaseModel):
    app_id: int
    message: str
    history: Optional[List[Dict[str, str]]] = []

class NewApplicationRequest(BaseModel):
    name: str
    age: int
    employment_type: str
    monthly_income: float
    loan_type: str
    loan_amount: float
    tenure_months: int
    existing_emi: float
    credit_score: int

# -------------------------------------------------------------------------
# API ENDPOINTS
# -------------------------------------------------------------------------

@app.get("/api/f5/queue")
def get_queue():
    """Returns applications sorted by priority_rank (1..N)."""
    rows = execute_query("SELECT * FROM applications ORDER BY priority_rank ASC;")
    for r in rows:
        if r.get("suggestions_json"):
            try:
                r["suggestions"] = json.loads(r["suggestions_json"])
            except Exception:
                r["suggestions"] = []
        else:
            r["suggestions"] = []
        if r.get("eligibility_reasons"):
            try:
                r["eligibility_reasons"] = json.loads(r["eligibility_reasons"])
            except Exception:
                pass
    return rows

@app.get("/api/f5/stats")
def get_stats():
    """Returns dashboard stats: counts by status, ₹ value in Review, ₹ value in recoverable Rejects."""
    status_counts = execute_query("""
        SELECT recommendation, COUNT(*) as count, SUM(loan_amount) as total_value
        FROM applications
        GROUP BY recommendation;
    """)
    
    counts = {"Approve": 0, "Review": 0, "Reject": 0}
    total_review_value = 0.0
    
    for row in status_counts:
        rec = row["recommendation"]
        if rec in counts:
            counts[rec] = row["count"]
        if rec == "Review" and row["total_value"]:
            total_review_value = float(row["total_value"])

    # Recoverable Rejects value
    recov_row = execute_single("""
        SELECT SUM(loan_amount) as total_val
        FROM applications
        WHERE recommendation = 'Reject' AND is_recoverable = 1;
    """)
    total_recoverable_reject_value = float(recov_row["total_val"]) if recov_row and recov_row["total_val"] else 0.0

    return {
        "count_by_status": counts,
        "total_value_review": total_review_value,
        "total_value_recoverable_rejects": total_recoverable_reject_value,
        "avg_time_to_decision": "< 50ms (Automated Engine)"
    }

@app.get("/api/f5/applications/{app_id}/tracker")
def get_applicant_tracker(app_id: int):
    """Returns application details, status timeline, checks, suggestions, and gap to approval."""
    app_data = execute_single("SELECT * FROM applications WHERE app_id = ?;", (app_id,))
    if not app_data:
        raise HTTPException(status_code=404, detail=f"Application #{app_id} not found.")

    # Status history timeline
    history = execute_query("""
        SELECT id, app_id, old_status, new_status, changed_by, timestamp
        FROM status_history
        WHERE app_id = ?
        ORDER BY id ASC;
    """, (app_id,))

    # Run engine dry-run to get structured checks and suggestions
    engine_data = recompute(app_id, dry_run=True)

    return {
        "application": app_data,
        "status_history": history,
        "explanation_text": engine_data["explanation_text"],
        "checks": engine_data["checks"],
        "suggestions": engine_data["suggestions"],
        "gap_to_approval": engine_data["gap_to_approval"],
        "is_recoverable": bool(engine_data["is_recoverable"]),
        "priority_rank": app_data.get("priority_rank", 1)
    }

@app.post("/api/f5/applications/{app_id}/recompute")
def post_recompute(app_id: int):
    """Triggers recompute single write pathway for an application."""
    try:
        result = recompute(app_id, dry_run=False, changed_by="system")
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/api/f5/applications/{app_id}/whatif")
def post_whatif(app_id: int, req: WhatIfRequest):
    """Performs dry-run recalculation with candidate overrides without writing to DB."""
    overrides = {}
    if req.loan_amount is not None:
        overrides["loan_amount"] = req.loan_amount
    if req.tenure_months is not None:
        overrides["tenure_months"] = req.tenure_months
    if req.loan_type is not None:
        overrides["loan_type"] = req.loan_type

    try:
        result = recompute(app_id, overrides=overrides, dry_run=True)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/api/f5/applications/{app_id}/apply-terms")
def post_apply_terms(app_id: int, req: ApplyTermsRequest):
    """Persists modified terms via recompute single write pathway (changed_by='officer')."""
    overrides = {}
    if req.loan_amount is not None:
        overrides["loan_amount"] = req.loan_amount
    if req.tenure_months is not None:
        overrides["tenure_months"] = req.tenure_months
    if req.loan_type is not None:
        overrides["loan_type"] = req.loan_type

    try:
        result = recompute(app_id, overrides=overrides, dry_run=False, changed_by="officer")
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/api/f5/applications/{app_id}/draft-message")
def post_draft_message(app_id: int):
    """Generates draft applicant notification message."""
    app_data = execute_single("SELECT * FROM applications WHERE app_id = ?;", (app_id,))
    if not app_data:
        raise HTTPException(status_code=404, detail=f"Application #{app_id} not found.")

    engine_data = recompute(app_id, dry_run=True)
    
    top_suggestion = ""
    if engine_data["suggestions"]:
        fixables = [s for s in engine_data["suggestions"] if s.get("fixable") in ["yes", "partly"]]
        if fixables:
            top_suggestion = f"\nNext Step: {fixables[0]['action']}."

    draft = (
        f"Dear {app_data['name']},\n"
        f"Update on your {app_data['loan_type']} application #{app_data['app_id']}:\n"
        f"Status: {engine_data['recommendation'].upper()}\n"
        f"{engine_data['explanation_text']}"
        f"{top_suggestion}\n"
        f"You can view complete term guidance on your Applicant Tracker portal."
    )

    return {"draft_message": draft}

@app.post("/api/f5/applications/{app_id}/send-message")
def post_send_message(app_id: int, req: SendMessageRequest):
    """Sends custom or drafted message via notifier."""
    try:
        res = send_status_update(app_id, custom_message=req.message)
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/f5/notifications")
def get_notifications(app_id: Optional[int] = Query(None)):
    """Returns outbox notifications, optionally filtered by app_id."""
    if app_id:
        rows = execute_query("""
            SELECT n.*, a.name as applicant_name
            FROM notifications n
            JOIN applications a ON n.app_id = a.app_id
            WHERE n.app_id = ?
            ORDER BY n.id DESC;
        """, (app_id,))
    else:
        rows = execute_query("""
            SELECT n.*, a.name as applicant_name
            FROM notifications n
            JOIN applications a ON n.app_id = a.app_id
            ORDER BY n.id DESC;
        """)
    return rows

@app.post("/api/f5/chat")
def post_chat(req: ChatRequest):
    """RAG Chatbot Endpoint."""
    reply_data = answer_chat(req.app_id, req.message, req.history)
    return reply_data

# -------------------------------------------------------------------------
# F1 STUB: NEW APPLICATION SUBMISSION
# -------------------------------------------------------------------------

@app.post("/api/f1/applications")
def create_application(req: NewApplicationRequest):
    """Creates a new loan application and triggers immediate recompute."""
    app_id = execute_write("""
        INSERT INTO applications (name, age, employment_type, monthly_income, loan_type, loan_amount, tenure_months, existing_emi, credit_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        req.name, req.age, req.employment_type, req.monthly_income,
        req.loan_type, req.loan_amount, req.tenure_months,
        req.existing_emi, req.credit_score
    ))

    # Log initial submission in status history
    execute_write("""
        INSERT INTO status_history (app_id, old_status, new_status, changed_by, timestamp)
        VALUES (?, 'None', 'Submitted', 'applicant', datetime('now'));
    """, (app_id,))

    # Trigger single write pathway recompute
    result = recompute(app_id, dry_run=False, changed_by="system")
    return result

# -------------------------------------------------------------------------
# STATIC FRONTEND MOUNTING
# -------------------------------------------------------------------------

DIST_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")

if os.path.exists(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        index_file = os.path.join(DIST_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"status": "ok", "service": "Loan Decision & Guidance Engine"}
else:
    @app.get("/")
    def read_root():
        return {"status": "ok", "service": "Loan Decision & Guidance Engine (Feature 5 Backend)"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
