#!/usr/bin/env node
/**
 * Guard: ensures npm/scripts run from repo root (where package.json exists).
 * Use before scripts that write reports or resolve paths from cwd.
 */

import { existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(join(__dirname, '..'))

const packageJsonPath = join(process.cwd(), 'package.json')
if (!existsSync(packageJsonPath)) {
  console.error('Du står ikke i repo-roten. Kør: cd', REPO_ROOT)
  process.exit(1)
}
