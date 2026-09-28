# LoanEase – Loan Application Pre-Screening System

LoanEase is an automated, full-stack pre-screening web application built for loan officers and loan applicants. It streamlines loan origination by collecting applicant information, enforcing bank-grade validation, calculating reducing-balance EMI and debt burden ratios, evaluating four distinct eligibility rules, and providing intelligent underwriting insights including plain-language explanations, priority queuing, and a gap-to-approval calculator.

---

## Architecture & Technology Stack

- **Frontend**: React 18, Vite, JavaScript, React Router 6, Lucide React Icons, Custom Financial UI Styling
- **Backend**: Python FastAPI, Pydantic v2 schemas, RESTful architecture, CORS enabled
- **Database**: SQLite with SQLAlchemy ORM (shared `loanease.db` across all modules)
- **AI & Rule Intelligence**:
  - Rule-based eligibility engine (Age 21–60, Minimum Income, Employment Type, Existing EMI ceiling)
  - Reducing-balance monthly EMI calculation: $EMI = \frac{P \cdot r \cdot (1+r)^n}{(1+r)^n - 1}$
  - Risk recommendation engine (`APPROVE`, `REVIEW`, `REJECT`)
  - Plain-language underwriting explanation generator (`explain()`)
  - Gap-to-Approval calculator testing amount reductions (10%, 20%, 30%) and tenure extensions (+12m, +24m, +36m)
  - Simulated notification service with DB audit log

---

## Project Structure

```
Loan Application Form/
├── backend/
│   ├── main.py                     # FastAPI entrypoint, lifespan seeding & CORS
│   ├── database.py                 # SQLite connection & sessionmaker
│   ├── models.py                   # SQLAlchemy models (Applications, Products, Logs, OTP)
│   ├── schemas.py                  # Pydantic v2 request/response schemas
│   ├── seed_demo.py                # Demo seeder for hackathon presentation
│   ├── test_backend.py             # Acceptance test suite (17 checks)
│   ├── routers/
│   │   ├── auth.py                 # OTP generation, verification & applicant lookup
│   │   ├── applications.py         # Application submission, query, override & gap analysis
│   │   └── dashboard.py            # Loan officer statistics & workload metrics
│   └── services/
│       ├── eligibility.py          # 4-point eligibility engine
│       ├── emi.py                  # Reducing-balance EMI & risk evaluation
│       ├── explanation.py          # Plain-language explanation generator
│       ├── gap_analysis.py         # Gap-to-Approval calculator
│       └── notifications.py        # Simulated SMS notification service
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js           # Centralized API service
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Header navigation & portal/officer switcher
│   │   │   ├── Badge.jsx           # Status & recommendation badges
│   │   │   └── NotificationBanner.jsx # Simulated SMS/Notification feed
│   │   ├── pages/
│   │   │   ├── PhoneAuthPage.jsx   # 10-digit Indian phone verification
│   │   │   ├── OTPVerifyPage.jsx   # 6-digit OTP verification & countdown
│   │   │   ├── WelcomePage.jsx     # Welcome screen with Login & New Registration
│   │   │   ├── ApplicantApplicationsPage.jsx # Applicant portal for saved applications
│   │   │   ├── LoanApplicationPage.jsx # Complete 4-section banking application form
│   │   │   ├── ApplicationSuccessPage.jsx # Submission confirmation screen
│   │   │   ├── ApplicantStatusPage.jsx # Pre-screening report & rule breakdown
│   │   │   └── OfficerDashboardPage.jsx # Loan officer command center & override
│   │   ├── App.jsx                 # Routing & applicant stepper journey
│   │   ├── App.css                 # Financial dashboard design system
│   │   └── index.css               # Design tokens, typography & base styling
│   ├── package.json
│   └── vite.config.js              # Dev server & API proxy config
└── README.md
```

---

## Quick Start Instructions

### Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Node.js 18+ (tested on Node v20)

---

### Step 1: Start the FastAPI Backend

Open a terminal in the project root:

```powershell
# 1. (Optional) Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Seed demo applications for hackathon showcase (optional but recommended)
python -m backend.seed_demo

# 4. Start the FastAPI server on port 8000
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend API will be live at:
- API Base: `http://127.0.0.1:8000`
- Interactive Swagger Documentation: `http://127.0.0.1:8000/docs`

---

### Step 2: Start the React Frontend

Open a second terminal window in the project root:

```powershell
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies (if not already done)
npm install

# 3. Launch Vite development server
npm run dev
```

The frontend will start at:
- **Local Application URL**: `http://localhost:5173`

---

## Step-by-Step Demo Guide (For Hackathon Judges)

### 1. Test Phone Number Authentication
1. Open `http://localhost:5173` in your browser.
2. Enter an invalid phone number (e.g. `12345` or letters) -> Observe instant validation error.
3. Enter a valid 10-digit Indian phone number: `9876543210` and click **Send OTP**.
4. The system automatically displays the generated 6-digit dev OTP in a blue banner (e.g. `953052`).
5. Master fallback OTP `123456` is also accepted.
6. Try typing an incorrect OTP (e.g. `000000`) -> Observe rejection error.
7. Click **Auto-Fill OTP** (or enter the generated code) and click **Verify OTP & Continue**.

