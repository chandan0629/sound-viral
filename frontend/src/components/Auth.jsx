import React, { useState, useEffect } from 'react'
import Login from './Login'
import Signup from './Signup'
import ForgotPassword from './ForgotPassword'

export default function Auth({ onLogin }) {
  const [authMode, setAuthMode] = useState('login') // 'login', 'signup', 'forgot'
  const [user, setUser] = useState(null)
  const [isDarkMode, setIsDarkMode] = useState(true)

  // Check for existing user session and theme on component mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('sv_user')
      if (savedUser) {
        const userData = JSON.parse(savedUser)
        setUser(userData)
        if (onLogin) onLogin(userData)
      }
      
      // Load theme preference
      const savedTheme = localStorage.getItem('sv_theme')
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark')
      }
    } catch (error) {
      console.error('Error loading user session:', error)
      localStorage.removeItem('sv_user')
    }
  }, [onLogin])

  const toggleTheme = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    localStorage.setItem('sv_theme', newTheme ? 'dark' : 'light')
  }

  const handleLogin = (userData) => {
    try {
      // Save user data to localStorage
      localStorage.setItem('sv_user', JSON.stringify(userData))
      setUser(userData)
      if (onLogin) onLogin(userData)
    } catch (error) {
      console.error('Error saving user session:', error)
    }
  }

  const handleSignup = (userData) => {
    try {
      // Save user data to localStorage
      localStorage.setItem('sv_user', JSON.stringify(userData))
      setUser(userData)
      if (onLogin) onLogin(userData)
    } catch (error) {
      console.error('Error saving user session:', error)
    }
  }

  // If user is already logged in, don't show auth forms
  if (user) {
    return null
  }

  return (
    <>
      {authMode === 'login' && (
        <Login 
          onLogin={handleLogin} 
          onSwitchToSignup={() => setAuthMode('signup')}
          onSwitchToForgot={() => setAuthMode('forgot')}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />
      )}
      {authMode === 'signup' && (
        <Signup 
          onSignup={handleSignup} 
          onSwitchToLogin={() => setAuthMode('login')}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />
      )}
      {authMode === 'forgot' && (
        <ForgotPassword 
          onSwitchToLogin={() => setAuthMode('login')}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />
      )}
    </>
  )
}
