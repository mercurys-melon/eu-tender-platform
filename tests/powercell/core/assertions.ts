/**
 * Powercell Assertions
 * Lightweight assertion library
 */

export class AssertionError extends Error {
  constructor(message: string, public actual?: any, public expected?: any) {
    super(message)
    this.name = 'AssertionError'
  }
}

export function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new AssertionError(message || 'Assertion failed')
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new AssertionError(
      message || `Expected ${expected}, but got ${actual}`,
      actual,
      expected
    )
  }
}

export function assertNotEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual === expected) {
    throw new AssertionError(
      message || `Expected not equal to ${expected}, but got ${actual}`,
      actual,
      expected
    )
  }
}

export function assertTrue(condition: boolean, message?: string): void {
  if (!condition) {
    throw new AssertionError(message || `Expected true, but got false`)
  }
}

export function assertFalse(condition: boolean, message?: string): void {
  if (condition) {
    throw new AssertionError(message || `Expected false, but got true`)
  }
}

export function assertNull(value: any, message?: string): void {
  if (value !== null) {
    throw new AssertionError(message || `Expected null, but got ${value}`, value, null)
  }
}

export function assertNotNull(value: any, message?: string): void {
  if (value === null || value === undefined) {
    throw new AssertionError(message || `Expected not null, but got ${value}`, value)
  }
}

export function assertContains(haystack: string, needle: string, message?: string): void {
  if (!haystack.includes(needle)) {
    throw new AssertionError(
      message || `Expected "${haystack}" to contain "${needle}"`,
      haystack,
      needle
    )
  }
}

export function assertMatches(value: string, pattern: RegExp, message?: string): void {
  if (!pattern.test(value)) {
    throw new AssertionError(
      message || `Expected "${value}" to match pattern ${pattern}`,
      value,
      pattern
    )
  }
}

export function assertThrows(
  fn: () => void | Promise<void>,
  expectedError?: string | RegExp | (new () => Error),
  message?: string
): void {
  let thrown = false
  let thrownError: any

  try {
    const result = fn()
    if (result instanceof Promise) {
      throw new AssertionError('Async function must use assertThrowsAsync')
    }
  } catch (error) {
    thrown = true
    thrownError = error
  }

  if (!thrown) {
    throw new AssertionError(message || 'Expected function to throw an error')
  }

  if (expectedError) {
    if (typeof expectedError === 'string') {
      if (!thrownError?.message?.includes(expectedError)) {
        throw new AssertionError(
          message || `Expected error message to contain "${expectedError}"`,
          thrownError?.message,
          expectedError
        )
      }
    } else if (expectedError instanceof RegExp) {
      if (!expectedError.test(thrownError?.message || '')) {
        throw new AssertionError(
          message || `Expected error message to match ${expectedError}`,
          thrownError?.message,
          expectedError
        )
      }
    } else if (thrownError instanceof expectedError === false) {
      throw new AssertionError(
        message || `Expected error to be instance of ${expectedError.name}`,
        thrownError,
        expectedError
      )
    }
  }
}

export async function assertThrowsAsync(
  fn: () => Promise<void>,
  expectedError?: string | RegExp | (new () => Error),
  message?: string
): Promise<void> {
  let thrown = false
  let thrownError: any

  try {
    await fn()
  } catch (error) {
    thrown = true
    thrownError = error
  }

  if (!thrown) {
    throw new AssertionError(message || 'Expected async function to throw an error')
  }

  if (expectedError) {
    if (typeof expectedError === 'string') {
      if (!thrownError?.message?.includes(expectedError)) {
        throw new AssertionError(
          message || `Expected error message to contain "${expectedError}"`,
          thrownError?.message,
          expectedError
        )
      }
    } else if (expectedError instanceof RegExp) {
      if (!expectedError.test(thrownError?.message || '')) {
        throw new AssertionError(
          message || `Expected error message to match ${expectedError}`,
          thrownError?.message,
          expectedError
        )
      }
    } else if (thrownError instanceof expectedError === false) {
      throw new AssertionError(
        message || `Expected error to be instance of ${expectedError.name}`,
        thrownError,
        expectedError
      )
    }
  }
}
