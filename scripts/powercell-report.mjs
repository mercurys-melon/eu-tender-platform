#!/usr/bin/env node
/**
 * Powercell Power Report
 * Reads reports/powercell/latest/summary.json and writes summary.md
 *
 * Uses only Node.js stdlib.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = join(__dirname, '..')

const REPORTS_DIR = join(ROOT_DIR, 'reports', 'powercell', 'latest')
const SUMMARY_JSON_PATH = join(REPORTS_DIR, 'summary.json')
const SUMMARY_MD_PATH = join(REPORTS_DIR, 'summary.md')

/**
 * Classify failure severity based on error snippet (case-insensitive).
 */
function getSeverity(errorSnippet) {
  const text = (errorSnippet || '').toLowerCase()

  const blockerKeywords = [
    '500',
    '503',
    'econnrefused',
    'login',
    'auth',
    'unauthorized',
    'forbidden',
    'navigation',
    'cannot find element',
  ]

  const majorKeywords = [
    'validation',
    'upload',
    'timeout',
    'missing field',
    'permission',
  ]

  if (blockerKeywords.some((k) => text.includes(k))) {
    return 'Blocker'
  }

  if (majorKeywords.some((k) => text.includes(k))) {
    return 'Major'
  }

  return 'Minor'
}

/**
 * Derive raw log path (relative to repo root) from test name.
 * Mirrors the naming used in run-powercell-suite.mjs.
 */
function getRawLogPath(testName) {
  const safeName = testName
    .replace(/\//g, '_')
    .replace(/[<>:"|?*]/g, '_')
  return join('reports', 'powercell', 'latest', 'raw', `${safeName}.log`)
}

/**
 * Generate markdown report content.
 */
function buildMarkdown(summary) {
  const total = summary.total || 0
  const passed = summary.passed || 0
  const failed = summary.failed || 0
  const tests = Array.isArray(summary.tests) ? summary.tests : []

  const failedTests = tests.filter((t) => t.status === 'fail')

  const grouped = {
    Blocker: [],
    Major: [],
    Minor: [],
  }

  for (const t of failedTests) {
    const severity = getSeverity(t.errorSnippet)
    const group = grouped[severity] || grouped.Minor
    const testName = t.testName || t.path || 'unknown'
    const rawLogPath = getRawLogPath(testName)
    // Show full error snippet (last ~40 lines as per run-powercell-suite.mjs)
    const errorSnippet = t.errorSnippet || ''

    group.push({
      testName,
      path: t.path || '',
      severity,
      rawLogPath,
      errorSnippet,
    })
  }

  let md = ''
  md += '# Powercell Test Report\n\n'
  md += `- **Total**: ${total}\n`
  md += `- **Passed**: ${passed}\n`
  md += `- **Failed**: ${failed}\n\n`

  if (failed === 0 || failedTests.length === 0) {
    md += 'All tests passed.\n'
    return md
  }

  md += '## Failures\n\n'

  const order = ['Blocker', 'Major', 'Minor']

  for (const severity of order) {
    const items = grouped[severity]
    if (!items || items.length === 0) continue

    md += `### ${severity} (${items.length})\n\n`

    for (const item of items) {
      md += `- **${item.testName}** \`(${item.path || 'no path'})\`\n`
      md += `  - **Raw log**: \`${item.rawLogPath}\`\n`
      if (item.errorSnippet && item.errorSnippet.trim()) {
        md += '  - **Error snippet**:\n\n'
        md += '```text\n'
        md += `${item.errorSnippet}\n`
        md += '```\n\n'
      } else {
        md += '  - **Error snippet**: *(empty)*\n\n'
      }
    }
  }

  return md
}

async function generateReport() {
  let raw
  try {
    raw = await readFile(SUMMARY_JSON_PATH, 'utf-8')
  } catch (error) {
    console.error(`❌ Could not read summary.json at ${SUMMARY_JSON_PATH}:`, error.message)
    process.exit(1)
  }

  let summary
  try {
    summary = JSON.parse(raw)
  } catch (error) {
    console.error('❌ Failed to parse summary.json as JSON:', error.message)
    process.exit(1)
  }

  const md = buildMarkdown(summary)

  try {
    await mkdir(dirname(SUMMARY_MD_PATH), { recursive: true })
    await writeFile(SUMMARY_MD_PATH, md, 'utf-8')
    console.log(`✅ Wrote Powercell markdown report to ${SUMMARY_MD_PATH}`)
  } catch (error) {
    console.error('❌ Failed to write markdown report:', error.message)
    process.exit(1)
  }
}

// Export for potential programmatic use
export { generateReport }

// CLI entry point - run if executed directly
// Works when run via: node scripts/powercell-report.mjs or npm run test:report
// Simple check: if argv[1] contains the script name, we're running directly
if (process.argv[1]?.includes('powercell-report.mjs') || 
    import.meta.url.endsWith('powercell-report.mjs')) {
  generateReport().catch((error) => {
    console.error('❌ Fatal error in powercell-report:', error)
    process.exit(1)
  })
}

