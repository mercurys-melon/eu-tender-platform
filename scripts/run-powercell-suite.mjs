#!/usr/bin/env node
/**
 * Powercell Suite Runner
 * Finds and runs all test files under tests/powercell/**, one by one via CLI
 * Uses only Node.js stdlib - no TypeScript/tsx dependencies
 */

import { readdir, stat, mkdir, writeFile } from 'node:fs/promises'
import { join, relative, dirname, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = join(__dirname, '..')

// Parse CLI arguments
const args = process.argv.slice(2)

// Support both --suite=smoke and --suite smoke formats
let suite = null
const suiteArgWithEquals = args.find(arg => arg.startsWith('--suite='))
if (suiteArgWithEquals) {
  suite = suiteArgWithEquals.split('=')[1]
} else {
  const suiteIndex = args.indexOf('--suite')
  if (suiteIndex !== -1 && suiteIndex + 1 < args.length) {
    suite = args[suiteIndex + 1]
  }
}

// Support --file <path> option
let singleFile = null
const fileIndex = args.indexOf('--file')
if (fileIndex !== -1 && fileIndex + 1 < args.length) {
  singleFile = args[fileIndex + 1]
}

// Validate suite
if (suite && !['smoke', 'journeys', 'edges'].includes(suite)) {
  console.error(`❌ Invalid suite: ${suite}. Must be one of: smoke, journeys, edges`)
  process.exit(1)
}

// Get Powercell command from environment
const POWERCELL_CMD = process.env.POWERCELL_CMD

if (!POWERCELL_CMD) {
  console.error('❌ POWERCELL_CMD environment variable is required')
  console.error('   Example: POWERCELL_CMD="powercell run"')
  process.exit(1)
}

// Test directories - standardize on tests/powercell/**
const TEST_BASE_DIR = join(ROOT_DIR, 'tests', 'powercell')
const SUITE_DIRS = {
  smoke: join(TEST_BASE_DIR, 'smoke'),
  journeys: join(TEST_BASE_DIR, 'journeys'),
  edges: join(TEST_BASE_DIR, 'edges'),
}

// Report directories
const REPORTS_DIR = join(ROOT_DIR, 'reports', 'powercell', 'latest')
const RAW_LOGS_DIR = join(REPORTS_DIR, 'raw')

/**
 * Find all test files recursively
 * Supports .test.ts files
 */
async function findTestFiles(dir) {
  const files = []
  
  async function walk(currentDir) {
    try {
      const entries = await readdir(currentDir)
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry)
        const stats = await stat(fullPath)
        
        if (stats.isDirectory()) {
          await walk(fullPath)
        } else if (stats.isFile() && entry.endsWith('.test.ts')) {
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

/**
 * Get test name from file path
 */
function getTestName(filePath) {
  const relativePath = relative(TEST_BASE_DIR, filePath)
  return relativePath.replace(/\.test\.ts$/, '').replace(/\\/g, '/')
}

/**
 * Get safe log filename from test name
 */
function getLogFilename(testName) {
  return testName.replace(/\//g, '_').replace(/[<>:"|?*]/g, '_') + '.log'
}

/**
 * Run a single test file via CLI
 */
function runTest(testPath) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const testName = getTestName(testPath)
    const logFilename = getLogFilename(testName)
    const logPath = join(RAW_LOGS_DIR, logFilename)
    
    // Parse command - handle both "cmd arg1 arg2" and "cmd" formats
    const cmdParts = POWERCELL_CMD.trim().split(/\s+/)
    const cmd = cmdParts[0]
    const baseArgs = cmdParts.slice(1)
    
    // Add test path as argument
    // If command contains placeholders like %s or {path}, replace them
    // Otherwise, append testPath to args
    let args = [...baseArgs]
    const cmdStr = POWERCELL_CMD
    if (cmdStr.includes('{path}') || cmdStr.includes('%s')) {
      args = baseArgs.map(arg => 
        arg.replace('{path}', testPath).replace('%s', testPath)
      )
    } else {
      args.push(testPath)
    }
    
    console.log(`\n▶️  Running: ${testName}`)
    console.log(`   Command: ${cmd} ${args.join(' ')}`)
    
    const child = spawn(cmd, args, {
      cwd: ROOT_DIR,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    })
    
    let stdout = ''
    let stderr = ''
    
    child.stdout.on('data', (data) => {
      const text = data.toString()
      stdout += text
      process.stdout.write(text)
    })
    
    child.stderr.on('data', (data) => {
      const text = data.toString()
      stderr += text
      process.stderr.write(text)
    })
    
    child.on('close', async (exitCode) => {
      const durationMs = Date.now() - startTime
      const status = exitCode === 0 ? 'pass' : 'fail'
      
      // Combine stdout and stderr for log
      const fullLog = `=== STDOUT ===\n${stdout}\n\n=== STDERR ===\n${stderr}`
      
      // Save raw log
      try {
        await mkdir(dirname(logPath), { recursive: true })
        await writeFile(logPath, fullLog, 'utf-8')
      } catch (error) {
        console.error(`⚠️  Failed to save log for ${testName}:`, error.message)
      }
      
      // Extract error snippet (last ~40 lines)
      const errorSnippet = getErrorSnippet(fullLog)
      
      resolve({
        testName,
        path: relative(ROOT_DIR, testPath),
        status,
        exitCode: exitCode || 0,
        durationMs,
        errorSnippet,
      })
    })
    
    child.on('error', async (error) => {
      const durationMs = Date.now() - startTime
      const fullLog = `=== ERROR ===\n${error.message}\n${error.stack || ''}`
      
      // Save raw log
      try {
        await mkdir(dirname(logPath), { recursive: true })
        await writeFile(logPath, fullLog, 'utf-8')
      } catch (err) {
        // Ignore
      }
      
      resolve({
        testName,
        path: relative(ROOT_DIR, testPath),
        status: 'fail',
        exitCode: 1,
        durationMs,
        errorSnippet: getErrorSnippet(fullLog),
      })
    })
  })
}

/**
 * Extract error snippet (last ~40 lines)
 */
function getErrorSnippet(log) {
  if (!log || log.trim().length === 0) {
    return ''
  }
  
  const lines = log.split('\n')
  
  // If log is short, return it all
  if (lines.length <= 40) {
    return log
  }
  
  // Get last 40 lines
  return lines.slice(-40).join('\n')
}

/**
 * Main execution
 */
async function main() {
  // Ensure reports directory exists
  await mkdir(RAW_LOGS_DIR, { recursive: true })
  
  let allTestFiles = []
  
  // If --file option is used, use that single file
  if (singleFile) {
    const resolvedPath = resolve(ROOT_DIR, singleFile)
    try {
      const stats = await stat(resolvedPath)
      if (stats.isFile()) {
        allTestFiles = [resolvedPath]
        console.log(`\n🧪 Powercell Suite Runner`)
        console.log(`📁 Single file: ${relative(ROOT_DIR, resolvedPath)}`)
      } else {
        console.error(`❌ Path is not a file: ${singleFile}`)
        process.exit(1)
      }
    } catch (error) {
      console.error(`❌ File not found: ${singleFile}`)
      process.exit(1)
    }
  } else {
    // Determine which directories to search
    const searchDirs = suite 
      ? [SUITE_DIRS[suite]]
      : Object.values(SUITE_DIRS)
    
    console.log(`\n🧪 Powercell Suite Runner`)
    if (suite) {
      console.log(`📁 Suite: ${suite}`)
    } else {
      console.log(`📁 All suites`)
    }
    
    // Find all test files
    for (const dir of searchDirs) {
      try {
        const files = await findTestFiles(dir)
        allTestFiles.push(...files)
      } catch (error) {
        console.error(`⚠️  Error reading directory ${dir}:`, error.message)
      }
    }
    
    if (allTestFiles.length === 0) {
      console.log('❌ No test files found')
      process.exit(1)
    }
  }
  
  console.log(`🔧 Command: ${POWERCELL_CMD}`)
  console.log(`📋 Found ${allTestFiles.length} test file(s)\n`)
  
  // Run tests one by one (continue on failure)
  const results = []
  let hasFailures = false
  
  for (const testFile of allTestFiles) {
    const result = await runTest(testFile)
    results.push(result)
    
    if (result.status === 'fail') {
      hasFailures = true
      console.log(`❌ Failed: ${result.testName} (${result.durationMs}ms)`)
    } else {
      console.log(`✅ Passed: ${result.testName} (${result.durationMs}ms)`)
    }
  }
  
  // Write summary
  const summary = {
    timestamp: new Date().toISOString(),
    suite: suite || (singleFile ? 'single-file' : 'all'),
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    durationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
    tests: results,
  }
  
  const summaryPath = join(REPORTS_DIR, 'summary.json')
  await mkdir(dirname(summaryPath), { recursive: true })
  await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8')

  // Automatically generate markdown report
  try {
    const reportScript = join(ROOT_DIR, 'scripts', 'powercell-report.mjs')
    const reportProcess = spawn('node', [reportScript], {
      cwd: ROOT_DIR,
      stdio: 'pipe',
      shell: false,
    })

    let reportStdout = ''
    let reportStderr = ''

    reportProcess.stdout.on('data', (data) => {
      reportStdout += data.toString()
    })

    reportProcess.stderr.on('data', (data) => {
      reportStderr += data.toString()
    })

    await new Promise((resolve) => {
      reportProcess.on('close', (code) => {
        if (code === 0) {
          // Only show success message if report was generated
          if (reportStdout.includes('✅')) {
            console.log(reportStdout.trim())
          }
        } else {
          // Non-fatal: warn but don't fail the test run
          console.warn('⚠️  Failed to generate markdown report (non-fatal)')
          if (reportStderr) {
            console.warn(reportStderr.trim())
          }
        }
        resolve()
      })
      reportProcess.on('error', () => {
        // Non-fatal: warn but don't fail the test run
        console.warn('⚠️  Failed to run report generator (non-fatal)')
        resolve()
      })
    })
  } catch (error) {
    // Non-fatal: warn but don't fail the test run
    console.warn('⚠️  Failed to generate markdown report (non-fatal):', error.message)
  }

  // Print summary to console
  console.log(`\n📊 Summary:`)
  console.log(`   Total:    ${summary.total}`)
  console.log(`   ✅ Passed: ${summary.passed}`)
  console.log(`   ❌ Failed: ${summary.failed}`)
  console.log(`   ⏱️  Duration: ${(summary.durationMs / 1000).toFixed(2)}s`)
  console.log(`\n📄 Summary saved to: ${relative(ROOT_DIR, summaryPath)}`)
  console.log(`📁 Raw logs saved to: ${relative(ROOT_DIR, RAW_LOGS_DIR)}\n`)
  
  // Exit with appropriate code: 1 if any failures, 0 otherwise
  process.exit(hasFailures ? 1 : 0)
}

// Run main
main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
