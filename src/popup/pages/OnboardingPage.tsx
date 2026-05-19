import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { browser } from '../../shared/browser-polyfill'
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../../shared/constants'
import type { Settings } from '../../shared/types'

const STEPS = [
  {
    title: '配置海关数据 API',
    desc: '填入您的海关数据平台 API Key，即可查询中国→越南出口趋势',
    render: (props: StepProps) => <StepApiKey {...props} />,
  },
  {
    title: '试试搜一个品类',
    desc: '了解产品如何使用 — 搜索一个热门品类看看效果',
    render: (props: StepProps) => <StepSearch {...props} />,
  },
  {
    title: '查看报告预览',
    desc: '这是您将获得的交叉分析报告，三源数据一目了然',
    render: (props: StepProps) => <StepReport {...props} />,
  },
]

interface StepProps {
  onNext: () => void
  onPrev: () => void
  isLast: boolean
}

function StepApiKey({ onNext, onPrev }: StepProps) {
  const [apiKey, setApiKey] = useState('')

  const handleSave = async () => {
    const existing = await browser.storage.local.get(STORAGE_KEYS.SETTINGS)
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      ...(existing[STORAGE_KEYS.SETTINGS] as Partial<Settings> | undefined),
      customsApiKey: apiKey,
    }
    await browser.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings })
    onNext()
  }

  return (
    <div>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="输入您的 API Key"
        className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-3 text-[#F1F5F9] text-sm placeholder:text-[#475569] focus:outline-none focus:border-[#00D4AA] transition-colors mb-3"
      />
      <p className="text-[10px] text-[#475569] mb-4">
        支持 customsdata.net / 腾道 / 国贸通。可稍后在设置中修改。
      </p>
      <button
        onClick={handleSave}
        className="w-full py-2.5 rounded-xl bg-[#1E293B] border border-[#334155] text-[#94A3B8] text-xs hover:border-[#00D4AA] hover:text-[#00D4AA] transition-all"
      >
        保存并继续
      </button>
      <button onClick={onPrev} className="w-full py-2 mt-2 text-xs text-[#475569] hover:text-[#94A3B8] transition-colors">
        跳过，稍后设置
      </button>
    </div>
  )
}

function StepSearch({ onNext, onPrev }: StepProps) {
  const suggestions = ['蓝牙耳机', '储能电源', '筋膜枪', '空气炸锅', '无人机']

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={onNext}
            className="px-3 py-1.5 rounded-lg bg-[#1E293B] border border-[#334155] text-[#94A3B8] text-xs hover:border-[#00D4AA] hover:text-[#00D4AA] transition-all"
          >
            {s}
          </button>
        ))}
      </div>
      <button onClick={onNext} className="w-full py-2.5 rounded-xl bg-[#1E293B] border border-[#334155] text-[#94A3B8] text-xs hover:border-[#00D4AA] hover:text-[#00D4AA] transition-all">
        跳过演示，开始使用
      </button>
    </div>
  )
}

function StepReport({ onNext, onPrev }: StepProps) {
  return (
    <div>
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 mb-4 text-xs text-[#94A3B8] leading-relaxed font-mono">
        <div className="text-[#00D4AA] font-bold mb-2"># 蓝牙耳机 越南市场交叉分析报告</div>
        <div className="mb-1">## 一、海关出口趋势</div>
        <div className="text-[#F59E0B]">↗ 同比增长 +45% · 机会评级：🔥蓝海</div>
        <div className="mb-1 mt-2">## 二、1688 采购成本</div>
        <div>¥15-85 · 中位数出厂价 ¥32</div>
        <div className="mb-1 mt-2">## 三、越南 Shopee 市场</div>
        <div>卖家 23 家 · 竞争度 🟢低 · 需求趋势 ↗加速</div>
        <div className="mb-1 mt-2">## 四、利润测算</div>
        <div className="text-[#00D4AA] font-bold">预估毛利率 52%</div>
      </div>
      <button
        onClick={async () => {
          await browser.storage.local.set({
            [STORAGE_KEYS.UI]: { onboardingCompleted: true },
          })
          onNext()
        }}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00D4AA] to-[#0ea878] text-white font-semibold text-sm hover:shadow-lg hover:shadow-[#00D4AA]/30 transition-all active:scale-[0.98]"
      >
        完成，开始使用
      </button>
    </div>
  )
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      navigate('/dashboard')
    }
  }

  const handlePrev = () => {
    if (step > 0) setStep(step - 1)
  }

  const CurrentStep = STEPS[step]

  return (
    <div className="flex flex-col px-8 py-10 h-full">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? 'bg-[#00D4AA]' : 'bg-[#334155]'
            }`}
          />
        ))}
      </div>

      <h2 className="text-lg font-bold text-[#F1F5F9] mb-1">{CurrentStep.title}</h2>
      <p className="text-xs text-[#64748B] mb-6">{CurrentStep.desc}</p>

      <CurrentStep.render onNext={handleNext} onPrev={handlePrev} isLast={step === STEPS.length - 1} />
    </div>
  )
}
