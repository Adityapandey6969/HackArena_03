"""
rag_chat.py
RAG Chatbot engine for Feature 5 Applicant Portal.
Uses scikit-learn TF-IDF to retrieve policy chunks from policy_docs.json.
Injects retrieved context + applicant application data into LLM prompt.
Supports LLM_API_KEY via Gemini API (or provider wrapper).
Includes what-if tool execution for term inquiries (e.g. "what if I take 5L?").
Falls back gracefully to template-based responses if LLM_API_KEY is not configured.
"""

import os
import json
import re
import urllib.request
import urllib.parse
from typing import Dict, Any, List, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from db import execute_single
from engine import recompute

# Load Policy Chunks
POLICY_DOCS_PATH = os.path.join(os.path.dirname(__file__), "policy_docs.json")
with open(POLICY_DOCS_PATH, "r", encoding="utf-8") as f:
    POLICY_CHUNKS = json.load(f)

# Initialize TF-IDF Vectorizer
chunk_texts = [f"{c['title']}: {c['content']}" for c in POLICY_CHUNKS]
vectorizer = TfidfVectorizer().fit(chunk_texts)
chunk_vectors = vectorizer.transform(chunk_texts)

def retrieve_top_chunks(query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """Retrieves top_k most relevant policy chunks using TF-IDF cosine similarity."""
    query_vec = vectorizer.transform([query])
    similarities = cosine_similarity(query_vec, chunk_vectors)[0]
    top_indices = similarities.argsort()[::-1][:top_k]
    return [POLICY_CHUNKS[idx] for idx in top_indices]

def extract_whatif_intent(message: str) -> Optional[Dict[str, Any]]:
    """
    Detects if applicant message contains what-if intent like 'what if I take 5 lakhs' or 'tenure 48 months'.
    Returns overrides dict or None.
    """
    msg_lower = message.lower()
    overrides = {}

    # Amount extraction (e.g., 5L, 5 lakh, 500000, 300k, 3L)
    lakh_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|l)', msg_lower)
    k_match = re.search(r'(\d+(?:\.\d+)?)\s*k', msg_lower)
    num_match = re.search(r'(?:rs\.?|₹)?\s*(\d{5,8})', msg_lower)

    if lakh_match:
        val = float(lakh_match.group(1)) * 100000
        overrides["loan_amount"] = val
    elif k_match:
        val = float(k_match.group(1)) * 1000
        overrides["loan_amount"] = val
    elif num_match:
        overrides["loan_amount"] = float(num_match.group(1))

    # Tenure extraction (e.g., 36 months, 4 years, 5 yrs)
    month_match = re.search(r'(\d+)\s*(?:month|months|m)\b', msg_lower)
    year_match = re.search(r'(\d+)\s*(?:year|years|yr|yrs)\b', msg_lower)

    if month_match:
        overrides["tenure_months"] = int(month_match.group(1))
    elif year_match:
        overrides["tenure_months"] = int(year_match.group(1)) * 12

    return overrides if overrides else None

def call_gemini_api(prompt: str, api_key: str) -> Optional[str]:
    """Calls Gemini 1.5 Flash API via REST HTTP request."""
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 400
            }
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
        
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            text = body["candidates"][0]["content"]["parts"][0]["text"]
            return text.strip()
    except Exception as e:
        print(f"[Gemini API Call Exception]: {e}")
        return None

