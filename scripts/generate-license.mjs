/**
 * Admin tool: Generate license keys for 越海选品 extension.
 * Uses Node.js crypto (HMAC-SHA256).
 *
 * Usage: node scripts/generate-license.mjs [count]
 *   count: number of keys to generate (default: 1)
 */
import { createHmac, randomBytes } from 'crypto'

const SECRET = 'yuexuan-prod-secret-key-2026'
const MESSAGE = 'yuexuan-license'

function generateLicense() {
  const hmac = createHmac('sha256', SECRET)
  hmac.update(MESSAGE)
  const signature = hmac.digest('hex').slice(0, 16).toUpperCase()
  return `${signature.slice(0, 4)}-${signature.slice(4, 8)}-${signature.slice(8, 12)}-${signature.slice(12, 16)}`
}

function verifyLicense(key) {
  const cleanKey = key.replace(/-/g, '')
  if (cleanKey.length !== 16 || !/^[0-9A-Fa-f]+$/.test(cleanKey)) {
    return false
  }
  const expected = generateLicense().replace(/-/g, '')
  return cleanKey.toUpperCase() === expected.toUpperCase()
}

const count = Math.max(1, parseInt(process.argv[2]) || 1)

console.log('=== 越海选品 License Key Generator ===\n')
console.log(`Secret: ${SECRET}`)
console.log(`Message: ${MESSAGE}\n`)

for (let i = 0; i < count; i++) {
  const key = generateLicense()
  const valid = verifyLicense(key)
  console.log(`  ${key}  ${valid ? '✓' : '✗'}`)
}

console.log(`\nGenerated ${count} key(s).`)
console.log('Format: XXXX-XXXX-XXXX-XXXX (16 hex chars)')
console.log('Validity: 1 year from activation date')
