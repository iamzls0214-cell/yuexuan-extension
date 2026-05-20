/**
 * Shopee VN Content Script — injects sidebar on shopee.vn product pages.
 * Uses MutationObserver + Shadow DOM isolation.
 */
import { browser } from '../shared/browser-polyfill'
import type { ExtensionMessage, ExtensionResponse, ShopeeProduct } from '../shared/types'
import { MessageType } from '../shared/types'
import { extractCategory } from '../shared/categories'
import { extractCategoryFromViTitle } from '../shared/vn-translations'
import { vndToCny } from '../shared/utils'

const SIDEBAR_WIDTH = 380
const OBSERVER_TIMEOUT = 8000

let sidebarRoot: ShadowRoot | null = null
let sidebarVisible = true

// ---- Init ----
async function init() {
  if (!window.location.hostname.includes('shopee.vn') && !window.location.hostname.includes('localhost')) return

  // Wait for product data
  const product = await waitForProductData()
  if (!product) return

  const category = extractCategory(product.title) || extractCategoryFromViTitle(product.title)
  if (!category) return

  browser.runtime.sendMessage({
    type: MessageType.PAGE_DATA_EXTRACTED,
    payload: { source: 'shopee', product, category },
  } as ExtensionMessage)

  injectSidebar(product, category)
  observeNavigation()
}

function waitForProductData(): Promise<ShopeeProduct | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), OBSERVER_TIMEOUT)
    let attempts = 0

    function tryExtract() {
      const product = extractShopeeProduct()
      if (product) {
        clearTimeout(timeout)
        resolve(product)
        return
      }
      attempts++
      if (attempts >= 3) {
        clearTimeout(timeout)
        resolve(null)
        return
      }
      setTimeout(tryExtract, 1000)
    }

    const observer = new MutationObserver(() => {
      const product = extractShopeeProduct()
      if (product) {
        observer.disconnect()
        clearTimeout(timeout)
        resolve(product)
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
    tryExtract()
  })
}

function extractShopeeProduct(): ShopeeProduct | null {
  // Title — multiple fallbacks
  const titleEl =
    document.querySelector('.attM6y') ||
    document.querySelector('[data-testid="title"]') ||
    document.querySelector('h1')

  const title = titleEl?.textContent?.trim()
  if (!title) return null

  // Price
  const priceEl =
    document.querySelector('.pqTWkA') ||
    document.querySelector('[data-testid="price"]') ||
    document.querySelector('.product-price')

  const priceText = priceEl?.textContent?.trim() || ''
  const priceVnd = parsePriceVnd(priceText)
  const exchangeRate = 3500

  return {
    title,
    priceVnd,
    priceCny: vndToCny(priceVnd, exchangeRate),
    soldCount: 0,
    shopName: '',
    rating: 0,
    reviewCount: 0,
    listedDays: 0,
    url: window.location.href,
  }
}

function parsePriceVnd(text: string): number {
  return parseInt(text.replace(/[^\d]/g, '')) || 0
}

