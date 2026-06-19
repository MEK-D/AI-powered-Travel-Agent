import { useState, useEffect } from 'react';
import './Auth.css';

const slides = [
  {
    image: '/destination1.png',
    title: 'The Maldives Escapes',
    description: 'Breathe in the tropical sea breeze and discover the turquoise waters, pristine coral reefs, and premium overwater bungalows.'
  },
  {
    image: '/destination2.png',
    title: 'Romantic Sunsets in Paris',
    description: 'Immerse yourself in history, fine dining, and beautiful golden hour street views of the Eiffel Tower.'
  },
  {
    image: '/destination3.png',
    title: 'Serenity of Dal Lake',
    description: 'Float alongside the snow-capped Himalayas in Srinagar on a traditional decorated Shikara boat.'
  }
];

const readResponse = async (res) => {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await res.json();
  }
  const text = await res.text();
  if (text.includes('<!DOCTYPE') || text.includes('<!doctype') || text.includes('<html')) {
    throw new Error('Unexpected HTML response. Is the Express auth gateway running on port 5000?');
  }
  throw new Error(text || `Request failed with status ${res.status}`);
};

export default function Auth({ onLoginSuccess }) {
  const [mode, setMode] = useState('home'); // home | login | signup | verify_signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Slideshow State
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Resend OTP Timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await readResponse(res);
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      
      setMessage(data.message || 'Verification OTP sent to your email');
      setMode('verify_signup');
      setResendTimer(30);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignup = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      return setError('OTP must be 6 digits');
    }
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await readResponse(res);
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      
      onLoginSuccess(data.user, data.accessToken, data.refreshToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await readResponse(res);
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      onLoginSuccess(data.user, data.accessToken, data.refreshToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await readResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to resend OTP');
      
      setMessage('A new OTP has been sent successfully');
      setResendTimer(30);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-container mode-${mode.includes('signup') ? 'signup' : 'login'}`}>
      {/* Form Side */}
      <div className="auth-form-side">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo-wrapper">
              <img src="/travelease_logo.png" alt="TravelEase Logo" className="auth-logo-img" />
              <h1 className="auth-logo">TravelEase</h1>
            </div>
            <p className="auth-subtitle">
              {mode === 'home' && 'Your Premium AI-Powered Travel Agent'}
              {mode === 'login' && 'Log in to orchestrate your next trip'}
              {mode === 'signup' && 'Create your account to start planning'}
              {mode === 'verify_signup' && 'Verify registration OTP'}
            </p>
          </div>

          {error && <div className="auth-alert error"><span>⚠️</span> {error}</div>}
          {message && <div className="auth-alert success"><span>✅</span> {message}</div>}

          <div key={mode} className="auth-form-transition">
            {/* Home/Welcome View */}
            {mode === 'home' && (
              <div className="auth-home-view">
                <p className="auth-home-tagline">
                  Experience seamless journey orchestration with our advanced 5-Phase Multi-Agent AI system.
                </p>
                <div className="auth-home-features">
                  <div className="feature-item">
                    <span className="feature-icon">♟️</span>
                    <div className="feature-text">
                      <h4>Master Orchestrator</h4>
                      <p>Intelligent routing of travel constraints & budget guidelines.</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🛩️</span>
                    <div className="feature-text">
                      <h4>Flights & Basecamps</h4>
                      <p>Consolidated booking shortlists with active flight/hotel nodes.</p>
                    </div>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🗺️</span>
                    <div className="feature-text">
                      <h4>Dynamic Itineraries</h4>
                      <p>Day-by-day sightseeing planning with live weather updates.</p>
                    </div>
                  </div>
                </div>
                <div className="auth-home-actions">
                  <button onClick={() => { setMode('login'); setError(''); setMessage(''); }} className="auth-button">
                    Sign In to Dashboard 🚀
                  </button>
                  <button onClick={() => { setMode('signup'); setError(''); setMessage(''); }} className="auth-button secondary-btn">
                    Create New Account ✨
                  </button>
                </div>
              </div>
            )}

            {/* Login Form */}
            {mode === 'login' && (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-wrapper">
                    <span className="input-icon">📧</span>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="name@domain.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon">🔒</span>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Enter password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="auth-button" disabled={loading}>
                  {loading ? 'Logging In...' : 'Log In 🚀'}
                </button>
                <div className="auth-toggle-link">
                  Don't have an account? 
                  <span onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>Sign Up</span>
                  <div style={{ marginTop: 12 }}>
                    <span style={{ color: '#6B8E23', fontSize: '0.82rem', textDecoration: 'underline' }} onClick={() => { setMode('home'); setError(''); setMessage(''); }}>← Back to Home</span>
                  </div>
                </div>
              </form>
            )}

            {/* Signup Form */}
            {mode === 'signup' && (
              <form onSubmit={handleSignup}>
                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-wrapper">
                    <span className="input-icon">📧</span>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="name@domain.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon">🔒</span>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon">🔒</span>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Repeat password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="auth-button" disabled={loading}>
                  {loading ? 'Sending OTP...' : 'Send Signup OTP 🚀'}
                </button>
                <div className="auth-toggle-link">
                  Already have an account? 
                  <span onClick={() => { setMode('login'); setError(''); setMessage(''); }}>Log In</span>
                  <div style={{ marginTop: 12 }}>
                    <span style={{ color: '#6B8E23', fontSize: '0.82rem', textDecoration: 'underline' }} onClick={() => { setMode('home'); setError(''); setMessage(''); }}>← Back to Home</span>
                  </div>
                </div>
              </form>
            )}

            {/* OTP Verification Form (Signup only) */}
            {mode === 'verify_signup' && (
              <form onSubmit={handleVerifySignup}>
                <div className="form-group" style={{ textAlign: 'center' }}>
                  <label>Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="form-input"
                    style={{ textAlign: 'center', fontSize: '1.6rem', letterSpacing: '8px', paddingLeft: '16px' }}
                    placeholder="000000"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <button type="submit" className="auth-button" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify OTP & Log In'}
                </button>
                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    className="resend-button"
                    disabled={resendTimer > 0 || loading}
                    onClick={handleResendOtp}
                  >
                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP Email'}
                  </button>
                </div>
                <div className="auth-toggle-link">
                  Back to 
                  <span onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>Start</span>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Slideshow Side */}
      <div className="auth-slideshow-side">
        <div className="slideshow-overlay"></div>
        {slides.map((slide, idx) => (
          <div
            key={idx}
            className={`slide-item ${idx === activeSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            {idx === activeSlide && (
              <div className="slide-content">
                <h2 className="slide-title">{slide.title}</h2>
                <p className="slide-description">{slide.description}</p>
              </div>
            )}
          </div>
        ))}
        <div className="slide-dots">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`slide-dot ${idx === activeSlide ? 'active' : ''}`}
              onClick={() => setActiveSlide(idx)}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
