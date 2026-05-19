import type { CustomsResult } from '../../shared/types'
import { formatPercent } from '../../shared/utils'

interface Props {
  data: CustomsResult | null
}

const ratingLabels: Record<string, { label: string; color: string }> = {
  blue_ocean: { label: '🔥 蓝海品类', color: '#00D4AA' },
  growing: { label: '⚡ 快速增长', color: '#F59E0B' },
  stable: { label: '➡️ 平稳增长', color: '#3B82F6' },
  declining: { label: '⚠️ 趋势下滑', color: '#FF6B6B' },
}

export default function CustomsCard({ data }: Props) {
  if (!data) {
    return (
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 text-center text-xs text-[#64748B]">
        <span className="text-2xl block mb-1">📊</span>
        暂无海关数据
      </div>
    )
  }

  const rating = ratingLabels[data.rating]

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 hover:border-[#334155]/80 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#F1F5F9]">海关出口趋势</h3>
        <span style={{ color: rating.color }} className="text-xs font-medium">
          {rating.label}
        </span>
      </div>

      {/* Sparkline */}
      <div className="flex items-end gap-[2px] h-16 mb-3">
        {data.dataPoints.map((d, i) => {
          const max = Math.max(...data.dataPoints.map((x) => x.exportAmount))
          const h = (d.exportAmount / max) * 100
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-all"
              style={{
                height: `${h}%`,
                background: d.yoyGrowth > 0 ? '#00D4AA' : '#FF6B6B',
                opacity: 0.6 + (h / 100) * 0.4,
              }}
              title={`${d.month}: ¥${d.exportAmount.toFixed(0)}万`}
            />
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-mono font-bold text-[#F1F5F9]">{formatPercent(data.avgGrowth)}</div>
          <div className="text-[10px] text-[#64748B]">同比增速</div>
        </div>
        <div>
          <div className="text-lg font-mono font-bold text-[#F1F5F9]">¥{data.totalExport}万</div>
          <div className="text-[10px] text-[#64748B]">近12月总额</div>
        </div>
        <div>
          <div className="text-lg font-mono font-bold text-[#F1F5F9]">{data.topProvinces[0]?.name || '-'}</div>
          <div className="text-[10px] text-[#64748B]">最大出口省</div>
        </div>
      </div>
    </div>
  )
}
