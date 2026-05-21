/**
 * Shopee VN page data extractor.
 * Used by shopee-sidebar.ts — contains all DOM extraction logic.
 */

export interface ExtractedShopeeProduct {
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

const DEFAULT_EXCHANGE_RATE = 3500

/**
 * Extract product data from a Shopee VN product detail page.
 */
export function extractDetailPage(exchangeRate = DEFAULT_EXCHANGE_RATE): ExtractedShopeeProduct | null {
  // Title
  const titleSelectors = ['.attM6y', '[data-testid="title"]', 'h1', '.product-title']
  const title = findText(titleSelectors)
  if (!title) return null

  // Price (VND)
  const priceSelectors = [
    '.pqTWkA',
    '[data-testid="price"]',
    '.product-price',
    '.price-current',
  ]
  const priceText = findText(priceSelectors) || ''
  const priceVnd = parseInt(priceText.replace(/[^\d]/g, '')) || 0

  // Sold count
  const soldSelectors = [
    '.e9sAa2',
    '.sold-count',
    '.product-sold',
  ]
  const soldText = findText(soldSelectors) || ''
  const soldCount = parseInt(soldText.replace(/[^\d]/g, '')) || 0

  // Shop name
  const shopSelectors = ['.WBVLwb', '.shop-name', '.product-shop-name']
  const shopName = findText(shopSelectors) || ''

  // Rating
  const ratingSelectors = ['.shop-rating', '.rating-number', '.product-rating']
  const ratingText = findText(ratingSelectors) || ''
  const rating = parseFloat(ratingText.replace(/[^\d.]/g, '')) || 0

  // Review count
  const reviewSelectors = ['.product-review-count', '.review-count', '.rating-count']
  const reviewText = findText(reviewSelectors) || ''
  const reviewCount = parseInt(reviewText.replace(/[^\d]/g, '')) || 0

  // Image
  const imgEl = document.querySelector<HTMLImageElement>('.product-image img, .gallery-image, .main-image img')

  return {
    title,
    priceVnd,
    priceCny: Math.round((priceVnd / exchangeRate) * 100) / 100,
    soldCount,
    shopName,
    rating,
    reviewCount,
    listedDays: 0, // Requires API call to get listing date
    url: window.location.href,
    imageUrl: imgEl?.src || undefined,
  }
}

/**
 * Extract product list from Shopee VN search page.
 */
export function extractSearchResults(exchangeRate = DEFAULT_EXCHANGE_RATE): ExtractedShopeeProduct[] {
  const items = document.querySelectorAll(
    '.shopee-search-item-result__item, .col-xs-2-4, [data-sqe="item"], .search-result-item',
  )
  const results: ExtractedShopeeProduct[] = []

  items.forEach((item) => {
    const titleEl = item.querySelector('a[title], .item-title, [class*="title"]')
    const title = titleEl?.getAttribute('title') || titleEl?.textContent?.trim() || ''
    if (!title) return

    const linkEl = item.querySelector<HTMLAnchorElement>('a[href*="-i."]')
    const url = linkEl?.href || ''

    // Price
    const priceEl = item.querySelector('.price, [class*="price"]')
    const priceText = priceEl?.textContent?.trim() || ''
    const priceVnd = parseInt(priceText.replace(/[^\d]/g, '')) || 0

    // Sold
    const soldEl = item.querySelector('.sold, [class*="sold"]')
    const soldText = soldEl?.textContent?.trim() || ''
    const soldCount = parseInt(soldText.replace(/[^\d]/g, '')) || 0

    const imgEl = item.querySelector<HTMLImageElement>('img')

    results.push({
      title,
      priceVnd,
      priceCny: Math.round((priceVnd / exchangeRate) * 100) / 100,
      soldCount,
      shopName: '',
      rating: 0,
      reviewCount: 0,
      listedDays: 0,
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
