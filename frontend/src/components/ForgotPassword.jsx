import React, { useState } from 'react'
import './Auth.css'

const BACKEND_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '' : 'http://192.168.1.31:5001')

export default function ForgotPassword({ onSwitchToLogin, isDarkMode, onToggleTheme }) {
  const [step, setStep] = useState(1) // 1: Verify, 2: Reset Password
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [resetToken, setResetToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.username || !formData.email) {
      setError('Please fill in both fields')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/verify-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed')
      }
      
      setResetToken(data.reset_token)
      setStep(2)
    } catch (err) {
      setError(err.message || 'Verification failed. Make sure your username and email match our records.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reset_token: resetToken,
          new_password: formData.newPassword
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Password reset failed')
      }
      
      setSuccess('Password successfully reset!')
      setTimeout(() => {
        onSwitchToLogin()
      }, 2000)
    } catch (err) {
      setError(err.message || 'Reset failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`auth-container ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      <div className="auth-background">
        <div className="music-symbol">♪</div>
        <div className="dna-helix"></div>
        <div className="floating-notes">
          <div className="note" style={{'--x': '10%', '--duration': '8s'}}>♫</div>
          <div className="note" style={{'--x': '20%', '--duration': '12s'}}>♪</div>
          <div className="note" style={{'--x': '80%', '--duration': '10s'}}>♬</div>
          <div className="note" style={{'--x': '90%', '--duration': '14s'}}>♩</div>
        </div>
        <div className="gradient-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
        </div>
      </div>

      <div className="auth-content">
        <div className="auth-card">
          <div className="auth-header">
            <div className="header-top">
              <div className="logo">
                <div className="logo-icon">🎵</div>
                <h1>SoundViral</h1>
              </div>
              <button className="theme-toggle" onClick={onToggleTheme} title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                <div className={`toggle-slider ${isDarkMode ? 'dark' : 'light'}`}>
                  <div className="toggle-icon">
                    {isDarkMode ? '🌙' : '☀️'}
                  </div>
                </div>
              </button>
            </div>
            <h2>Reset Password</h2>
            <p>{step === 1 ? 'Verify your identity to reset your password' : 'Create a new password'}</p>
          </div>
          
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {success && (
            <div className="success-message" style={{color: '#1db954', background: 'rgba(29, 185, 84, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <span className="success-icon">✓</span>
              {success}
            </div>
          )}
          
          {step === 1 ? (
            <form className="auth-form" onSubmit={handleVerify}>
              <div className="form-group">
                <label htmlFor="username">
                  Username <span className="required">*</span>
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">
                  Email Address <span className="required">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your registered email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              
              <button
                type="submit"
                className="auth-button primary"
                disabled={loading || !formData.username || !formData.email}
              >
                {loading ? <div className="loading-spinner"></div> : 'Verify Account'}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleReset}>
              <div className="form-group">
                <label htmlFor="newPassword">
                  New Password <span className="required">*</span>
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="Enter new password (min 6 chars)"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">
                  Confirm Password <span className="required">*</span>
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              
              <button
                type="submit"
                className="auth-button primary"
                disabled={loading || !formData.newPassword || !formData.confirmPassword}
              >
                {loading ? <div className="loading-spinner"></div> : 'Reset Password'}
              </button>
            </form>
          )}
          
          <div className="auth-divider"></div>
          
          <div className="auth-footer">
            <p>
              Remember your password?{' '}
              <button 
                className="switch-auth"
                onClick={onSwitchToLogin}
                disabled={loading}
              >
                Back to Login
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
