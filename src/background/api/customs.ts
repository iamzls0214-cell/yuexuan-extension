import type { CustomsResult } from '../../shared/types'

/**
 * Customs data adapter interface.
 * Implement this for each customs data provider (customsdata.net, 腾道, 国贸通, etc.)
 */
export interface CustomsAdapter {
  fetchExportData(keyword: string, endpoint: string, apiKey: string, months?: number): Promise<CustomsResult>
}

/**
 * Default adapter: customsdata.net
 */
const customsdataNetAdapter: CustomsAdapter = {
  async fetchExportData(
    keyword: string,
    endpoint: string,
    apiKey: string,
    months = 12,
  ): Promise<CustomsResult> {
    const url = `${endpoint}/export/trade?keyword=${encodeURIComponent(keyword)}&country=VN&months=${months}`

    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!resp.ok) {
      throw new Error(`海关 API 返回错误: ${resp.status}`)
    }

    const json = await resp.json()

    // Normalize response to our internal format
    return {
      keyword,
      dataPoints: (json.data || []).map((d: Record<string, unknown>) => ({
        month: String(d.month || ''),
        exportAmount: Number(d.amount) || 0,
        yoyGrowth: Number(d.yoy_growth) || 0,
      })),
      totalExport: json.data?.reduce((sum: number, d: Record<string, unknown>) => sum + (Number(d.amount) || 0), 0) || 0,
      avgGrowth: json.summary?.avg_growth || 0,
      topProvinces: (json.summary?.provinces || []).map((p: Record<string, unknown>) => ({
        name: String(p.name || ''),
        share: Number(p.share) || 0,
      })),
      rating: classifyGrowth(json.summary?.avg_growth || 0),
    }
  },
}

/**
 * Classify growth rate into rating.
 */
function classifyGrowth(growth: number): CustomsResult['rating'] {
  if (growth > 50) return 'blue_ocean'
  if (growth > 20) return 'growing'
  if (growth > 0) return 'stable'
  return 'declining'
}

// Default adapter instance
let currentAdapter: CustomsAdapter = customsdataNetAdapter

/**
 * Fetch customs data using the configured adapter.
 */
export async function fetchCustomsData(
  keyword: string,
  endpoint: string,
  apiKey: string,
): Promise<CustomsResult> {
  return currentAdapter.fetchExportData(keyword, endpoint, apiKey)
}

/**
 * Register a custom adapter (for 腾道, 国贸通, etc.)
 */
export function registerCustomsAdapter(adapter: CustomsAdapter): void {
  currentAdapter = adapter
}
