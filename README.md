# Feature 5: Loan Decision & Guidance Engine

An end-to-end working, demo-ready **Loan Decision & Guidance Engine** for loan application pre-screening. Built as part of a 6-hour hackathon.

---

## 🌟 Key Features

1. **Single Source of Truth (`applications` Table)**:
   - Uses SQLite (`loans.db`) via FastAPI layer. Every feature reads and writes through the same shared engine pathway (`engine.recompute`).

2. **Deterministic Mathematical Engine (`engine.py`)**:
   - Reducing balance EMI calculation: \( EMI = P \cdot r \cdot (1+r)^n / ((1+r)^n - 1) \)
   - Inverse max loan calculation: \( P = EMI \cdot ((1+r)^n - 1) / (r \cdot (1+r)^n) \)
   - F2 Eligibility rules & F3 Recommendation logic
   - Explainability generator (`explain()`)
   - Counterfactual term suggestions (`suggest()`)
   - Grid-search term optimizer (`gap_to_approval()`)
   - Urgent officer queue priority scorer (`recompute_priority_ranks()`)

3. **Module B: Officer Command Center**:
   - Priority-ranked queue table (Review & Recoverable Rejects prioritized at top)
   - Real-time case panel with eligibility checklist
   - Live interactive What-If sliders (amount, tenure, product type) with instant debounced calculations
   - One-click **"Apply these terms"** button that updates database, status history, notifications, and priority order
   - Automated applicant SMS/WhatsApp draft generator & outbox viewer

4. **Module A: Applicant Portal (`/track`)**:
   - Application lookup by ID with visual timeline tracker (`status_history`)
   - 2-Column "How to Improve" card (Fixable vs Hard Policy Constraints)
   - Highlighted **Gap to Approval** banner
   - RAG Chatbot powered by scikit-learn TF-IDF policy document retrieval + Gemini LLM (with template fallback)
   - Mobile Notification inbox

5. **Notification Engine (`notifier.py`)**:
   - Twilio WhatsApp Sandbox integration when `TWILIO_*` credentials exist
   - Graceful fallback to `MOCK` mode recording all messages in `notifications` DB table

---

## 🛠️ Environment Variables (.env)

Create a `.env` file in the root directory (optional, fallbacks exist for all):

```env
# Optional LLM API Key (if omitted, Chatbot falls back to template answers)
LLM_API_KEY="your-gemini-api-key-here"
LLM_PROVIDER="gemini"

# Optional Twilio Credentials (if omitted, Notifier runs in MOCK mode)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_FROM_NUMBER="whatsapp:+14155238886"
TWILIO_TO_NUMBER="whatsapp:+919999999999"
```

---

## 🚀 Quick Run Steps

### Step 1: Install Python Dependencies
```bash
pip install fastapi uvicorn scikit-learn
```

### Step 2: Run Database Migration & Seed (~100 applications + 5 loan products)
```bash
python migrate_and_seed.py
```

### Step 3: Run Engine Selftest (Verifies 5 Benchmark Applications)
```bash
python -m engine_selftest
```

### Step 4: Build Frontend Assets
```bash
cd frontend
npm install
npm run build
cd ..
```

### Step 5: Start Unified Server
```bash
python main.py
```
Open your browser at: **[http://localhost:8000](http://localhost:8000)**

*(Alternatively, for frontend dev mode with hot reload, run `npm run dev` in the `frontend` folder while `python main.py` is running).*

---

## 🎬 30-Second Demo Script

1. **Officer Command Center (Priority Queue & What-If)**:
   - Open `http://localhost:8000` (defaults to **Officer Center**).
   - Point out the **Stats Bar** showing count by status and ₹ value in Review/Recoverable Rejects.
   - Click on application **#104** (Borderline EMI Applicant). Notice the recommendation is `REJECT` and gap to approval is `"Best achievable: Review"`.
   - In the right-side Case Panel, drag the **Loan Amount** slider down to ₹3,000,000 and **Tenure** slider to 48 months.
   - Notice the live simulated outcome updates to `REVIEW` with EMI ratio 31.8%.
   - Click **"Apply these terms"**. The table row, stats bar, status history, and priority rank instantly update!

2. **Applicant Portal & RAG Chatbot**:
   - Switch tab to **Applicant Portal (Module A)** and look up Application **#104**.
   - Show the visual progress timeline (`Submitted` → `Screened` → `Review`), highlighted **Gap to Approval** banner, and 2-column **How to Improve** card.
   - In the RAG Chatbot, type: *"What if I take ₹4 Lakhs loan for 36 months?"*
   - Show the chatbot response quoting exact engine calculated numbers and TF-IDF policy document citations.

3. **F1 New Application Submission**:
   - Switch tab to **Submit App (F1 Stub)**.
   - Fill in candidate details and click **Submit & Compute Recommendation**.
   - Show how the decision engine computes EMI, ratio, and recommendation in <50ms and assigns a priority rank.

---

## 📂 Codebase File Structure

```
niceHackathon/
├── config.py                 # Central business rules, thresholds, & tier weights
├── db.py                     # SQLite connection & query helpers (loans.db)
├── migrate_and_seed.py       # Idempotent DB table creation & ~100 apps seed data
├── engine.py                 # Core F5 decision engine (recompute single write pathway)
├── engine_selftest.py        # Selftest benchmark runner for 5 sample profiles
├── notifier.py               # WhatsApp Twilio API integration with MOCK fallback
├── policy_docs.json          # 15 policy knowledge base chunks
├── rag_chat.py               # TF-IDF retrieval + Gemini LLM wrapper + What-If tool
├── main.py                   # FastAPI app with REST endpoints & frontend static mounting
└── frontend/                 # React + Tailwind CSS Web Application
    ├── src/
    │   ├── App.jsx           # Main Dashboard container & tab navigation
    │   ├── components/
    │   │   ├── OfficerCenter.jsx     # Module B Officer Queue & Case Panel
    │   │   ├── ApplicantTracker.jsx  # Module A Applicant Portal & Improvement Card
    │   │   ├── Chatbot.jsx           # RAG Chatbot UI widget
    │   │   ├── OutboxTab.jsx         # Outbox & Notification history view
    │   │   └── SubmitForm.jsx        # F1 Submission form stub
    │   └── index.css         # Tailwind base styling
    └── vite.config.js        # Vite build & API proxy configuration
```

---

## 📌 Summary of Features & Stubs

- **Core Engine (`engine.py`)**: Completely implemented end-to-end.
- **F2 Eligibility & F3 Recommendation**: Implemented as production stubs ready for direct swap-in.
- **F1 Application Form**: Implemented as interactive React form stub pointing to `/api/f1/applications`.
- **F4 Officer Queue**: Wrapped and extended in Module B Officer Command Center.
