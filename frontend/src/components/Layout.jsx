import React, { useState, useEffect, useRef, useCallback } from 'react'
import './Layout.css'

// Lazy load components
const PredictorForm = React.lazy(() => import('./PredictorForm'))
const LiveSongTest = React.lazy(() => import('./LiveSongTest'))
const Recommendations = React.lazy(() => import('./Recommendations'))
const Creators = React.lazy(() => import('./Creators'))
const GameDashboard = React.lazy(() => import('./GameDashboard'))
const LiveRecording = React.lazy(() => import('./LiveRecording'))
const ThreeDCanvas = React.lazy(() => import('./ThreeDCanvas'))

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'static', label: 'Static Viral Check', icon: '📊' },
  { id: 'live', label: 'Live Song Test', icon: '🎵' },
  { id: 'record', label: 'Live Recording', icon: '🎙️' },
  { id: 'recommend', label: 'Recommendations', icon: '💡' },
  { id: 'creators', label: 'Creators', icon: '👤' },
]

export default function Layout({ score, logs, onResult, user, onLogout }) {
  const [currentPage, setCurrentPage] = useState('home')
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDarkTheme, setIsDarkTheme] = useState(true)
  const [pageTransition, setPageTransition] = useState('')
  const [pageKey, setPageKey] = useState(0)
  const mainRef = useRef(null)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setIsDarkTheme(savedTheme === 'dark')
      document.documentElement.setAttribute('data-theme', savedTheme)
    } else {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDarkTheme
    setIsDarkTheme(newTheme)
    const themeValue = newTheme ? 'dark' : 'light'
    localStorage.setItem('theme', themeValue)
    document.documentElement.setAttribute('data-theme', themeValue)
  }

  const toggleMenu = () => setMenuOpen(!menuOpen)
  const closeMenu = () => setMenuOpen(false)

  const navigate = useCallback((page) => {
    if (page === currentPage) {
      closeMenu()
      return
    }
    // Trigger page transition
    setPageTransition('page-exit')
    setTimeout(() => {
      setCurrentPage(page)
      setPageKey(k => k + 1)
      setPageTransition('page-enter')
      closeMenu()
    }, 250)
  }, [currentPage])

  // Loading fallback
  const LoadingFallback = () => (
    <div className="page-loading">
      <div className="page-loading-spinner"></div>
      <span>Loading...</span>
    </div>
  )

  return (
    <div className="layout">
      {/* Always-on 3D particle background */}
      <React.Suspense fallback={null}>
        <ThreeDCanvas activePage={currentPage} />
      </React.Suspense>

      {/* Hamburger Menu Button */}
      <button
        className={`hamburger ${menuOpen ? 'active' : ''}`}
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Theme Toggle */}
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        <span className="theme-icon">{isDarkTheme ? '☀️' : '🌙'}</span>
      </button>

      {/* Sidebar Navigation */}
      <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="menu-header">
          <h1 className="sidebar-logo">
            <span className="logo-icon">🎵</span>
            <span className="gradient-text">SoundViral</span>
          </h1>
          {user && (
            <div className="user-info">
              <div className="user-avatar">
                {user.picture ? (
                  <img src={user.picture} alt="Avatar" />
                ) : (
                  user.username?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <div className="user-details">
                <span className="user-name">{user.name || user.username}</span>
                <span className="user-id">@{user.username}</span>
              </div>
            </div>
          )}
        </div>

        <ul className="menu-items">
          {NAV_ITEMS.map((item, index) => (
            <li key={item.id} style={{ animationDelay: `${index * 50}ms` }}>
              <button
                className={`menu-link ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => navigate(item.id)}
              >
                <span className="menu-link-icon">{item.icon}</span>
                <span className="menu-link-label">{item.label}</span>
                {currentPage === item.id && <span className="active-indicator"></span>}
              </button>
            </li>
          ))}
        </ul>

        <div className="menu-footer">
          {user && (
            <button className="logout-btn" onClick={onLogout}>
              <span>🚪</span>
              Logout
            </button>
          )}
          <p className="footer-text">Made with 💜 for music</p>
        </div>
      </nav>

      {/* Menu Overlay */}
      {menuOpen && (
        <div className="menu-overlay" onClick={closeMenu}></div>
      )}

      {/* Main Content with Page Transitions */}
      <main className={`main-content ${pageTransition}`} ref={mainRef} key={pageKey}>
        {currentPage === 'home' && (
          <div className="home-page stagger-children">
            <div className="welcome-section">
              <h1 className="title-3d">
                <span className="gradient-text">SoundViral</span>
              </h1>
              <p className="subtitle">Predict Your Song's Viral Potential</p>
              <p className="description">
                AI-powered machine learning trained on 176,000+ tracks from multiple Spotify datasets.
                Analyze features, test hooks, and maximize your song's chance to go viral.
              </p>
              <div className="quick-buttons">
                <button className="btn primary large glow-btn" onClick={() => navigate('static')}>
                  <span>Start Analyzing</span>
                  <span className="btn-arrow">→</span>
                </button>
                <button className="btn secondary large" onClick={() => navigate('live')}>
                  <span>Live Test</span>
                  <span className="btn-arrow">🎵</span>
                </button>
              </div>
            </div>
            <aside className="game-dashboard-container">
              <React.Suspense fallback={<LoadingFallback />}>
                <GameDashboard score={score} logs={logs} />
              </React.Suspense>
            </aside>
          </div>
        )}

        {currentPage === 'static' && (
          <div className="static-page stagger-children">
            <div className="page-header">
              <h2 className="gradient-text">Static Viral Check</h2>
              <p>Analyze song features for viral potential</p>
            </div>
            <div className="static-content">
              <div className="static-intro">
                <p>Fine-tune your song's audio features to maximize its viral potential.</p>
              </div>
              <div className="form-container">
                <React.Suspense fallback={<LoadingFallback />}>
                  <PredictorForm onResult={onResult} />
                </React.Suspense>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'live' && (
          <div className="live-page page-enter">
            <React.Suspense fallback={<LoadingFallback />}>
              <LiveSongTest />
            </React.Suspense>
          </div>
        )}

        {currentPage === 'record' && (
          <div className="record-page page-enter">
            <React.Suspense fallback={<LoadingFallback />}>
              <LiveRecording />
            </React.Suspense>
          </div>
        )}

        {currentPage === 'recommend' && (
          <div className="recommend-page page-enter">
            <React.Suspense fallback={<LoadingFallback />}>
              <Recommendations />
            </React.Suspense>
          </div>
        )}

        {currentPage === 'creators' && (
          <div className="creators-page page-enter">
            <React.Suspense fallback={<LoadingFallback />}>
              <Creators />
            </React.Suspense>
          </div>
        )}
      </main>
    </div>
  )
}