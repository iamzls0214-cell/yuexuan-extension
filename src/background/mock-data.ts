/**
 * Mock data provider — generates realistic sample data for demonstration
 * and testing when live APIs are unavailable.
 */
import type { SearchResult, CustomsResult, Result1688, ShopeeResult, ProfitAnalysis } from '../shared/types'
import type { CountryCode } from '../shared/countries'
import { SHOPEE_COUNTRIES } from '../shared/countries'
import { translateKeyword } from '../shared/translations'
import { calcGrossMargin } from '../shared/utils'

const SAMPLE_PROVINCES = ['浙江', '广东', '福建', '江苏', '山东', '上海', '安徽']
const SAMPLE_1688_SUPPLIERS = [
  '义乌市创亿电子商务有限公司', '深圳市华强电子科技有限公司', '广州市白云区皮具厂',
  '东莞市中堂玩具厂', '潮州市潮安区陶瓷厂', '深圳市龙岗区数码配件厂',
]
const SAMPLE_SHOPS: Record<string, string[]> = {
  VN: ['ShopMall.VN', 'DealSốc', 'GiáTốt24h', 'HàngChínhHiệu', 'MuaSắmOnline', 'TechZone.VN', 'PhụKiệnSố1'],
  TH: ['ShopMall.TH', 'DealDee', 'ราคาถูก', 'ของแท้100', 'ช้อปออนไลน์', 'TechZone.TH', 'GadgetThai'],
  ID: ['ShopMall.ID', 'DiskonHebat', 'HargaMurah', 'Asli100', 'BelanjaOnline', 'TechZone.ID', 'GadgetID'],
  PH: ['ShopMall.PH', 'SulitShoppe', 'MuraNa', 'Legit100', 'OnlineShop.PH', 'TechZone.PH', 'GadgetPH'],
}

function seedFromKeyword(kw: string): number {
  let h = 0
  for (let i = 0; i < kw.length; i++) {
    h = ((h << 5) - h) + kw.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function pickRandom<T>(arr: T[], seed: number, index: number): T {
  return arr[(seed + index * 7 + index * index * 13) % arr.length]
}

function randomRange(seed: number, index: number, min: number, max: number, decimals = 0): number {
  const s = (seed * 17 + index * 31 + index * index * 11) % 1000 / 1000
  const val = min + s * (max - min)
  if (decimals > 0) {
    const mult = 10 ** decimals
    return Math.round(val * mult) / mult
  }
  return Math.round(val)
}

export function generateMockSearchResult(keyword: string, country: CountryCode = 'VN'): SearchResult {
  const seed = seedFromKeyword(keyword)
  const keywordVi = translateKeyword(keyword, country)
  const cfg = SHOPEE_COUNTRIES[country]
  const exchangeRate = cfg?.exchangeRate || 3500

  const customs: CustomsResult = generateMockCustoms(keyword, seed)
  const result1688: Result1688 = generateMock1688(keyword, seed)
  const shopee: ShopeeResult = generateMockShopee(keyword, keywordVi, seed, country, exchangeRate)

  let profit: ProfitAnalysis | null = null
  if (result1688.priceMedian > 0 && shopee.priceMedianCny > 0) {
    const calc = calcGrossMargin(result1688.priceMedian, shopee.priceMedianCny, 15, 0.1)
    profit = {
      costPrice: result1688.priceMedian,
      exchangeRate,
      freightCost: 15,
      tariffCost: result1688.priceMedian * 0.1,
      totalCost: calc.totalCost,
      shopeePrice: shopee.priceMedianCny,
      grossProfit: calc.grossProfit,
      grossMargin: calc.grossMargin,
      rating: calc.grossMargin > 40 ? 'high' : calc.grossMargin > 15 ? 'medium' : 'low',
    }
  }

  return {
    keyword,
    customs,
    result1688,
    shopee,
    profit,
    searchedAt: Date.now(),
  }
}

function generateMockCustoms(keyword: string, seed: number): CustomsResult {
  const dataPoints = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(2025, i, 1).toISOString().slice(0, 7)
    const exportAmount = randomRange(seed, i + 100, 50, 500)
    const yoyGrowth = randomRange(seed, i + 200, -20, 80, 1)
    return { month, exportAmount, yoyGrowth }
  })

  const totalExport = dataPoints.reduce((s, d) => s + d.exportAmount, 0)
  const avgGrowth = Math.round((dataPoints.reduce((s, d) => s + d.yoyGrowth, 0) / dataPoints.length) * 10) / 10
  const topProvinces = [0, 1, 2].map((i) => ({
    name: pickRandom(SAMPLE_PROVINCES, seed, i),
    share: randomRange(seed, i + 50, 15, 45, 1),
  }))

  return {
    keyword,
    dataPoints,
    totalExport,
    avgGrowth,
    topProvinces,
    rating: avgGrowth > 50 ? 'blue_ocean' : avgGrowth > 20 ? 'growing' : avgGrowth > 0 ? 'stable' : 'declining',
  }
}

