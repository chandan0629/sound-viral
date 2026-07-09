import React, { useState, useEffect } from 'react'
import './Auth.css'

const BACKEND_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '' : 'http://localhost:5001')

export default function Login({ onLogin, onSwitchToSignup, onSwitchToForgot, isDarkMode, onToggleTheme }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Google Identity Services has been removed per user request

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

    if (!formData.username || !formData.password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Invalid username or password')
      }
      const userData = await res.json()
      localStorage.setItem('sv_user', JSON.stringify(userData))
      if (onLogin) {
        onLogin(userData)
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
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
            <h2>Welcome Back</h2>
            <p>Sign in to your account to continue predicting viral hits</p>
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
                placeholder="Enter username"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="username"
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
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '8px'}}>
                <button 
                  type="button" 
                  className="switch-auth" 
                  style={{fontSize: '0.85rem'}}
                  onClick={onSwitchToForgot}
                  disabled={loading}
                >
                  Forgot Password?
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              className="auth-button primary"
              disabled={loading || !formData.username || !formData.password}
            >
              {loading ? <div className="loading-spinner"></div> : 'Sign In'}
            </button>
          </form>
          

          
          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <button 
                className="switch-auth"
                onClick={onSwitchToSignup}
                disabled={loading}
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
