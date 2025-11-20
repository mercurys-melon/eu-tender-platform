import { format, addDays, addHours, parseISO, isValid } from 'date-fns';
import { da, enUS } from 'date-fns/locale';
import { blockBidConfig } from '../config/env';

export interface DateConfig {
  timezone: string;
  language: string;
}

export class DateUtils {
  private locale: Locale;
  private timezone: string;

  constructor(config: DateConfig = { timezone: blockBidConfig.timezone, language: blockBidConfig.language }) {
    this.timezone = config.timezone;
    this.locale = config.language.startsWith('da') ? da : enUS;
  }

  /**
   * Get current date/time in the configured timezone
   */
  now(): Date {
    return new Date();
  }

  /**
   * Add days to current date and set time to 12:00
   */
  addDaysAtNoon(days: number): Date {
    const date = addDays(this.now(), days);
    date.setHours(12, 0, 0, 0);
    return date;
  }

  /**
   * Add hours to current date
   */
  addHours(hours: number): Date {
    return addHours(this.now(), hours);
  }

  /**
   * Format date for UI display (dd-MM-yyyy HH:mm)
   */
  formatForUI(date: Date): string {
    return format(date, 'dd-MM-yyyy HH:mm', { locale: this.locale });
  }

  /**
   * Format date for ISO string
   */
  formatISO(date: Date): string {
    return date.toISOString();
  }

  /**
   * Parse date from various formats
   */
  parseDate(dateInput: string | Date): Date {
    if (dateInput instanceof Date) {
      return dateInput;
    }

    // Try ISO format first
    const isoDate = parseISO(dateInput);
    if (isValid(isoDate)) {
      return isoDate;
    }

    // Try Danish format (dd-MM-yyyy HH:mm)
    const danishDate = new Date(dateInput.replace(/(\d{2})-(\d{2})-(\d{4})/, '$3-$2-$1'));
    if (isValid(danishDate)) {
      return danishDate;
    }

    throw new Error(`Unable to parse date: ${dateInput}`);
  }

  /**
   * Get relative deadline (e.g., "now + X days at 12:00")
   */
  getRelativeDeadline(days: number, time: string = '12:00'): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const date = addDays(this.now(), days);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Check if date is in the future
   */
  isFuture(date: Date): boolean {
    return date > this.now();
  }

  /**
   * Get business days between two dates (excluding weekends)
   */
  getBusinessDays(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }
}

// Export singleton instance
export const dateUtils = new DateUtils();
