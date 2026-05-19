import { useNavigate } from 'react-router-dom'
import { APP_NAME, APP_TAGLINE } from '../../shared/constants'

const features = [
  {
    icon: '📊',
    title: '海关趋势追踪',
    desc: '实时监控中国→越南海关出口数据，发现暴增品类，比市场快3-6个月',
  },
  {
    icon: '🏭',
    title: '1688智能比价',
    desc: '一键抓取1688出厂价，自动计算采购成本区间和起批量',
  },
  {
    icon: '🛒',
    title: 'Shopee市场洞察',
    desc: '扫描越南Shopee热卖商品，分析竞争度、价格、需求趋势',
  },
]

export default function WelcomePage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center px-8 py-10 h-full">
      {/* Logo */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00D4AA] to-[#0ea878] flex items-center justify-center mb-4 shadow-lg shadow-[#00D4AA]/20">
        <span className="text-2xl font-bold text-white">越</span>
      </div>

      <h1 className="text-xl font-bold text-[#F1F5F9] mb-1">{APP_NAME}</h1>
      <p className="text-xs text-[#94A3B8] mb-8">{APP_TAGLINE}</p>

      {/* Features */}
      <div className="space-y-3 w-full mb-8">
        {features.map((f) => (
          <div
            key={f.title}
            className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 flex items-start gap-3 hover:border-[#00D4AA]/30 transition-colors"
          >
            <span className="text-2xl">{f.icon}</span>
            <div>
              <h3 className="text-sm font-semibold text-[#F1F5F9] mb-0.5">{f.title}</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={() => navigate('/activate')}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00D4AA] to-[#0ea878] text-white font-semibold text-sm hover:shadow-lg hover:shadow-[#00D4AA]/30 transition-all active:scale-[0.98]"
      >
        开始使用
      </button>

      <p className="text-[10px] text-[#475569] mt-4">v1.0.0 · 面向跨境电商卖家的专业选品工具</p>
    </div>
  )
}
