/**
 * Powercell Test Runner
 * Lightweight testing framework using Node.js stdlib only
 */

export type TestSeverity = 'Blocker' | 'Major' | 'Minor'

export interface TestResult {
  name: string
  file: string
  severity: TestSeverity
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  error?: {
    message: string
    stack?: string
  }
  metadata?: Record<string, any>
}

export interface TestSuite {
  name: string
  file: string
  tests: TestResult[]
  duration: number
  passed: number
  failed: number
  skipped: number
}

export interface TestContext {
  metadata: Record<string, any>
  startTime: number
}

export class TestRunner {
  private suites: TestSuite[] = []
  private currentSuite: TestSuite | null = null
  private continueOnFailure: boolean

  constructor(continueOnFailure: boolean = true) {
    this.continueOnFailure = continueOnFailure
  }

  startSuite(name: string, file: string): void {
    this.currentSuite = {
      name,
      file,
      tests: [],
      duration: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    }
  }

  endSuite(): void {
    if (this.currentSuite) {
      this.currentSuite.duration = this.currentSuite.tests.reduce(
        (sum, test) => sum + test.duration,
        0
      )
      this.suites.push(this.currentSuite)
      this.currentSuite = null
    }
  }

  async runTest(
    name: string,
    severity: TestSeverity,
    testFn: (ctx: TestContext) => Promise<void> | void,
    metadata?: Record<string, any>
  ): Promise<TestResult> {
    if (!this.currentSuite) {
      throw new Error('No active test suite. Call startSuite() first.')
    }

    const startTime = Date.now()
    const result: TestResult = {
      name,
      file: this.currentSuite.file,
      severity,
      status: 'failed',
      duration: 0,
      metadata,
    }

    const ctx: TestContext = {
      metadata: metadata || {},
      startTime,
    }

    try {
      await testFn(ctx)
      result.status = 'passed'
      this.currentSuite.passed++
    } catch (error: any) {
      result.status = 'failed'
      result.error = {
        message: error.message || String(error),
        stack: error.stack,
      }
      this.currentSuite.failed++

      if (!this.continueOnFailure) {
        throw error
      }
    } finally {
      result.duration = Date.now() - startTime
      this.currentSuite.tests.push(result)
    }

    return result
  }

  skipTest(name: string, severity: TestSeverity, reason?: string): void {
    if (!this.currentSuite) {
      throw new Error('No active test suite. Call startSuite() first.')
    }

    this.currentSuite.tests.push({
      name,
      file: this.currentSuite.file,
      severity,
      status: 'skipped',
      duration: 0,
      metadata: reason ? { skipReason: reason } : undefined,
    })
    this.currentSuite.skipped++
  }

  getResults(): TestSuite[] {
    return this.suites
  }

  getSummary(): {
    totalSuites: number
    totalTests: number
    passed: number
    failed: number
    skipped: number
    totalDuration: number
  } {
    const summary = {
      totalSuites: this.suites.length,
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      totalDuration: 0,
    }

    for (const suite of this.suites) {
      summary.totalTests += suite.tests.length
      summary.passed += suite.passed
      summary.failed += suite.failed
      summary.skipped += suite.skipped
      summary.totalDuration += suite.duration
    }

    return summary
  }
}
