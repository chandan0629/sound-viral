import React, { useRef, useState, useCallback } from 'react'

const TILT_MAX = 12
const GLARE_MAX = 0.15
const SCALE_HOVER = 1.02
const TRANSITION_SPEED = '0.4s'
const TRANSITION_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

export default function TiltCard({ children, className = '', style = {}, glare = true, scale = true, tiltMax = TILT_MAX, ...props }) {
  const cardRef = useRef(null)
  const [tiltStyle, setTiltStyle] = useState({})
  const [glareStyle, setGlareStyle] = useState({})
  const rafRef = useRef(null)

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    
    rafRef.current = requestAnimationFrame(() => {
      const rect = cardRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      
      const rotateY = ((x - centerX) / centerX) * tiltMax
      const rotateX = -((y - centerY) / centerY) * tiltMax
      
      setTiltStyle({
        transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)${scale ? ` scale3d(${SCALE_HOVER}, ${SCALE_HOVER}, ${SCALE_HOVER})` : ''}`,
        transition: 'transform 0.1s ease-out',
      })
      
      if (glare) {
        const glareX = (x / rect.width) * 100
        const glareY = (y / rect.height) * 100
        const intensity = Math.sqrt(
          Math.pow((x - centerX) / centerX, 2) + Math.pow((y - centerY) / centerY, 2)
        ) * GLARE_MAX
        
        setGlareStyle({
          background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,${intensity}), transparent 60%)`,
          opacity: 1,
        })
      }
    })
  }, [tiltMax, scale, glare])

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setTiltStyle({
      transform: `perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
      transition: `transform ${TRANSITION_SPEED} ${TRANSITION_EASING}`,
    })
    setGlareStyle({ opacity: 0 })
  }, [])

  return (
    <div
      ref={cardRef}
      className={`tilt-card ${className}`}
      style={{
        position: 'relative',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        ...tiltStyle,
        ...style,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
      {glare && (
        <div
          className="tilt-card-glare"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            pointerEvents: 'none',
            zIndex: 2,
            transition: `opacity ${TRANSITION_SPEED} ${TRANSITION_EASING}`,
            ...glareStyle,
          }}
        />
      )}
    </div>
  )
}
