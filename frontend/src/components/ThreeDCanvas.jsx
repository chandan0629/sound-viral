import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'

// Particle formation generators for each page mode
const formations = {
  // Home: Galaxy spiral
  home: (i, total) => {
    const arm = (i % 3) * ((2 * Math.PI) / 3)
    const dist = Math.pow(i / total, 0.5) * 6
    const angle = arm + (dist * 2.5) + (Math.random() * 0.3)
    const height = (Math.random() - 0.5) * 0.8 * (1 - dist / 6)
    return [
      Math.cos(angle) * dist,
      height,
      Math.sin(angle) * dist
    ]
  },
  // Predictor: DNA double helix
  static: (i, total) => {
    const t = (i / total) * Math.PI * 6
    const strand = i % 2
    const r = 2.5
    const offset = strand * Math.PI
    return [
      Math.cos(t + offset) * r,
      (i / total - 0.5) * 12,
      Math.sin(t + offset) * r
    ]
  },
  // Live Test: Audio waveform cylinder
  live: (i, total) => {
    const angle = (i / total) * Math.PI * 2 * 8
    const y = (i / total - 0.5) * 10
    const waveR = 2 + Math.sin(y * 1.5) * 1.5
    return [
      Math.cos(angle) * waveR,
      y,
      Math.sin(angle) * waveR
    ]
  },
  // Recording: Pulsing sphere
  record: (i, total) => {
    const theta = Math.acos(1 - 2 * (i / total))
    const phi = Math.PI * (1 + Math.sqrt(5)) * i
    const r = 4
    return [
      r * Math.sin(theta) * Math.cos(phi),
      r * Math.sin(theta) * Math.sin(phi),
      r * Math.cos(theta)
    ]
  },
  // Recommendations: Constellation grid
  recommend: (i, total) => {
    const cols = Math.ceil(Math.sqrt(total))
    const row = Math.floor(i / cols)
    const col = i % cols
    const spacing = 0.35
    const offsetX = (cols * spacing) / 2
    const offsetY = (Math.ceil(total / cols) * spacing) / 2
    const z = (Math.random() - 0.5) * 2
    return [
      col * spacing - offsetX + (Math.random() - 0.5) * 0.15,
      row * spacing - offsetY + (Math.random() - 0.5) * 0.15,
      z
    ]
  },
  // Creators: Orbiting rings
  creators: (i, total) => {
    const ring = i % 3
    const ringTotal = Math.floor(total / 3)
    const indexInRing = Math.floor(i / 3)
    const angle = (indexInRing / ringTotal) * Math.PI * 2
    const r = 3 + ring * 1.5
    const tilt = ring * 0.4
    return [
      Math.cos(angle) * r,
      Math.sin(angle + tilt) * r * 0.3,
      Math.sin(angle) * r
    ]
  }
}

const PARTICLE_COUNT = 3000

// Color palettes per page
const palettes = {
  home:      { hStart: 0.85, hRange: 0.25 },
  static:    { hStart: 0.75, hRange: 0.15 },
  live:      { hStart: 0.50, hRange: 0.20 },
  record:    { hStart: 0.00, hRange: 0.08 },
  recommend: { hStart: 0.60, hRange: 0.30 },
  creators:  { hStart: 0.80, hRange: 0.20 }
}

export default function ThreeDCanvas({ activePage = 'home' }) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const targetPositionsRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight

    // Scene
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.012)

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
    camera.position.z = 14

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    // Particles
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const targetPositions = new Float32Array(PARTICLE_COUNT * 3)
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    const color = new THREE.Color()

    // Initialize with home formation
    const getFormation = formations.home
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const [x, y, z] = getFormation(i, PARTICLE_COUNT)
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      targetPositions[i * 3] = x
      targetPositions[i * 3 + 1] = y
      targetPositions[i * 3 + 2] = z

      // Color: gradient pink → purple → cyan
      const ratio = i / PARTICLE_COUNT
      const hue = 0.85 + ratio * 0.25
      const sat = 0.7 + Math.random() * 0.3
      const light = 0.45 + Math.random() * 0.25
      color.setHSL(hue % 1, sat, light)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    targetPositionsRef.current = targetPositions

    // Soft circle texture (higher res)
    const createCircleTexture = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 32
      canvas.height = 32
      const ctx = canvas.getContext('2d')
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
      gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 32, 32)
      return new THREE.CanvasTexture(canvas)
    }

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      map: createCircleTexture(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })

    const particles = new THREE.Points(geometry, material)
    scene.add(particles)

    // Mouse tracking with spring physics
    let mouseX = 0, mouseY = 0
    let smoothMouseX = 0, smoothMouseY = 0

    const handleMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', handleMouseMove)

    // Animation loop
    let animId
    const clock = new THREE.Clock()

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const time = clock.getElapsedTime()
      const posAttr = geometry.attributes.position
      const target = targetPositionsRef.current

      // Lerp positions toward target (smooth morphing)
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3
        const lerpFactor = 0.02 + (i % 10) * 0.001 // slight variation for organic feel

        let cx = posAttr.getX(i)
        let cy = posAttr.getY(i)
        let cz = posAttr.getZ(i)

        // Lerp toward target
        cx += (target[idx] - cx) * lerpFactor
        cy += (target[idx + 1] - cy) * lerpFactor
        cz += (target[idx + 2] - cz) * lerpFactor

        // Subtle floating motion
        const floatX = Math.sin(time * 0.3 + i * 0.1) * 0.02
        const floatY = Math.cos(time * 0.4 + i * 0.15) * 0.02
        const floatZ = Math.sin(time * 0.35 + i * 0.12) * 0.02

        posAttr.setXYZ(i, cx + floatX, cy + floatY, cz + floatZ)
      }
      posAttr.needsUpdate = true

      // Gentle rotation
      particles.rotation.y = time * 0.05
      particles.rotation.x = Math.sin(time * 0.03) * 0.1

      // Spring mouse follow for camera
      smoothMouseX += (mouseX * 3 - smoothMouseX) * 0.03
      smoothMouseY += (mouseY * 2 - smoothMouseY) * 0.03

      camera.position.x = smoothMouseX
      camera.position.y = -smoothMouseY
      camera.lookAt(scene.position)

      renderer.render(scene, camera)
    }

    animate()
    sceneRef.current = { scene, camera, renderer, particles, geometry, material }

    // Resize
    const handleResize = () => {
      if (!containerRef.current) return
      const w = containerRef.current.clientWidth || window.innerWidth
      const h = containerRef.current.clientHeight || window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animId)
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [])

  // Morph to new formation when activePage changes
  useEffect(() => {
    if (!targetPositionsRef.current) return
    const formation = formations[activePage] || formations.home
    const target = targetPositionsRef.current

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const [x, y, z] = formation(i, PARTICLE_COUNT)
      target[i * 3] = x
      target[i * 3 + 1] = y
      target[i * 3 + 2] = z
    }

    // Update colors per mode
    if (sceneRef.current) {
      const colorAttr = sceneRef.current.geometry.attributes.color
      const c = new THREE.Color()
      const p = palettes[activePage] || palettes.home
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ratio = i / PARTICLE_COUNT
        c.setHSL((p.hStart + ratio * p.hRange) % 1, 0.7 + Math.random() * 0.3, 0.45 + Math.random() * 0.25)
        colorAttr.setXYZ(i, c.r, c.g, c.b)
      }
      colorAttr.needsUpdate = true
    }
  }, [activePage])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
