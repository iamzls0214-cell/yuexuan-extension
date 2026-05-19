import { browser } from '../shared/browser-polyfill'
import type { ExtensionMessage, ExtensionResponse } from '../shared/types'
import { MessageType } from '../shared/types'
import { verifyLicense } from './api/license'
import { fetchCustomsData } from './api/customs'
import { translateToVietnamese } from '../shared/vn-translations'
import { getCache, setCache } from './cache'

// ---- Message Router ----
browser.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender): Promise<ExtensionResponse> | undefined => {
    switch (message.type) {
      case MessageType.VERIFY_LICENSE:
        return handleVerifyLicense(message.payload as { key: string })

      case MessageType.FETCH_CUSTOMS:
        return handleFetchCustoms(message.payload as { keyword: string })

      case MessageType.SEARCH_KEYWORD:
        return handleSearchKeyword(message.payload as { keyword: string })

      case MessageType.GENERATE_REPORT:
        return handleGenerateReport(message.payload as { keyword: string })

      default:
        return Promise.resolve({ success: false, error: '未知消息类型' })
    }
  },
)

// ---- Handlers ----

async function handleVerifyLicense(payload: { key: string }): Promise<ExtensionResponse> {
  const isValid = await verifyLicense(payload.key)
  if (isValid) {
    return { success: true }
  }
  return { success: false, error: '激活码无效' }
}

async function handleFetchCustoms(payload: { keyword: string }): Promise<ExtensionResponse> {
  try {
    // Check cache
    const cached = await getCache(payload.keyword + '_customs')
    if (cached) {
      return { success: true, data: cached.data.customs }
    }

    const settings = await browser.storage.local.get('settings')
    const customsSettings = settings.settings as { customsApiEndpoint?: string; customsApiKey?: string } | undefined

    if (!customsSettings?.customsApiKey) {
      return { success: false, error: '请先在设置中配置海关 API Key' }
    }

    const data = await fetchCustomsData(
      payload.keyword,
      customsSettings.customsApiEndpoint || 'https://api.customsdata.net/v1',
      customsSettings.customsApiKey,
    )

    return { success: true, data }
  } catch (err) {
    return { success: false, error: `海关数据查询失败: ${(err as Error).message}` }
  }
}

async function handleSearchKeyword(payload: { keyword: string }): Promise<ExtensionResponse> {
  try {
    const keyword = payload.keyword
    const keywordVi = translateToVietnamese(keyword)

    // Fetch 1688 and Shopee in parallel via fetch (service worker has no CORS)
    const [result1688, shopeeData] = await Promise.allSettled([
      fetch1688Search(keyword),
      fetchShopeeSearch(keywordVi),
    ])

    return {
      success: true,
      data: {
        result1688: result1688.status === 'fulfilled' ? result1688.value : null,
        shopee: shopeeData.status === 'fulfilled' ? shopeeData.value : null,
        keywordVi,
      },
    }
  } catch (err) {
    return { success: false, error: `搜索失败: ${(err as Error).message}` }
  }
}

async function handleGenerateReport(payload: { keyword: string }): Promise<ExtensionResponse> {
  // Report generation is handled client-side in the popup
  return { success: true }
}

// ---- 1688 Search (Mode B: background worker fetch) ----
async function fetch1688Search(keyword: string) {
  const url = `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(keyword)}`
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    },
  })
  const html = await resp.text()

  // Parse products from HTML using regex patterns (multiple fallbacks)
  const products = parse1688Html(html, keyword)
  if (products.length === 0) {
    return null
  }

  const prices = products.map((p) => p.priceMedian)
  return {
    keyword,
    products: products.slice(0, 20),
    priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
    priceMedian: median(prices),
    totalResults: products.length,
  }
}

function parse1688Html(html: string, keyword: string) {
  const products: Array<{
    title: string
    priceMin: number
    priceMax: number
    priceMedian: number
    moq: number
    supplier: string
    supplierRegion: string
    soldCount: number
    url: string
  }> = []

  // Try multiple regex patterns as fallbacks
  const patterns = [
    /"title":"([^"]+)"[^}]*"price":"([^"]+)"[^}]*"offerId":(\d+)/g,
    /data-title="([^"]+)"[^>]*data-price="([^"]+)"/g,
    /<a[^>]*href="(https:\/\/detail\.1688\.com\/offer\/\d+\.html)"[^>]*title="([^"]+)"/g,
  ]

  // Simple pattern: look for price patterns in the HTML
  const priceMatches = html.match(/¥\s*[\d.]+(\s*-\s*¥?\s*[\d.]+)?/g) || []

  // Return empty for now — proper parsing requires page-specific selectors
  // The content script handles the actual extraction when user is on 1688
  return products
}

// ---- Shopee VN Search (Mode B: background worker fetch) ----
async function fetchShopeeSearch(keywordVi: string) {
  const url = `https://shopee.vn/search?keyword=${encodeURIComponent(keywordVi)}`
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    },
  })
  await resp.text()

  // Shopee loads data via API, not SSR. The content script handles extraction.
  // This returns placeholder — actual data comes from content script Mode A.
  return null
}

// ---- Utilities ----
function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
