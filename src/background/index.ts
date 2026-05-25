import { browser } from '../shared/browser-polyfill'
import type { ExtensionMessage, ExtensionResponse, CustomsResult, Result1688, ShopeeResult, ProfitAnalysis } from '../shared/types'
import { MessageType } from '../shared/types'
import { verifyLicense } from './api/license'
import { fetchCustomsData } from './api/customs'
import { queryLocalCustoms } from '../data/customs-cache'
import { translateKeyword } from '../shared/translations'
import { getCache, setCache } from './cache'
import { generateMockSearchResult } from './mock-data'
import { SHOPEE_COUNTRIES, type CountryCode, ALL_COUNTRIES } from '../shared/countries'

// ---- UA Pool & rate limiting ----
const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
]
let uaIdx = 0
function nextUA(): string {
  const ua = UA_POOL[uaIdx % UA_POOL.length]
  uaIdx++
  return ua
}

function throttleDelay(): Promise<void> {
  const ms = 1000 + Math.random() * 2000 // 1-3s jittered delay between requests
  return new Promise((r) => setTimeout(r, ms))
}

// Run fetchers sequentially with a throttle gap between each
async function staggeredFetchers<T>(fetchers: Array<() => Promise<T | null>>): Promise<Array<{ status: 'fulfilled'; value: T | null } | { status: 'rejected'; reason: unknown }>> {
  const results: Array<{ status: 'fulfilled'; value: T | null } | { status: 'rejected'; reason: unknown }> = []
  for (let i = 0; i < fetchers.length; i++) {
    if (i > 0) await throttleDelay()
    try {
      results.push({ status: 'fulfilled', value: await fetchers[i]() })
    } catch (err) {
      results.push({ status: 'rejected', reason: err })
    }
  }
  return results
}

// ---- Message Router ----
browser.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender): Promise<ExtensionResponse> | undefined => {
    switch (message.type) {
      case MessageType.VERIFY_LICENSE:
        return handleVerifyLicense(message.payload as { key: string })

      case MessageType.FETCH_CUSTOMS:
        return handleFetchCustoms(message.payload as { keyword: string })

      case MessageType.SEARCH_KEYWORD:
        return handleSearchKeyword(message.payload as { keyword: string; countries?: CountryCode[] })

      case MessageType.GENERATE_REPORT:
        return handleGenerateReport(message.payload as { keyword: string; countries?: CountryCode[] })

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
    const cached = await getCache(payload.keyword + '_customs')
    if (cached) {
      return { success: true, data: cached.data.customs }
    }

    const settings = await browser.storage.local.get('settings')
    const customsSettings = settings.settings as { customsApiEndpoint?: string; customsApiKey?: string } | undefined

    if (customsSettings?.customsApiKey) {
      const data = await fetchCustomsData(
        payload.keyword,
        customsSettings.customsApiEndpoint || 'https://api.customsdata.net/v1',
        customsSettings.customsApiKey,
      )
      return { success: true, data }
    }

    // Fallback 1: local crawl-china customs data
    const localData = queryLocalCustoms(payload.keyword)
    if (localData) {
      return { success: true, data: localData, _source: 'crawl-china' }
    }

    // Fallback 2: generate mock customs data
    const mockResult = generateMockSearchResult(payload.keyword, 'VN')
    return {
      success: true,
      data: mockResult.customs,
      _mock: true,
    }
  } catch (err) {
    const localData = queryLocalCustoms(payload.keyword)
    if (localData) {
      return { success: true, data: localData, _source: 'crawl-china' }
    }
    try {
      const mockResult = generateMockSearchResult(payload.keyword, 'VN')
      return { success: true, data: mockResult.customs, _mock: true }
    } catch {
      return { success: false, error: `海关数据查询失败: ${(err as Error).message}` }
    }
  }
}

