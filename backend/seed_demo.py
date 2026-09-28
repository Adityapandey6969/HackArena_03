import json
import datetime
from .database import SessionLocal, Base, engine
from .models import LoanProduct, Application, NotificationLog
from .services.eligibility import evaluate_eligibility
from .services.emi import calculate_emi, evaluate_recommendation
from .services.explanation import generate_explanation
from .services.gap_analysis import calculate_gap_to_approval
from .services.notifications import generate_submission_message, send_simulated_notification

def seed_demo_applications():
    db = SessionLocal()
    try:
        products = {p.loan_type: p for p in db.query(LoanProduct).all()}
        if not products:
            print("No loan products found.")
            return

        demo_applicants = [
            {
                "name": "Rahul Sharma",
                "phone": "9876543210",
                "age": 32,
                "employment_type": "Salaried",
                "monthly_income": 90000.0,
                "loan_type": "Personal Loan",
                "loan_amount": 250000.0,
                "tenure_months": 24,
                "existing_emi": 5000.0,
                "credit_score": 775,
                "confirmed": True,
            },
            {
                "name": "Priya Patel",
                "phone": "9812345678",
                "age": 28,
                "employment_type": "Salaried",
                "monthly_income": 45000.0,
                "loan_type": "Home Loan",
                "loan_amount": 1500000.0,
                "tenure_months": 240,
                "existing_emi": 4000.0,
                "credit_score": 670,
                "confirmed": True,
            },
            {
                "name": "Sneha Kulkarni",
                "phone": "9822334455",
                "age": 29,
                "employment_type": "Salaried",
                "monthly_income": 70000.0,
                "loan_type": "Personal Loan",
                "loan_amount": 550000.0,
                "tenure_months": 24,
                "existing_emi": 5000.0,
                "credit_score": 755,
                "confirmed": True,
            },
            {
                "name": "Vikram Singh",
                "phone": "9898989898",
                "age": 35,
                "employment_type": "Self-employed",
                "monthly_income": 60000.0,
                "loan_type": "Vehicle Loan",
                "loan_amount": 950000.0,
                "tenure_months": 36,
                "existing_emi": 15000.0,
                "credit_score": 740,
                "confirmed": True,
            },
            {
                "name": "Ananya Sen",
                "phone": "9700012345",
                "age": 24,
                "employment_type": "Salaried",
                "monthly_income": 35000.0,
                "loan_type": "Education Loan",
                "loan_amount": 600000.0,
                "tenure_months": 60,
                "existing_emi": 16000.0,
                "credit_score": 620,
                "confirmed": True,
            },
        ]

        for data in demo_applicants:
            existing = db.query(Application).filter(Application.name == data["name"]).first()
            if existing:
                continue

            last_app = db.query(Application).order_by(Application.id.desc()).first()
            next_num = 1001 if not last_app else (last_app.id + 1001)
            app_id = f"APP-{next_num}"

            product = products.get(data["loan_type"])
            if not product:
                continue

            el_status, rule_results = evaluate_eligibility(
                age=data["age"],
                monthly_income=data["monthly_income"],
                employment_type=data["employment_type"],
                existing_emi=data["existing_emi"],
                loan_product=product,
            )

            emi_val = calculate_emi(data["loan_amount"], product.interest_rate, data["tenure_months"])
            rec_res = evaluate_recommendation(
                emi_amount=emi_val,
                existing_emi=data["existing_emi"],
                monthly_income=data["monthly_income"],
                credit_score=data["credit_score"],
                eligibility_status=el_status,
            )

            explanation = generate_explanation(
                name=data["name"],
                monthly_income=data["monthly_income"],
                credit_score=data["credit_score"],
                emi_amount=emi_val,
                existing_emi=data["existing_emi"],
                emi_ratio=rec_res["emi_ratio"],
                rule_results=rule_results,
                recommendation=rec_res["recommendation"],
                loan_type=data["loan_type"],
                loan_amount=data["loan_amount"],
            )

            gap_res = calculate_gap_to_approval(
                loan_amount=data["loan_amount"],
                tenure_months=data["tenure_months"],
                existing_emi=data["existing_emi"],
                monthly_income=data["monthly_income"],
                credit_score=data["credit_score"],
                age=data["age"],
                employment_type=data["employment_type"],
                loan_product=product,
                current_recommendation=rec_res["recommendation"],
            )

            notif_msg = generate_submission_message(app_id, data["name"])

            new_record = Application(
                app_id=app_id,
                name=data["name"],
                phone=data["phone"],
                age=data["age"],
                employment_type=data["employment_type"],
                monthly_income=data["monthly_income"],
                loan_type=data["loan_type"],
                loan_amount=data["loan_amount"],
                tenure_months=data["tenure_months"],
                existing_emi=data["existing_emi"],
                credit_score=data["credit_score"],
                eligibility_status=el_status,
                eligibility_reasons=json.dumps(rule_results),
                emi_amount=emi_val,
                emi_ratio=rec_res["emi_ratio"],
                recommendation=rec_res["recommendation"],
                explanation_text=explanation,
                priority_rank=rec_res["priority_rank"],
                last_notified_status=notif_msg,
                gap_to_approval=json.dumps(gap_res),
            )
            db.add(new_record)
            db.commit()
            db.refresh(new_record)

            send_simulated_notification(db, app_id, data["phone"], notif_msg)
            print(f"Seeded demo app: {app_id} ({data['name']}) -> {rec_res['recommendation']}")

    except Exception as e:
        print(f"Error seeding demo apps: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_applications()
