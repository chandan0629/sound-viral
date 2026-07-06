import React, { useState, useEffect, useRef, useCallback } from 'react'
import './Layout.css'
import TiltCard from './TiltCard'

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
  // Global Cursor Lighting
  const layoutRef = useRef(null)
  const handleMouseMove = (e) => {
    if (!layoutRef.current) return
    const x = (e.clientX / window.innerWidth) * 100
    const y = (e.clientY / window.innerHeight) * 100
    layoutRef.current.style.setProperty('--mouse-x', `${x}%`)
    layoutRef.current.style.setProperty('--mouse-y', `${y}%`)
  }

  return (
    <div className="layout" ref={layoutRef} onMouseMove={handleMouseMove}>
      {/* Dynamic Ambient Background */}
      <div className="ambient-bg">
        <div className="ambient-orb orb-1"></div>
        <div className="ambient-orb orb-2"></div>
        <div className="ambient-orb orb-3"></div>
      </div>

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
          <div className="spotify-dashboard stagger-children">
            <div className="dashboard-header">
              <h1 className="greeting-text">
                {(() => {
                  const hour = new Date().getHours();
                  if (hour < 12) return 'Good morning';
                  if (hour < 18) return 'Good afternoon';
                  return 'Good evening';
                })()}
              </h1>
            </div>

            {/* Quick Actions Grid (Spotify's Top 6-8 Cards) */}
            <div className="quick-grid">
              {[
                { title: 'Static Viral Check', img: '/images/cover_synthwave.jpg', path: 'static', icon: '📊' },
                { title: 'Live Song Test', img: '/images/cover_pop.jpg', path: 'live', icon: '🎵' },
                { title: 'Live Recording', img: '/images/cover_acoustic.jpg', path: 'record', icon: '🎙️' },
                { title: 'Recommendations', img: '/images/cover_hiphop.jpg', path: 'recommend', icon: '💡' },
                { title: 'Creators Board', img: '/images/hero_music_ai.jpg', path: 'creators', icon: '👤' },
                { title: 'Your Dashboard', img: '/images/cover_synthwave.jpg', path: 'home', icon: '🏠' }
              ].map((item, i) => (
                <div key={i} className="quick-card" onClick={() => navigate(item.path)}>
                  <img src={item.img} alt={item.title} className="quick-img" />
                  <div className="quick-title">{item.icon} {item.title}</div>
                  <button className="play-btn">
                    <svg height="24" width="24" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="8 5 8 19 19 12"></polygon>
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Trending / Made For You Shelf */}
            <section className="shelf-section">
              <div className="shelf-header">
                <h2>Made For You</h2>
                <span className="show-all">Show all</span>
              </div>
              <div className="shelf-container">
                {[
                  { title: 'Daily Mix 1', desc: 'Predictions for your latest tracks.', img: '/images/cover_pop.jpg' },
                  { title: 'Top Hits', desc: 'The most viral songs this week.', img: '/images/cover_hiphop.jpg' },
                  { title: 'Chill Vibes', desc: 'Relaxing acoustic analysis.', img: '/images/cover_acoustic.jpg' },
                  { title: 'Synthwave Classics', desc: 'Retro electronic deep dive.', img: '/images/cover_synthwave.jpg' },
                  { title: 'AI Generated', desc: 'Machine learning masterpieces.', img: '/images/hero_music_ai.jpg' }
                ].map((item, i) => (
                  <TiltCard key={i} tiltMax={10} className="shelf-card">
                    <div className="shelf-img-wrapper">
                      <img src={item.img} alt={item.title} className="shelf-img" />
                      <button className="play-btn-large">
                        <svg height="24" width="24" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="8 5 8 19 19 12"></polygon>
                        </svg>
                      </button>
                    </div>
                    <h3 className="shelf-title">{item.title}</h3>
                    <p className="shelf-desc">{item.desc}</p>
                  </TiltCard>
                ))}
              </div>
            </section>

            {/* Game Dashboard Integration */}
            <section className="shelf-section">
              <div className="shelf-header">
                <h2>Your Progress</h2>
              </div>
              <div className="dashboard-inline-wrapper">
                <React.Suspense fallback={<LoadingFallback />}>
                  <GameDashboard score={score} logs={logs} />
                </React.Suspense>
              </div>
            </section>
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