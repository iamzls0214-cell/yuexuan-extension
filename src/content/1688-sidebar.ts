/**
 * 1688 Content Script — injects sidebar on 1688 product/detail pages.
 * Uses MutationObserver + Shadow DOM isolation.
 */
import { browser } from '../shared/browser-polyfill'
import type { ExtensionMessage, ExtensionResponse, Product1688 } from '../shared/types'
import { MessageType } from '../shared/types'
import { extractCategory } from '../shared/categories'

const SIDEBAR_WIDTH = 380
const OBSERVER_TIMEOUT = 8000

let sidebarRoot: ShadowRoot | null = null
let sidebarVisible = false

// ---- Init ----
async function init() {
  // Only activate on product detail pages
  if (!window.location.hostname.includes('detail.1688.com')) return

  // Wait for product data to render
  const product = await waitForProductData()
  if (!product) return

  // Extract category keyword
  const category = extractCategory(product.title)
  if (!category) return

  // Send product data to background
  browser.runtime.sendMessage({
    type: MessageType.PAGE_DATA_EXTRACTED,
    payload: { source: '1688', product, category },
  } as ExtensionMessage)

  // Inject sidebar
  injectSidebar(product, category)

  // Re-check on navigation (SPA)
  observeNavigation()
}

// ---- Wait for DOM to render product data (MutationObserver) ----
function waitForProductData(): Promise<Product1688 | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), OBSERVER_TIMEOUT)
    let attempts = 0
    const maxAttempts = 3

    function tryExtract() {
      const product = extract1688Product()
      if (product) {
        clearTimeout(timeout)
        resolve(product)
        return
      }

      attempts++
      if (attempts >= maxAttempts) {
        clearTimeout(timeout)
        resolve(null)
        return
      }

      // Retry after 1s
      setTimeout(tryExtract, 1000)
    }

    // Start observing
    const observer = new MutationObserver(() => {
      const product = extract1688Product()
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

// ---- Extract product data from 1688 page ----
function extract1688Product(): Product1688 | null {
  // Multiple fallback selectors for title
  const titleEl =
    document.querySelector('.mod-detail-offline-title h1') ||
    document.querySelector('[data-name="offerTitle"]') ||
    document.querySelector('.offer-title') ||
    document.querySelector('h1')

  const title = titleEl?.textContent?.trim()
  if (!title) return null

  // Price — multiple fallbacks
  const priceEl =
    document.querySelector('.mod-detail-price .value') ||
    document.querySelector('[data-range="price"]') ||
    document.querySelector('.price-original')

  const priceText = priceEl?.textContent?.trim() || ''
  const { priceMin, priceMax } = parsePrice(priceText)

  return {
    title,
    priceMin,
    priceMax,
    priceMedian: (priceMin + priceMax) / 2,
    moq: 0,
    supplier: '',
    supplierRegion: '',
    soldCount: 0,
    url: window.location.href,
  }
}

function parsePrice(text: string): { priceMin: number; priceMax: number } {
  const cleaned = text.replace(/[¥￥\s]/g, '')
  const parts = cleaned.split('-')
  if (parts.length === 2) {
    return { priceMin: parseFloat(parts[0]) || 0, priceMax: parseFloat(parts[1]) || 0 }
  }
  const single = parseFloat(cleaned)
  return { priceMin: single || 0, priceMax: single || 0 }
}

// ---- Inject Sidebar with Shadow DOM ----
function injectSidebar(product: Product1688, category: string) {
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
  sidebarVisible = true
}

function renderSidebarContent(product: Product1688, category: string) {
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
      .logo {
        font-size: 14px;
        font-weight: 700;
        color: #00D4AA;
      }
      .toggle-btn {
        background: none;
        border: none;
        color: #64748B;
        cursor: pointer;
        font-size: 16px;
        padding: 4px;
      }
      .toggle-btn:hover { color: #F1F5F9; }
      .content { padding: 16px; }
      .card {
        background: #1E293B;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 12px;
        margin-bottom: 12px;
      }
      .card-title {
        font-size: 12px;
        font-weight: 600;
        color: #00D4AA;
        margin-bottom: 8px;
      }
      .stat-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        font-size: 11px;
      }
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
          <div class="card-title">📦 当前商品</div>
          <div class="stat-row">
            <span class="stat-label">品类</span>
            <span class="stat-value">${escapeHtml(category)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">1688 价格</span>
            <span class="stat-value">¥${product.priceMin}-${product.priceMax}</span>
          </div>
        </div>
        <div class="card" id="yuexuan-customs">
          <div class="card-title">📊 海关出口趋势</div>
          <div class="loading-text">加载中...</div>
        </div>
        <div class="card" id="yuexuan-shopee">
          <div class="card-title">🛒 Shopee 越南对比</div>
          <div class="loading-text">加载中...</div>
        </div>
        <div class="conclusion" id="yuexuan-conclusion" style="display:none"></div>
        <button class="report-btn" id="yuexuan-report-btn">生成完整报告</button>
      </div>
    </div>
  `

  // Event listeners
  sidebarRoot!.getElementById('yuexuan-toggle')?.addEventListener('click', toggleSidebar)
  sidebarRoot!.getElementById('yuexuan-report-btn')?.addEventListener('click', () => {
    browser.runtime.sendMessage({
      type: MessageType.GENERATE_REPORT,
      payload: { keyword: category },
    } as ExtensionMessage)
  })

  // Load cross-reference data
  loadCrossData(category)
}

function updateSidebarContent(product: Product1688, category: string) {
  if (!sidebarRoot) return
  // Re-render with new data
  renderSidebarContent(product, category)
}

async function loadCrossData(category: string) {
  try {
    const customsResp: ExtensionResponse = await browser.runtime.sendMessage({
      type: MessageType.FETCH_CUSTOMS,
      payload: { keyword: category },
    } as ExtensionMessage)

    if (customsResp.success && sidebarRoot) {
      const data = customsResp.data as { avgGrowth: number } | undefined
      const customsEl = sidebarRoot.getElementById('yuexuan-customs')
      if (customsEl) {
        customsEl.innerHTML = `
          <div class="card-title">📊 海关出口趋势</div>
          <div class="stat-row">
            <span class="stat-label">同比增速</span>
            <span class="stat-value" style="color:${data?.avgGrowth && data.avgGrowth > 30 ? '#00D4AA' : '#F59E0B'}">
              ${data?.avgGrowth ? (data.avgGrowth > 0 ? '+' : '') + data.avgGrowth.toFixed(1) + '%' : '暂无'}
            </span>
          </div>
        `
      }

      const conclusionEl = sidebarRoot.getElementById('yuexuan-conclusion')
      if (conclusionEl && data) {
        conclusionEl.style.display = 'block'
        conclusionEl.textContent = `该品类近3个月对越出口增长${data.avgGrowth > 0 ? '+' : ''}${data.avgGrowth.toFixed(0)}%，${data.avgGrowth > 30 ? '属于快速增长品类，值得关注' : '市场表现平稳'}`
      }
    }
  } catch {
    // Silently handle — sidebar is auxiliary
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
      // SPA navigation detected, re-init
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

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
