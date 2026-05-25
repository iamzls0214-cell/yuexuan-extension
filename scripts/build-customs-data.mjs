/**
 * Generate customs-data.json from crawl-china output.
 * Run after crawl-china produces new data:
 *   npm run build:customs-data
 * Or specify a custom path:
 *   node scripts/build-customs-data.mjs /path/to/customs_summary.csv
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// Default: find latest crawl-china summary CSV
function findLatestSummary() {
  const crawlDataDir = join(process.env.HOME || '/Users/leez', 'crawl-china', 'data', 'customs_manual')
  const files = readdirSync(crawlDataDir).filter(f => f.startsWith('customs_summary_') && f.endsWith('.csv'))
  if (files.length === 0) {
    console.error('No customs_summary_*.csv found in', crawlDataDir)
    process.exit(1)
  }
  return join(crawlDataDir, files.sort().pop())
}

const inputPath = process.argv[2] || findLatestSummary()
const outputPath = resolve(root, 'src', 'data', 'customs-data.json')

console.log(`Input:  ${inputPath}`)
console.log(`Output: ${outputPath}`)

// Parse CSV
const csv = readFileSync(inputPath, 'utf-8')
const lines = csv.trim().replace(/^﻿/, '').split('\n')
const headers = lines[0].split(',')

// { hsSection: { period: value_usd } } for Vietnam only
const data = {}

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',')
  const row = {}
  headers.forEach((h, idx) => row[h] = cols[idx] || '')

  if (row.country !== '越南') continue

  const section = row.hs_section
  const period = row.period
  const value = parseFloat(row.value_usd) || 0

  if (!data[section]) data[section] = {}
  data[section][period] = (data[section][period] || 0) + value
}

// Sort periods within each section
for (const section of Object.keys(data)) {
  const sorted = {}
  Object.keys(data[section]).sort().forEach(k => {
    sorted[k] = Math.round(data[section][k] * 100) / 100
  })
  data[section] = sorted
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8')

// Summary
console.log('\nHS Sections:')
for (const section of Object.keys(data).sort()) {
  const months = Object.keys(data[section])
  const total = Object.values(data[section]).reduce((a, b) => a + b, 0)
  console.log(`  ${section}: ${months.length} months, $${(total / 1e6).toFixed(1)}M`)
}
console.log(`\nWritten ${Object.keys(data).length} sections to ${outputPath}`)
