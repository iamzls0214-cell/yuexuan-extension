import { useState } from 'react'
import type { ShopeeResult } from '../../shared/types'
import { SHOPEE_COUNTRIES } from '../../shared/countries'
import { formatCny, formatPercent, generateId } from '../../shared/utils'
import { browser } from '../../shared/browser-polyfill'
import { STORAGE_KEYS } from '../../shared/constants'

interface Props {
  keyword: string
  searchResult: { keyword: string; customs?: unknown; result1688?: unknown; shopee?: unknown; shopees?: ShopeeResult[]; profit?: unknown; [key: string]: unknown } | null
}

const opportunityLabels: Record<string, string> = {
  blue_ocean: '🔥蓝海',
  growing: '⚡增长',
  stable: '➡️平稳',
  declining: '⚠️下滑',
}

export default function ReportGenerator({ keyword, searchResult }: Props) {
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!searchResult) return null

  const { customs, result1688, shopee, shopees, profit } = searchResult
  const shopeeList: ShopeeResult[] = (shopees as ShopeeResult[])?.length
    ? shopees as ShopeeResult[]
    : (shopee as ShopeeResult) ? [shopee as ShopeeResult] : []

  const shopeeBlocks = shopeeList.map((s) => {
    const cfg = SHOPEE_COUNTRIES[s.country]
    const compEmoji = s.competitionLevel === 'low' ? '🟢低' : s.competitionLevel === 'medium' ? '🟡中' : '🔴高'
    const trendEmoji = s.demandTrend === 'accelerating' ? '↗️加速' : s.demandTrend === 'stable' ? '➡️平稳' : '↘️放缓'
    return `### ${cfg?.flag || ''} ${cfg?.name || s.country}
- 在售商品数：${s.totalListings} 件
- 售价区间：${formatCny(s.priceRangeCny.min)} - ${formatCny(s.priceRangeCny.max)}
- 卖家数量：${s.sellerCount} 家
- 竞争度评级：${compEmoji}
- 需求趋势：${trendEmoji}
- 新卖家占比（近3个月）：${((s.newSellerRatio || 0) * 100).toFixed(0)}%`
  }).join('\n\n')

  const report = `# ${keyword} 东南亚市场交叉分析报告
> 生成时间：${new Date().toLocaleString('zh-CN')}

## 一、海关出口趋势
- 近12个月出口总额：¥${(customs as { totalExport?: number })?.totalExport ?? '-'}万
- 同比增长：${(customs as { avgGrowth?: number })?.avgGrowth != null ? formatPercent((customs as { avgGrowth: number }).avgGrowth) : '-'}
- 主要出口省份：${(customs as { topProvinces?: Array<{ name: string; share: number }> })?.topProvinces?.map((p) => `${p.name}(${p.share}%)`).join('、') ?? '-'}
- 机会评级：${(customs as { rating?: string })?.rating ? opportunityLabels[(customs as { rating: string }).rating] : '-'}

## 二、1688 采购成本
- 价格区间：${(result1688 as { priceRange?: { min: number; max: number } })?.priceRange ? formatCny((result1688 as { priceRange: { min: number; max: number } }).priceRange.min) + ' - ' + formatCny((result1688 as { priceRange: { min: number; max: number } }).priceRange.max) : '-'}
- 中位数出厂价：${(result1688 as { priceMedian?: number })?.priceMedian != null ? formatCny((result1688 as { priceMedian: number }).priceMedian) : '-'}
- 主要供应商区域：${(result1688 as { products?: Array<{ supplierRegion: string }> })?.products ? [...new Set((result1688 as { products: Array<{ supplierRegion: string }> }).products.map((p) => p.supplierRegion))].join('、') : '-'}

## 三、Shopee 各国市场
${shopeeBlocks || '- 暂无Shopee数据'}

## 四、利润测算
- 单品采购成本：${(profit as { costPrice?: number })?.costPrice != null ? formatCny((profit as { costPrice: number }).costPrice) : '-'}
- 预估运费+关税：${(profit as { freightCost?: number; tariffCost?: number })?.freightCost != null && (profit as { tariffCost: number }).tariffCost != null ? formatCny((profit as { freightCost: number }).freightCost + (profit as { tariffCost: number }).tariffCost) : '-'}
- 总成本：${(profit as { totalCost?: number })?.totalCost != null ? formatCny((profit as { totalCost: number }).totalCost) : '-'}
- Shopee 中位售价：${(profit as { shopeePrice?: number })?.shopeePrice != null ? formatCny((profit as { shopeePrice: number }).shopeePrice) : '-'}
- 预估毛利率：${(profit as { grossMargin?: number })?.grossMargin != null ? formatPercent((profit as { grossMargin: number }).grossMargin) : '-'}

## 五、综合结论
- ${generateConclusion(searchResult)}
`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${keyword}_东南亚市场分析_${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSave = async () => {
    setSaving(true)
    const existing = await browser.storage.local.get(STORAGE_KEYS.REPORTS)
    const reports = (existing[STORAGE_KEYS.REPORTS] as Array<unknown>) || []
    reports.unshift({
      id: generateId(),
      keyword,
      content: report,
      createdAt: Date.now(),
    })
    await browser.storage.local.set({
      [STORAGE_KEYS.REPORTS]: reports.slice(0, 50),
    })
    setSaving(false)
  }

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#F1F5F9]">生成报告</h3>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 py-2 rounded-lg bg-[#0F172A] border border-[#334155] text-xs text-[#94A3B8] hover:border-[#00D4AA] hover:text-[#00D4AA] transition-all"
        >
          {copied ? '已复制 ✓' : '复制 Markdown'}
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 py-2 rounded-lg bg-[#0F172A] border border-[#334155] text-xs text-[#94A3B8] hover:border-[#00D4AA] hover:text-[#00D4AA] transition-all"
        >
          下载 .md 文件
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2 rounded-lg bg-gradient-to-r from-[#00D4AA] to-[#0ea878] text-white text-xs font-semibold hover:shadow-lg hover:shadow-[#00D4AA]/30 transition-all disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存报告'}
        </button>
      </div>
    </div>
  )
}

function generateConclusion(result: { customs?: unknown; shopee?: unknown; shopees?: ShopeeResult[]; profit?: unknown }): string {
  const parts: string[] = []
  const { customs, shopee, shopees, profit } = result
  const c = customs as { avgGrowth?: number } | undefined
  const p = profit as { grossMargin?: number } | undefined
  const s = (shopees?.[0] || shopee) as ShopeeResult | undefined

  if (c && c.avgGrowth != null && c.avgGrowth > 30) {
    parts.push(`该品类对东南亚出口增速高达${formatPercent(c.avgGrowth)}，处于快速放量阶段，值得重点关注。`)
  } else if (c && c.avgGrowth != null && c.avgGrowth > 0) {
    parts.push(`该品类对东南亚出口保持正增长（${formatPercent(c.avgGrowth)}），市场稳定。`)
  }

  if (s && s.competitionLevel === 'low' && s.demandTrend === 'accelerating') {
    const cfg = SHOPEE_COUNTRIES[s.country]
    parts.push(`${cfg?.name || s.country}Shopee卖家仅${s.sellerCount}家且需求在加速，属于低竞争的蓝海窗口期。`)
  } else if (s && s.competitionLevel === 'high') {
    parts.push(`市场竞争激烈（${s.sellerCount}家卖家），需差异化或价格优势切入。`)
  }

  if (p && p.grossMargin != null && p.grossMargin > 40) {
    parts.push(`预估毛利率${formatPercent(p.grossMargin)}，利润空间充足。`)
  } else if (p && p.grossMargin != null && p.grossMargin < 0) {
    parts.push(`当前价差倒挂，需优化供应链或提高售价。`)
  }

  return parts.join('') || '数据不足，建议补充更多信息后再分析'
}
