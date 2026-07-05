import { useEffect, useRef } from 'react'

export default function useScrollReveal(options = {}) {
  const ref = useRef(null)
  
  useEffect(() => {
    const element = ref.current
    if (!element) return
    
    const { threshold = 0.15, rootMargin = '0px 0px -50px 0px', once = true } = options
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            if (once) observer.unobserve(entry.target)
          } else if (!once) {
            entry.target.classList.remove('visible')
          }
        })
      },
      { threshold, rootMargin }
    )
    
    const revealElements = element.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale')
    revealElements.forEach((el) => observer.observe(el))
    
    if (element.classList.contains('reveal') || element.classList.contains('reveal-left') || 
        element.classList.contains('reveal-right') || element.classList.contains('reveal-scale')) {
      observer.observe(element)
    }
    
    return () => observer.disconnect()
  }, [])
  
  return ref
}
