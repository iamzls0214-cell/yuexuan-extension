import type { Result1688 } from '../../shared/types'
import { formatCny } from '../../shared/utils'

interface Props {
  data: Result1688 | null
}

export default function Price1688Card({ data }: Props) {
  if (!data) {
    return (
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 text-center text-xs text-[#64748B]">
        <span className="text-2xl block mb-1">🏭</span>
        暂无1688价格数据
      </div>
    )
  }

  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 hover:border-[#334155]/80 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#F1F5F9]">1688 采购成本</h3>
        <span className="text-[10px] text-[#64748B]">共 {data.totalResults} 件商品</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-[#0F172A] rounded-lg p-2.5">
          <div className="text-[10px] text-[#64748B] mb-0.5">价格区间</div>
          <div className="text-xs font-mono text-[#F1F5F9]">
            {formatCny(data.priceRange.min)} - {formatCny(data.priceRange.max)}
          </div>
        </div>
        <div className="bg-[#0F172A] rounded-lg p-2.5">
          <div className="text-[10px] text-[#64748B] mb-0.5">中位数出厂价</div>
          <div className="text-xs font-mono font-bold text-[#00D4AA]">{formatCny(data.priceMedian)}</div>
        </div>
      </div>

      {/* Top products */}
      <div className="space-y-1.5">
        {data.products.slice(0, 3).map((p, i) => (
          <a
            key={i}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2 rounded-lg hover:bg-[#0F172A] transition-colors group"
          >
            <span className="text-[11px] text-[#94A3B8] truncate flex-1 mr-2 group-hover:text-[#F1F5F9]">
              {p.title}
            </span>
            <span className="text-[11px] font-mono text-[#F1F5F9] whitespace-nowrap">
              {formatCny(p.priceMin)}-{formatCny(p.priceMax)}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}
