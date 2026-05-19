import { useState } from 'react'
import type { SearchResult } from '../../shared/types'
import { formatCny, formatPercent, generateId } from '../../shared/utils'
import { browser } from '../../shared/browser-polyfill'
import { STORAGE_KEYS } from '../../shared/constants'

interface Props {
  keyword: string
  searchResult: SearchResult | null
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

  const { customs, result1688, shopee, profit } = searchResult

  const report = `# ${keyword} 越南市场交叉分析报告
> 生成时间：${new Date().toLocaleString('zh-CN')}

## 一、海关出口趋势
- 近12个月出口总额：¥${customs?.totalExport ?? '-'}万
- 同比增长：${customs ? formatPercent(customs.avgGrowth) : '-'}
- 主要出口省份：${customs?.topProvinces.map((p) => `${p.name}(${p.share}%)`).join('、') ?? '-'}
- 机会评级：${customs ? opportunityLabels[customs.rating] : '-'}

## 二、1688 采购成本
- 价格区间：${result1688 ? formatCny(result1688.priceRange.min) + ' - ' + formatCny(result1688.priceRange.max) : '-'}
- 中位数出厂价：${result1688 ? formatCny(result1688.priceMedian) : '-'}
- 主要供应商区域：${result1688 ? [...new Set(result1688.products.map((p) => p.supplierRegion))].join('、') : '-'}

## 三、越南 Shopee 市场
- 在售商品数：${shopee?.totalListings ?? '-'} 件
- 售价区间：${shopee ? formatCny(shopee.priceRangeCny.min) + ' - ' + formatCny(shopee.priceRangeCny.max) : '-'}
- 卖家数量：${shopee?.sellerCount ?? '-'} 家
- 竞争度评级：${shopee ? (shopee.competitionLevel === 'low' ? '🟢低' : shopee.competitionLevel === 'medium' ? '🟡中' : '🔴高') : '-'}
- 需求趋势：${shopee ? (shopee.demandTrend === 'accelerating' ? '↗️加速' : shopee.demandTrend === 'stable' ? '➡️平稳' : '↘️放缓') : '-'}

## 四、利润测算
- 单品采购成本：${profit ? formatCny(profit.costPrice) : '-'}
- 预估运费+关税：${profit ? formatCny(profit.freightCost + profit.tariffCost) : '-'}
- 总成本：${profit ? formatCny(profit.totalCost) : '-'}
- Shopee 中位售价：${profit ? formatCny(profit.shopeePrice) : '-'}
- 预估毛利率：${profit ? formatPercent(profit.grossMargin) : '-'}

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
    a.download = `${keyword}_越南市场分析_${new Date().toISOString().slice(0, 10)}.md`
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

function generateConclusion(result: SearchResult): string {
  const parts: string[] = []
  const { customs, shopee, profit } = result

  if (customs && customs.avgGrowth > 30) {
    parts.push(`该品类对越出口增速高达${formatPercent(customs.avgGrowth)}，处于快速放量阶段，值得重点关注。`)
  } else if (customs && customs.avgGrowth > 0) {
    parts.push(`该品类对越出口保持正增长（${formatPercent(customs.avgGrowth)}），市场稳定。`)
  }

  if (shopee && shopee.competitionLevel === 'low' && shopee.demandTrend === 'accelerating') {
    parts.push(`越南Shopee卖家仅${shopee.sellerCount}家且需求在加速，属于低竞争的蓝海窗口期。`)
  } else if (shopee && shopee.competitionLevel === 'high') {
    parts.push(`越南市场竞争激烈（${shopee.sellerCount}家卖家），需差异化或价格优势切入。`)
  }

  if (profit && profit.grossMargin > 40) {
    parts.push(`预估毛利率${formatPercent(profit.grossMargin)}，利润空间充足。`)
  } else if (profit && profit.grossMargin < 0) {
    parts.push(`当前价差倒挂，需优化供应链或提高售价。`)
  }

  return parts.join('')
}
