/**
 * 越海选品 API Relay Server
 * Proxies 1688 + multi-country Shopee scraping to avoid extension CORS issues.
 *
 * Usage: node server/index.mjs
 *   PORT=3000 node server/index.mjs
 */
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 3000
const API_KEY = process.env.API_KEY || 'yuexuan-server-key-2026'

// ---- Country config ----
const COUNTRIES = {
  VN: { name: '越南', domain: 'shopee.vn', exchangeRate: 3500 },
  TH: { name: '泰国', domain: 'shopee.co.th', exchangeRate: 5.0 },
  ID: { name: '印尼', domain: 'shopee.co.id', exchangeRate: 2200 },
  PH: { name: '菲律宾', domain: 'shopee.ph', exchangeRate: 7.6 },
}

// ---- Translations (mirror of shared/translations.ts) ----
const TRANSLATIONS = {
  VN: {
    '蓝牙耳机': 'tai nghe bluetooth', '充电宝': 'pin sạc dự phòng', '数据线': 'cáp sạc',
    '手机壳': 'ốp điện thoại', '智能手表': 'đồng hồ thông minh', '音箱': 'loa',
    '蓝牙音箱': 'loa bluetooth', '耳机': 'tai nghe', '储能电源': 'trạm sạc di động',
    '便携储能电源': 'trạm sạc di động', '太阳能灯': 'đèn năng lượng mặt trời',
    '筋膜枪': 'súng massage cơ', '投影仪': 'máy chiếu', '加湿器': 'máy tạo độ ẩm',
    '吸尘器': 'máy hút bụi', '电风扇': 'quạt điện', '榨汁机': 'máy ép trái cây',
    '空气炸锅': 'nồi chiên không dầu', '电动牙刷': 'bàn chải điện', '摄像头': 'camera',
    '无人机': 'drone', '平衡车': 'xe cân bằng', '滑板车': 'xe trượt', '电动车': 'xe điện',
    '灯具': 'đèn', '家具': 'nội thất', '玩具': 'đồ chơi', '箱包': 'túi xách',
    '鞋类': 'giày dép', '服装': 'quần áo', '美妆': 'mỹ phẩm', '五金工具': 'dụng cụ',
    '汽摩配': 'phụ tùng ô tô', '宠物用品': 'đồ dùng thú cưng', '户外用品': 'đồ dã ngoại',
    '厨具': 'đồ nhà bếp', '手机支架': 'giá đỡ điện thoại', '充电器': 'bộ sạc',
    '移动电源': 'pin sạc dự phòng', '自拍杆': 'gậy selfie', '智能家居': 'nhà thông minh',
    '汽车用品': 'phụ kiện ô tô', '母婴用品': 'đồ dùng mẹ và bé',
  },
  TH: {
    '蓝牙耳机': 'หูฟังบลูทูธ', '充电宝': 'พาวเวอร์แบงค์', '数据线': 'สายชาร์จ',
    '手机壳': 'เคสมือถือ', '智能手表': 'สมาร์ทวอทช์', '音箱': 'ลำโพง', '耳机': 'หูฟัง',
    '太阳能灯': 'ไฟโซล่าเซลล์', '投影仪': 'โปรเจคเตอร์', '加湿器': 'เครื่องเพิ่มความชื้น',
    '吸尘器': 'เครื่องดูดฝุ่น', '电风扇': 'พัดลม', '空气炸锅': 'หม้อทอดไร้น้ำมัน',
    '电动牙刷': 'แปรงสีฟันไฟฟ้า', '摄像头': 'กล้องวงจรปิด', '无人机': 'โดรน',
    '服装': 'เสื้อผ้า', '鞋类': 'รองเท้า', '箱包': 'กระเป๋า', '玩具': 'ของเล่น', '美妆': 'เครื่องสำอาง',
  },
  ID: {
    '蓝牙耳机': 'earphone bluetooth', '充电宝': 'power bank', '数据线': 'kabel data',
    '手机壳': 'casing hp', '智能手表': 'smartwatch', '音箱': 'speaker', '耳机': 'earphone',
    '太阳能灯': 'lampu tenaga surya', '投影仪': 'proyektor', '加湿器': 'humidifier',
    '吸尘器': 'vacuum cleaner', '电风扇': 'kipas angin', '空气炸锅': 'air fryer',
    '电动牙刷': 'sikat gigi elektrik', '摄像头': 'kamera', '无人机': 'drone',
    '服装': 'pakaian', '鞋类': 'sepatu', '箱包': 'tas', '玩具': 'mainan', '美妆': 'kosmetik',
  },
  PH: {
    '蓝牙耳机': 'bluetooth earphones', '充电宝': 'power bank', '数据线': 'charging cable',
    '手机壳': 'phone case', '智能手表': 'smartwatch', '音箱': 'speaker', '耳机': 'earphones',
    '太阳能灯': 'solar light', '投影仪': 'projector', '加湿器': 'humidifier',
    '吸尘器': 'vacuum cleaner', '电风扇': 'electric fan', '空气炸锅': 'air fryer',
    '电动牙刷': 'electric toothbrush', '摄像头': 'camera', '无人机': 'drone',
    '服装': 'clothing', '鞋类': 'shoes', '箱包': 'bags', '玩具': 'toys', '美妆': 'cosmetics',
  },
}