// ---- Inject Sidebar ----
function injectSidebar(product: ShopeeProduct, category: string) {
  if (sidebarRoot) {
    updateSidebarContent(product, category)
    return
  }

  const host = document.createElement('div')
  host.id = 'yuexuan-sidebar'
  host.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: ${SIDEBAR_WIDTH}px;
    height: 100vh;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  `

  sidebarRoot = host.attachShadow({ mode: 'closed' })
  document.body.appendChild(host)
  renderSidebarContent(product, category)
}

function renderSidebarContent(product: ShopeeProduct, category: string) {
  if (!sidebarRoot) return

  sidebarRoot.innerHTML = `
    <style>
      :host { all: initial; }
      .sidebar {
        background: #0F172A;
        color: #F1F5F9;
        width: 100%;
        height: 100%;
        overflow-y: auto;
        font-size: 13px;
        border-left: 1px solid #334155;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid #334155;
      }
      .logo { font-size: 14px; font-weight: 700; color: #00D4AA; }
      .toggle-btn { background: none; border: none; color: #64748B; cursor: pointer; font-size: 16px; padding: 4px; }
      .toggle-btn:hover { color: #F1F5F9; }
      .content { padding: 16px; }
      .card {
        background: #1E293B;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 12px;
        margin-bottom: 12px;
      }
      .card-title { font-size: 12px; font-weight: 600; color: #00D4AA; margin-bottom: 8px; }
      .stat-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
      .stat-label { color: #64748B; }
      .stat-value { color: #F1F5F9; font-family: monospace; }
      .conclusion {
        background: #00D4AA10;
        border: 1px solid #00D4AA30;
        border-radius: 8px;
        padding: 10px;
        font-size: 11px;
        color: #00D4AA;
        margin-bottom: 12px;
      }
      .report-btn {
        width: 100%;
        padding: 10px;
        background: linear-gradient(135deg, #00D4AA, #0ea878);
        border: none;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        font-size: 12px;
        cursor: pointer;
      }
      .report-btn:hover { box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3); }
      .loading-text { color: #64748B; font-size: 11px; text-align: center; padding: 20px; }
      .collapsed .content { display: none; }
    </style>
    <div class="sidebar" id="yuexuan-sidebar-inner">
      <div class="header">
        <span class="logo">越海选品</span>
        <button class="toggle-btn" id="yuexuan-toggle">−</button>
      </div>
      <div class="content" id="yuexuan-content">
        <div class="card">
          <div class="card-title">🛒 当前商品</div>
          <div class="stat-row">
            <span class="stat-label">品类</span>
            <span class="stat-value">${escapeHtml(category)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Shopee 价格</span>
            <span class="stat-value">₫${product.priceVnd.toLocaleString()} (¥${product.priceCny.toFixed(0)})</span>
          </div>
        </div>
        <div class="card" id="yuexuan-1688">
          <div class="card-title">🏭 1688 价格对比</div>
          <div class="loading-text">加载中...</div>
        </div>
        <div class="card" id="yuexuan-customs">
          <div class="card-title">📊 海关出口趋势</div>
          <div class="loading-text">加载中...</div>
        </div>
        <div class="conclusion" id="yuexuan-conclusion" style="display:none"></div>
        <button class="report-btn" id="yuexuan-report-btn">生成完整报告</button>
      </div>
    </div>
  `

  sidebarRoot!.getElementById('yuexuan-toggle')?.addEventListener('click', toggleSidebar)
  sidebarRoot!.getElementById('yuexuan-report-btn')?.addEventListener('click', () => {
    browser.runtime.sendMessage({
      type: MessageType.GENERATE_REPORT,
      payload: { keyword: category },
    } as ExtensionMessage)
  })

  load1688Prices(category, product)
}

function updateSidebarContent(product: ShopeeProduct, category: string) {
  if (!sidebarRoot) return
  renderSidebarContent(product, category)
}

async function load1688Prices(category: string, product: ShopeeProduct) {
  try {
    const resp: ExtensionResponse = await browser.runtime.sendMessage({
      type: MessageType.SEARCH_KEYWORD,
      payload: { keyword: category },
    } as ExtensionMessage)

    if (resp.success && sidebarRoot) {
      const data = resp.data as { result1688?: { priceMedian: number } } | undefined
      const el1688 = sidebarRoot.getElementById('yuexuan-1688')
      if (el1688) {
        const median1688 = data?.result1688?.priceMedian
        const priceDiff = median1688 ? ((product.priceCny - median1688) / median1688 * 100) : 0

        el1688.innerHTML = `
          <div class="card-title">🏭 1688 价格对比</div>
          <div class="stat-row">
            <span class="stat-label">1688 中位价</span>
            <span class="stat-value">${median1688 ? '¥' + median1688.toFixed(0) : '暂无数据'}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Shopee 售价</span>
            <span class="stat-value">¥${product.priceCny.toFixed(0)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">价差</span>
            <span class="stat-value" style="color:${priceDiff > 40 ? '#00D4AA' : '#F59E0B'}">
              ${median1688 ? (priceDiff > 0 ? '+' : '') + priceDiff.toFixed(0) + '%' : '-'}
            </span>
          </div>
        `

        const conclusionEl = sidebarRoot.getElementById('yuexuan-conclusion')
        if (conclusionEl && median1688) {
          conclusionEl.style.display = 'block'
          conclusionEl.textContent = `该商品1688类似款出厂价约¥${median1688.toFixed(0)}，价差${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(0)}%，${priceDiff > 40 ? '利润空间较大' : '需优化采购成本'}`
        }
      }
    }
  } catch {
    // Silently handle
  }
}

function toggleSidebar() {
  if (!sidebarRoot) return
  const inner = sidebarRoot.getElementById('yuexuan-sidebar-inner')
  const btn = sidebarRoot.getElementById('yuexuan-toggle')
  if (!inner || !btn) return

  sidebarVisible = !sidebarVisible
  if (sidebarVisible) {
    inner.classList.remove('collapsed')
    btn.textContent = '−'
  } else {
    inner.classList.add('collapsed')
    btn.textContent = '+'
  }
}

function observeNavigation() {
  let lastUrl = window.location.href
  new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href
      sidebarRoot?.host.remove()
      sidebarRoot = null
      init()
    }
  }).observe(document.body, { childList: true, subtree: true })
}

function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
