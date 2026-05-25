/**
 * 汇率转换、金额格式化等工具函数。
 */

/** 越南盾转人民币 */
export function vndToCny(vnd: number, exchangeRate = 3500): number {
  return Math.round((vnd / exchangeRate) * 100) / 100
}

/** 人民币转越南盾 */
export function cnyToVnd(cny: number, exchangeRate = 3500): number {
  return Math.round(cny * exchangeRate)
}

/** 格式化人民币金额 */
export function formatCny(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** 格式化越南盾金额 */
export function formatVnd(amount: number): string {
  return `₫${amount.toLocaleString('vi-VN')}`
}

/**
 * 通用货币格式化 — 根据国家代码选择合适的 symbol 和 locale。
 */
export function formatCurrency(amount: number, country: string): string {
  const cfg: Record<string, { symbol: string; locale: string }> = {
    VN: { symbol: '₫', locale: 'vi-VN' },
    TH: { symbol: '฿', locale: 'th-TH' },
    ID: { symbol: 'Rp', locale: 'id-ID' },
    PH: { symbol: '₱', locale: 'en-PH' },
  }
  const c = cfg[country]
  if (!c) return formatCny(amount)
  return `${c.symbol}${amount.toLocaleString(c.locale)}`
}

/** 格式化百分比 */
export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

/** 生成唯一 ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** 计算毛利率 */
export function calcGrossMargin(costCny: number, sellPriceCny: number, freightCost = 15, tariffRate = 0.1): {
  totalCost: number
  grossProfit: number
  grossMargin: number
} {
  const totalCost = costCny + freightCost + costCny * tariffRate
  const grossProfit = sellPriceCny - totalCost
  const grossMargin = sellPriceCny > 0 ? (grossProfit / sellPriceCny) * 100 : 0
  return {
    totalCost: Math.round(totalCost * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossMargin: Math.round(grossMargin * 100) / 100,
  }
}

/** 解析区间价 "¥5.00-15.00" → { min: 5, max: 15 } */
export function parsePriceRange(text: string): { min: number; max: number } | null {
  const cleaned = text.replace(/[¥￥\s]/g, '')
  const parts = cleaned.split('-')
  if (parts.length === 2) {
    const min = parseFloat(parts[0])
    const max = parseFloat(parts[1])
    if (!isNaN(min) && !isNaN(max)) {
      return { min, max }
    }
  }
  const single = parseFloat(cleaned)
  if (!isNaN(single)) {
    return { min: single, max: single }
  }
  return null
}

/** 计算中位数 */
export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