// ---- UA Pool (rotated per request) ----
const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
]
let uaIndex = 0
function rotatedUA() {
  const ua = UA_POOL[uaIndex % UA_POOL.length]
  uaIndex++
  return ua
}

// ---- Rate limiting ----
function delay(minMs = 1500, maxMs = 2500) {
  const ms = minMs + Math.random() * (maxMs - minMs)
  return new Promise((r) => setTimeout(r, ms))
}

// Run fetchers sequentially with delays between each to avoid triggering rate limits
async function sequentialWithDelay(fetchers) {
  const results = []
  for (let i = 0; i < fetchers.length; i++) {
    if (i > 0) await delay()
    try {
      results.push({ status: 'fulfilled', value: await fetchers[i]() })
    } catch (err) {
      results.push({ status: 'rejected', reason: err })
    }
  }
  return results
}

// ---- Cache (30 min TTL in memory) ----
const cache = new Map()
const CACHE_TTL = 30 * 60 * 1000

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() })
}

// ---- Middleware ----
app.use(cors())
app.use(express.json({ limit: '1mb' }))

// Auth middleware
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (token !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// ---- Routes ----

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// Search (1688 + multi-country Shopee)
app.post('/api/search', auth, async (req, res) => {
  const { keyword, countries = ['VN'] } = req.body
  if (!keyword) return res.status(400).json({ error: 'keyword required' })

  const cacheKey = `search:${keyword}:${countries.join(',')}`
  const cached = getCached(cacheKey)
  if (cached) return res.json({ ...cached, _cached: true })

  try {
    const results = await sequentialWithDelay([
      () => fetch1688(keyword),
      ...countries.map((c) => () => fetchShopee(keyword, c)),
    ])

    const data1688 = results[0]?.status === 'fulfilled' ? results[0].value : null
    const shopees = results.slice(1)
      .map((r) => r.status === 'fulfilled' ? r.value : null)
      .filter(Boolean)

    const result = { result1688: data1688, shopees, keyword }
    setCache(cacheKey, result)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Report generation
app.post('/api/report', auth, async (req, res) => {
  const { keyword, countries = ['VN'] } = req.body
  if (!keyword) return res.status(400).json({ error: 'keyword required' })

  try {
    const results = await sequentialWithDelay([
      () => fetch1688(keyword),
      ...countries.map((c) => () => fetchShopee(keyword, c)),
    ])

    const data1688 = results[0]?.status === 'fulfilled' ? results[0].value : null
    const shopees = results.slice(1)
      .map((r) => r.status === 'fulfilled' ? r.value : null)
      .filter(Boolean)

    const content = buildReport(keyword, data1688, shopees)
    res.json({ content })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Customs data proxy
app.post('/api/customs', auth, async (req, res) => {
  const { keyword } = req.body
  if (!keyword) return res.status(400).json({ error: 'keyword required' })
  // For now, return empty — customs data comes from crawl-china
  res.json({ keyword, dataPoints: [], totalExport: 0, avgGrowth: 0, topProvinces: [], rating: 'stable' })
})

// ---- 1688 Search ----
async function fetch1688(keyword) {
  const url = `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(keyword)}`
  const resp = await fetch(url, {
    headers: {
      'User-Agent': rotatedUA(),
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
  })

  if (!resp.ok) return null
  const html = await resp.text()

  // Try JSON extraction
  const jsonMatch = html.match(/(?:window\.__INIT_DATA__|window\.__data__|window\.__PRELOADED_STATE__)\s*=\s*(\{.+?\});/s)
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1])
      const products = extract1688JSON(data)
      if (products.length > 0) return build1688Result(keyword, products)
    } catch { /* fall through */ }
  }

  // Try HTML parsing
  const products = parse1688HTML(html)
  if (products.length > 0) return build1688Result(keyword, products)

  return null
}

function extract1688JSON(data) {
  const products = []
  const paths = [data?.data?.offers, data?.offers, data?.data?.result?.list, data?.result?.list, data?.data?.items, data?.items]
  for (const list of paths) {
    if (!Array.isArray(list)) continue
    for (const item of list) {
      const title = item?.title || item?.name || item?.offerTitle || ''
      const price = parseFloat(item?.price || item?.priceMin || item?.amount || '0')
      const offerId = item?.offerId || item?.id || ''
      if (title && price > 0) {
        products.push({
          title, priceMin: price, priceMax: price, priceMedian: price,
          moq: item?.moq || 0, supplier: item?.supplierName || '',
          supplierRegion: item?.supplierAddress || '', soldCount: item?.soldCount || 0,
          url: offerId ? `https://detail.1688.com/offer/${offerId}.html` : item?.url || '',
        })
      }
    }
    if (products.length > 0) break
  }
  return products
}

function parse1688HTML(html) {
  const products = []
  const seen = new Set()
  const regex = /<a[^>]*href="(https:\/\/detail\.1688\.com\/offer\/\d+\.html)"[^>]*title="([^"]+)"[^>]*>/gi
  let m
  while ((m = regex.exec(html)) !== null) {
    if (seen.has(m[1])) continue
    seen.add(m[1])
    const ctx = html.substring(m.index, m.index + 2000)
    const pm = ctx.match(/[¥￥]\s*(\d+(?:\.\d{1,2})?)\s*-\s*[¥￥]?\s*(\d+(?:\.\d{1,2})?)/)
    const sm = ctx.match(/[¥￥]\s*(\d+(?:\.\d{1,2})?)/)
    const p = pm ? { min: parseFloat(pm[1]), max: parseFloat(pm[2]) }
      : sm ? { min: parseFloat(sm[1]), max: parseFloat(sm[1]) }
      : { min: 0, max: 0 }
    if (m[2] && p.min > 0) {
      products.push({
        title: m[2], priceMin: p.min, priceMax: p.max, priceMedian: (p.min + p.max) / 2,
        moq: 0, supplier: '', supplierRegion: '', soldCount: 0, url: m[1],
      })
    }
  }
  return products
}

function build1688Result(keyword, products) {
  const prices = products.map((p) => p.priceMedian).filter((p) => p > 0)
  return {
    keyword,
    products: products.slice(0, 20),
    priceRange: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 },
    priceMedian: median(prices),
    totalResults: products.length,
  }
}

// ---- Shopee Search (multi-country) ----
async function fetchShopee(keyword, country) {
  const cfg = COUNTRIES[country]
  if (!cfg) return null

  const translated = translateKeyword(keyword, country)
  const apiUrl = new URL(`https://${cfg.domain}/api/v4/search/search_items`)
  apiUrl.searchParams.set('by', 'relevancy')
  apiUrl.searchParams.set('keyword', translated)
  apiUrl.searchParams.set('limit', '30')
  apiUrl.searchParams.set('newest', '0')
  apiUrl.searchParams.set('order', 'desc')
  apiUrl.searchParams.set('page_type', 'search')
  apiUrl.searchParams.set('version', '2')

  try {
    const resp = await fetch(apiUrl.toString(), {
      headers: {
        'User-Agent': rotatedUA(),
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Api-Source': 'rn-search',
      },
    })

    if (resp.status === 429) {
      await new Promise((r) => setTimeout(r, 2000))
      const retry = await fetch(apiUrl.toString(), {
        headers: {
          'User-Agent': rotatedUA(),
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
      if (!retry.ok) return null
      return parseShopee(await retry.json(), translated, cfg.exchangeRate, country)
    }

    if (!resp.ok) return null
    return parseShopee(await resp.json(), translated, cfg.exchangeRate, country)
  } catch {
    return null
  }
}

function parseShopee(data, keywordVi, exchangeRate, country) {
  const items = data?.items || []
  if (!items.length) return null

  const cfg = COUNTRIES[country]
  const products = items.map((item) => {
    const b = item?.item_basic || {}
    const price = b?.price || 0
    const priceLocal = price > 1000 ? price / 100000 : price
    return {
      title: b?.name || '',
      priceVnd: priceLocal,
      priceCny: Math.round((priceLocal / exchangeRate) * 100) / 100,
      soldCount: b?.sold || b?.historical_sold || 0,
      shopName: b?.shop_name || '',
      rating: b?.item_rating?.rating_star || 0,
      reviewCount: b?.item_rating?.rating_count?.[0] || 0,
      listedDays: b?.ctime ? Math.floor((Date.now() / 1000 - b.ctime) / 86400) : 0,
      url: (b?.shopid && b?.itemid) ? `https://${cfg.domain}/product/${b.shopid}/${b.itemid}` : '',
    }
  }).filter((p) => p.title && (p.priceVnd || p.priceCny) > 0)

  if (!products.length) return null

  const pricesCny = products.map((p) => p.priceCny)
  const sellers = new Set(products.map((p) => p.shopName))
  const newSellers = products.filter((p) => p.listedDays > 0 && p.listedDays <= 90)
  const recent = products.filter((p) => p.listedDays <= 30)
  const avgVelocity = recent.length ? (recent.reduce((s, p) => s + p.reviewCount, 0) / recent.length) * 3.3 : 0

  return {
    keyword: keywordVi, keywordVi, country,
    products: products.slice(0, 20),
    priceRangeVnd: { min: 0, max: 0 },
    priceRangeCny: { min: Math.min(...pricesCny), max: Math.max(...pricesCny) },
    priceMedianCny: median(pricesCny),
    sellerCount: sellers.size, totalListings: products.length,
    competitionLevel: sellers.size < 50 ? 'low' : sellers.size < 150 ? 'medium' : 'high',
    demandTrend: avgVelocity > 15 ? 'accelerating' : avgVelocity > 5 ? 'stable' : 'slowing',
    newSellerRatio: products.length ? newSellers.length / products.length : 0,
    avgReviewVelocity: Math.round(avgVelocity * 10) / 10,
  }
}

// ---- Helpers ----
function translateKeyword(keyword, country) {
  const map = TRANSLATIONS[country]
  if (!map) return keyword
  if (map[keyword]) return map[keyword]
  const keys = Object.keys(map).sort((a, b) => b.length - a.length)
  for (const k of keys) {
    if (keyword.includes(k)) return map[k]
  }
  return keyword
}

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function buildReport(keyword, data1688, shopees) {
  const now = new Date().toISOString().slice(0, 10)
  const shopeeBlocks = shopees.map((s) => {
    const cfg = COUNTRIES[s.country]
    return `### ${cfg?.name || s.country}
- 在售商品数：${s.totalListings} 件
- 售价区间：¥${s.priceRangeCny.min.toFixed(0)} - ¥${s.priceRangeCny.max.toFixed(0)}
- 卖家数量：${s.sellerCount} 家
- 竞争度：${s.competitionLevel === 'low' ? '🟢低' : s.competitionLevel === 'medium' ? '🟡中' : '🔴高'}
- 需求趋势：${s.demandTrend === 'accelerating' ? '↗️加速' : s.demandTrend === 'stable' ? '➡️平稳' : '↘️放缓'}`
  }).join('\n\n')

  return `# ${keyword} 东南亚市场交叉分析报告
> 生成时间：${now}

## 一、1688 采购成本
${data1688 ? `- 价格区间：¥${data1688.priceRange.min.toFixed(0)} - ¥${data1688.priceRange.max.toFixed(0)}
- 中位数出厂价：¥${data1688.priceMedian.toFixed(0)}
- 搜索结果数：${data1688.totalResults} 件` : '- 暂无数据'}

## 二、Shopee 各国市场
${shopeeBlocks || '- 暂无数据'}
`
}

// ---- Start ----
app.listen(PORT, () => {
  console.log(`🚀 越海选品 API Server running on http://localhost:${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/health`)
  console.log(`   API Key: ${API_KEY}`)
})
