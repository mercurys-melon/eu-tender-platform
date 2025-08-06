import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { da } from 'date-fns/locale'

export function formatDate(date: string | Date, formatStr: string = 'PPP') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr, { locale: da })
}

export function formatRelativeDate(date: string | Date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: da })
}

export function formatCurrency(amount: number, currency: string = 'DKK') {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatCVRNumber(cvr: string): string {
  // Format Danish CVR number (8 digits)
  return cvr.replace(/(\d{4})(\d{4})/, '$1 $2')
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function generateTenderId(): string {
  return 'TDR-' + Date.now().toString(36).toUpperCase()
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateCVRNumber(cvr: string): boolean {
  // Danish CVR number validation (8 digits)
  const cvrRegex = /^\d{8}$/
  return cvrRegex.test(cvr.replace(/\s/g, ''))
} 