async function handleSearchKeyword(payload: { keyword: string; countries?: CountryCode[] }): Promise<ExtensionResponse> {
  try {
    const keyword = payload.keyword
    const countries = payload.countries?.length ? payload.countries : ALL_COUNTRIES

    // Load settings
    const stored = await browser.storage.local.get('settings')
    const settings = stored.settings as {
      exchangeRate?: number; apiServerUrl?: string; serverApiKey?: string
      enabledCountries?: CountryCode[]
    } | undefined

    // Try server first if configured
    const serverUrl = settings?.apiServerUrl || ''
    const serverKey = settings?.serverApiKey || ''
    if (serverUrl) {
      try {
        const serverResult = await callServer(serverUrl, serverKey, keyword, countries)
        if (serverResult) return serverResult
      } catch { /* fall through to direct */ }
    }

    // Direct fetch: sequential with throttle gaps to avoid rate-limiting
    const searchResults = await staggeredFetchers([
      () => fetch1688Search(keyword),
      ...countries.map((c) => {
        const vi = translateKeyword(keyword, c)
        const exRate = SHOPEE_COUNTRIES[c]?.exchangeRate || 3500
        return () => fetchShopeeSearch(vi, exRate, c)
      }),
    ])

    const real1688 = searchResults[0]?.status === 'fulfilled' ? searchResults[0].value : null
    const realShopees = searchResults.slice(1)
      .map((r) => (r.status === 'fulfilled' ? r.value : null))
      .filter(Boolean) as ShopeeResult[]

    // If we got any real data, return it
    if (real1688 || realShopees.length > 0) {
      return {
        success: true,
        data: {
          result1688: real1688,
          shopees: realShopees,
          keyword,
        },
      }
    }

    // Fallback: mock data for all countries
    const mockShopees = countries.map((c) => {
      const mock = generateMockSearchResult(keyword, c)
      return mock.shopee
    }).filter(Boolean)
    const mockResult = generateMockSearchResult(keyword, countries[0] || 'VN')

    return {
      success: true,
      data: {
        result1688: mockResult.result1688,
        shopees: mockShopees.length > 0 ? mockShopees : [mockResult.shopee],
        _mock: true,
      },
    }
  } catch (err) {
    return { success: false, error: `搜索失败: ${(err as Error).message}` }
  }
}