function generateMock1688(keyword: string, seed: number): Result1688 {
  const productCount = randomRange(seed, 1, 15, 30)
  const products = Array.from({ length: Math.min(productCount, 20) }, (_, i) => {
    const priceMin = randomRange(seed, i + 10, 5, 50)
    const priceMax = priceMin + randomRange(seed, i + 20, 2, 30)
    return {
      title: `${keyword}${['新款', '爆款', '热销', '源头工厂', '跨境专供'][i % 5]} ${['A款', 'B款', '标准款', '升级款', '经济款'][i % 5]}`,
      priceMin,
      priceMax,
      priceMedian: Math.round(((priceMin + priceMax) / 2) * 100) / 100,
      moq: randomRange(seed, i + 30, 1, 100),
      supplier: pickRandom(SAMPLE_1688_SUPPLIERS, seed, i),
      supplierRegion: pickRandom(SAMPLE_PROVINCES, seed, i + 5),
      soldCount: randomRange(seed, i + 40, 100, 5000),
      url: `https://detail.1688.com/offer/${randomRange(seed, i + 60, 1000000000, 9999999999)}.html`,
    }
  })

  const prices = products.map((p) => p.priceMedian)

  return {
    keyword,
    products,
    priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
    priceMedian: median(prices),
    totalResults: productCount,
  }
}

function generateMockShopee(keyword: string, keywordLocal: string, seed: number, country: CountryCode, exchangeRate: number): ShopeeResult {
  const cfg = SHOPEE_COUNTRIES[country]
  const domain = cfg?.domain || 'shopee.vn'
  const shops = SAMPLE_SHOPS[country] || SAMPLE_SHOPS.VN
  const productCount = randomRange(seed, 2, 8, 25)
  const sellerCount = randomRange(seed, 3, 5, productCount)
  const products = Array.from({ length: Math.min(productCount, 20) }, (_, i) => {
    const priceLocal = randomRange(seed, i + 10, 50000, 500000)
    return {
      title: `${keywordLocal} ${['cao cấp', 'giá tốt', 'chính hãng', 'mới', 'hot'][i % 5]}`,
      priceVnd: priceLocal,
      priceCny: Math.round((priceLocal / exchangeRate) * 100) / 100,
      soldCount: randomRange(seed, i + 20, 50, 3000),
      shopName: pickRandom(shops, seed, i),
      rating: randomRange(seed, i + 30, 35, 50, 1) / 10,
      reviewCount: randomRange(seed, i + 40, 10, 500),
      listedDays: randomRange(seed, i + 50, 5, 400),
      url: `https://${domain}/product/${randomRange(seed, i + 60, 10000, 99999)}/${randomRange(seed, i + 70, 10000000, 99999999)}`,
    }
  })

  const pricesVnd = products.map((p) => p.priceVnd)
  const pricesCny = products.map((p) => p.priceCny)
  const newSellers = products.filter((p) => p.listedDays <= 90)
  const recentProducts = products.filter((p) => p.listedDays <= 30)
  const avgReviewVelocity = recentProducts.length > 0
    ? Math.round((recentProducts.reduce((s, p) => s + p.reviewCount, 0) / recentProducts.length) * 3.3 * 10) / 10
    : 0

  return {
    keyword: keywordLocal,
    keywordVi: keywordLocal,
    country,
    products,
    priceRangeVnd: { min: Math.min(...pricesVnd), max: Math.max(...pricesVnd) },
    priceRangeCny: { min: Math.min(...pricesCny), max: Math.max(...pricesCny) },
    priceMedianCny: median(pricesCny),
    sellerCount,
    totalListings: productCount,
    competitionLevel: sellerCount < 10 ? 'low' : sellerCount < 30 ? 'medium' : 'high',
    demandTrend: avgReviewVelocity > 15 ? 'accelerating' : avgReviewVelocity > 5 ? 'stable' : 'slowing',
    newSellerRatio: productCount > 0 ? Math.round((newSellers.length / productCount) * 100) / 100 : 0,
    avgReviewVelocity,
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
