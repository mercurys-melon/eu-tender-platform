#!/usr/bin/env node
/**
 * udbud.dk Functional Test Suite - Krav 1.1 og 1.2
 * Tests publication API for:
 * - Krav 1.1: "Udbud under tærskelværdi"
 * - Krav 1.2: "Forventet indkøb"
 * 
 * Genererer dokumentation i reports/udbuddk/functional-test/<timestamp>/
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync as readFile, readdirSync, statSync, appendFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { spawn } from 'node:child_process'
import readline from 'node:readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = join(__dirname, '..')

// Known SDK tags from git.erst.dk/udbud-dk/sdk (hardcoded fallback for help / defaults)
const KNOWN_SDK_TAGS = ['1.13.0-1.2.1', '1.13.0-1.1.2', '1.13.0-1.1.0', '1.13.0-1.0.0']
// Candidates for --sdk-version auto (demo only), in priority order
const SDK_VERSION_AUTO_CANDIDATES = ['1.13.0-1.3.0', '1.13.0-1.2.1', '1.13.0-1.1.2', '1.13.0-1.1.0', '1.13.0-1.0.0', '1.11.0-1.0.2', '1.11.0-1.0.1', '1.11.0-1.0.0']
const SDK_409_UNSUPPORTED = 'SDK-version ikke understøttet'

/** Never log --basic-user or --basic-pass values. Log only "✅ Basic Auth credentials received". For summary/debug use masked forms. */
function maskBasicUser(val) {
  if (val == null || String(val).trim() === '') return 'N/A'
  const s = String(val).trim()
  if (s.length <= 1) return '*'
  return s[0] + '***' + s[s.length - 1]
}
function maskBasicPass() {
  return '***'
}

// Load environment variables from .env.local
function loadEnv() {
  const envPath = join(ROOT_DIR, '.env.local')
  const env = { ...process.env }

  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim()
          // Remove quotes if present
          env[key.trim()] = value.replace(/^["']|["']$/g, '')
        }
      }
    }
  }

  return env
}

const env = loadEnv()

/**
 * Show usage/help information
 */
function showUsage() {
  console.log('📖 udbud.dk Functional Test Suite - Usage\n')
  console.log('This script authenticates by fetching an OIDC access token using Basic Auth')
  console.log('credentials issued by udbud.dk, then calls validate/publish endpoints.\n')
  console.log('Usage examples:\n')
  console.log('  # Interactive mode (prompts for credentials):')
  console.log('  npm run udbud:functional-test\n')
  console.log('  # With Basic Auth credentials (note: npm requires -- before args):')
  console.log('  npm run udbud:functional-test -- --basic-user <username> --basic-pass <password>\n')
  console.log('  # With all options (no prompt):')
  console.log('  npm run udbud:functional-test -- --env demo --api-base-url <url> --sdk-version <tag> --basic-user <u> --basic-pass <p>\n')
  console.log('Arguments (required):')
  console.log('  --api-base-url <url>       API base URL (required)')
  console.log('  --sdk-version <tag>         Git tag from git.erst.dk/udbud-dk/sdk (e.g. 1.13.0-1.3.0, current likely DEMO version), or auto (demo only)')
  console.log(`                             Known tags (fallback): ${KNOWN_SDK_TAGS.join(', ')}`)
  console.log('Arguments (optional):')
  console.log('  --env <env>                demo (default sdk-version 1.13.0-1.3.0) or prod (requires --sdk-version)')
  console.log('  --basic-user <username>    Basic Auth username (from email)')
  console.log('  --basic-pass <password>    Basic Auth password (from SMS)')
  console.log('  --token-url <url>          OIDC token endpoint (default: PREPROD)')
  console.log('  --run-id <id>              Deterministic run ID for idempotency (default: timestamp)')
  console.log('  --help, -h                 Show this help message\n')
  console.log('Environment variables (alternative to CLI args for optional):')
  console.log('  UDBUD_DK_BASIC_USER        Basic Auth username')
  console.log('  UDBUD_DK_BASIC_PASS        Basic Auth password')
  console.log('  UDBUD_DK_TOKEN_URL         OIDC token endpoint')
  console.log('  UDBUD_FUNCTIONAL_TEST_RUN_ID  Run ID for idempotency')
  console.log('  UDBUD_BEKENDTGOERELSE_XML_BASE64  Base64-encoded bekendtgoerelse XML (hvis sat, valideres før API-kald)\n')
}

/**
 * Parse CLI arguments
 */
function parseCLIArgs() {
  const args = process.argv.slice(2)
  const parsed = {
    apiBaseUrl: null,
    sdkVersion: null,
    env: null,
    basicUser: null,
    basicPass: null,
    tokenUrl: null,
    runId: null,
    help: false,
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      parsed.help = true
    } else if (args[i] === '--api-base-url' && i + 1 < args.length) {
      parsed.apiBaseUrl = args[i + 1]
      i++
    } else if (args[i] === '--sdk-version' && i + 1 < args.length) {
      parsed.sdkVersion = args[i + 1]
      i++
    } else if (args[i] === '--env' && i + 1 < args.length) {
      parsed.env = args[i + 1]
      i++
    } else if (args[i] === '--basic-user' && i + 1 < args.length) {
      parsed.basicUser = args[i + 1]
      i++
    } else if (args[i] === '--basic-pass' && i + 1 < args.length) {
      parsed.basicPass = args[i + 1]
      i++
    } else if (args[i] === '--token-url' && i + 1 < args.length) {
      parsed.tokenUrl = args[i + 1]
      i++
    } else if (args[i] === '--run-id' && i + 1 < args.length) {
      parsed.runId = args[i + 1]
      i++
    }
  }

  return parsed
}

const MAX_PROMPT_ATTEMPTS = 3
const USERNAME_EMPTY_MSG = 'Username cannot be empty — please paste it'
const PASSWORD_EMPTY_MSG = 'Password cannot be empty — please paste it'

/**
 * Prompt user for Basic Auth credentials interactively (max 3 attempts each)
 */
function promptForBasicAuth() {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const done = (err) => {
      rl.close()
      if (err) reject(err)
    }

    // Note: Node.js readline doesn't support native password hiding
    console.log('⚠️  WARNING: Password input will be visible as you type')

    function askUsername(attempt) {
      if (attempt > MAX_PROMPT_ATTEMPTS) {
        done(new Error('Basic Auth username empty after 3 attempts'))
        return
      }
      const prompt = attempt === 1 ? 'Paste Basic Auth username (from email): ' : `${USERNAME_EMPTY_MSG}\nPaste Basic Auth username (from email): `
      rl.question(prompt, (userAnswer) => {
        const trimmedUser = userAnswer.trim()
        if (!trimmedUser) {
          console.log(USERNAME_EMPTY_MSG)
          askUsername(attempt + 1)
          return
        }
        currentStep = 'awaiting basic auth password'
        askPassword(trimmedUser, 1)
      })
    }

    function askPassword(basicUser, attempt) {
      if (attempt > MAX_PROMPT_ATTEMPTS) {
        done(new Error('Basic Auth password empty after 3 attempts'))
        return
      }
      const prompt = attempt === 1 ? 'Paste Basic Auth password (from SMS): ' : `${PASSWORD_EMPTY_MSG}\nPaste Basic Auth password (from SMS): `
      rl.question(prompt, (passAnswer) => {
        const trimmedPass = passAnswer.trim()
        if (!trimmedPass) {
          console.log(PASSWORD_EMPTY_MSG)
          askPassword(basicUser, attempt + 1)
          return
        }
        rl.close()
        resolve({ basicUser, basicPass: trimmedPass })
      })
    }

    rl.on('SIGINT', () => {
      rl.close()
      reject(new Error('Interrupted by user'))
    })

    askUsername(1)
  })
}

// Create timestamped report directory IMMEDIATELY (before any checks)
const now = new Date()
// Format: YYYY-MM-DDTHH-MM-SS (remove milliseconds and timezone)
const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5) // YYYY-MM-DDTHH-MM-SS
const REPORT_DIR = join(ROOT_DIR, 'reports', 'udbuddk', 'functional-test', timestamp)

// Create report directory immediately
mkdirSync(REPORT_DIR, { recursive: true })

// Calculate relative path for logging (no secrets)
const relativeReportPath = `reports/udbuddk/functional-test/${timestamp}`

// Parse CLI arguments early to check for --help
const cliArgs = parseCLIArgs()

// Show help and exit if requested
if (cliArgs.help) {
  showUsage()
  process.exit(0)
}

/**
 * Format date/time helper
 */