async function handleGenerateReport(payload: { keyword: string; countries?: CountryCode[] }): Promise<ExtensionResponse> {
  try {
    const keyword = payload.keyword
    const countries = payload.countries?.length ? payload.countries : ['VN']

    const stored = await browser.storage.local.get('settings')
    const settings = stored.settings as {
      customsApiEndpoint?: string; customsApiKey?: string
      exchangeRate?: number; freightCostPerKg?: number; tariffRate?: number
      apiServerUrl?: string; serverApiKey?: string
    } | undefined
    const exchangeRate = settings?.exchangeRate || 3500
    const freightCost = settings?.freightCostPerKg || 15
    const tariffRate = settings?.tariffRate || 0.1

    // Try server first
    const serverUrl = settings?.apiServerUrl || ''
    const serverKey = settings?.serverApiKey || ''
    if (serverUrl) {
      try {
        const resp = await fetch(`${serverUrl}/api/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serverKey}` },
          body: JSON.stringify({ keyword, countries }),
        })
        if (resp.ok) {
          const data = await resp.json()
          return { success: true, data: { content: data.content } }
        }
      } catch { /* fall through */ }
    }

    // Direct: fetch sequentially with throttle gaps
    const keywordVi = translateKeyword(keyword, countries[0])

    // Fetch customs (standalone, not throttled among itself)
    let customs: CustomsResult | null = null
    try {
      if (settings?.customsApiKey) {
        customs = await fetchCustomsData(keyword, settings.customsApiEndpoint || 'https://api.customsdata.net/v1', settings.customsApiKey)
      } else {
        customs = generateMockSearchResult(keyword, 'VN').customs
      }
    } catch { customs = null }

    // Fetch 1688 + Shopee countries sequentially with throttle
    const searchResults = await staggeredFetchers([
      () => fetch1688Search(keyword),
      ...countries.map((c) => {
        const vi = translateKeyword(keyword, c)
        const rate = SHOPEE_COUNTRIES[c]?.exchangeRate || 3500
        return () => fetchShopeeSearch(vi, rate, c)
      }),
    ])

    const data1688 = searchResults[0]?.status === 'fulfilled' ? searchResults[0].value : null
    const shopees = searchResults.slice(1)
      .filter((r): r is { status: 'fulfilled'; value: ShopeeResult } => r.status === 'fulfilled' && r.value != null)
      .map((r) => r.value)

    // Fallback to mock
    if (!customs && !data1688 && shopees.length === 0) {
      const mock = generateMockSearchResult(keyword, countries[0] || 'VN')
      const report = buildMarkdownReport(keyword, mock.customs, mock.result1688, [mock.shopee].filter(Boolean), null)
      return { success: true, data: { content: report, _mock: true } }
    }

    const costPrice = data1688?.priceMedian || 0
    const primaryShopee = shopees[0]
    const shopeeMedianCny = primaryShopee?.priceMedianCny || 0
    const totalCost = costPrice + freightCost + costPrice * tariffRate
    const grossProfit = shopeeMedianCny - totalCost
    const grossMargin = shopeeMedianCny > 0 ? (grossProfit / shopeeMedianCny) * 100 : 0

    const profit: ProfitAnalysis | null = costPrice > 0 && shopeeMedianCny > 0 ? {
      costPrice,
      exchangeRate,
      freightCost,
      tariffCost: costPrice * tariffRate,
      totalCost,
      shopeePrice: shopeeMedianCny,
      grossProfit,
      grossMargin,
      rating: grossMargin > 40 ? 'high' as const : grossMargin > 20 ? 'medium' as const : 'low' as const,
    } : null

    const report = buildMarkdownReport(keyword, customs, data1688, shopees, profit)
    return { success: true, data: { content: report } }
  } catch (err) {
    return { success: false, error: `报告生成失败: ${(err as Error).message}` }
  }
}

// ---- Server API call ----
async function callServer(
  serverUrl: string,
  serverKey: string,
  keyword: string,
  countries: CountryCode[],
): Promise<ExtensionResponse | null> {
  const resp = await fetch(`${serverUrl}/api/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serverKey}`,
    },
    body: JSON.stringify({ keyword, countries }),
  })
  if (!resp.ok) return null
  const data = await resp.json()
  return { success: true, data }
}

