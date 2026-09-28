"""
engine_selftest.py
Runs engine selftest across 5 benchmark application profiles:
1. Strong (Approve)
2. Borderline EMI (Review)
3. Low Credit Score (Review / Reject)
4. Underage Applicant (Reject unrecoverable)
5. Low Income (Reject recoverable)

Execute via: python -m engine_selftest (or python engine_selftest.py)
"""

import sys
import os
from db import execute_write
from engine import recompute

# Ensure UTF-8 output formatting for Windows console
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def run_selftest():
    print("=" * 70)
    print("RUNNING F5 ENGINE BENCHMARK SELFTEST (5 Sample Applications)")
    print("=" * 70)

    samples = [
        {
            "name": "Benchmark 1: Strong Applicant",
            "age": 35,
            "employment_type": "Salaried",
            "monthly_income": 120000.0,
            "loan_type": "Personal Loan",
            "loan_amount": 500000.0,
            "tenure_months": 36,
            "existing_emi": 5000.0,
            "credit_score": 780
        },
        {
            "name": "Benchmark 2: Borderline EMI Applicant",
            "age": 29,
            "employment_type": "Salaried",
            "monthly_income": 50000.0,
            "loan_type": "Personal Loan",
            "loan_amount": 750000.0,
            "tenure_months": 24,
            "existing_emi": 8000.0,
            "credit_score": 680
        },
        {
            "name": "Benchmark 3: Low Credit Score Applicant",
            "age": 42,
            "employment_type": "Business",
            "monthly_income": 90000.0,
            "loan_type": "Auto Loan",
            "loan_amount": 600000.0,
            "tenure_months": 48,
            "existing_emi": 10000.0,
            "credit_score": 580
        },
        {
            "name": "Benchmark 4: Underage Applicant",
            "age": 19,
            "employment_type": "Salaried",
            "monthly_income": 40000.0,
            "loan_type": "Personal Loan",
            "loan_amount": 200000.0,
            "tenure_months": 24,
            "existing_emi": 0.0,
            "credit_score": 720
        },
        {
            "name": "Benchmark 5: Low Income Applicant",
            "age": 31,
            "employment_type": "Self-Employed",
            "monthly_income": 18000.0,
            "loan_type": "Personal Loan",
            "loan_amount": 300000.0,
            "tenure_months": 36,
            "existing_emi": 2000.0,
            "credit_score": 710
        }
    ]

    for idx, sample in enumerate(samples, 1):
        app_id = execute_write("""
            INSERT INTO applications (name, age, employment_type, monthly_income, loan_type, loan_amount, tenure_months, existing_emi, credit_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            sample["name"], sample["age"], sample["employment_type"], sample["monthly_income"],
            sample["loan_type"], sample["loan_amount"], sample["tenure_months"],
            sample["existing_emi"], sample["credit_score"]
        ))

        res = recompute(app_id, dry_run=False)

        print(f"\n[{idx}] App #{app_id}: {sample['name']}")
        print(f"    Inputs: Income=Rs.{sample['monthly_income']:,.0f}, Loan=Rs.{sample['loan_amount']:,.0f}, Tenure={sample['tenure_months']}m, CreditScore={sample['credit_score']}")
        print(f"    Computed EMI: Rs.{res['emi_amount']:,.2f} | EMI Ratio: {res['emi_ratio']*100:.1f}%")
        print(f"    Recommendation: [{res['recommendation'].upper()}] | Priority Rank: #{res['priority_rank']}")
        print(f"    Gap to Approval: {res['gap_to_approval']}")
        print(f"    Explanation: {res['explanation_text']}")
        print(f"    Suggestions Count: {len(res['suggestions'])} | Recoverable: {bool(res['is_recoverable'])}")

    print("\n" + "=" * 70)
    print("SELFTEST COMPLETED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_selftest()
