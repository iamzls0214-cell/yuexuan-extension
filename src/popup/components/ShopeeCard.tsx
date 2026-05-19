import type { ShopeeResult } from '../../shared/types'
import { formatCny, formatVnd, formatPercent } from '../../shared/utils'

interface Props {
  data: ShopeeResult | null
}

const competitionLabels: Record<string, { label: string; color: string }> = {
  low: { label: '🟢 低竞争', color: '#00D4AA' },
  medium: { label: '🟡 中等竞争', color: '#F59E0B' },
  high: { label: '🔴 高竞争', color: '#FF6B6B' },
}

const trendLabels: Record<string, { label: string; color: string }> = {
  accelerating: { label: '↗️ 需求加速', color: '#00D4AA' },
  stable: { label: '➡️ 需求平稳', color: '#3B82F6' },
  slowing: { label: '↘️ 需求放缓', color: '#FF6B6B' },
}

export default function ShopeeCard({ data }: Props) {
  if (!data) {
    return (
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 text-center text-xs text-[#64748B]">
        <span className="text-2xl block mb-1">🛒</span>
        暂无 Shopee 越南数据
      </div>
    )
  }

  const comp = competitionLabels[data.competitionLevel]
  const trend = trendLabels[data.demandTrend]

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 hover:border-[#334155]/80 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#F1F5F9]">Shopee 越南行情</h3>
        <span className="text-[10px] text-[#64748B]">
          {data.keywordVi}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-[#0F172A] rounded-lg p-2.5">
          <div className="text-[10px] text-[#64748B] mb-0.5">售价区间 (¥)</div>
          <div className="text-xs font-mono text-[#F1F5F9]">
            {formatCny(data.priceRangeCny.min)} - {formatCny(data.priceRangeCny.max)}
          </div>
        </div>
        <div className="bg-[#0F172A] rounded-lg p-2.5">
          <div className="text-[10px] text-[#64748B] mb-0.5">中位售价</div>
          <div className="text-xs font-mono font-bold text-[#00D4AA]">{formatCny(data.priceMedianCny)}</div>
        </div>
      </div>

      {/* Lifecycle & Competition */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <div className="text-xs font-bold text-[#F1F5F9]">{data.sellerCount}</div>
          <div className="text-[10px] text-[#64748B]">卖家数</div>
        </div>
        <div className="text-center">
          <div style={{ color: comp.color }} className="text-[11px] font-medium">{comp.label}</div>
          <div className="text-[10px] text-[#64748B]">竞争度</div>
        </div>
        <div className="text-center">
          <div style={{ color: trend.color }} className="text-[11px] font-medium">{trend.label}</div>
          <div className="text-[10px] text-[#64748B]">需求趋势</div>
        </div>
      </div>

      {/* Top sellers */}
      <div className="space-y-1.5">
        {data.products.slice(0, 3).map((p, i) => (
          <a
            key={i}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2 rounded-lg hover:bg-[#0F172A] transition-colors group"
          >
            <div className="flex-1 mr-2 min-w-0">
              <div className="text-[11px] text-[#94A3B8] truncate group-hover:text-[#F1F5F9]">
                {p.title}
              </div>
              <div className="text-[10px] text-[#64748B] mt-0.5">
                已售 {p.soldCount.toLocaleString()} · {p.shopName}
              </div>
            </div>
            <span className="text-[11px] font-mono text-[#F1F5F9] whitespace-nowrap">
              {formatCny(p.priceCny)}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}