// ---- Report builder ----
function buildMarkdownReport(
  keyword: string,
  customs: CustomsResult | null,
  data1688: Result1688 | null,
  shopees: ShopeeResult[],
  profit: ProfitAnalysis | null,
): string {
  const now = new Date().toISOString().slice(0, 10)
  const growthEmoji = !customs ? '❓' : customs.avgGrowth > 30 ? '🔥' : customs.avgGrowth > 10 ? '⚡' : customs.avgGrowth > 0 ? '➡️' : '⚠️'

  const shopeeBlocks = shopees.map((shopee) => {
    const cfg = SHOPEE_COUNTRIES[shopee.country]
    const name = cfg?.name || shopee.country
    const compEmoji = shopee.competitionLevel === 'low' ? '🟢' : shopee.competitionLevel === 'medium' ? '🟡' : '🔴'
    return [
      `### ${cfg?.flag || ''} ${name}`,
      `- 在售商品数：${shopee.totalListings} 件`,
      `- 售价区间：¥${shopee.priceRangeCny.min.toFixed(0)} - ¥${shopee.priceRangeCny.max.toFixed(0)}`,
      `- 卖家数量：${shopee.sellerCount} 家`,
      `- 竞争度评级：${compEmoji} ${shopee.competitionLevel === 'low' ? '低' : shopee.competitionLevel === 'medium' ? '中' : '高'}`,
      `- 需求趋势：${shopee.demandTrend === 'accelerating' ? '↗️加速' : shopee.demandTrend === 'stable' ? '➡️平稳' : '↘️放缓'}`,
      `- 新卖家占比（近3个月）：${(shopee.newSellerRatio * 100).toFixed(0)}%`,
    ].join('\n')
  }).join('\n\n')

  return [
    `# ${keyword} 东南亚市场交叉分析报告`,
    `> 生成时间：${now}`,
    '',
    '## 一、海关出口趋势',
    customs ? [
      `- 近12个月出口总额：¥${(customs.totalExport / 10000).toFixed(1)}万`,
      `- 同比增长：${customs.avgGrowth > 0 ? '+' : ''}${customs.avgGrowth.toFixed(1)}%`,
      `- 主要出口省份：${customs.topProvinces.slice(0, 3).map((p) => `${p.name}(${(p.share * 100).toFixed(0)}%)`).join('、')}`,
      `- 机会评级：${growthEmoji} ${customs.rating === 'blue_ocean' ? '蓝海' : customs.rating === 'growing' ? '增长' : customs.rating === 'stable' ? '平稳' : '下滑'}`,
    ].join('\n') : '- 暂无海关数据',
    '',
    '## 二、1688 采购成本',
    data1688 ? [
      `- 价格区间：¥${data1688.priceRange.min.toFixed(0)} - ¥${data1688.priceRange.max.toFixed(0)}`,
      `- 中位数出厂价：¥${data1688.priceMedian.toFixed(0)}`,
      `- 搜索结果数：${data1688.totalResults} 件`,
      data1688.products.length > 0 ? `- 主要供应商区域：${[...new Set(data1688.products.slice(0, 5).map((p) => p.supplierRegion).filter(Boolean))].join('、') || '暂无'}` : '',
    ].join('\n') : '- 暂无1688数据',
    '',
    '## 三、Shopee 各国市场',
    shopeeBlocks || '- 暂无Shopee数据',
    '',
    '## 四、利润测算',
    profit ? [
      `- 单品采购成本：¥${profit.costPrice.toFixed(0)}`,
      `- 预估运费+关税：¥${(profit.freightCost + profit.tariffCost).toFixed(0)}`,
      `- Shopee 中位售价：¥${profit.shopeePrice.toFixed(0)}`,
      `- 预估毛利率：${profit.grossMargin.toFixed(1)}%`,
      `- 利润评级：${profit.rating === 'high' ? '🟢高利润' : profit.rating === 'medium' ? '🟡中等' : '🔴低利润'}`,
    ].join('\n') : '- 暂无利润数据',
    '',
    '## 五、综合结论',
    generateReportConclusion(customs, data1688, shopees[0] || null, profit),
  ].join('\n')
}

function generateReportConclusion(
  customs: CustomsResult | null,
  data1688: Result1688 | null,
  shopee: ShopeeResult | null,
  profit: ProfitAnalysis | null,
): string {
  const points: string[] = []
  if (customs) {
    if (customs.avgGrowth > 30) points.push('海关出口增速强劲，属于快速增长品类')
    else if (customs.avgGrowth > 0) points.push('海关出口平稳增长，市场有基础需求')
    else points.push('海关出口呈下降趋势，需谨慎评估')
  }
  if (shopee) {
    const cfg = SHOPEE_COUNTRIES[shopee.country]
    const name = cfg?.name || shopee.country
    if (shopee.competitionLevel === 'low') points.push(`${name}市场卖家少、竞争度低，属于蓝海机会`)
    else if (shopee.competitionLevel === 'medium') points.push(`${name}市场竞争适中，仍有切入空间`)
    else points.push(`${name}市场竞争激烈，需差异化策略`)
    if (shopee.demandTrend === 'accelerating') points.push('消费者需求正在加速增长')
  }
  if (profit) {
    if (profit.grossMargin > 40) points.push(`毛利率${profit.grossMargin.toFixed(0)}%，利润空间充裕`)
    else if (profit.grossMargin > 20) points.push(`毛利率${profit.grossMargin.toFixed(0)}%，利润空间合理`)
    else points.push('毛利率偏低，需优化采购或物流成本')
  }
  return points.length > 0 ? points.map((p) => `- ${p}`).join('\n') : '- 数据不足，建议补充更多信息后再分析'
}

