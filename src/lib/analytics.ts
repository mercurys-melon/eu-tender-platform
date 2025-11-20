'use client'

type EventType = 'cta_primary_click' | 'cta_secondary_click' | 'lead_submit' | 'form_interaction' | 'button_click' | 'scroll_depth' | 'time_on_page' | 'nav_click' | 'anchor_view' | 'cta_click'

interface EventPayload {
  location?: string
  company?: string
  [key: string]: any
}

const ANALYTICS_ENDPOINT = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''

export function track(event: EventType, payload: EventPayload = {}) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Analytics Event:', { event, payload, timestamp: new Date().toISOString() })
  }

  // Send to analytics service if configured
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event, {
      event_category: 'marketing',
      event_label: payload.location || 'unknown',
      ...payload
    })
  }

  // Send to custom analytics endpoint if configured
  if (ANALYTICS_ENDPOINT) {
    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        payload,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : ''
      })
    }).catch(error => {
      console.warn('Failed to send analytics event:', error)
    })
  }
}

// Track page views
export function trackPageView(url: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log('Page View:', { url, timestamp: new Date().toISOString() })
  }

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url
    })
  }
}

// Track form interactions
export function trackFormInteraction(formName: string, action: 'start' | 'complete' | 'error') {
  track('form_interaction', {
    form_name: formName,
    action,
    location: typeof window !== 'undefined' ? window.location.pathname : ''
  })
}

// Track button clicks
export function trackButtonClick(buttonText: string, location: string) {
  track('button_click', {
    button_text: buttonText,
    location
  })
}

// Track scroll depth
export function trackScrollDepth(depth: number) {
  track('scroll_depth', {
    depth_percentage: depth,
    location: typeof window !== 'undefined' ? window.location.pathname : ''
  })
}

// Track time on page
export function trackTimeOnPage(seconds: number) {
  track('time_on_page', {
    seconds,
    location: typeof window !== 'undefined' ? window.location.pathname : ''
  })
}

// Initialize analytics
export function initializeAnalytics() {
  if (typeof window === 'undefined') return

  // Track page views on route changes
  const originalPushState = history.pushState
  history.pushState = function(...args) {
    originalPushState.apply(history, args)
    trackPageView(window.location.pathname)
  }

  // Track scroll depth
  let maxScrollDepth = 0
  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const scrollPercent = Math.round((scrollTop / docHeight) * 100)
    
    if (scrollPercent > maxScrollDepth) {
      maxScrollDepth = scrollPercent
      if (scrollPercent % 25 === 0) { // Track at 25%, 50%, 75%, 100%
        trackScrollDepth(scrollPercent)
      }
    }
  })

  // Track time on page
  let startTime = Date.now()
  window.addEventListener('beforeunload', () => {
    const timeOnPage = Math.round((Date.now() - startTime) / 1000)
    trackTimeOnPage(timeOnPage)
  })
}

// Declare global gtag for TypeScript
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}