function formatDateTime(date) {
  const local = date.toLocaleString('da-DK', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const iso = date.toISOString()
  return { local, iso }
}

/**
 * Write initial bootstrap summary.md
 */
function writeBootstrapSummary(missingInputs = []) {
  const { local, iso } = formatDateTime(now)
  
  let summary = `# Funktionsmæssig Test - Summary\n\n`
  summary += `**Dato/Tid (lokal):** ${local}\n`
  summary += `**Dato/Tid (ISO):** ${iso}\n\n`
  summary += `**Report Directory:** ${REPORT_DIR}\n\n`
  summary += `**Status:** STARTED\n\n`
  
  if (missingInputs.length > 0) {
    summary += `**Inputs missing:** ${missingInputs.join(', ')}\n\n`
  }
  
  const summaryFile = join(REPORT_DIR, 'summary.md')
  writeFileSync(summaryFile, summary, 'utf-8')
}

// Show usage information at start
console.log('📖 udbud.dk Functional Test Suite')
console.log('='.repeat(60))
console.log('This script authenticates by fetching an OIDC access token using Basic Auth')
console.log('credentials issued by udbud.dk, then calls validate/publish endpoints.')
console.log('='.repeat(60))
console.log(`📁 Report directory: ${relativeReportPath}`)

// Write bootstrap summary.md immediately (will be updated later)
writeBootstrapSummary([])
console.log(`📄 Bootstrap summary.md created`)

// Log initial step
logProgress('START')

// Track current step for abort handling
let currentStep = 'initialized'

/**
 * Log progress to progress.log (one line per step, no secrets)
 */
function logProgress(step) {
  try {
    const timestamp = new Date().toISOString()
    const progressFile = join(REPORT_DIR, 'progress.log')
    const logLine = `${timestamp} ${step}\n`
    appendFileSync(progressFile, logLine, 'utf-8')
  } catch (error) {
    // Don't fail script if logging fails
    console.warn(`⚠️  Could not write to progress.log: ${error.message}`)
  }
}

/**
 * Handle script interruption (SIGINT/SIGTERM)
 */
function handleAbort(signal) {
  console.log(`\n\n⚠️  Script interrupted (${signal})`)
  console.log(`   Current step: ${currentStep}`)
  
  // Log abort to progress.log
  logProgress('ABORTED')
  
  // Append abort status to summary.md
  try {
    const summaryFile = join(REPORT_DIR, 'summary.md')
    
    // Read existing summary if it exists, otherwise create bootstrap
    let summary = ''
    if (existsSync(summaryFile)) {
      summary = readFileSync(summaryFile, 'utf-8')
      // Remove any existing status line
      summary = summary.replace(/\*\*Status:\*\* .+\n\n/g, '')
    } else {
      // Create bootstrap summary if it doesn't exist
      const { local, iso } = formatDateTime(now)
      summary = `# Funktionsmæssig Test - Summary\n\n`
      summary += `**Dato/Tid (lokal):** ${local}\n`
      summary += `**Dato/Tid (ISO):** ${iso}\n\n`
      summary += `**Report Directory:** ${REPORT_DIR}\n\n`
    }
    
    const abortTime = new Date()
    const { local, iso } = formatDateTime(abortTime)
    
    summary += `\n---\n\n`
    summary += `**Status:** ABORTED\n\n`
    summary += `**Aborted at (lokal):** ${local}\n`
    summary += `**Aborted at (ISO):** ${iso}\n\n`
    summary += `**Step:** ${currentStep}\n\n`
    
    writeFileSync(summaryFile, summary, 'utf-8')
    console.log(`📄 Abort status written to: ${relativeReportPath}/summary.md`)
  } catch (error) {
    console.error(`⚠️  Could not write abort status to summary.md: ${error.message}`)
  }
  
  process.exit(1)
}

// Register signal handlers
process.on('SIGINT', () => handleAbort('SIGINT'))
process.on('SIGTERM', () => handleAbort('SIGTERM'))

/**
 * Write error summary to summary.md (appends to or replaces bootstrap)
 */
function writeErrorSummary(missingInputs) {
  const { local, iso } = formatDateTime(now)
  
  let summary = `# Funktionsmæssig Test - Summary\n\n`
  summary += `**Dato/Tid (lokal):** ${local}\n`
  summary += `**Dato/Tid (ISO):** ${iso}\n\n`
  summary += `**Report Directory:** ${REPORT_DIR}\n\n`
  summary += `**api-base-url:** ${cliArgs.apiBaseUrl || 'N/A (required)'}\n\n`
  summary += `**sdk-version:** ${cliArgs.sdkVersion ?? 'N/A (required)'}\n\n`
  summary += `**Status:** ERROR - Manglende Inputs\n\n`
  summary += `## Fejl: Manglende Inputs\n\n`
  summary += `Scriptet kunne ikke køre fordi følgende påkrævede inputs mangler:\n\n`
  
  const missingInputNames = []
  for (const input of missingInputs) {
    missingInputNames.push(input.name)
    summary += `- ❌ **${input.name}**: ${input.description}\n`
    if (input.suggestions && input.suggestions.length > 0) {
      summary += `  - Forslag: ${input.suggestions.join(', ')}\n`
    }
  }
  
  summary += `\n**Inputs missing:** ${missingInputNames.join(', ')}\n\n`
  summary += `## Løsning\n\n`
  summary += `For at køre scriptet skal du:\n\n`
  summary += `1. Enten tilføje de manglende inputs via CLI argumenter:\n`
  summary += `   \`npm run udbud:functional-test -- --api-base-url <url> --sdk-version <v> [--basic-user <u> --basic-pass <p>]\`\n\n`
  summary += `2. Eller sætte dem som environment variabler i .env.local eller system environment\n\n`
  summary += `3. Eller indtaste credentials interaktivt når scriptet beder om det\n\n`
  
  const summaryFile = join(REPORT_DIR, 'summary.md')
  writeFileSync(summaryFile, summary, 'utf-8')
  
  // Append final summary section (no token, no test results)
  let finalSection = `\n---\n\n`
  finalSection += `## Afsluttende Sektion\n\n`
  finalSection += `- **api-base-url:** ${cliArgs.apiBaseUrl || 'N/A'}\n`
  finalSection += `- **sdk-version:** ${cliArgs.sdkVersion ?? 'N/A'}\n\n`
  finalSection += `### AUTH\n\n`
  finalSection += `- **Token fetched:** no\n`
  finalSection += `\n`
  finalSection += `### Krav 1.1 (Afsend annonce under tærskel)\n\n`
  finalSection += `- **Validate HTTP status:** N/A\n`
  finalSection += `- **Publish HTTP status:** N/A\n`
  finalSection += `- **success:** no\n`
  finalSection += `- **timestamp:** ${iso}\n`
  finalSection += `\n`
  finalSection += `### Krav 1.2 (Afsend forventet indkøb)\n\n`
  finalSection += `- **Validate HTTP status:** N/A\n`
  finalSection += `- **Publish HTTP status:** N/A\n`
  finalSection += `- **success:** no\n`
  finalSection += `- **timestamp:** ${iso}\n`
  finalSection += `\n`
  finalSection += `### Overall result\n\n`
  finalSection += `FAIL\n\n`
  appendFileSync(summaryFile, finalSection, 'utf-8')
  
  console.log(`📄 Error summary written to: ${relativeReportPath}/summary.md`)
}

// Configuration - required CLI only (no .env for API/SDK)
const TOKEN_URL = cliArgs.tokenUrl || env.UDBUD_DK_TOKEN_URL || 'https://erstpreprod.virk.dk/auth/token?grant_type=client_credentials'

let basicUser = (cliArgs.basicUser || env.UDBUD_DK_BASIC_USER || '').trim()
let basicPass = (cliArgs.basicPass || env.UDBUD_DK_BASIC_PASS || '').trim()
const hadBasicUser = cliArgs.basicUser != null || !!env.UDBUD_DK_BASIC_USER
const hadBasicPass = cliArgs.basicPass != null || !!env.UDBUD_DK_BASIC_PASS
if ((hadBasicUser || hadBasicPass) && (!basicUser || !basicPass)) {
  writeErrorSummary([{ name: 'Basic Auth', description: '--basic-user and --basic-pass must not be empty when provided.' }])
  console.error('\n❌ --basic-user and --basic-pass must not be empty when provided.')
  console.error(`   See ${relativeReportPath}/summary.md for details`)
  process.exit(1)
}

// Check for missing or invalid required inputs: --api-base-url and --sdk-version (Basic Auth can be prompted)
const prodSdkMessage = 'With --env prod, --sdk-version is required. Provide a real tag from udbud.dk SDK repo.'
const autoOnlyDemoMessage = '--sdk-version auto is only allowed with --env demo. In PROD use an explicit tag.'
const invalidSdkMessage = 'Invalid sdk-version. Provide a real tag from udbud.dk SDK repo.'
const missingInputs = []
if (!cliArgs.apiBaseUrl || !cliArgs.apiBaseUrl.trim()) {
  missingInputs.push({ name: '--api-base-url', description: 'API base URL (required)', suggestions: ['e.g. https://preprod.udbud.dk'] })
}
const sdkVersionStr = cliArgs.sdkVersion != null ? String(cliArgs.sdkVersion).trim() : ''
if (sdkVersionStr === 'auto') {
  if (cliArgs.env !== 'demo') {
    missingInputs.push({ name: '--sdk-version', description: autoOnlyDemoMessage })
  }
} else if (!sdkVersionStr) {
  if (cliArgs.env === 'demo') {
    cliArgs.sdkVersion = '1.13.0-1.3.0'
  } else if (cliArgs.env === 'prod') {
    missingInputs.push({ name: '--sdk-version', description: prodSdkMessage })
  } else {
    missingInputs.push({ name: '--sdk-version', description: 'SDK version for endpoint path (required)', suggestions: ['e.g. 1'] })
  }
} else if (sdkVersionStr.includes('<') || sdkVersionStr.includes('>')) {
  missingInputs.push({ name: '--sdk-version', description: invalidSdkMessage })
}

// Note: Basic Auth can be prompted interactively, so we handle it separately below

// If there are missing/invalid inputs (other than Basic Auth), write error summary and exit
if (missingInputs.length > 0) {
  writeErrorSummary(missingInputs)
  const hasProdSdk = missingInputs.some((i) => i.description === prodSdkMessage)
  const hasAutoOnlyDemo = missingInputs.some((i) => i.description === autoOnlyDemoMessage)
  const hasInvalidSdk = missingInputs.some((i) => i.description === invalidSdkMessage)
  if (hasProdSdk) {
    console.error(`\n❌ ${prodSdkMessage}`)
  } else if (hasAutoOnlyDemo) {
    console.error(`\n❌ ${autoOnlyDemoMessage}`)
  } else if (hasInvalidSdk) {
    console.error(`\n❌ ${invalidSdkMessage}`)
  } else {
    console.error('\n❌ Error: Required inputs are missing')
  }
  console.error(`   See ${relativeReportPath}/summary.md for details`)
  process.exit(1)
}

// Handle Basic Auth - try interactive prompt if missing
if (!basicUser || !basicPass) {
  const missing = []
  if (!basicUser) missing.push('--basic-user')
  if (!basicPass) missing.push('--basic-pass')
  
  // Update bootstrap summary with missing inputs
  writeBootstrapSummary(missing)
  
  console.log(`⚠️  Missing inputs: ${missing.join(', ')}`)
  console.log('   Prompting interactively...')
  
  currentStep = 'awaiting basic auth username'
  logProgress('AWAITING_USERNAME')
  promptForBasicAuth()
    .then((credentials) => {
      basicUser = credentials.basicUser
      basicPass = credentials.basicPass
      console.log('✅ Basic Auth credentials received')
      logProgress('GOT_USERNAME')
      currentStep = 'awaiting basic auth password'
      logProgress('AWAITING_PASSWORD')
      currentStep = 'fetching access token'
      logProgress('GOT_PASSWORD')
      // Continue with token retrieval and script execution
      getAccessTokenAndRun()
    })
    .catch((error) => {
      writeErrorSummary([{
        name: 'Basic Auth Credentials',
        description: error.message || 'Kunne ikke hentes interaktivt',
        suggestions: ['Bruger afbrød indtastning', 'Tom username/password efter 3 forsøg', 'Prøv igen med --basic-user og --basic-pass argumenter']
      }])
      console.error('❌ Error: Failed to get Basic Auth credentials:', error.message)
      console.error(`   See ${relativeReportPath}/summary.md for details`)
      process.exit(1)
    })
} else {
  // Basic Auth from CLI/env; never log values
  console.log('✅ Basic Auth credentials received')
  currentStep = 'fetching access token'
  logProgress('GOT_CREDENTIALS')
  getAccessTokenAndRun()
}

/**
 * Get OIDC access token and then run tests
 */
async function getAccessTokenAndRun() {
  try {
    // Update summary with status: getting token
    currentStep = 'fetching access token'
    logProgress('FETCHING_TOKEN')
    const { local, iso } = formatDateTime(now)
    let summary = `# Funktionsmæssig Test - Summary\n\n`
    summary += `**Dato/Tid (lokal):** ${local}\n`
    summary += `**Dato/Tid (ISO):** ${iso}\n\n`
    summary += `**Report Directory:** ${REPORT_DIR}\n\n`
    summary += `**Status:** AUTHENTICATING\n\n`
    const summaryFile = join(REPORT_DIR, 'summary.md')
    writeFileSync(summaryFile, summary, 'utf-8')
    
    const tokenData = await getAccessToken(basicUser, basicPass, TOKEN_URL)
    logProgress('GOT_TOKEN')
    
    // Update summary with status: running tests
    currentStep = 'running tests'
    logProgress('INITIALIZING')
    summary = `# Funktionsmæssig Test - Summary\n\n`
    summary += `**Dato/Tid (lokal):** ${local}\n`
    summary += `**Dato/Tid (ISO):** ${iso}\n\n`
    summary += `**Report Directory:** ${REPORT_DIR}\n\n`
    summary += `**Status:** RUNNING TESTS\n\n`
    writeFileSync(summaryFile, summary, 'utf-8')
    
    // Continue with script execution
    initializeAndRun(tokenData.access_token, tokenData.expires_in)
  } catch (error) {
    logProgress('TOKEN_ERROR')
    // Write error to summary.md (without secrets)
    const { local, iso } = formatDateTime(now)
    let summary = `# Funktionsmæssig Test - Summary\n\n`
    summary += `**Dato/Tid (lokal):** ${local}\n`
    summary += `**Dato/Tid (ISO):** ${iso}\n\n`
    summary += `**Report Directory:** ${REPORT_DIR}\n\n`
    summary += `**api-base-url:** ${cliArgs.apiBaseUrl || 'N/A'}\n\n`
    summary += `**sdk-version:** ${cliArgs.sdkVersion ?? 'N/A'}\n\n`
    summary += `**Status:** ERROR - Token-hentning fejlede\n\n`
    summary += `## Fejl: Token-hentning fejlede\n\n`
    summary += `Scriptet kunne ikke hente OIDC access token fra token endpoint.\n\n`
    summary += `**Token URL:** ${TOKEN_URL}\n\n`
    summary += `**Fejlbesked:** ${error.message}\n\n`
    summary += `**Mulige årsager:**\n`
    summary += `- Forkerte Basic Auth credentials\n`
    summary += `- Token URL er ikke tilgængelig\n`
    summary += `- Netværksfejl\n\n`
    summary += `**Løsning:**\n`
    summary += `1. Verificer Basic Auth credentials (--basic-user og --basic-pass)\n`
    summary += `2. Tjek at token URL er korrekt (--token-url)\n`
    summary += `3. Verificer netværksforbindelse\n\n`
    
    const summaryFile = join(REPORT_DIR, 'summary.md')
    writeFileSync(summaryFile, summary, 'utf-8')
    
    // Append final summary section (no token, no test results)
    let finalSection = `\n---\n\n`
    finalSection += `## Afsluttende Sektion\n\n`
    finalSection += `- **api-base-url:** ${cliArgs.apiBaseUrl || 'N/A'}\n`
    finalSection += `- **sdk-version:** ${cliArgs.sdkVersion ?? 'N/A'}\n\n`
    finalSection += `### AUTH\n\n`
    finalSection += `- **Token fetched:** no\n`
    finalSection += `\n`
    finalSection += `### Krav 1.1 (Afsend annonce under tærskel)\n\n`
    finalSection += `- **Validate HTTP status:** N/A\n`
    finalSection += `- **Publish HTTP status:** N/A\n`
    finalSection += `- **success:** no\n`
    finalSection += `- **timestamp:** ${iso}\n`
    finalSection += `\n`
    finalSection += `### Krav 1.2 (Afsend forventet indkøb)\n\n`
    finalSection += `- **Validate HTTP status:** N/A\n`
    finalSection += `- **Publish HTTP status:** N/A\n`
    finalSection += `- **success:** no\n`
    finalSection += `- **timestamp:** ${iso}\n`
    finalSection += `\n`
    finalSection += `### Overall result\n\n`
    finalSection += `FAIL\n\n`
    appendFileSync(summaryFile, finalSection, 'utf-8')
    
    console.error('\n❌ Error: Failed to get access token:', error.message)
    console.error(`   See ${relativeReportPath}/summary.md for details`)
    process.exit(1)
  }
}

/**
 * Get OIDC access token using Basic Auth
 */
async function getAccessToken(basicUser, basicPass, tokenUrl) {
  // Create Basic Auth header
  const credentials = Buffer.from(`${basicUser}:${basicPass}`).toString('base64')
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  if (!response.ok) {
    let errorText = await response.text().catch(() => 'Unknown error')
    // Sanitize error text to remove any potential secrets
    // Remove any JSON that might contain credentials
    try {
      const errorJson = JSON.parse(errorText)
      // Remove sensitive fields if present
      if (errorJson.error_description) {
        errorText = `Error: ${errorJson.error || 'Token request failed'}`
      } else {
        errorText = `HTTP ${response.status} ${response.statusText}`
      }
    } catch {
      // Not JSON, use safe error message
      errorText = `HTTP ${response.status} ${response.statusText}`
    }
    throw new Error(`Token request failed: ${errorText}`)
  }

  const tokenData = await response.json()
  
  if (!tokenData.access_token) {
    throw new Error('Token response missing access_token field')
  }

  // Return both access_token and expires_in for summary reporting
  return {
    access_token: tokenData.access_token,
    expires_in: tokenData.expires_in || null,
  }
}

/**
 * Initialize configuration and run tests
 * This function is called after access token is obtained
 */
async function initializeAndRun(accessToken, tokenExpiresIn = null) {
  currentStep = 'initializing test environment'
  
  // Store accessToken in closure for use in nested functions
  // This token is used for all API calls and is never logged or written to disk
  const ACCESS_TOKEN = accessToken
  
  // Store token expiration info for summary (no secrets)
  const TOKEN_EXPIRES_IN = tokenExpiresIn

  // API endpoints from required CLI (no .env)
  const API_BASE_URL = (cliArgs.apiBaseUrl || '').replace(/\/$/, '')
  let SDK_VERSION = String(cliArgs.sdkVersion || '').trim()
  let sdkAutoTable = []

  if (SDK_VERSION === 'auto') {
    // auto only allowed with --env demo (enforced earlier); discover first supported version
    const rawCandidates = SDK_VERSION_AUTO_CANDIDATES
    const expandedCandidates = []
    for (const raw of rawCandidates) {
      expandedCandidates.push(raw)
      expandedCandidates.push(`eforms-sdk-dk-${raw}`)
    }
    expandedCandidates.push('eforms-sdk-dk-1.13.0', 'eforms-sdk-dk-1.11.0')
    const discoveryPayload = {
      title: 'Udbud under tærskelværdi - Funktionsmæssig test',
      description: 'Dette er et test-udbud under tærskelværdi oprettet som del af funktioneltesten.',
      category: 'IT Services',
      estimated_value: 500000,
      currency: 'DKK',
      submission_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      publication_date: new Date().toISOString(),
      entity_id: 'test-entity-123',
      espd_required: false,
      status: 'draft',
      type: 'below_threshold',
      notification_type: 'below_threshold_notice',
      threshold_value: 750000,
      justification: 'Udbud under tærskelværdi - test formål',
    }
    for (const candidate of expandedCandidates) {
      const url = `${API_BASE_URL}/ekstern-data/bekendtgoerelse/v1/${candidate}/valider`
      let status = ''
      let message = ''
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ACCESS_TOKEN}` },
          body: JSON.stringify(discoveryPayload),
        })
        status = String(res.status)
        const data = await res.json().catch(() => ({}))
        message = data.message ?? data.Message ?? data.debugMessage ?? data.debug_message ?? res.statusText ?? ''
        const is5xx = res.status >= 500 && res.status < 600
        const is409Unsupported = res.status === 409 && (String(message).includes(SDK_409_UNSUPPORTED))
        const isSupported = res.ok || (res.status === 400 || res.status === 422) && (data != null && typeof data === 'object' && !Array.isArray(data))
        if (is5xx) {
          sdkAutoTable.push({ version: candidate, status: res.status, message: (message || '') + (message ? ' ' : '') + '(inconclusive)' })
          continue
        }
        if (is409Unsupported) {
          sdkAutoTable.push({ version: candidate, status: res.status, message: message || (res.ok ? 'OK' : '') })
          continue
        }
        if (isSupported) {
          sdkAutoTable.push({ version: candidate, status: res.status, message: message || (res.ok ? 'OK' : '') })
          SDK_VERSION = candidate
          break
        }
        sdkAutoTable.push({ version: candidate, status: res.status, message: message || '' })
        continue
      } catch (err) {
        status = 'error'
        message = err.message || ''
        sdkAutoTable.push({ version: candidate, status: 'error', message: message })
        continue
      }
    }
    if (!SDK_VERSION || SDK_VERSION === 'auto') {
      console.error('❌ No supported SDK version found (all candidates returned 409 or 5xx).')
      const summaryFile = join(REPORT_DIR, 'summary.md')
      let summary = existsSync(summaryFile) ? readFileSync(summaryFile, 'utf-8') : ''
      summary += '\n## SDK version (auto)\n\nNo supported SDK version found (all candidates returned 409 or 5xx).\n\n| Version | Status | Message |\n|---------|--------|--------|\n'
      for (const row of sdkAutoTable) {
        summary += `| ${row.version} | ${row.status} | ${(row.message || '').replace(/\|/g, ' ').slice(0, 80)} |\n`
      }
      summary += '\n**Anbefaling:** Kontakt system@udbud.dk med requestId.\n\n'
      writeFileSync(summaryFile, summary, 'utf-8')
      process.exit(1)
    }
    console.log('Selected sdkVersion:', SDK_VERSION)
    console.log('SDK version (auto) tried:')
    console.log('| Version       | Status | Message |')
    console.log('|---------------|--------|--------|')
    for (const row of sdkAutoTable) {
      const msg = (row.message || '').replace(/\n/g, ' ').slice(0, 60)
      console.log(`| ${row.version.padEnd(13)} | ${String(row.status).padEnd(6)} | ${msg} |`)
    }
    const summaryFile = join(REPORT_DIR, 'summary.md')
    let summary = existsSync(summaryFile) ? readFileSync(summaryFile, 'utf-8') : ''
    summary += `\n## SDK version (auto)\n\n**Selected sdkVersion:** ${SDK_VERSION}\n\n| Version | Status | Message |\n|---------|--------|--------|\n`
    for (const row of sdkAutoTable) {
      summary += `| ${row.version} | ${row.status} | ${(row.message || '').replace(/\|/g, ' ').replace(/\n/g, ' ').slice(0, 80)} |\n`
    }
    summary += '\n'
    writeFileSync(summaryFile, summary, 'utf-8')
  }

  const VALIDATE_URL = `${API_BASE_URL}/ekstern-data/bekendtgoerelse/v1/${SDK_VERSION}/valider`
  const PUBLISH_URL = `${API_BASE_URL}/ekstern-data/bekendtgoerelse/v1/${SDK_VERSION}/publicer`

  // Supabase configuration for idempotency check
  const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || ''
  const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || ''

  // Initialize Supabase client if credentials are available
  let supabaseClient = null
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      console.log('✅ Supabase client initialized for idempotency checks')
    } catch (error) {
      console.warn('⚠️  Could not initialize Supabase client:', error.message)
      console.warn('   Will use API idempotency keys only')
    }
  } else {
    console.warn('⚠️  Supabase credentials not found - will use API idempotency keys only')
  }

  // Deterministic RUN_ID for idempotency - CLI arg takes precedence
  const RUN_ID = cliArgs.runId || process.env.UDBUD_FUNCTIONAL_TEST_RUN_ID || timestamp

  // Configurable idempotency header name
  const IDEMPOTENCY_HEADER = process.env.UDBUD_IDEMPOTENCY_HEADER || 'X-Idempotency-Key'

  // Log working directory (report directory already logged earlier)
  console.log('📁 Working directory:', process.cwd())

  // Test results
  const testResults = []

  /**
   * List of sensitive field patterns that should be redacted
   */
  const SENSITIVE_PATTERNS = [
  /key/i,
  /secret/i,
  /token/i,
  /password/i,
  /authorization/i,
  /auth/i,
  /credential/i,
  /api[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /client[_-]?secret/i,
    /bearer/i,
  ]

  /**
   * Check if a field name is sensitive
   */
  function isSensitiveField(key) {
    return SENSITIVE_PATTERNS.some(pattern => pattern.test(key))
  }

  /**
   * Sanitize string values that might contain tokens or secrets
   */
  function sanitizeString(value) {
  if (typeof value !== 'string') return value
  
  // Check for Bearer tokens
  if (/Bearer\s+[A-Za-z0-9\-._~+/]+/i.test(value)) {
    return '[REDACTED]'
  }
  
  // Check for client_secret patterns
  if (/client[_-]?secret\s*[:=]\s*[A-Za-z0-9\-._~+/]+/i.test(value)) {
    return '[REDACTED]'
  }
  
  // Check for access_token patterns
  if (/access[_-]?token\s*[:=]\s*[A-Za-z0-9\-._~+/]+/i.test(value)) {
    return '[REDACTED]'
  }
  
  // If value looks like a token (long alphanumeric string), be cautious
  // But don't redact everything - only if it's clearly a token pattern
  if (/^[A-Za-z0-9\-._~+/]{32,}$/.test(value) && value.length > 50) {
    // Might be a token, but we'll be conservative and only redact if in sensitive context
    return value
  }
  
    return value
  }

  /**
   * Sanitize request/response to remove secrets
   * 
   * For requests:
   * - Removes/replaces Authorization header with [REDACTED]
   * - Redacts sensitive fields
   * 
   * For responses:
   * - Keeps all data but redacts any tokens found in values
   */
  function sanitize(obj, isRequest = false) {
  if (!obj || typeof obj !== 'object') {
    return sanitizeString(obj)
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitize(item, isRequest))
  }

  const sanitized = { ...obj }

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase()
    
    // Always redact Authorization header in requests
    if (isRequest && (lowerKey === 'authorization' || lowerKey === 'auth')) {
      sanitized[key] = '[REDACTED]'
      continue
    }
    
    // Redact sensitive field names
    if (isSensitiveField(key)) {
      sanitized[key] = '[REDACTED]'
      continue
    }
    
    // Recursively sanitize nested objects
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitize(sanitized[key], isRequest)
    } else if (typeof sanitized[key] === 'string') {
      // Sanitize string values that might contain tokens
      sanitized[key] = sanitizeString(sanitized[key])
    }
  }

    return sanitized
  }

  /**
   * Validate that no secrets leaked into saved files
   * Asserts that "Bearer " and "client_secret" are not present in request files
   */
  function validateNoSecretsInFile(filePath, fileType) {
  try {
    const content = readFile(filePath, 'utf-8')
    const lowerContent = content.toLowerCase()
    
    const violations = []
    
    // Check for Bearer tokens (case-insensitive)
    if (/bearer\s+[a-z0-9\-._~+/]+/i.test(content)) {
      violations.push('Found "Bearer " token pattern in file')
    }
    
    // Check for client_secret patterns
    if (/client[_-]?secret\s*[:=]\s*[a-z0-9\-._~+/]+/i.test(content)) {
      violations.push('Found "client_secret" pattern in file')
    }
    
    // Check for access_token patterns
    if (/access[_-]?token\s*[:=]\s*[a-z0-9\-._~+/]+/i.test(content)) {
      violations.push('Found "access_token" pattern in file')
    }
    
    // Check for authorization header with actual token (not [REDACTED])
    if (/authorization\s*[:=]\s*["']?bearer\s+[a-z0-9\-._~+/]+/i.test(content)) {
      violations.push('Found Authorization header with actual token (not redacted)')
    }
    
    if (violations.length > 0) {
      console.error(`\n❌ SECURITY VIOLATION: Secrets found in ${fileType} file: ${filePath}`)
      violations.forEach(v => console.error(`   - ${v}`))
      throw new Error(`Security validation failed: Secrets detected in ${fileType} file`)
    }
    
    // Success
    console.log(`   ✅ Security validation passed for ${fileType} file`)
  } catch (error) {
    if (error.message.includes('Security validation failed')) {
      throw error
    }
      console.warn(`   ⚠️  Could not validate ${fileType} file: ${error.message}`)
    }
  }

  const MIN_XML_LENGTH = 200

  /**
   * Validate bekendtgoerelseXmlBase64 before API call: decode, check XML sanity.
   * Returns { ok: true } or { ok: false, error: string }. Logs decoded length + first 120 chars (safe).
   */
  function validateBekendtgoerelseXmlBase64(payload, testCaseName) {
    const base64 = payload?.bekendtgoerelseXmlBase64 ?? payload?.bekendtgoerelse_xml_base64 ?? null
    if (base64 == null || typeof base64 !== 'string') return { ok: true }
    let decoded
    try {
      decoded = Buffer.from(base64, 'base64').toString('utf-8')
    } catch (e) {
      return { ok: false, error: `Base64 decode fejlede: ${e.message}` }
    }
    const len = decoded.length
    const snippet = decoded.slice(0, 120).replace(/[\r\n]/g, ' ')
    console.log(`   📋 bekendtgoerelseXmlBase64: decoded length=${len}, snippet: ${snippet}${len > 120 ? '...' : ''}`)
    if (!decoded.startsWith('<')) {
      return { ok: false, error: `XML sanity fail: output starter ikke med <. decoded length=${len}` }
    }
    if (!decoded.includes('</')) {
      return { ok: false, error: `XML sanity fail: output indeholder ikke </. decoded length=${len}` }
    }
    if (len <= MIN_XML_LENGTH) {
      return { ok: false, error: `XML sanity fail: længde ${len} <= ${MIN_XML_LENGTH} tegn. For kort til gyldig bekendtgoerelse.` }
    }
    return { ok: true }
  }

  /**
   * Write payload sanity error to summary.md and exit 1
   */
  function failPayloadSanity(testCaseName, error) {
    const summaryFile = join(REPORT_DIR, 'summary.md')
    let summary = existsSync(summaryFile) ? readFileSync(summaryFile, 'utf-8') : ''
    summary += `\n## Fejl: Payload sanity (${testCaseName})\n\n`
    summary += `**bekendtgoerelseXmlBase64 validering fejlede.**\n\n`
    summary += `**Fejl:** ${error}\n\n`
    summary += `API-kaldet blev sprunget over for at undgå serverfejl pga. skæv payload.\n\n`
    writeFileSync(summaryFile, summary, 'utf-8')
    console.error(`\n❌ ${testCaseName}: ${error}`)
    console.error(`   Se ${relativeReportPath}/summary.md`)
    process.exit(1)
  }

  /**
   * Payload template for "Udbud under tærskelværdi" (Krav 1.1)
   * 
   * Forskelle fra "Forventet indkøb":
   * - estimated_value skal være under tærskelværdi (typisk < 750.000 DKK for offentlige indkøb)
   * - type: "below_threshold"
   * - notification_type: "below_threshold_notice"
   */
  function createBelowThresholdPayload() {
  const base = {
    title: 'Udbud under tærskelværdi - Funktionsmæssig test',
    description: 'Dette er et test-udbud under tærskelværdi oprettet som del af funktioneltesten. Udbuddet skal kun bruges til testformål.',
    category: 'IT Services',
    estimated_value: 500000, // Under tærskelværdi (750.000 DKK)
    currency: 'DKK',
    submission_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dage fra nu
    publication_date: new Date().toISOString(),
    entity_id: 'test-entity-123',
    espd_required: false, // Typisk ikke påkrævet for udbud under tærskelværdi
    status: 'draft',
    type: 'below_threshold',
    notification_type: 'below_threshold_notice',
    // Yderligere felter specifikke for udbud under tærskelværdi
    threshold_value: 750000,
    justification: 'Udbud under tærskelværdi - test formål',
  }
  const xmlBase64 = env.UDBUD_BEKENDTGOERELSE_XML_BASE64
  if (xmlBase64) base.bekendtgoerelseXmlBase64 = xmlBase64
  return base
  }

  /**
   * Payload template for "Forventet indkøb" (Krav 1.2)
   * 
   * Forskelle fra "Udbud under tærskelværdi":
   * - estimated_value kan være over eller under tærskelværdi
   * - type: "expected_procurement"
   * - notification_type: "prior_information_notice" eller "contract_notice"
   * - expected_start_date og expected_end_date er typisk påkrævet
   */
  function createExpectedProcurementPayload() {
  const base = {
    title: 'Forventet indkøb - Funktionsmæssig test',
    description: 'Dette er et test-udbud for forventet indkøb oprettet som del af funktioneltesten. Udbuddet skal kun bruges til testformål.',
    category: 'IT Services',
    estimated_value: 1000000, // Kan være over tærskelværdi
    currency: 'DKK',
    submission_deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 dage fra nu
    publication_date: new Date().toISOString(),
    entity_id: 'test-entity-123',
    espd_required: true, // Typisk påkrævet for forventet indkøb
    status: 'draft',
    type: 'expected_procurement',
    notification_type: 'prior_information_notice',
    // Yderligere felter specifikke for forventet indkøb
    expected_start_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    expected_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    procurement_method: 'open',
  }
  const xmlBase64 = env.UDBUD_BEKENDTGOERELSE_XML_BASE64
  if (xmlBase64) base.bekendtgoerelseXmlBase64 = xmlBase64
  return base
  }

  /**
   * Generate deterministic idempotency key from testcase name and RUN_ID
   * Uses sha256(testCaseName + RUN_ID) for deterministic keys
   */
  function generateIdempotencyKey(testCaseName) {
    const input = `${testCaseName}${RUN_ID}`
    const hash = createHash('sha256').update(input).digest('hex')
    return hash
  }

  const IDEMPOTENCY_FILE = join(REPORT_DIR, 'idempotency.json')

  function readIdempotencyFile() {
    try {
      if (!existsSync(IDEMPOTENCY_FILE)) return {}
      const raw = readFileSync(IDEMPOTENCY_FILE, 'utf-8')
      const data = JSON.parse(raw)
      return data && typeof data === 'object' ? data : {}
    } catch {
      return {}
    }
  }

  function checkFileIdempotency(idempotencyKey) {
    const data = readIdempotencyFile()
    return data[idempotencyKey] === 'sent'
  }

  function recordFileIdempotency(idempotencyKey) {
    const data = readIdempotencyFile()
    data[idempotencyKey] = 'sent'
    writeFileSync(IDEMPOTENCY_FILE, JSON.stringify(data, null, 2), 'utf-8')
  }

  /**
   * Check if testcase has already been sent (idempotency guard).
   * Uses Supabase when available; on missing table or error, fallback to local idempotency.json.
   */
  async function checkAlreadySent(idempotencyKey) {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('publication_jobs')
          .select('id, status')
          .eq('request_id', idempotencyKey)
          .limit(1)
          .single()

        if (!error || error.code === 'PGRST116') {
          if (data) {
            console.log(`   ℹ️  Found existing publication job with idempotency key (status: ${data.status})`)
            return true
          }
          return false
        }
        console.warn(`   ⚠️  Supabase idempotency check failed: ${error.message}, falling back to local file`)
      } catch (error) {
        console.warn(`   ⚠️  Supabase idempotency check error: ${error.message}, falling back to local file`)
      }
    }
    const sent = checkFileIdempotency(idempotencyKey)
    if (sent) console.log(`   ℹ️  Idempotency key already sent (local idempotency.json)`)
    return sent
  }

  /**
   * Record publication job (Supabase or local file fallback).
   * On publish success only: mark key as "sent" in idempotency.json when using file fallback.
   */
  async function recordPublicationJob(idempotencyKey, payload, result) {
    if (supabaseClient) {
      try {
        await supabaseClient
          .from('publication_jobs')
          .insert({
            tender_id: '00000000-0000-0000-0000-000000000000',
            status: result.success ? 'completed' : 'failed',
            payload_version: 1,
            request_id: idempotencyKey,
            payload: payload,
            response: result.response,
            last_error: result.error?.message || null,
            attempts: 1,
            max_attempts: 3,
          })
        return
      } catch (error) {
        console.warn(`   ⚠️  Could not record publication job in Supabase: ${error.message}, using local file`)
      }
    }
    if (result.success) {
      recordFileIdempotency(idempotencyKey)
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Calculate exponential backoff delay
   */
  function calculateBackoffDelay(attempt) {
    const baseDelay = 1000 // 1 second
    const maxDelay = 10000 // 10 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
    return delay
  }

  /**
   * Check if error is retryable (5xx or timeout)
   */
  function isRetryableError(response, error) {
  if (error) {
    // Network errors, timeouts, abort signals, etc.
    const errorMsg = error.message || error.toString() || ''
    return errorMsg.includes('timeout') || 
           errorMsg.includes('ECONNRESET') ||
           errorMsg.includes('ECONNREFUSED') ||
           errorMsg.includes('ETIMEDOUT') ||
           errorMsg.includes('aborted') ||
           error.name === 'AbortError' ||
           error.name === 'TimeoutError'
  }
  
  if (response) {
    // 5xx server errors
    return response.status >= 500 && response.status < 600
  }
  
    return false
  }

  /**
   * Make API call to udbud.dk with retry logic
   */
  async function callAPIWithRetry(method, url, body = null, idempotencyKey = null, maxRetries = 3) {
    
    let lastError = null
    let lastResponse = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = calculateBackoffDelay(attempt - 1)
      console.log(`   🔄 Retry attempt ${attempt}/${maxRetries} after ${delay}ms backoff...`)
      await sleep(delay)
    }

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 seconds
    
    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
      signal: controller.signal,
    }

    if (idempotencyKey) {
      fetchOptions.headers[IDEMPOTENCY_HEADER] = idempotencyKey
    }

    if (body) {
      fetchOptions.body = JSON.stringify(body)
    }

    try {
      const response = await fetch(url, fetchOptions)
      clearTimeout(timeoutId) // Clear timeout on success
      
      let responseData
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        try {
          responseData = await response.json()
        } catch {
          responseData = { error: 'Invalid JSON response' }
        }
      } else {
        responseData = { text: await response.text() }
      }

      // Sanitize response headers (especially Authorization if present)
      const responseHeaders = Object.fromEntries(response.headers.entries())
      const sanitizedHeaders = sanitize(responseHeaders, false) // isRequest = false
      
      // Sanitize response data (tokens in values will be redacted)
      const sanitizedData = sanitize(responseData, false) // isRequest = false
      
      const responseObj = {
        status: response.status,
        statusText: response.statusText,
        headers: sanitizedHeaders,
        data: sanitizedData,
      }

      // Check if we should retry
      if (response.ok || !isRetryableError(responseObj, null)) {
        // Success or non-retryable error (4xx, etc.)
        return { 
          success: response.ok, 
          response: responseObj, 
          error: null,
          attempts: attempt + 1
        }
      }

      // Retryable error (5xx)
      lastResponse = responseObj
      lastError = {
        message: `HTTP ${response.status} ${response.statusText}`,
        retryable: true,
      }

    } catch (error) {
      clearTimeout(timeoutId) // Clear timeout on error
      lastError = {
        message: error.message,
        stack: error.stack,
        retryable: isRetryableError(null, error),
      }

      // If not retryable, return immediately
      if (!lastError.retryable) {
        return {
          success: false,
          response: null,
          error: lastError,
          attempts: attempt + 1,
        }
      }
    }
  }

  // All retries exhausted
  return {
      success: false,
      response: lastResponse,
      error: lastError,
      attempts: maxRetries + 1,
    }
  }

  /**
   * Extract requestId, timestamp, status from response body (for "kontakt administrator" - uden secrets)
   */
  function extractContactFields(response) {
    const data = response?.data
    const objs = []
    if (data != null && typeof data === 'object') objs.push(data)
    if (data?.error != null && typeof data.error === 'object') objs.push(data.error)
    if (data?.data != null && typeof data.data === 'object') objs.push(data.data)
    for (const o of objs) {
      const requestId = o.requestId ?? o.request_id ?? null
      const ts = o.timestamp ?? null
      const st = o.status ?? null
      if (requestId != null || ts != null || st != null) {
        return { requestId, timestamp: ts, status: st }
      }
    }
    return { requestId: null, timestamp: null, status: null }
  }

  /**
   * Save response headers to file (sanitized, uden secrets)
   */
  function saveResponseHeaders(response, filePath) {
    if (!response?.headers) return
    try {
      writeFileSync(filePath, JSON.stringify(response.headers, null, 2), 'utf-8')
      console.log(`   📄 Response headers saved: ${filePath.split(/[/\\]/).pop()}`)
    } catch (e) {
      console.warn(`   ⚠️  Could not save headers file: ${e.message}`)
    }
  }

  /**
   * Build error snippet for non-2xx response: requestId/timestamp/status (for kontakt administrator); HTTP status; message/debugMessage; else body (redacted)
   */
  function buildErrorSnippet(response) {
    const status = response?.status ?? '?'
    const data = response?.data
    const contact = extractContactFields(response)
    let out = ''
    if (contact.requestId != null || contact.timestamp != null || contact.status != null) {
      out += '**Kontakt administrator med:**\n'
      if (contact.requestId != null) out += `requestId: ${sanitizeString(String(contact.requestId))}\n`
      if (contact.timestamp != null) out += `timestamp: ${sanitizeString(String(contact.timestamp))}\n`
      if (contact.status != null) out += `status: ${sanitizeString(String(contact.status))}\n`
      out += '\n'
    }
    out += `HTTP ${status}\n`
    if (data != null && typeof data === 'object' && !Array.isArray(data)) {
      const message = data.message ?? data.Message ?? null
      const debugMessage = data.debugMessage ?? data.debug_message ?? data.DebugMessage ?? null
      if (message != null || debugMessage != null) {
        if (message != null) out += `message: ${sanitizeString(String(message))}\n`
        if (debugMessage != null) out += `debugMessage: ${sanitizeString(String(debugMessage))}\n`
        return out
      }
    }
    let bodyStr = ''
    if (data != null) {
      if (typeof data === 'string') bodyStr = data
      else if (data.text != null) bodyStr = String(data.text)
      else bodyStr = JSON.stringify(data)
    }
    bodyStr = sanitizeString(bodyStr).slice(0, 2000)
    out += `\n${bodyStr}`
    return out
  }

  /**
   * Extract notice ids from publish response (no secrets)
   */
  function extractNoticeIds(data) {
    if (!data || typeof data !== 'object') return {}
    const d = data.data || data
    return {
      noticeId: d.noticeId ?? d.notice_id ?? null,
      noticeVersion: d.noticeVersion ?? d.notice_version ?? null,
      noticePublicationNumber: d.noticePublicationNumber ?? d.notice_publication_number ?? null,
    }
  }

  /**
   * Test case: Krav 1.1 - Udbud under tærskelværdi
   * Flow: POST valider → log result → if OK POST publicer → save both responses
   */
  async function testKrav11() {
    currentStep = 'running test Krav 1.1'
    logProgress('TEST_1_1_START')
    const startTime = Date.now()
    console.log('\n📝 Krav 1.1: Udbud under tærskelværdi')
    const testCase = 'krav-1-1-below-threshold'
    const idempotencyKey = generateIdempotencyKey(testCase)
    console.log(`   🔑 Idempotency key: ${idempotencyKey}`)

    const alreadySent = await checkAlreadySent(idempotencyKey)
    if (alreadySent) {
      console.log(`   ⏭️  SKIPPED (already sent)`)
      logProgress('TEST_1_1_SKIPPED')
      const endTime = Date.now()
      const runtime = endTime - startTime
      const testTimestamp = new Date().toISOString()
      testResults.push({
        testCase: 'Krav 1.1',
        testCaseName: '1.1',
        passed: true,
        skipped: true,
        skipReason: 'already sent',
        validateHttpStatus: null,
        publishHttpStatus: null,
        noticeId: null,
        noticeVersion: null,
        noticePublicationNumber: null,
        endpoint: VALIDATE_URL,
        runtime,
        timestamp: testTimestamp,
      })
      return { passed: true, skipped: true, validateHttpStatus: null, publishHttpStatus: null }
    }

    const payload = createBelowThresholdPayload()
    const sanity = validateBekendtgoerelseXmlBase64(payload, 'Krav 1.1')
    if (!sanity.ok) failPayloadSanity('Krav 1.1', sanity.error)
    const sanitizedRequest = {
      method: 'POST',
      url: VALIDATE_URL,
      headers: sanitize({
        'Content-Type': 'application/json',
        'Authorization': '[REDACTED]',
        [IDEMPOTENCY_HEADER]: idempotencyKey,
      }, true),
      body: sanitize(payload, true),
    }
    const requestFile = join(REPORT_DIR, `${testCase}-request.json`)
    writeFileSync(requestFile, JSON.stringify(sanitizedRequest, null, 2), 'utf-8')
    console.log(`   📄 Request saved: ${testCase}-request.json`)
    validateNoSecretsInFile(requestFile, 'request')

    // 1) Validate (POST)
    console.log(`   📡 Calling valider (POST)...`)
    const validateResult = await callAPIWithRetry('POST', VALIDATE_URL, payload, idempotencyKey, 3)
    const validateResponse = validateResult.response
    const validateHttpStatus = validateResponse?.status ?? null
    const sanitizedValidate = sanitize(validateResponse || {}, false)
    const validateFile = join(REPORT_DIR, `${testCase}-validate-response.json`)
    writeFileSync(validateFile, JSON.stringify(sanitizedValidate, null, 2), 'utf-8')
    console.log(`   📄 Validate response saved: ${testCase}-validate-response.json`)
    validateNoSecretsInFile(validateFile, 'validate-response')
    saveResponseHeaders(validateResponse, join(REPORT_DIR, `${testCase}-validate-response.headers.json`))
    const validateOk = validateHttpStatus >= 200 && validateHttpStatus < 300
    let validateErrorSnippet = null
    if (!validateOk && validateResponse) {
      validateErrorSnippet = buildErrorSnippet(validateResponse)
      console.log('   --- Validate error (non-2xx) ---')
      console.log(validateErrorSnippet)
      console.log('   ---')
    }
    if (validateResult.attempts > 1) {
      console.log(`   ℹ️  Validate completed after ${validateResult.attempts} attempt(s)`)
    }

    let publishHttpStatus = null
    let publishResponse = null
    let publishResult = null
    let noticeId = null
    let noticeVersion = null
    let noticePublicationNumber = null
    let publishErrorSnippet = null

    if (validateOk) {
      console.log(`   📡 Calling publicer (POST)...`)
      publishResult = await callAPIWithRetry('POST', PUBLISH_URL, payload, idempotencyKey, 3)
      publishResponse = publishResult.response
      publishHttpStatus = publishResponse?.status ?? null
      const sanitizedPublish = sanitize(publishResponse || {}, false)
      const publishFile = join(REPORT_DIR, `${testCase}-publish-response.json`)
      writeFileSync(publishFile, JSON.stringify(sanitizedPublish, null, 2), 'utf-8')
      console.log(`   📄 Publish response saved: ${testCase}-publish-response.json`)
      validateNoSecretsInFile(publishFile, 'publish-response')
      saveResponseHeaders(publishResponse, join(REPORT_DIR, `${testCase}-publish-response.headers.json`))
      const publishOkThis = publishHttpStatus >= 200 && publishHttpStatus < 300
      if (!publishOkThis && publishResponse) {
        publishErrorSnippet = buildErrorSnippet(publishResponse)
        console.log('   --- Publish error (non-2xx) ---')
        console.log(publishErrorSnippet)
        console.log('   ---')
      }
      const ids = extractNoticeIds(publishResponse?.data || publishResponse)
      noticeId = ids.noticeId
      noticeVersion = ids.noticeVersion
      noticePublicationNumber = ids.noticePublicationNumber
      await recordPublicationJob(idempotencyKey, payload, { success: publishHttpStatus >= 200 && publishHttpStatus < 300, response: publishResponse, error: publishResult.error })
    }

    const publishOk = publishHttpStatus !== null && publishHttpStatus >= 200 && publishHttpStatus < 300
    const passed = validateOk && publishOk
    const endTime = Date.now()
    const runtime = endTime - startTime
    const testTimestamp = new Date().toISOString()
    testResults.push({
      testCase: 'Krav 1.1',
      testCaseName: '1.1',
      passed,
      validateHttpStatus,
      publishHttpStatus,
      validateErrorSnippet,
      publishErrorSnippet,
      noticeId,
      noticeVersion,
      noticePublicationNumber,
      referenceId: noticeId || (publishResponse?.data?.id ?? publishResponse?.data?.reference_id) || null,
      endpoint: VALIDATE_URL,
      error: validateResult.error?.message || publishResult?.error?.message || null,
      runtime,
      timestamp: testTimestamp,
      response: publishResponse || validateResponse,
    })

    if (passed) {
      console.log(`   ✅ PASS - Validate ${validateHttpStatus}, Publish ${publishHttpStatus}`)
      logProgress('TEST_1_1_OK')
    } else {
      const msg = !validateOk ? `Validate ${validateHttpStatus}` : `Publish ${publishHttpStatus}`
      console.log(`   ❌ FAIL - ${msg}`)
      logProgress('TEST_1_1_FAIL')
    }
    return { passed, validateHttpStatus, publishHttpStatus, noticeId, noticeVersion, noticePublicationNumber }
  }

  /**
   * Test case: Krav 1.2 - Forventet indkøb
   * Flow: POST valider → log result → if OK POST publicer → save both responses
   */
  async function testKrav12() {
    currentStep = 'running test Krav 1.2'
    logProgress('TEST_1_2_START')
    const startTime = Date.now()
    console.log('\n📝 Krav 1.2: Forventet indkøb')
    const testCase = 'krav-1-2-expected-procurement'
    const idempotencyKey = generateIdempotencyKey(testCase)
    console.log(`   🔑 Idempotency key: ${idempotencyKey}`)

    const alreadySent = await checkAlreadySent(idempotencyKey)
    if (alreadySent) {
      console.log(`   ⏭️  SKIPPED (already sent)`)
      logProgress('TEST_1_2_SKIPPED')
      const endTime = Date.now()
      const runtime = endTime - startTime
      const testTimestamp = new Date().toISOString()
      testResults.push({
        testCase: 'Krav 1.2',
        testCaseName: '1.2',
        passed: true,
        skipped: true,
        skipReason: 'already sent',
        validateHttpStatus: null,
        publishHttpStatus: null,
        noticeId: null,
        noticeVersion: null,
        noticePublicationNumber: null,
        endpoint: VALIDATE_URL,
        runtime,
        timestamp: testTimestamp,
      })
      return { passed: true, skipped: true, validateHttpStatus: null, publishHttpStatus: null }
    }

    const payload = createExpectedProcurementPayload()
    const sanity = validateBekendtgoerelseXmlBase64(payload, 'Krav 1.2')
    if (!sanity.ok) failPayloadSanity('Krav 1.2', sanity.error)
    const sanitizedRequest = {
      method: 'POST',
      url: VALIDATE_URL,
      headers: sanitize({
        'Content-Type': 'application/json',
        'Authorization': '[REDACTED]',
        [IDEMPOTENCY_HEADER]: idempotencyKey,
      }, true),
      body: sanitize(payload, true),
    }
    const requestFile = join(REPORT_DIR, `${testCase}-request.json`)
    writeFileSync(requestFile, JSON.stringify(sanitizedRequest, null, 2), 'utf-8')
    console.log(`   📄 Request saved: ${testCase}-request.json`)
    validateNoSecretsInFile(requestFile, 'request')

    // 1) Validate (POST)
    console.log(`   📡 Calling valider (POST)...`)
    const validateResult = await callAPIWithRetry('POST', VALIDATE_URL, payload, idempotencyKey, 3)
    const validateResponse = validateResult.response
    const validateHttpStatus = validateResponse?.status ?? null
    const sanitizedValidate = sanitize(validateResponse || {}, false)
    const validateFile = join(REPORT_DIR, `${testCase}-validate-response.json`)
    writeFileSync(validateFile, JSON.stringify(sanitizedValidate, null, 2), 'utf-8')
    console.log(`   📄 Validate response saved: ${testCase}-validate-response.json`)
    validateNoSecretsInFile(validateFile, 'validate-response')
    saveResponseHeaders(validateResponse, join(REPORT_DIR, `${testCase}-validate-response.headers.json`))
    const validateOk = validateHttpStatus >= 200 && validateHttpStatus < 300
    let validateErrorSnippet = null
    if (!validateOk && validateResponse) {
      validateErrorSnippet = buildErrorSnippet(validateResponse)
      console.log('   --- Validate error (non-2xx) ---')
      console.log(validateErrorSnippet)
      console.log('   ---')
    }
    if (validateResult.attempts > 1) {
      console.log(`   ℹ️  Validate completed after ${validateResult.attempts} attempt(s)`)
    }

    let publishHttpStatus = null
    let publishResponse = null
    let publishResult = null
    let noticeId = null
    let noticeVersion = null
    let noticePublicationNumber = null
    let publishErrorSnippet = null

    if (validateOk) {
      console.log(`   📡 Calling publicer (POST)...`)
      publishResult = await callAPIWithRetry('POST', PUBLISH_URL, payload, idempotencyKey, 3)
      publishResponse = publishResult.response
      publishHttpStatus = publishResponse?.status ?? null
      const sanitizedPublish = sanitize(publishResponse || {}, false)
      const publishFile = join(REPORT_DIR, `${testCase}-publish-response.json`)
      writeFileSync(publishFile, JSON.stringify(sanitizedPublish, null, 2), 'utf-8')
      console.log(`   📄 Publish response saved: ${testCase}-publish-response.json`)
      validateNoSecretsInFile(publishFile, 'publish-response')
      saveResponseHeaders(publishResponse, join(REPORT_DIR, `${testCase}-publish-response.headers.json`))
      const publishOkThis = publishHttpStatus >= 200 && publishHttpStatus < 300
      if (!publishOkThis && publishResponse) {
        publishErrorSnippet = buildErrorSnippet(publishResponse)
        console.log('   --- Publish error (non-2xx) ---')
        console.log(publishErrorSnippet)
        console.log('   ---')
      }
      const ids = extractNoticeIds(publishResponse?.data || publishResponse)
      noticeId = ids.noticeId
      noticeVersion = ids.noticeVersion
      noticePublicationNumber = ids.noticePublicationNumber
      await recordPublicationJob(idempotencyKey, payload, { success: publishHttpStatus >= 200 && publishHttpStatus < 300, response: publishResponse, error: publishResult.error })
    }

    const publishOk = publishHttpStatus !== null && publishHttpStatus >= 200 && publishHttpStatus < 300
    const passed = validateOk && publishOk
    const endTime = Date.now()
    const runtime = endTime - startTime
    const testTimestamp = new Date().toISOString()
    testResults.push({
      testCase: 'Krav 1.2',
      testCaseName: '1.2',
      passed,
      validateHttpStatus,
      publishHttpStatus,
      validateErrorSnippet,
      publishErrorSnippet,
      noticeId,
      noticeVersion,
      noticePublicationNumber,
      referenceId: noticeId || (publishResponse?.data?.id ?? publishResponse?.data?.reference_id) || null,
      endpoint: VALIDATE_URL,
      error: validateResult.error?.message || publishResult?.error?.message || null,
      runtime,
      timestamp: testTimestamp,
      response: publishResponse || validateResponse,
    })

    if (passed) {
      console.log(`   ✅ PASS - Validate ${validateHttpStatus}, Publish ${publishHttpStatus}`)
      logProgress('TEST_1_2_OK')
    } else {
      const msg = !validateOk ? `Validate ${validateHttpStatus}` : `Publish ${publishHttpStatus}`
      console.log(`   ❌ FAIL - ${msg}`)
      logProgress('TEST_1_2_FAIL')
    }
    return { passed, validateHttpStatus, publishHttpStatus, noticeId, noticeVersion, noticePublicationNumber }
  }

  /**
   * Append final summary section to summary.md
   * This function can be called from anywhere to append the final section
   */
  function appendFinalSummarySection(testResultsForSummary = [], tokenExpiresIn = null) {
    const summaryFile = join(REPORT_DIR, 'summary.md')
    let existingSummary = ''
    
    // Read existing summary if it exists
    if (existsSync(summaryFile)) {
      existingSummary = readFileSync(summaryFile, 'utf-8')
      // Remove any existing final section if present
      const finalSectionIndex = existingSummary.indexOf('\n---\n\n## Afsluttende Sektion\n\n')
      if (finalSectionIndex !== -1) {
        existingSummary = existingSummary.substring(0, finalSectionIndex)
      }
    }
    
    const { iso } = formatDateTime(now)
    
    let finalSection = `\n---\n\n`
    finalSection += `## Afsluttende Sektion\n\n`
    finalSection += `- **api-base-url:** ${API_BASE_URL}\n`
    finalSection += `- **sdk-version:** ${SDK_VERSION}\n\n`
    
    finalSection += `### AUTH\n\n`
    finalSection += `- **Token fetched:** ${tokenExpiresIn !== null ? 'yes' : 'no'}\n`
    if (tokenExpiresIn !== null) finalSection += `- **expires_in:** ${tokenExpiresIn} sekunder\n`
    finalSection += `\n`
    
    const krav11Result = testResultsForSummary.find(r => r.testCaseName === '1.1' || r.testCase === 'Krav 1.1')
    const krav12Result = testResultsForSummary.find(r => r.testCaseName === '1.2' || r.testCase === 'Krav 1.2')
    
    finalSection += `### Krav 1.1 (Afsend annonce under tærskel)\n\n`
    if (krav11Result) {
      finalSection += `- **Validate HTTP status:** ${krav11Result.validateHttpStatus ?? 'N/A'}\n`
      finalSection += `- **Publish HTTP status:** ${krav11Result.publishHttpStatus ?? 'N/A'}\n`
      if (krav11Result.noticeId != null) finalSection += `- **noticeId:** ${krav11Result.noticeId}\n`
      if (krav11Result.noticeVersion != null) finalSection += `- **noticeVersion:** ${krav11Result.noticeVersion}\n`
      if (krav11Result.noticePublicationNumber != null) finalSection += `- **noticePublicationNumber:** ${krav11Result.noticePublicationNumber}\n`
      finalSection += `- **success:** ${krav11Result.skipped ? 'SKIPPED (already sent)' : krav11Result.passed ? 'yes' : 'no'}\n`
      finalSection += `- **timestamp:** ${krav11Result.timestamp || iso}\n`
    } else {
      finalSection += `- **Validate HTTP status:** N/A\n`
      finalSection += `- **Publish HTTP status:** N/A\n`
      finalSection += `- **success:** no\n`
      finalSection += `- **timestamp:** ${iso}\n`
    }
    finalSection += `\n`
    
    finalSection += `### Krav 1.2 (Afsend forventet indkøb)\n\n`
    if (krav12Result) {
      finalSection += `- **Validate HTTP status:** ${krav12Result.validateHttpStatus ?? 'N/A'}\n`
      finalSection += `- **Publish HTTP status:** ${krav12Result.publishHttpStatus ?? 'N/A'}\n`
      if (krav12Result.noticeId != null) finalSection += `- **noticeId:** ${krav12Result.noticeId}\n`
      if (krav12Result.noticeVersion != null) finalSection += `- **noticeVersion:** ${krav12Result.noticeVersion}\n`
      if (krav12Result.noticePublicationNumber != null) finalSection += `- **noticePublicationNumber:** ${krav12Result.noticePublicationNumber}\n`
      finalSection += `- **success:** ${krav12Result.skipped ? 'SKIPPED (already sent)' : krav12Result.passed ? 'yes' : 'no'}\n`
      finalSection += `- **timestamp:** ${krav12Result.timestamp || iso}\n`
    } else {
      finalSection += `- **Validate HTTP status:** N/A\n`
      finalSection += `- **Publish HTTP status:** N/A\n`
      finalSection += `- **success:** no\n`
      finalSection += `- **timestamp:** ${iso}\n`
    }
    finalSection += `\n`
    
    // Overall result
    const overallPassed = testResultsForSummary.length > 0 && testResultsForSummary.every(r => r.passed || r.skipped)
    finalSection += `### Overall result\n\n`
    finalSection += `${overallPassed ? 'PASS' : 'FAIL'}\n\n`
    
    // Append to existing summary
    const updatedSummary = existingSummary + finalSection
    writeFileSync(summaryFile, updatedSummary, 'utf-8')
  }

  /**
   * Generate summary.md (replaces bootstrap summary)
   */
  function generateSummary(zipCreated = false) {
    currentStep = 'generating summary'
    logProgress('GENERATING_SUMMARY')
    const { local, iso } = formatDateTime(now)
    
    let summary = `# Funktionsmæssig Test - Summary\n\n`
    summary += `**Dato/Tid (lokal):** ${local}\n`
    summary += `**Dato/Tid (ISO):** ${iso}\n\n`
    summary += `**Report Directory:** ${REPORT_DIR}\n\n`
    summary += `**api-base-url:** ${API_BASE_URL}\n\n`
    summary += `**sdk-version:** ${SDK_VERSION}\n\n`
    
    const hasFailures = testResults.some(r => !r.passed)
    let status = 'COMPLETED'
    if (hasFailures) status = 'COMPLETED WITH FAILURES'
    else if (testResults.length === 0) status = 'IN PROGRESS'
    summary += `**Status:** ${status}\n\n`
    summary += `## Test Resultater\n\n`

    for (const result of testResults) {
      summary += `### ${result.testCase}\n\n`
      summary += `- **Testcase:** ${result.testCaseName || result.testCase}\n`
      summary += `- **Validate HTTP status:** ${result.validateHttpStatus ?? 'N/A'}\n`
      summary += `- **Publish HTTP status:** ${result.publishHttpStatus ?? 'N/A'}\n`
      if (result.noticeId != null) summary += `- **noticeId:** ${result.noticeId}\n`
      if (result.noticeVersion != null) summary += `- **noticeVersion:** ${result.noticeVersion}\n`
      if (result.noticePublicationNumber != null) summary += `- **noticePublicationNumber:** ${result.noticePublicationNumber}\n`
      summary += `- **Reference/ID:** ${result.referenceId || 'N/A'}\n`
      if (result.runtime !== undefined) {
        summary += `- **Total Runtime:** ${(result.runtime / 1000).toFixed(2)} sekunder\n`
      }
      summary += `- **Status:** ${result.skipped ? 'SKIPPED (already sent)' : result.passed ? '✅ PASS' : '❌ FAIL'}\n`
      if (result.error) summary += `- **Fejl:** ${result.error}\n`
      if (result.validateErrorSnippet) {
        summary += `\n**Validate error (non-2xx):**\n\`\`\`\n${result.validateErrorSnippet}\n\`\`\`\n\n`
      }
      if (result.publishErrorSnippet) {
        summary += `**Publish error (non-2xx):**\n\`\`\`\n${result.publishErrorSnippet}\n\`\`\`\n\n`
      }
      summary += `\n`
    }

    summary += `## Filer\n\n`
    summary += `- Request payloads: krav-1-1-below-threshold-request.json, krav-1-2-expected-procurement-request.json\n`
    summary += `- Validate responses: krav-1-1-validate-response.json, krav-1-2-validate-response.json\n`
    summary += `- Validate response headers: krav-1-1-validate-response.headers.json, krav-1-2-validate-response.headers.json\n`
    summary += `- Publish responses: krav-1-1-publish-response.json, krav-1-2-publish-response.json\n`
    summary += `- Publish response headers: krav-1-1-publish-response.headers.json, krav-1-2-publish-response.headers.json\n`
    summary += `- Idempotency (local fallback): idempotency.json\n`
    
    if (zipCreated) {
      summary += `- **Zip Archive:** udbuddk-functional-test-${timestamp}.zip (klar til at sende som bilag)\n`
    }

    const summaryFile = join(REPORT_DIR, 'summary.md')
    writeFileSync(summaryFile, summary, 'utf-8')
    
    // Append final summary section
    appendFinalSummarySection(testResults, TOKEN_EXPIRES_IN)
    
    console.log(`\n📋 Summary generated: summary.md`)
  }

  /**
   * Create zip archive of report directory
   */
  async function createZipArchive() {
    const zipFileName = `udbuddk-functional-test-${timestamp}.zip`
    const zipFilePath = join(ROOT_DIR, 'reports', 'udbuddk', 'functional-test', zipFileName)
    const reportDirName = timestamp // The folder name inside functional-test/
    const functionalTestDir = join(ROOT_DIR, 'reports', 'udbuddk', 'functional-test')

    return new Promise((resolve) => {
    const isWindows = process.platform === 'win32'
    
    if (isWindows) {
      // Use PowerShell Compress-Archive on Windows (no shell, proper quoting)
      const pathArg = (REPORT_DIR + '\\*').replace(/'/g, "''")
      const destArg = zipFilePath.replace(/'/g, "''")
      const powershellCmd = `Compress-Archive -Path '${pathArg}' -DestinationPath '${destArg}' -Force`
      const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', powershellCmd], {
        cwd: ROOT_DIR,
        shell: false,
        stdio: 'pipe',
      })

      let stderr = ''
      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0 && existsSync(zipFilePath)) {
          console.log(`\n📦 Zip archive created: ${zipFileName}`)
          console.log(`   Location: ${zipFilePath}`)
          resolve(true)
        } else {
          console.warn(`\n⚠️  Could not create zip archive: ${stderr || 'Unknown error'}`)
          console.warn(`   Will add manual instructions to summary.md`)
          resolve(false)
        }
      })

      child.on('error', (error) => {
        console.warn(`\n⚠️  Error creating zip archive: ${error.message}`)
        console.warn(`   Will add manual instructions to summary.md`)
        resolve(false)
      })
    } else {
      // Use zip command on Unix/Mac
      // Package the timestamp folder into zip
      const child = spawn('zip', ['-r', zipFileName, reportDirName], {
        cwd: functionalTestDir,
        shell: false,
        stdio: 'pipe',
      })

      let stderr = ''
      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0 && existsSync(zipFilePath)) {
          console.log(`\n📦 Zip archive created: ${zipFileName}`)
          console.log(`   Location: ${zipFilePath}`)
          resolve(true)
        } else {
          console.warn(`\n⚠️  Could not create zip archive: ${stderr || 'Unknown error'}`)
          console.warn(`   Will add manual instructions to summary.md`)
          resolve(false)
        }
      })

      child.on('error', (error) => {
        console.warn(`\n⚠️  Error creating zip archive: ${error.message}`)
        console.warn(`   Will add manual instructions to summary.md`)
        resolve(false)
      })
    }
  })
  }

  /**
   * Add zip instructions to summary.md if zip creation failed
   */
  function addZipInstructionsToSummary() {
    const summaryFile = join(REPORT_DIR, 'summary.md')
    let summary = readFileSync(summaryFile, 'utf-8')
    
    summary += `\n## Zip Archive\n\n`
    summary += `For at sende dokumentationen som bilag, skal mappen pakkes som zip:\n\n`
    summary += `**Windows (PowerShell):**\n`
    summary += `\`\`\`powershell\n`
    summary += `Compress-Archive -Path "${REPORT_DIR.replace(/\\/g, '/')}/*" -DestinationPath "udbuddk-functional-test-${timestamp}.zip"\n`
    summary += `\`\`\`\n\n`
    summary += `**Unix/Mac/Linux:**\n`
    summary += `\`\`\`bash\n`
    summary += `cd reports/udbuddk/functional-test\n`
    summary += `zip -r udbuddk-functional-test-${timestamp}.zip ${timestamp}/\n`
    summary += `\`\`\`\n\n`
    summary += `**Alternativt (manuelt):**\n`
    summary += `1. Naviger til mappen: \`${REPORT_DIR}\`\n`
    summary += `2. Vælg alle filer i mappen\n`
    summary += `3. Højreklik og vælg "Send til" > "Komprimeret (zippet) mappe"\n`
    summary += `4. Omdøb zip-filen til: \`udbuddk-functional-test-${timestamp}.zip\`\n\n`
    summary += `Zip-filen kan derefter sendes som bilag 1+2.\n`
    
    writeFileSync(summaryFile, summary, 'utf-8')
    console.log(`   📝 Added zip instructions to summary.md`)
  }

  /**
   * Generate evidence.md with copy/paste text for schema
   */
  function generateEvidence() {
    currentStep = 'generating evidence'
    logProgress('GENERATING_EVIDENCE')
    const { local, iso } = formatDateTime(now)
    
    let evidence = `# Evidence - Funktionsmæssig Test\n\n`
    evidence += `Dette dokument beskriver dokumentationen for funktioneltesten og kan copy/pastes direkte ind i skemaet.\n\n`
    
    evidence += `## Krav 1.1: Udbud under tærskelværdi\n\n`
    evidence += `**Beskrivelse:**\n`
    evidence += `Funktioneltest for publicering af "Udbud under tærskelværdi" til udbud.dk PREPROD miljøet.\n\n`
    evidence += `**Test udført:** ${local} (${iso})\n\n`
    evidence += `**Validate HTTP status:** ${testResults[0]?.validateHttpStatus ?? 'N/A'}\n\n`
    evidence += `**Publish HTTP status:** ${testResults[0]?.publishHttpStatus ?? 'N/A'}\n\n`
    evidence += `**Reference/ID (noticeId):** ${testResults[0]?.noticeId ?? testResults[0]?.referenceId ?? 'N/A'}\n\n`
    evidence += `**Resultat:** ${testResults[0]?.passed ? '✅ PASS' : '❌ FAIL'}\n\n`
    evidence += `**Dokumentation:**\n`
    evidence += `- Bilag 1: Request payload (krav-1-1-below-threshold-request.json)\n`
    evidence += `- Bilag 2: Response data (krav-1-1-below-threshold-response.json)\n\n`
    
    evidence += `**Forskelle i payload:**\n`
    evidence += `- type: "below_threshold"\n`
    evidence += `- notification_type: "below_threshold_notice"\n`
    evidence += `- estimated_value: Under tærskelværdi (500.000 DKK)\n`
    evidence += `- espd_required: false (typisk ikke påkrævet)\n\n`
    
    evidence += `---\n\n`
    
    evidence += `## Krav 1.2: Forventet indkøb\n\n`
    evidence += `**Beskrivelse:**\n`
    evidence += `Funktioneltest for publicering af "Forventet indkøb" til udbud.dk PREPROD miljøet.\n\n`
    evidence += `**Test udført:** ${local} (${iso})\n\n`
    evidence += `**Validate HTTP status:** ${testResults[1]?.validateHttpStatus ?? 'N/A'}\n\n`
    evidence += `**Publish HTTP status:** ${testResults[1]?.publishHttpStatus ?? 'N/A'}\n\n`
    evidence += `**Reference/ID (noticeId):** ${testResults[1]?.noticeId ?? testResults[1]?.referenceId ?? 'N/A'}\n\n`
    evidence += `**Resultat:** ${testResults[1]?.passed ? '✅ PASS' : '❌ FAIL'}\n\n`
    evidence += `**Dokumentation:**\n`
    evidence += `- Bilag 1: Request payload (krav-1-2-expected-procurement-request.json)\n`
    evidence += `- Bilag 2: Response data (krav-1-2-expected-procurement-response.json)\n\n`
    
    evidence += `**Forskelle i payload:**\n`
    evidence += `- type: "expected_procurement"\n`
    evidence += `- notification_type: "prior_information_notice"\n`
    evidence += `- estimated_value: Kan være over tærskelværdi (1.000.000 DKK)\n`
    evidence += `- espd_required: true (typisk påkrævet)\n`
    evidence += `- expected_start_date: Påkrævet felt\n`
    evidence += `- expected_end_date: Påkrævet felt\n`
    evidence += `- procurement_method: "open"\n\n`
    
    evidence += `---\n\n`
    
    evidence += `## Payload Template Forskelle\n\n`
    evidence += `### Fælles felter:\n`
    evidence += `- title, description, category\n`
    evidence += `- estimated_value, currency\n`
    evidence += `- submission_deadline, publication_date\n`
    evidence += `- entity_id, status\n\n`
    
    evidence += `### Specifikke felter for "Udbud under tærskelværdi":\n`
    evidence += `- type: "below_threshold"\n`
    evidence += `- notification_type: "below_threshold_notice"\n`
    evidence += `- threshold_value: 750000\n`
    evidence += `- justification: Tekst der begrunder hvorfor udbuddet er under tærskelværdi\n`
    evidence += `- espd_required: false\n\n`
    
    evidence += `### Specifikke felter for "Forventet indkøb":\n`
    evidence += `- type: "expected_procurement"\n`
    evidence += `- notification_type: "prior_information_notice" eller "contract_notice"\n`
    evidence += `- expected_start_date: Forventet startdato\n`
    evidence += `- expected_end_date: Forventet slutdato\n`
    evidence += `- procurement_method: "open", "restricted", "negotiated", etc.\n`
    evidence += `- espd_required: true\n\n`

    const evidenceFile = join(REPORT_DIR, 'evidence.md')
    writeFileSync(evidenceFile, evidence, 'utf-8')
    console.log(`📝 Evidence generated: evidence.md`)
  }

  /**
   * Print summary
   */
  function printSummary() {
    console.log('\n' + '='.repeat(60))
    console.log('📋 Test Summary')
    console.log('='.repeat(60))

    const passed = testResults.filter((r) => r.passed).length
    const failed = testResults.filter((r) => !r.passed).length
    const total = testResults.length

    console.log(`\nTotal: ${total} | ✅ Passed: ${passed} | ❌ Failed: ${failed}\n`)

    for (const result of testResults) {
      const icon = result.passed ? '✅' : '❌'
      console.log(`${icon} ${result.testCase}: ${result.passed ? 'PASS' : 'FAIL'}`)
      if (result.referenceId) {
        console.log(`   Reference ID: ${result.referenceId}`)
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log(`Report directory: ${REPORT_DIR}`)
    console.log('='.repeat(60))

    return failed === 0 ? 0 : 1
  }

  /**
   * Main execution
   */
  async function main() {
    console.log('🧪 udbud.dk Functional Test Suite - Krav 1.1 og 1.2')
    console.log('='.repeat(60))
    console.log(`API base URL: ${API_BASE_URL}`)
    console.log(`SDK version: ${SDK_VERSION}`)
    console.log(`Report Dir: ${REPORT_DIR}`)
    console.log('='.repeat(60))

    try {
      // Test Krav 1.1: Udbud under tærskelværdi
      currentStep = 'running test Krav 1.1'
      await testKrav11()

      // Test Krav 1.2: Forventet indkøb
      currentStep = 'running test Krav 1.2'
      await testKrav12()

      // Generate documentation
      currentStep = 'generating documentation'
      generateSummary(false) // Will be updated after zip creation
      
      currentStep = 'generating evidence'
      generateEvidence()
    } catch (error) {
      logProgress('FATAL_ERROR')
      console.error('\n❌ Fatal error:', error.message)
      testResults.push({ 
        testCase: 'fatal', 
        testCaseName: 'Fatal Error',
        passed: false, 
        error: error.message,
        attempts: 0,
        runtime: 0
      })
    }

    // Calculate exit code based ONLY on testcase results (before zip creation)
    const exitCode = printSummary()

    // Create zip archive (fail-safe - NEVER affects exit code)
    // This runs AFTER exit code is determined, so zip failures can't change it
    currentStep = 'creating zip archive'
    logProgress('CREATING_ZIP')
    try {
      const zipCreated = await createZipArchive()
      
      if (zipCreated) {
        logProgress('ZIP_CREATED')
        // Update summary with zip info
        generateSummary(true)
      } else {
        logProgress('ZIP_FAILED')
        // Add instructions to summary if zip creation failed
        console.warn(`\n⚠️  Zip archive creation failed - this does not affect test results`)
        console.warn(`   Manual zip instructions have been added to summary.md`)
        addZipInstructionsToSummary()
      }
    } catch (error) {
      logProgress('ZIP_ERROR')
      // Zip creation errors are non-fatal - only log warning and add instructions
      console.warn(`\n⚠️  Zip creation error (non-fatal): ${error.message}`)
      console.warn(`   This does not affect test results - exit code is based on testcase results only`)
      console.warn(`   Manual zip instructions have been added to summary.md`)
      addZipInstructionsToSummary()
    }

    logProgress('DONE')
    // Exit with code determined by testcase results only
    process.exit(exitCode)
  }

  // Run main
  await main()
}

// Entry point - initializeAndRun will be called after API key is obtained
