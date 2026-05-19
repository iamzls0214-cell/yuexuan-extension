import type { ProfitAnalysis as ProfitType } from '../../shared/types'
import { formatCny, formatPercent } from '../../shared/utils'

interface Props {
  data: ProfitType | null
}

const profitLabels: Record<string, { label: string; color: string }> = {
  high: { label: '🟢 高利润', color: '#00D4AA' },
  medium: { label: '🟡 中等利润', color: '#F59E0B' },
  low: { label: '🔴 低利润/亏损', color: '#FF6B6B' },
}

export default function ProfitAnalysis({ data }: Props) {
  if (!data) {
    return (
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 text-center text-xs text-[#64748B]">
        <span className="text-2xl block mb-1">💰</span>
        暂无利润数据
      </div>
    )
  }

  const rating = profitLabels[data.rating]

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 hover:border-[#334155]/80 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#F1F5F9]">利润测算</h3>
        <span style={{ color: rating.color }} className="text-xs font-medium">
          {rating.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="flex justify-between text-[11px]">
            <span className="text-[#64748B]">采购成本</span>
            <span className="text-[#F1F5F9] font-mono">{formatCny(data.costPrice)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#64748B]">运费</span>
            <span className="text-[#F1F5F9] font-mono">{formatCny(data.freightCost)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#64748B]">关税</span>
            <span className="text-[#F1F5F9] font-mono">{formatCny(data.tariffCost)}</span>
          </div>
          <div className="flex justify-between text-[11px] border-t border-[#334155] pt-1.5">
            <span className="text-[#94A3B8] font-medium">总成本</span>
            <span className="text-[#F1F5F9] font-mono font-bold">{formatCny(data.totalCost)}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[11px]">
            <span className="text-[#64748B]">Shopee售价</span>
            <span className="text-[#F1F5F9] font-mono">{formatCny(data.shopeePrice)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#64748B]">毛利</span>
            <span
              className="font-mono font-bold"
              style={{ color: data.grossProfit > 0 ? '#00D4AA' : '#FF6B6B' }}
            >
              {formatCny(data.grossProfit)}
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[#64748B]">毛利率</span>
            <span
              className="font-mono text-lg font-bold"
              style={{ color: data.grossMargin > 40 ? '#00D4AA' : data.grossMargin > 15 ? '#F59E0B' : '#FF6B6B' }}
            >
              {formatPercent(data.grossMargin)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
