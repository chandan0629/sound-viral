import React, { useState, useEffect } from 'react'
import './Auth.css'

const BACKEND_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '' : 'http://localhost:5001')

export default function Signup({ onSignup, onSwitchToLogin, isDarkMode, onToggleTheme }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Helper to decode JWT token on client-side
  const decodeJwt = (token) => {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch (e) {
      console.error('Error decoding Google Identity JWT:', e)
      return null
    }
  }

  const handleGoogleResponse = async (response) => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${BACKEND_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Google login failed')
      }
      const userData = await res.json()
      localStorage.setItem('sv_user', JSON.stringify(userData))
      if (onSignup) {
        onSignup(userData)
      }
    } catch (err) {
      console.error('Google Sign-In failed:', err)
      setError(err.message || 'Google Sign-In failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Initialize and render Google Identity Services button
  useEffect(() => {
    const initGoogle = () => {
      if (typeof window !== 'undefined' && typeof window.google !== 'undefined' && window.google.accounts) {
        try {
          window.google.accounts.id.initialize({
            client_id: '932079735532-ovm5u0rrsgdp0mtpr8mlf2oo0njo4n3h.apps.googleusercontent.com',
            callback: handleGoogleResponse
          })
          const btn = document.getElementById('google-signup-button')
          if (btn) {
            window.google.accounts.id.renderButton(btn, {
              theme: isDarkMode ? 'filled_black' : 'outline',
              size: 'large',
              width: btn.offsetWidth || 340,
              text: 'signup_with'
            })
          }
          return true
        } catch (e) {
          console.error('Error rendering Google button:', e)
        }
      }
      return false
    }

    if (!initGoogle()) {
      const interval = setInterval(() => {
        if (initGoogle()) {
          clearInterval(interval)
        }
      }, 500)
      return () => clearInterval(interval)
    }
  }, [isDarkMode])
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        })
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Registration failed')
      }
      const userData = await res.json()
      localStorage.setItem('sv_user', JSON.stringify(userData))
      if (onSignup) {
        onSignup(userData)
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
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
            <h2>Create Account</h2>
            <p>Sign up to start tracking your viral predictions</p>
          </div>
          
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">
                Username <span className="required">*</span>
              </label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Create a username"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="username"
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
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password <span className="required">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="new-password"
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
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="auth-button primary"
              disabled={loading || !formData.username || !formData.email || !formData.password || !formData.confirmPassword}
            >
              {loading ? <div className="loading-spinner"></div> : 'Create Account'}
            </button>
          </form>

          <div className="auth-divider">
            <span>or sign up with</span>
          </div>

          <div className="google-auth-container">
            <div id="google-signup-button"></div>
          </div>
          
          <div className="auth-footer">
            <p>
              Ready to login?{' '}
              <button 
                className="switch-auth"
                onClick={onSwitchToLogin}
                disabled={loading}
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
