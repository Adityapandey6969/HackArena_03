import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import PhoneAuthPage from './pages/PhoneAuthPage';
import OTPVerifyPage from './pages/OTPVerifyPage';
import WelcomePage from './pages/WelcomePage';
import ApplicantApplicationsPage from './pages/ApplicantApplicationsPage';
import LoanApplicationPage from './pages/LoanApplicationPage';
import ApplicationSuccessPage from './pages/ApplicationSuccessPage';

function ApplicantFlow({ verifiedPhone, setVerifiedPhone }) {
  // Stages in applicant flow:
  // 'PHONE' -> 'OTP' -> 'WELCOME' -> 'LOGIN' (Saved Submissions) | 'NEW_APP' -> 'SUCCESS'
  const [stage, setStage] = useState(verifiedPhone ? 'WELCOME' : 'PHONE');
  const [devOtp, setDevOtp] = useState('');
  const [smsInfo, setSmsInfo] = useState(null);
  const [currentApp, setCurrentApp] = useState(null);

  // Stage 1: Phone entered, OTP sent
  const handleOtpSent = (phoneNum, otpCode, resData) => {
    setVerifiedPhone(phoneNum);
    setDevOtp(otpCode);
    setSmsInfo(resData || null);
    setStage('OTP');
  };

  // Stage 2: OTP verified
  const handleOtpVerified = () => {
    setStage('WELCOME');
  };

  // Stage 3: Welcome choices
  const handleChooseLogin = () => {
    setStage('LOGIN');
  };

  const handleChooseNewRegistration = () => {
    setStage('NEW_APP');
  };

  // Stage 4: Form submission (submit only, no applicant screening shown)
  const handleApplicationSubmitted = (savedApp) => {
    setCurrentApp(savedApp);
    setStage('SUCCESS');
  };

  // 4-step progress stepper
  const getStepProgress = () => {
    if (stage === 'PHONE') return 1;
    if (stage === 'OTP') return 2;
    if (stage === 'WELCOME' || stage === 'LOGIN') return 3;
    return 4; // 'NEW_APP' or 'SUCCESS'
  };

  const currentStep = getStepProgress();

  return (
    <div>
      {/* 4-Step Visual Stepper */}
      <div className="stepper">
        <div className={`step-item ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}>
          <div className="step-circle">{currentStep > 1 ? '✓' : '1'}</div>
          <span className="step-label">Mobile Auth</span>
        </div>
        <div className={`step-line ${currentStep > 1 ? 'completed' : ''}`} />

        <div className={`step-item ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}>
          <div className="step-circle">{currentStep > 2 ? '✓' : '2'}</div>
          <span className="step-label">OTP Verification</span>
        </div>
        <div className={`step-line ${currentStep > 2 ? 'completed' : ''}`} />

        <div className={`step-item ${currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : ''}`}>
          <div className="step-circle">{currentStep > 3 ? '✓' : '3'}</div>
          <span className="step-label">Welcome</span>
        </div>
        <div className={`step-line ${currentStep > 3 ? 'completed' : ''}`} />

        <div className={`step-item ${currentStep === 4 ? (stage === 'SUCCESS' ? 'completed' : 'active') : ''}`}>
          <div className="step-circle">{stage === 'SUCCESS' ? '✓' : '4'}</div>
          <span className="step-label">{stage === 'SUCCESS' ? 'Application Submitted' : 'Loan Application'}</span>
        </div>
      </div>

      {/* Dynamic Stage Render */}
      {stage === 'PHONE' && (
        <PhoneAuthPage onOtpSent={handleOtpSent} />
      )}

      {stage === 'OTP' && (
        <OTPVerifyPage
          phone={verifiedPhone}
          devOtp={devOtp}
          smsInfo={smsInfo}
          onVerified={handleOtpVerified}
          onChangePhone={() => setStage('PHONE')}
        />
      )}

      {stage === 'WELCOME' && (
        <WelcomePage
          verifiedPhone={verifiedPhone}
          onChooseLogin={handleChooseLogin}
          onChooseNewRegistration={handleChooseNewRegistration}
        />
      )}

      {stage === 'LOGIN' && (
        <ApplicantApplicationsPage
          verifiedPhone={verifiedPhone}
          onBackToWelcome={() => setStage('WELCOME')}
          onStartNewApplication={() => setStage('NEW_APP')}
        />
      )}

      {stage === 'NEW_APP' && (
        <LoanApplicationPage
          verifiedPhone={verifiedPhone}
          onBack={() => setStage('WELCOME')}
          onSubmitSuccess={handleApplicationSubmitted}
        />
      )}

      {stage === 'SUCCESS' && (
        <ApplicationSuccessPage
          application={currentApp}
          onGoToDashboard={() => setStage('LOGIN')}
          onApplyAnother={() => setStage('NEW_APP')}
        />
      )}
    </div>
  );
}

export default function App() {
  const [verifiedPhone, setVerifiedPhone] = useState('');

  const handleLogout = () => {
    setVerifiedPhone('');
    window.location.href = '/';
  };

  return (
    <BrowserRouter>
      <div className="app-container">
        <Navbar verifiedPhone={verifiedPhone} onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route
              path="*"
              element={
                <ApplicantFlow
                  verifiedPhone={verifiedPhone}
                  setVerifiedPhone={setVerifiedPhone}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
