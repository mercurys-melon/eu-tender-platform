#!/usr/bin/env node
/**
 * Dev Test Runner
 * Starts dev server, waits for readiness, runs tests, then stops server
 * Uses only Node.js stdlib
 */

import { spawn } from 'node:child_process'
import { get } from 'node:http'
import { get as httpsGet } from 'node:https'
import { join, dirname } from 'node:path'
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

// Validate suite
if (suite && !['smoke', 'journeys', 'edges'].includes(suite)) {
  console.error(`❌ Invalid suite: ${suite}. Must be one of: smoke, journeys, edges`)
  process.exit(1)
}

// Configuration
const TEST_APP_URL = process.env.TEST_APP_URL || 'http://localhost:3000'
const HEALTH_CHECK_ENDPOINT = '/api/leads'
const POLL_INTERVAL_MS = 1000 // Check every second
const POLL_TIMEOUT_MS = 60000 // 60 seconds timeout

let devServerProcess = null

/**
 * Poll health check endpoint until ready or timeout
 */
function waitForServerReady() {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const url = `${TEST_APP_URL}${HEALTH_CHECK_ENDPOINT}`
    const isHttps = url.startsWith('https://')
    const httpModule = isHttps ? httpsGet : get

    const check = () => {
      const elapsed = Date.now() - startTime

      if (elapsed > POLL_TIMEOUT_MS) {
        reject(new Error(`Timeout waiting for server after ${POLL_TIMEOUT_MS}ms`))
        return
      }

      const req = httpModule(url, (res) => {
        if (res.statusCode === 200) {
          console.log(`✅ Server is ready (${elapsed}ms)`)
          resolve()
        } else {
          // Not ready yet, try again
          setTimeout(check, POLL_INTERVAL_MS)
        }
        res.resume() // Consume response to free up memory
      })

      req.on('error', (error) => {
        // Connection error - server not up yet, try again
        if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
          setTimeout(check, POLL_INTERVAL_MS)
        } else {
          reject(error)
        }
      })

      req.setTimeout(2000, () => {
        req.destroy()
        // Timeout on individual request, try again
        setTimeout(check, POLL_INTERVAL_MS)
      })
    }

    console.log(`⏳ Waiting for server at ${url}...`)
    check()
  })
}

/**
 * Start dev server
 */
function startDevServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting dev server...')

    // Use npm to run dev script to ensure proper environment
    devServerProcess = spawn('npm', ['run', 'dev'], {
      cwd: ROOT_DIR,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    })

    let hasResolved = false

    // Buffer output for debugging
    let stdout = ''
    let stderr = ''

    devServerProcess.stdout.on('data', (data) => {
      const text = data.toString()
      stdout += text
      // Next.js dev server prints "Ready" when ready, but we'll use health check instead
      process.stdout.write(text)
    })

    devServerProcess.stderr.on('data', (data) => {
      const text = data.toString()
      stderr += text
      process.stderr.write(text)
    })

    devServerProcess.on('error', (error) => {
      if (!hasResolved) {
        hasResolved = true
        reject(error)
      }
    })

    devServerProcess.on('exit', (code) => {
      if (code !== null && code !== 0 && !hasResolved) {
        hasResolved = true
        reject(new Error(`Dev server exited with code ${code}`))
      }
    })

    // Give server a moment to start, then begin polling
    setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true
        resolve()
      }
    }, 2000)
  })
}

/**
 * Stop dev server
 */
function stopDevServer() {
  return new Promise((resolve) => {
    if (!devServerProcess) {
      resolve()
      return
    }

    console.log('\n🛑 Stopping dev server...')

    // Try to kill the process
    try {
      if (process.platform === 'win32') {
        // Windows: try kill first, then taskkill as fallback
        if (devServerProcess.kill) {
          devServerProcess.kill()
        }
        
        // Also try to kill the entire process tree using taskkill
        // This handles npm's child processes
        const killProcess = spawn('taskkill', ['/F', '/T', '/PID', devServerProcess.pid.toString()], {
          shell: true,
          stdio: 'ignore'
        })
        
        killProcess.on('close', () => {
          // Give it a moment, then resolve
          setTimeout(resolve, 500)
        })
        
        // Timeout fallback
        setTimeout(() => resolve(), 3000)
      } else {
        // Unix: send SIGTERM first
        devServerProcess.kill('SIGTERM')

        // Force kill after timeout
        const forceKillTimeout = setTimeout(() => {
          if (devServerProcess && !devServerProcess.killed) {
            devServerProcess.kill('SIGKILL')
          }
          resolve()
        }, 5000)

        devServerProcess.on('exit', () => {
          clearTimeout(forceKillTimeout)
          resolve()
        })
      }
    } catch (error) {
      // If kill fails, just resolve (process might already be dead)
      console.warn('⚠️  Warning: Could not stop dev server cleanly:', error.message)
      resolve()
    }
  })
}

/**
 * Run test suite
 */
function runTests() {
  return new Promise((resolve) => {
    // Determine which test script to run
    const testScript = suite ? `test:${suite}` : 'test:powercell'
    console.log(`\n🧪 Running tests: ${testScript}`)

    const testProcess = spawn('npm', ['run', testScript], {
      cwd: ROOT_DIR,
      shell: true,
      stdio: 'inherit',
      env: { ...process.env }
    })

    testProcess.on('close', (code) => {
      resolve(code || 0)
    })

    testProcess.on('error', (error) => {
      console.error('❌ Error running tests:', error.message)
      resolve(1)
    })
  })
}

/**
 * Main execution
 */
async function main() {
  let exitCode = 0

  try {
    // Start dev server
    await startDevServer()

    // Wait for server to be ready
    await waitForServerReady()

    // Run tests
    const testExitCode = await runTests()
    exitCode = testExitCode

  } catch (error) {
    console.error('❌ Error:', error.message)
    exitCode = 1
  } finally {
    // Always stop dev server (even if tests fail)
    await stopDevServer()
  }

  process.exit(exitCode)
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⚠️  Interrupted, cleaning up...')
  await stopDevServer()
  process.exit(1)
})

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Terminated, cleaning up...')
  await stopDevServer()
  process.exit(1)
})

// Run main
main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
