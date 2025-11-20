import { Page } from '@playwright/test';
import { blockBidConfig } from '../config/env';
import { ensureDir } from 'fs-extra';
import { join } from 'path';

export class BlockBidError extends Error {
  public readonly testName: string;
  public readonly screenshotPath?: string;
  public readonly htmlPath?: string;

  constructor(
    message: string,
    testName: string,
    page?: Page,
    originalError?: Error
  ) {
    super(message);
    this.name = 'BlockBidError';
    this.testName = testName;
    
    if (originalError) {
      this.stack = originalError.stack;
    }

    // Capture screenshot and HTML if page is available
    if (page) {
      this.captureArtifacts(page, testName);
    }
  }

  private async captureArtifacts(page: Page, testName: string): Promise<void> {
    try {
      const artifactsDir = join(blockBidConfig.artifactsDir, testName);
      await ensureDir(artifactsDir);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Capture full page screenshot
      this.screenshotPath = join(artifactsDir, `error-${timestamp}.png`);
      await page.screenshot({ 
        path: this.screenshotPath, 
        fullPage: true 
      });

      // Capture HTML snapshot
      this.htmlPath = join(artifactsDir, `error-${timestamp}.html`);
      const html = await page.content();
      await require('fs').promises.writeFile(this.htmlPath, html);

      console.error(`Artifacts saved to: ${artifactsDir}`);
    } catch (error) {
      console.error('Failed to capture artifacts:', error);
    }
  }
}

export class SelectorError extends BlockBidError {
  constructor(
    message: string,
    testName: string,
    page?: Page,
    selectorHints?: any[]
  ) {
    const fullMessage = selectorHints 
      ? `${message}\nSelector hints: ${JSON.stringify(selectorHints, null, 2)}`
      : message;
    
    super(fullMessage, testName, page);
    this.name = 'SelectorError';
  }
}

export class ValidationError extends BlockBidError {
  constructor(
    message: string,
    testName: string,
    page?: Page,
    validationDetails?: any
  ) {
    const fullMessage = validationDetails
      ? `${message}\nValidation details: ${JSON.stringify(validationDetails, null, 2)}`
      : message;
    
    super(fullMessage, testName, page);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends BlockBidError {
  constructor(
    message: string,
    testName: string,
    page?: Page,
    url?: string
  ) {
    const fullMessage = url ? `${message}\nURL: ${url}` : message;
    super(fullMessage, testName, page);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends BlockBidError {
  constructor(
    message: string,
    testName: string,
    page?: Page,
    timeout?: number
  ) {
    const fullMessage = timeout ? `${message}\nTimeout: ${timeout}ms` : message;
    super(fullMessage, testName, page);
    this.name = 'TimeoutError';
  }
}

/**
 * Wrapper function to handle errors with proper artifact capture
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  testName: string,
  page?: Page
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof BlockBidError) {
      throw error;
    }
    
    throw new BlockBidError(
      `Operation failed: ${error instanceof Error ? error.message : String(error)}`,
      testName,
      page,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Retry mechanism for operations that might fail due to timing
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