// ---- 1688 Search ----
async function fetch1688Search(keyword: string) {
  const url = `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(keyword)}`
  const resp = await fetch(url, {
    headers: {
      'User-Agent': nextUA(),
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
  })

  if (!resp.ok) {
    console.warn(`1688 search returned ${resp.status}`)
    return null
  }

  const html = await resp.text()

  const jsonMatch = html.match(/(?:window\.__INIT_DATA__|window\.__data__|window\.__PRELOADED_STATE__)\s*=\s*(\{.+?\});/s)
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1])
      const products = extract1688FromJSON(data, keyword)
      if (products.length > 0) return build1688Result(keyword, products)
    } catch { /* fall through */ }
  }

  const products = parse1688HtmlCards(html)
  if (products.length > 0) return build1688Result(keyword, products)

  const ldJson = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
  if (ldJson) {
    for (const match of ldJson) {
      try {
        const inner = match.replace(/<\/?script[^>]*>/g, '')
        const parsed = JSON.parse(inner)
        if (parsed['@type'] === 'ItemList' && parsed.itemListElement) {
          const products = parsed.itemListElement.map((item: { name: string; offers?: { price?: string }; url?: string }) => ({
            title: item.name || '',
            priceMin: parseFloat(item.offers?.price || '0'),
            priceMax: parseFloat(item.offers?.price || '0'),
            priceMedian: parseFloat(item.offers?.price || '0'),
            moq: 0,
            supplier: '',
            supplierRegion: '',
            soldCount: 0,
            url: item.url || '',
          }))
          if (products.length > 0) return build1688Result(keyword, products)
        }
      } catch { /* continue */ }
    }
  }

  return null
}

function build1688Result(keyword: string, products: ReturnType<typeof parse1688HtmlCards>) {
  const prices = products.map((p) => p.priceMedian).filter((p) => p > 0)
  const validProducts = products.filter((p) => p.title && p.url)
  return {
    keyword,
    products: validProducts.slice(0, 20),
    priceRange: {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
    },
    priceMedian: median(prices),
    totalResults: validProducts.length,
  }
}

function extract1688FromJSON(data: Record<string, unknown>, _keyword: string) {
  const products: Array<{
    title: string; priceMin: number; priceMax: number; priceMedian: number
    moq: number; supplier: string; supplierRegion: string; soldCount: number; url: string
  }> = []

  const paths = [
    data?.data?.offers,
    data?.offers,
    data?.data?.result?.list,
    data?.result?.list,
    data?.data?.items,
    data?.items,
  ]

  for (const list of paths) {
    if (!Array.isArray(list)) continue
    for (const item of list) {
      const title = item?.title || item?.name || item?.offerTitle || ''
      const price = parseFloat(item?.price || item?.priceMin || item?.amount || '0')
      const url = item?.url || item?.href || item?.detailUrl || ''
      const offerId = item?.offerId || item?.id || ''
      const offerUrl = offerId ? `https://detail.1688.com/offer/${offerId}.html` : url
      if (title && price > 0) {
        products.push({
          title,
          priceMin: price,
          priceMax: price,
          priceMedian: price,
          moq: item?.moq || item?.minOrderQuantity || 0,
          supplier: item?.supplierName || item?.company || '',
          supplierRegion: item?.supplierAddress || item?.region || '',
          soldCount: item?.soldCount || item?.tradeCount || 0,
          url: offerUrl,
        })
      }
    }
    if (products.length > 0) break
  }

  return products
}

