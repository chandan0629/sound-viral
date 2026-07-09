import React from 'react'

export default function TiltCard({ children, className = '', style = {}, glare = true, scale = true, tiltMax = 0, ...props }) {
  return (
    <div
      className={`tilt-card ${className}`}
      style={{
        position: 'relative',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
