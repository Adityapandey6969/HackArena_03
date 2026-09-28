import asyncio
import httpx
from backend.main import app, seed_database
from backend.database import Base, engine

async def run_tests():
    Base.metadata.create_all(bind=engine)
    seed_database()

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        # 1. Send OTP
        res1 = await client.post("/api/auth/send-otp", json={"phone": "9876543210"})
        assert res1.status_code == 200, res1.text
        data1 = res1.json()
        otp = data1["otp_code"]
        print("[PASS] Send OTP:", otp)

        # 2. Reject Invalid OTP
        res2 = await client.post("/api/auth/verify-otp", json={"phone": "9876543210", "otp_code": "000000"})
        assert res2.status_code == 400, res2.text
        print("[PASS] Invalid OTP rejected")

        # 3. Accept Valid OTP
        res3 = await client.post("/api/auth/verify-otp", json={"phone": "9876543210", "otp_code": otp})
        assert res3.status_code == 200, res3.text
        print("[PASS] Valid OTP accepted")

        # 4. Form validation rejection (Pydantic)
        bad_app = {
            "name": "A",
            "phone": "9876543210",
            "age": 16,
            "employment_type": "Student",
            "monthly_income": 0,
            "loan_type": "Personal Loan",
            "loan_amount": -1000,
            "tenure_months": 0,
            "existing_emi": -500,
            "credit_score": 200,
            "confirmed": False,
        }
        res_bad = await client.post("/api/applications", json=bad_app)
        assert res_bad.status_code == 422, "Should reject invalid fields"
        print("[PASS] Invalid fields rejected with 422")

        # 5. Missing confirmation checkbox rejected
        almost_good = {
            "name": "Rahul Sharma",
            "phone": "9876543210",
            "age": 30,
            "employment_type": "Salaried",
            "monthly_income": 80000,
            "loan_type": "Personal Loan",
            "loan_amount": 200000,
            "tenure_months": 24,
            "existing_emi": 5000,
            "credit_score": 750,
            "confirmed": False,
        }
        res_no_conf = await client.post("/api/applications", json=almost_good)
        assert res_no_conf.status_code == 422, "Unconfirmed application should fail"
        print("[PASS] Unconfirmed application rejected")

        # 6. Valid Application submission
        good_app = {
            "name": "Rahul Sharma",
            "phone": "9876543210",
            "age": 30,
            "employment_type": "Salaried",
            "monthly_income": 80000,
            "loan_type": "Personal Loan",
            "loan_amount": 200000,
            "tenure_months": 24,
            "existing_emi": 5000,
            "credit_score": 750,
            "confirmed": True,
        }
        res_good = await client.post("/api/applications", json=good_app)
        assert res_good.status_code == 201, res_good.text
        created = res_good.json()
        app_id = created["app_id"]
        print(f"[PASS] Application created: {app_id}, Rec: {created['recommendation']}, EMI: {created['emi_amount']}")

        # 7. Check that application appears in list
        res_list = await client.get("/api/applications")
        assert res_list.status_code == 200
        apps = res_list.json()
        assert any(a["app_id"] == app_id for a in apps)
        print(f"[PASS] Application appears in list (total: {len(apps)})")

        # 8. Test Manual Override
        res_ov = await client.post(f"/api/applications/{app_id}/override", json={"decision": "APPROVE", "notes": "Approved by senior officer"})
        assert res_ov.status_code == 200
        ov_data = res_ov.json()
        assert ov_data["officer_decision"] == "APPROVE"
        print("[PASS] Manual override persisted")

        # 9. Test Gap analysis
        res_gap = await client.get(f"/api/applications/{app_id}/gap-analysis")
        assert res_gap.status_code == 200
        print("[PASS] Gap analysis retrieved, solution:", res_gap.json()["found_solution"])

        # 10. Test Dashboard statistics
        res_stats = await client.get("/api/dashboard/stats")
        assert res_stats.status_code == 200
        stats = res_stats.json()
        print("[PASS] Dashboard stats retrieved:", stats)

        print("\nALL ACCEPTANCE CRITERIA BACKEND TESTS PASSED!")

if __name__ == "__main__":
    asyncio.run(run_tests())