function parse1688HtmlCards(html: string) {
  const products: Array<{
    title: string; priceMin: number; priceMax: number; priceMedian: number
    moq: number; supplier: string; supplierRegion: string; soldCount: number; url: string
  }> = []

  const seenOffers = new Set<string>()
  const cardRegex = /<a[^>]*href="(https:\/\/detail\.1688\.com\/offer\/\d+\.html)"[^>]*title="([^"]+)"[^>]*>/gi
  let match
  while ((match = cardRegex.exec(html)) !== null) {
    const url = match[1]
    const title = match[2]
    if (seenOffers.has(url)) continue
    seenOffers.add(url)

    const pos = match.index
    const context = html.substring(pos, pos + 2000)
    const priceInfo = parsePriceFromContext(context)

    const supplierMatch = context.match(/(?:supplier|company|公司|供应商)[^<]*<[^>]*>([^<]+)</i)
    const supplier = supplierMatch ? supplierMatch[1].trim() : ''

    const regionMatch = context.match(/(?:location|region|地区|所在地)[^<]*<[^>]*>([^<]+)</i)
    const region = regionMatch ? regionMatch[1].trim() : ''

    products.push({
      title,
      ...priceInfo,
      priceMedian: (priceInfo.priceMin + priceInfo.priceMax) / 2,
      moq: 0,
      supplier,
      supplierRegion: region,
      soldCount: 0,
      url,
    })
  }

  if (products.length === 0) {
    const offerIdMatches = html.match(/\/offer\/(\d+)\.html/gi) || []
    const seen = new Set<string>()
    for (const offerPath of offerIdMatches) {
      if (seen.has(offerPath)) continue
      seen.add(offerPath)

      const idx = html.indexOf(offerPath)
      if (idx < 0) continue
      const context = html.substring(Math.max(0, idx - 500), Math.min(html.length, idx + 2000))

      const titleMatch = context.match(/(?:title="([^"]+)")|(?:<a[^>]*>([^<]{10,})<\/a>)/)
      const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : ''

      const priceInfo = parsePriceFromContext(context)

      if (title) {
        products.push({
          title,
          ...priceInfo,
          priceMedian: (priceInfo.priceMin + priceInfo.priceMax) / 2,
          moq: 0,
          supplier: '',
          supplierRegion: '',
          soldCount: 0,
          url: `https://detail.1688.com${offerPath}`,
        })
      }
    }
  }

  return products
}

function parsePriceFromContext(context: string): { priceMin: number; priceMax: number } {
  const pricePatterns = [
    /[¥￥]\s*(\d+(?:\.\d{1,2})?)\s*-\s*[¥￥]?\s*(\d+(?:\.\d{1,2})?)/,
    /[¥￥]\s*(\d+(?:\.\d{1,2})?)/g,
    /"price"\s*:\s*"?([\d.]+)"?/,
    /data-price\s*=\s*"([\d.]+)"/,
  ]

  const rangeMatch = context.match(pricePatterns[0])
  if (rangeMatch) {
    return {
      priceMin: parseFloat(rangeMatch[1]) || 0,
      priceMax: parseFloat(rangeMatch[2]) || 0,
    }
  }

  const singlePrices: number[] = []
  const singleRegex = pricePatterns[1]
  let sm
  while ((sm = singleRegex.exec(context)) !== null) {
    singlePrices.push(parseFloat(sm[1]))
  }
  singleRegex.lastIndex = 0

  if (singlePrices.length > 0) {
    const p = singlePrices[0]
    return { priceMin: p, priceMax: p }
  }

  return { priceMin: 0, priceMax: 0 }
}

