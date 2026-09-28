import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base, SessionLocal
from .models import LoanProduct, Application
from .routers import auth, applications, dashboard

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("loanease")


def seed_database():
    """Seeds the initial loan products if the table is empty."""
    db = SessionLocal()
    try:
        existing = db.query(LoanProduct).first()
        if not existing:
            default_products = [
                LoanProduct(
                    loan_type="Personal Loan",
                    interest_rate=11.5,
                    min_income=25000.0,
                    max_tenure_months=60,
                ),
                LoanProduct(
                    loan_type="Home Loan",
                    interest_rate=8.5,
                    min_income=35000.0,
                    max_tenure_months=360,
                ),
                LoanProduct(
                    loan_type="Education Loan",
                    interest_rate=9.0,
                    min_income=20000.0,
                    max_tenure_months=120,
                ),
                LoanProduct(
                    loan_type="Vehicle Loan",
                    interest_rate=9.5,
                    min_income=25000.0,
                    max_tenure_months=84,
                ),
            ]
            db.add_all(default_products)
            db.commit()
            logger.info("Loan products successfully seeded.")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield


app = FastAPI(
    title="LoanEase – Loan Application Pre-Screening System API",
    description="Automated pre-screening, rule evaluation, reducing-balance EMI calculations, smart explanations, and gap-to-approval engine.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(applications.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {
        "service": "LoanEase Pre-Screening System API",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs",
    }


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
