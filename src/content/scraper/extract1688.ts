/**
 * 1688 page data extractor.
 * Used by 1688-sidebar.ts — contains all DOM extraction logic.
 */

export interface Extracted1688Product {
  title: string
  priceMin: number
  priceMax: number
  priceMedian: number
  moq: number
  supplier: string
  supplierRegion: string
  soldCount: number
  url: string
  imageUrl?: string
}

/**
 * Extract product data from a 1688 detail page.
 * Returns null if the page is not a product detail page or data extraction fails.
 */
export function extractDetailPage(): Extracted1688Product | null {
  // Title — 3 fallback selectors
  const titleSelectors = [
    '.mod-detail-offline-title h1',
    '[data-name="offerTitle"]',
    '.offer-title',
    'h1',
  ]
  const title = findText(titleSelectors)
  if (!title) return null

  // Price
  const priceSelectors = [
    '.mod-detail-price .value',
    '[data-range="price"]',
    '.price-original',
    '.mod-detail-price span',
  ]
  const priceText = findText(priceSelectors) || ''
  const { priceMin, priceMax } = parse1688Price(priceText)

  // MOQ (minimum order quantity)
  const moqSelectors = ['.mod-detail-count .value', '[data-range="quantity"]', '.moq']
  const moqText = findText(moqSelectors) || ''
  const moq = parseInt(moqText.replace(/[^\d]/g, '')) || 0

  // Supplier
  const supplierSelectors = [
    '.supplier-name a',
    '.company-name',
    '[data-name="supplierName"]',
  ]
  const supplier = findText(supplierSelectors) || ''

  // Supplier region
  const regionSelectors = [
    '.supplier-address',
    '.company-address',
    '[data-name="supplierAddress"]',
  ]
  const supplierRegion = findText(regionSelectors) || ''

  // Sold count
  const soldSelectors = [
    '.mod-detail-count .sold',
    '.sold-count',
    '.trade-record',
  ]
  const soldText = findText(soldSelectors) || ''
  const soldCount = parseInt(soldText.replace(/[^\d]/g, '')) || 0

  // Image
  const imgEl = document.querySelector<HTMLImageElement>('.mod-detail-gallery img, .detail-gallery-img, .main-image img')

  return {
    title,
    priceMin,
    priceMax,
    priceMedian: (priceMin + priceMax) / 2,
    moq,
    supplier,
    supplierRegion,
    soldCount,
    url: window.location.href,
    imageUrl: imgEl?.src || undefined,
  }
}

/**
 * Extract product list from 1688 search page.
 */
export function extractSearchResults(): Extracted1688Product[] {
  const items = document.querySelectorAll('.sm-offer-item, .offer-list-item, [class*="offerItem"]')
  const results: Extracted1688Product[] = []

  items.forEach((item) => {
    const titleEl = item.querySelector('.sm-offer-title, .offer-title, a[title]')
    const title = titleEl?.getAttribute('title') || titleEl?.textContent?.trim() || ''
    if (!title) return

    const priceEl = item.querySelector('.sm-offer-price, .price, [class*="price"]')
    const priceText = priceEl?.textContent?.trim() || ''
    const { priceMin, priceMax } = parse1688Price(priceText)

    const linkEl = item.querySelector<HTMLAnchorElement>('a[href*="detail.1688.com"]')
    const url = linkEl?.href || ''

    const supplierEl = item.querySelector('.sm-offer-company, .supplier, [class*="company"]')
    const supplier = supplierEl?.textContent?.trim() || ''

    const soldEl = item.querySelector('.sm-offer-trade, .trade-num, [class*="trade"]')
    const soldText = soldEl?.textContent?.trim() || ''
    const soldCount = parseInt(soldText.replace(/[^\d]/g, '')) || 0

    const imgEl = item.querySelector<HTMLImageElement>('img')

    results.push({
      title,
      priceMin,
      priceMax,
      priceMedian: (priceMin + priceMax) / 2,
      moq: 0,
      supplier,
      supplierRegion: '',
      soldCount,
      url,
      imageUrl: imgEl?.src || undefined,
    })
  })

  return results
}

function findText(selectors: string[]): string | null {
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el?.textContent?.trim()) {
      return el.textContent.trim()
    }
  }
  return null
}

function parse1688Price(text: string): { priceMin: number; priceMax: number } {
  const cleaned = text.replace(/[¥￥\s]/g, '')
  const parts = cleaned.split('-')
  if (parts.length === 2) {
    const min = parseFloat(parts[0])
    const max = parseFloat(parts[1])
    if (!isNaN(min) && !isNaN(max)) return { priceMin: min, priceMax: max }
  }
  const single = parseFloat(cleaned)
  if (!isNaN(single)) return { priceMin: single, priceMax: single }
  return { priceMin: 0, priceMax: 0 }
}
