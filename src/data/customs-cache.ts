/**
 * Local customs data cache — generated from crawl-china output.
 * Provides HS section-level China→Vietnam export data as fallback
 * when no live API key is configured.
 */
import customsData from './customs-data.json'
import { lookupHsSection } from '../shared/hs-categories'
import type { CustomsDataPoint, CustomsResult } from '../shared/types'

type SectionData = Record<string, number>

/**
 * Query customs data for a product keyword.
 * Returns null if the keyword's HS section has no data.
 */
export function queryLocalCustoms(keyword: string): CustomsResult | null {
  const hsSection = lookupHsSection(keyword)
  if (!hsSection) return null

  const sectionData = (customsData as Record<string, SectionData>)[hsSection]
  if (!sectionData) return null

  const periods = Object.keys(sectionData).sort()
  if (periods.length === 0) return null

  const dataPoints: CustomsDataPoint[] = []
  let totalExport = 0

  for (let i = 0; i < periods.length; i++) {
    const month = periods[i]
    const exportAmount = sectionData[month]
    totalExport += exportAmount

    // YoY growth: compare to same month last year if available
    const year = parseInt(month.slice(0, 4))
    const monthNum = month.slice(4)
    const prevYearMonth = `${year - 1}${monthNum}`
    const prevAmount = sectionData[prevYearMonth]
    const yoyGrowth = prevAmount ? ((exportAmount - prevAmount) / prevAmount) * 100 : 0

    dataPoints.push({
      month: `${month.slice(0, 4)}-${month.slice(4)}`,
      exportAmount,
      yoyGrowth: Math.round(yoyGrowth * 10) / 10,
    })
  }

  // Calculate average growth
  const avgGrowth = dataPoints.length > 0
    ? dataPoints.reduce((s, d) => s + d.yoyGrowth, 0) / dataPoints.length
    : 0

  // HS sections don't have province data in summary — leave empty
  const rating: CustomsResult['rating'] =
    avgGrowth > 30 ? 'blue_ocean' : avgGrowth > 10 ? 'growing' : avgGrowth > 0 ? 'stable' : 'declining'

  return {
    keyword,
    dataPoints,
    totalExport,
    avgGrowth,
    topProvinces: [],
    rating,
  }
}
