// ---- 海关数据 ----
export interface CustomsDataPoint {
  month: string
  exportAmount: number // 人民币万元
  yoyGrowth: number // 同比增长率
}

export interface CustomsResult {
  keyword: string
  dataPoints: CustomsDataPoint[]
  totalExport: number
  avgGrowth: number
  topProvinces: { name: string; share: number }[]
  rating: 'blue_ocean' | 'growing' | 'stable' | 'declining'
}

// ---- 1688 数据 ----
export interface Product1688 {
  title: string
  priceMin: number
  priceMax: number
  priceMedian: number
  moq: number // 起批量
  supplier: string
  supplierRegion: string
  soldCount: number
  url: string
  imageUrl?: string
}

export interface Result1688 {
  keyword: string
  products: Product1688[]
  priceRange: { min: number; max: number }
  priceMedian: number
  totalResults: number
}

// ---- Shopee VN 数据 ----
export interface ShopeeProduct {
  title: string
  priceVnd: number
  priceCny: number
  soldCount: number
  shopName: string
  rating: number
  reviewCount: number
  listedDays: number
  url: string
  imageUrl?: string
}

export interface ShopeeResult {
  keyword: string
  keywordVi: string
  products: ShopeeProduct[]
  priceRangeVnd: { min: number; max: number }
  priceRangeCny: { min: number; max: number }
  priceMedianCny: number
  sellerCount: number
  totalListings: number
  competitionLevel: 'low' | 'medium' | 'high'
  demandTrend: 'accelerating' | 'stable' | 'slowing'
  newSellerRatio: number // 近3个月新卖家占比
  avgReviewVelocity: number // 近30天评价增速 %
}

// ---- 利润测算 ----
export interface ProfitAnalysis {
  costPrice: number // 1688 中位数价
  exchangeRate: number
  freightCost: number
  tariffCost: number
  totalCost: number
  shopeePrice: number // Shopee 中位售价
  grossProfit: number
  grossMargin: number // 毛利率
  rating: 'high' | 'medium' | 'low'
}

// ---- 聚合搜索 ----
export interface SearchResult {
  keyword: string
  customs: CustomsResult | null
  result1688: Result1688 | null
  shopee: ShopeeResult | null
  profit: ProfitAnalysis | null
  searchedAt: number
}

// ---- 报告 ----
export interface Report {
  id: string
  keyword: string
  content: string
  createdAt: number
}

// ---- 设置 ----
export interface Settings {
  customsApiEndpoint: string
  customsApiKey: string
  exchangeRate: number // 默认 3500 VND/CNY
  freightCostPerKg: number
  tariffRate: number // 默认 0.1
  cacheTtlHours: number // 默认 24
}

// ---- License ----
export interface License {
  key: string
  activatedAt: number
  expiresAt: number
}

// ---- 缓存 ----
export interface CacheEntry {
  keyword: string
  data: SearchResult
  cachedAt: number
}

// ---- UI 状态 ----
export interface UIState {
  onboardingCompleted: boolean
  sidebarCollapsed: boolean
  lastActivePage: string
}

// ---- 浏览器检测 ----
export type BrowserType = 'chrome' | 'edge' | '360safe' | '360speed' | 'qq' | 'sogou' | 'star' | 'unknown'

export interface BrowserInfo {
  type: BrowserType
  version: number
  isCompatible: boolean
  needsUpdate: boolean
}

// ---- 消息类型 (popup/content <-> background) ----
export enum MessageType {
  SEARCH_KEYWORD = 'SEARCH_KEYWORD',
  FETCH_CUSTOMS = 'FETCH_CUSTOMS',
  FETCH_1688 = 'FETCH_1688',
  FETCH_SHOPEE = 'FETCH_SHOPEE',
  PAGE_DATA_EXTRACTED = 'PAGE_DATA_EXTRACTED',
  GENERATE_REPORT = 'GENERATE_REPORT',
  VERIFY_LICENSE = 'VERIFY_LICENSE',
  GET_SETTINGS = 'GET_SETTINGS',
  SAVE_SETTINGS = 'SAVE_SETTINGS',
  GET_REPORTS = 'GET_REPORTS',
  DELETE_REPORT = 'DELETE_REPORT',
  GET_BROWSER_INFO = 'GET_BROWSER_INFO',
}

export interface ExtensionMessage {
  type: MessageType
  payload?: unknown
}

export interface ExtensionResponse {
  success: boolean
  data?: unknown
  error?: string
}