def answer_chat(app_id: int, message: str, history: List[Dict[str, str]] = None) -> Dict[str, Any]:
    """
    Main Chatbot Handler:
    1. Fetches applicant DB record & runs engine dry-run if what-if parameters detected.
    2. Retrieves top 3 policy chunks via TF-IDF.
    3. Builds context and calls Gemini API if LLM_API_KEY exists.
    4. Otherwise returns deterministic template response.
    """
    app = execute_single("SELECT * FROM applications WHERE app_id = ?;", (app_id,))
    if not app:
        return {"reply": f"Application #{app_id} not found.", "sources": []}

    # Retrieve relevant policy chunks
    top_chunks = retrieve_top_chunks(message, top_k=3)
    chunk_summary = "\n".join([f"- {c['title']}: {c['content']}" for c in top_chunks])

    # Check for what-if intent tool call
    whatif_overrides = extract_whatif_intent(message)
    whatif_result = None
    if whatif_overrides:
        try:
            whatif_result = recompute(app_id, overrides=whatif_overrides, dry_run=True)
        except Exception as e:
            print(f"Whatif tool error: {e}")

    # Parse suggestions
    suggestions = []
    if app.get("suggestions_json"):
        try:
            suggestions = json.loads(app["suggestions_json"])
        except Exception:
            pass

    # Build Prompt context
    context = (
        f"Applicant Info:\n"
        f"- ID: #{app['app_id']} | Name: {app['name']}\n"
        f"- Loan Type: {app['loan_type']} | Amount: ₹{app['loan_amount']:,.0f} | Tenure: {app['tenure_months']} months\n"
        f"- Monthly Income: ₹{app['monthly_income']:,.0f} | Existing EMI: ₹{app['existing_emi']:,.0f}\n"
        f"- Current Status: {app.get('recommendation', 'Submitted')}\n"
        f"- Explanation: {app.get('explanation_text', '')}\n"
        f"- Gap to Approval: {app.get('gap_to_approval', '')}\n"
    )

    if whatif_result:
        context += (
            f"\nSIMULATED WHAT-IF NUMBERS (Calculated by Engine):\n"
            f"- Requested Loan: ₹{whatif_result['loan_amount']:,.0f}, Tenure: {whatif_result['tenure_months']}m\n"
            f"- Calculated Monthly EMI: ₹{whatif_result['emi_amount']:,.2f}\n"
            f"- Calculated EMI Ratio: {whatif_result['emi_ratio']*100:.1f}%\n"
            f"- Simulated Recommendation: {whatif_result['recommendation'].upper()}\n"
        )

    system_guardrails = (
        "GUARDRAILS & RULES:\n"
        "1. You are a helpful loan assistant for the applicant.\n"
        "2. You CANNOT change loan decisions or promise guaranteed approval.\n"
        "3. Always state clearly that the credit officer makes the final decision.\n"
        "4. NEVER invent math calculations; use the exact figures provided in context.\n"
        "5. Stay strictly focused on loan screening, eligibility, and policy.\n"
    )

    full_prompt = (
        f"{system_guardrails}\n"
        f"POLICY DOCUMENT CONTEXT:\n{chunk_summary}\n\n"
        f"APPLICANT CONTEXT:\n{context}\n\n"
        f"USER QUESTION: {message}\n\n"
        f"Provide a helpful, polite, and concise answer based ONLY on the policy context and engine numbers:"
    )

    api_key = os.environ.get("LLM_API_KEY")
    reply = None

    if api_key:
        reply = call_gemini_api(full_prompt, api_key)

    # Fallback to Template Answer if no API Key or LLM call failed
    if not reply:
        top_policy = top_chunks[0] if top_chunks else None
        
        if whatif_result:
            reply = (
                f"Based on your simulated numbers: Taking a ₹{whatif_result['loan_amount']:,.0f} loan over {whatif_result['tenure_months']} months "
                f"results in a monthly EMI of ₹{whatif_result['emi_amount']:,.0f} (EMI Ratio: {whatif_result['emi_ratio']*100:.1f}%). "
                f"This yields a simulated outcome of [{whatif_result['recommendation'].upper()}]. "
                f"Please note that the credit officer makes the final decision on all applications."
            )
        elif "reject" in message.lower() or "why" in message.lower():
            reply = (
                f"Your application status is currently [{app.get('recommendation', 'Under Review').upper()}]. "
                f"Reason: {app.get('explanation_text', 'Evaluating eligibility norms.')} "
                f"Guidance: {app.get('gap_to_approval', 'Contact support for terms update.')} "
                f"Please note that the credit officer makes the final decision."
            )
        elif top_policy:
            reply = (
                f"According to policy '{top_policy['title']}': {top_policy['content']} "
                f"For your application #{app['app_id']} ({app['loan_type']}), your current status is [{app.get('recommendation', 'Submitted')}]. "
                f"Note: The credit officer makes the final decision."
            )
        else:
            reply = (
                f"For application #{app['app_id']}, your current decision status is [{app.get('recommendation', 'Submitted')}]. "
                f"Explanation: {app.get('explanation_text', '')}. "
                f"The credit officer makes the final decision."
            )

    return {
        "reply": reply,
        "sources": [c["title"] for c in top_chunks],
        "whatif_result": whatif_result
    }