### 2. Welcome Page & Applicant Journey
1. The **Welcome to LoanEase** page displays the verified phone badge.
2. It presents exactly two options:
   - **Login**: View applications previously submitted under this phone number.
   - **New Registration**: Open the complete 4-section Loan Application Form.

### 3. Submitting a New Loan Application
1. Click **New Registration**.
2. Notice that the verified mobile number (`+91 9876543210`) is **automatically populated and read-only**.
3. Fill in the form:
   - **Full Name**: Rahul Sharma
   - **Age**: 32 (Try entering 16 -> Observe validation rejection)
   - **Employment Type**: Salaried
   - **Monthly Income**: ₹85,000
   - **Existing Monthly EMI**: ₹5,000 (or 0)
   - **Credit Score**: 760 (Range: 300 to 900)
   - **Loan Type**: Personal Loan (11.5% p.a.)
   - **Loan Amount**: ₹2,50,000
   - **Loan Tenure**: 24 months
4. Notice the **Live Reducing Balance EMI Calculator** dynamically computing the monthly installment (`₹11,712/month`).
5. Select the mandatory confirmation checkbox: *"I confirm that the information provided above is accurate and complete."*
6. Click **Submit Loan Application**.
7. The system saves the application to SQLite, assigns an application ID (e.g. `APP-1006`), displays a confirmation screen, and logs a simulated SMS notification.

### 4. Exploring Pre-Screening Status
1. Click **View Pre-Screening Status & Details**.
2. Review:
   - **Automated Screening Badge**: `APPROVE`
   - **Plain-language Underwriting Explanation**: Formulated with actual applicant income, credit score, and debt ratio.
   - **Key Metrics**: Reducing EMI, Total Debt Ratio (EMI Ratio), Credit Score.
   - **4 Eligibility Checks**: Age (21–60), Minimum Income, Employment Type, Existing EMI policy cap.
   - **Simulated Notification Feed**: Displays time-stamped status messages dispatched to the applicant.

### 5. Loan Officer Command Center (`/officer`)
1. Click **Loan Officer Dashboard** in the top navigation bar (or navigate to `http://localhost:5173/officer`).
2. **Workload & Summary KPI Cards**:
   - Total Applications
   - Pending Decision count
   - Queue Priority (Awaiting Review)
   - Automated Approval & Rejection counts
   - Average Decision Time in minutes
3. **Priority Queuing**:
   - Applications are automatically prioritized: `Priority 1 (REVIEW)` $\rightarrow$ `Priority 2 (REJECT)` $\rightarrow$ `Priority 3 (APPROVE)`.
4. **Search & Filter**:
   - Search by applicant name or Application ID.
   - Filter by recommendation (`Approve`, `Review`, `Reject`) and loan product type.
5. **Dossier Detail & Smart Command Center**:
   - Click **View** on any application to open the complete applicant dossier.
   - View the automated explanation and 4-point rule outcomes.
6. **Feature 5.1 — Gap-to-Approval Calculator**:
   - Inspect application `APP-1005` (Sneha Kulkarni) or any borderline application.
   - The engine tests amount reductions (10%, 20%, 30%) and tenure extensions (+12m, +24m, +36m).
   - Identifies the smallest adjustment: e.g., *"By adjusting tenure to 36 months, EMI lowers to ₹18,137 bringing debt ratio to 33.1%, which satisfies automated approval criteria."*
7. **Officer Manual Override**:
   - Click **Override** on any application row or within the detail modal.
   - Select the final decision (`APPROVE`, `REVIEW`, or `REJECT`) and enter underwriter notes.
   - Click **Save Decision & Notify Applicant**.
   - Notice that the officer's decision persists in SQLite without overwriting the automated preliminary recommendation.
   - Refresh the page to verify that the override status persists.

---

## Automated Acceptance Testing Suite

Run the included automated verification script to validate all 17 requirements:

```powershell
python -m backend.test_backend
```

Tests performed:
- `TEST 1`: Phone number validation and format rejection
- `TEST 2`: Rejecting invalid OTPs
- `TEST 3`: Accepting valid mock/master OTPs
- `TEST 4`: Form validation and Pydantic 422 constraints
- `TEST 5`: Rejection of unconfirmed applications
- `TEST 6`: Creation of valid application and reducing EMI computation
- `TEST 7`: Persistence in SQLite and listing in dashboard
- `TEST 8`: Officer manual override persistence
- `TEST 9`: Gap-to-approval scenarios execution
- `TEST 10`: Dashboard workload metrics computation

---

## Configurable Loan Products

Loan products and interest rates are stored in the SQLite `loan_products` table (no hardcoding in code):

| Loan Product | Annual Interest Rate | Min Monthly Income | Max Allowable Tenure |
| :--- | :--- | :--- | :--- |
| **Personal Loan** | 11.5% p.a. | ₹25,000 | 60 months |
| **Home Loan** | 8.5% p.a. | ₹35,000 | 360 months |
| **Education Loan** | 9.0% p.a. | ₹20,000 | 120 months |
| **Vehicle Loan** | 9.5% p.a. | ₹25,000 | 84 months |

---

## Licensing & Hackathon Deliverable
Built for the 6-hour hackathon. Clean, modular, beginner-friendly architecture ready for immediate local evaluation.
