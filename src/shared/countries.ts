/**
 * Shopee country configurations.
 * Each country has its own domain, currency, exchange rate, and locale.
 */
export const SHOPEE_COUNTRIES = {
  VN: {
    code: 'VN' as const,
    name: '越南',
    nameEn: 'Vietnam',
    domain: 'shopee.vn',
    currency: 'VND',
    currencySymbol: '₫',
    exchangeRate: 3500,
    locale: 'vi-VN',
    flag: '🇻🇳',
    productUrl: (shopId: number, itemId: number) =>
      `https://shopee.vn/product/${shopId}/${itemId}`,
  },
  TH: {
    code: 'TH' as const,
    name: '泰国',
    nameEn: 'Thailand',
    domain: 'shopee.co.th',
    currency: 'THB',
    currencySymbol: '฿',
    exchangeRate: 5.0,
    locale: 'th-TH',
    flag: '🇹🇭',
    productUrl: (shopId: number, itemId: number) =>
      `https://shopee.co.th/product/${shopId}/${itemId}`,
  },
  ID: {
    code: 'ID' as const,
    name: '印尼',
    nameEn: 'Indonesia',
    domain: 'shopee.co.id',
    currency: 'IDR',
    currencySymbol: 'Rp',
    exchangeRate: 2200,
    locale: 'id-ID',
    flag: '🇮🇩',
    productUrl: (shopId: number, itemId: number) =>
      `https://shopee.co.id/product/${shopId}/${itemId}`,
  },
  PH: {
    code: 'PH' as const,
    name: '菲律宾',
    nameEn: 'Philippines',
    domain: 'shopee.ph',
    currency: 'PHP',
    currencySymbol: '₱',
    exchangeRate: 7.6,
    locale: 'en-PH',
    flag: '🇵🇭',
    productUrl: (shopId: number, itemId: number) =>
      `https://shopee.ph/product/${shopId}/${itemId}`,
  },
} as const

export type CountryCode = keyof typeof SHOPEE_COUNTRIES
export type CountryConfig = (typeof SHOPEE_COUNTRIES)[CountryCode]
export const DEFAULT_COUNTRIES: CountryCode[] = ['VN']
export const ALL_COUNTRIES: CountryCode[] = ['VN', 'TH', 'ID', 'PH']

export function getCountryByDomain(hostname: string): CountryConfig | null {
  for (const [, cfg] of Object.entries(SHOPEE_COUNTRIES)) {
    if (hostname.includes(cfg.domain)) return cfg as CountryConfig
  }
  return null
}

export const ALL_SHOPEE_DOMAINS = Object.values(SHOPEE_COUNTRIES).map(c => c.domain)
