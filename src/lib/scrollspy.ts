import { useState, useEffect } from 'react'
import { track } from './analytics'

export interface ScrollSpyOptions {
  threshold?: number
  rootMargin?: string
  offset?: number
}

export function createScrollSpy(
  sections: string[],
  onSectionChange: (sectionId: string) => void,
  options: ScrollSpyOptions = {}
) {
  const { threshold = 0.5, rootMargin = '-40% 0px -60% 0px', offset = 80 } = options

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id
          onSectionChange(sectionId)
        }
      })
    },
    {
      threshold,
      rootMargin
    }
  )

  // Observe all sections
  sections.forEach((sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      observer.observe(element)
    }
  })

  return {
    observe: (sectionId: string) => {
      const element = document.getElementById(sectionId)
      if (element) {
        observer.observe(element)
      }
    },
    unobserve: (sectionId: string) => {
      const element = document.getElementById(sectionId)
      if (element) {
        observer.unobserve(element)
      }
    },
    disconnect: () => observer.disconnect()
  }
}

export function smoothScrollTo(elementId: string, offset: number = 80) {
  const element = document.getElementById(elementId)
  if (element) {
    const elementPosition = element.offsetTop - offset
    window.scrollTo({
      top: elementPosition,
      behavior: 'smooth'
    })
  }
}

// Custom hook for scrollspy
export function useScrollSpy(ids: string[], options = { rootMargin: '-40% 0px -60% 0px' }) {
  const [activeId, setActiveId] = useState<string>('hero')

  useEffect(() => {
    const scrollSpy = createScrollSpy(ids, (sectionId) => {
      setActiveId(sectionId)
      track('anchor_view', { id: sectionId })
    }, options)

    return () => scrollSpy.disconnect()
  }, [ids, options])

  return activeId
}