// ---- Shopee Search (multi-country) ----
async function fetchShopeeSearch(keywordLocal: string, exchangeRate: number, country: CountryCode) {
  const cfg = SHOPEE_COUNTRIES[country]
  if (!cfg) return null

  const domain = cfg.domain
  const apiUrl = new URL(`https://${domain}/api/v4/search/search_items`)
  apiUrl.searchParams.set('by', 'relevancy')
  apiUrl.searchParams.set('keyword', keywordLocal)
  apiUrl.searchParams.set('limit', '30')
  apiUrl.searchParams.set('newest', '0')
  apiUrl.searchParams.set('order', 'desc')
  apiUrl.searchParams.set('page_type', 'search')
  apiUrl.searchParams.set('version', '2')

  try {
    const resp = await fetch(apiUrl.toString(), {
      headers: {
        'User-Agent': nextUA(),
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Api-Source': 'rn-search',
      },
    })

    if (resp.status === 429) {
      await new Promise((r) => setTimeout(r, 2000))
      const retryResp = await fetch(apiUrl.toString(), {
        headers: {
          'User-Agent': nextUA(),
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
      if (!retryResp.ok) return null
      return parseShopeeApiResponse(await retryResp.json(), keywordLocal, exchangeRate, country)
    }

    if (!resp.ok) return null

    const data = await resp.json()
    return parseShopeeApiResponse(data, keywordLocal, exchangeRate, country)
  } catch {
    return null
  }
}

function parseShopeeApiResponse(data: Record<string, unknown>, keywordVi: string, exchangeRate: number, country: CountryCode) {
  const items = (data?.items as Array<Record<string, unknown>>) || []
  if (items.length === 0) return null

  const cfg = SHOPEE_COUNTRIES[country]
  const domain = cfg?.domain || 'shopee.vn'

  const products = items.map((item) => {
    const itemBasic = item?.item_basic as Record<string, unknown> | undefined
    const price = (itemBasic?.price as number) || 0
    const priceLocal = price > 1000 ? price / 100000 : price

    const soldCount = (itemBasic?.sold as number) ||
      (itemBasic?.historical_sold as number) || 0
    const rating = (itemBasic?.item_rating?.rating_star as number) || 0
    const reviewCount = (itemBasic?.item_rating?.rating_count?.[0] as number) || 0
    const shopName = (itemBasic?.shop_name as string) || ''
    const title = (itemBasic?.name as string) || ''

    const ctime = (itemBasic?.ctime as number) || 0
    const listedDays = ctime > 0
      ? Math.floor((Date.now() / 1000 - ctime) / 86400)
      : 0

    const shopId = itemBasic?.shopid as number | undefined
    const itemId = itemBasic?.itemid as number | undefined

    return {
      title,
      priceVnd: priceLocal,
      priceCny: Math.round((priceLocal / exchangeRate) * 100) / 100,
      soldCount,
      shopName,
      rating,
      reviewCount,
      listedDays,
      url: itemId && shopId
        ? `https://${domain}/product/${shopId}/${itemId}`
        : '',
    }
  }).filter((p) => p.title && (p.priceVnd || p.priceCny) > 0)

  if (products.length === 0) return null

  const pricesCny = products.map((p) => p.priceCny)
  const sellerIds = new Set(products.map((p) => p.shopName))
  const newSellers = products.filter((p) => p.listedDays > 0 && p.listedDays <= 90)
  const recentProducts = products.filter((p) => p.listedDays <= 30)
  const avgReviewVelocity = recentProducts.length > 0
    ? (recentProducts.reduce((sum, p) => sum + p.reviewCount, 0) / recentProducts.length) * 3.3
    : 0

  return {
    keyword: keywordVi,
    keywordVi,
    country,
    products: products.slice(0, 20),
    priceRangeVnd: { min: 0, max: 0 },
    priceRangeCny: { min: Math.min(...pricesCny), max: Math.max(...pricesCny) },
    priceMedianCny: median(pricesCny),
    sellerCount: sellerIds.size,
    totalListings: products.length,
    competitionLevel: (sellerIds.size < 50 ? 'low' : sellerIds.size < 150 ? 'medium' : 'high') as 'low' | 'medium' | 'high',
    demandTrend: (avgReviewVelocity > 15 ? 'accelerating' : avgReviewVelocity > 5 ? 'stable' : 'slowing') as 'accelerating' | 'stable' | 'slowing',
    newSellerRatio: products.length > 0 ? newSellers.length / products.length : 0,
    avgReviewVelocity: Math.round(avgReviewVelocity * 10) / 10,
  }
}

// ---- Utilities ----
function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
