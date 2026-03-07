#!/usr/bin/env node
/**
 * Powercell Suite Runner
 * Runs all test suites and continues on failures
 */

import { readdir, stat } from 'node:fs/promises'
import { join, extname, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { TestRunner, TestSuite, TestSeverity } from './core/test-runner'
import { generateJsonReport } from './reports/json-reporter'
import { generateMarkdownReport } from './reports/markdown-reporter'

interface RunnerOptions {
  testDir: string
  continueOnFailure?: boolean
  outputDir?: string
  pattern?: RegExp
}

export async function runTestSuites(options: RunnerOptions): Promise<{
  success: boolean
  summary: ReturnType<TestRunner['getSummary']>
  suites: TestSuite[]
}> {
  const {
    testDir,
    continueOnFailure = true,
    outputDir = './test-results',
    pattern = /\.test\.(ts|js)$/,
  } = options

  const runner = new TestRunner(continueOnFailure)
  const testFiles = await findTestFiles(testDir, pattern)

  console.log(`\n🧪 Powercell Test Runner`)
  console.log(`📁 Found ${testFiles.length} test file(s)\n`)

  for (const testFile of testFiles) {
    try {
      await runTestFile(runner, testFile, testDir)
    } catch (error: any) {
      console.error(`❌ Failed to load test file ${testFile}:`, error.message)
      if (!continueOnFailure) {
        throw error
      }
    }
  }

  // Generate reports
  const suites = runner.getResults()
  const summary = runner.getSummary()

  // Ensure output directory exists
  const { mkdir } = await import('node:fs/promises')
  await mkdir(outputDir, { recursive: true })

  // Generate JSON report
  const jsonReport = generateJsonReport(suites, summary)
  const jsonPath = join(outputDir, 'powercell-report.json')
  const { writeFile } = await import('node:fs/promises')
  await writeFile(jsonPath, JSON.stringify(jsonReport, null, 2))

  // Generate Markdown report
  const markdownReport = generateMarkdownReport(suites, summary)
  const mdPath = join(outputDir, 'powercell-report.md')
  await writeFile(mdPath, markdownReport)

  console.log(`\n📊 Test Summary:`)
  console.log(`   Total Suites: ${summary.totalSuites}`)
  console.log(`   Total Tests:  ${summary.totalTests}`)
  console.log(`   ✅ Passed:     ${summary.passed}`)
  console.log(`   ❌ Failed:     ${summary.failed}`)
  console.log(`   ⏭️  Skipped:    ${summary.skipped}`)
  console.log(`   ⏱️  Duration:   ${(summary.totalDuration / 1000).toFixed(2)}s`)
  console.log(`\n📄 Reports generated:`)
  console.log(`   JSON:     ${jsonPath}`)
  console.log(`   Markdown: ${mdPath}\n`)

  return {
    success: summary.failed === 0,
    summary,
    suites,
  }
}

async function findTestFiles(dir: string, pattern: RegExp): Promise<string[]> {
  const files: string[] = []

  async function walk(currentDir: string): Promise<void> {
    try {
      const entries = await readdir(currentDir)

      for (const entry of entries) {
        const fullPath = join(currentDir, entry)
        const stats = await stat(fullPath)

        if (stats.isDirectory()) {
          await walk(fullPath)
        } else if (stats.isFile() && pattern.test(entry)) {
          files.push(fullPath)
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }

  await walk(dir)
  return files.sort()
}

async function runTestFile(
  runner: TestRunner,
  testFile: string,
  baseDir: string
): Promise<void> {
  const relativePath = relative(baseDir, testFile)
  const suiteName = relativePath.replace(/\.test\.(ts|js)$/, '')

  console.log(`▶️  Running: ${suiteName}`)

  runner.startSuite(suiteName, relativePath)

  try {
    // Import and execute test file
    const fileUrl = pathToFileURL(testFile).href
    const testModule = await import(fileUrl)

    // Execute test function if it exists
    if (typeof testModule.default === 'function') {
      await testModule.default(runner)
    } else if (typeof testModule.runTests === 'function') {
      await testModule.runTests(runner)
    } else {
      console.warn(`⚠️  No test function found in ${relativePath}`)
    }
  } catch (error: any) {
    console.error(`❌ Error in ${relativePath}:`, error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    throw error
  } finally {
    runner.endSuite()
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('suite-runner')) {
  const testDir = process.argv[2] || './tests/powercell'
  const continueOnFailure = !process.argv.includes('--fail-fast')
  const outputDir = process.argv.find((arg) => arg.startsWith('--output='))?.split('=')[1] || './test-results'

  runTestSuites({
    testDir,
    continueOnFailure,
    outputDir,
  })
    .then(({ success }) => {
      process.exit(success ? 0 : 1)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}
