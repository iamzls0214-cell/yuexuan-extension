import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import CustomsCard from '../components/CustomsCard'
import Price1688Card from '../components/Price1688Card'
import ShopeeCard from '../components/ShopeeCard'
import ProfitAnalysis from '../components/ProfitAnalysis'
import ReportGenerator from '../components/ReportGenerator'
import ReportsList from '../components/ReportsList'
import Toast from '../components/Toast'
import { useAggregatedData } from '../hooks/useAggregatedData'
import { useLicense } from '../hooks/useLicense'
import { browser } from '../../shared/browser-polyfill'
import { STORAGE_KEYS } from '../../shared/constants'
import type { Report } from '../../shared/types'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { loading, error, result, search, clear } = useAggregatedData()
  const { isActivated, loading: licenseLoading } = useLicense()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showReports, setShowReports] = useState(false)

  useEffect(() => {
    if (licenseLoading) return
    if (!isActivated) {
      navigate('/activate', { replace: true })
      return
    }
    browser.storage.local.get(STORAGE_KEYS.UI).then((r) => {
      const ui = r[STORAGE_KEYS.UI] as { onboardingCompleted?: boolean } | undefined
      if (!ui?.onboardingCompleted) {
        navigate('/onboarding')
      }
    })
  }, [navigate, isActivated, licenseLoading])

  const handleSearch = async (keyword: string) => {
    await search(keyword)
    if (error) {
      setToast({ message: error, type: 'error' })
    } else {
      setToast({ message: '数据加载完成', type: 'success' })
    }
  }

  const handleClear = () => {
    clear()
  }

  if (showReports) {
    return (
      <ReportsList
        onClose={() => setShowReports(false)}
        onSelect={(report: Report) => {
          setShowReports(false)
          navigator.clipboard.writeText(report.content)
          setToast({ message: '报告已复制到剪贴板', type: 'success' })
        }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#334155]">
        <button onClick={handleClear} className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00D4AA] to-[#0ea878] flex items-center justify-center">
            <span className="text-xs font-bold text-white">越</span>
          </div>
          <span className="text-sm font-semibold text-[#F1F5F9]">越海选品</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowReports(true)}
            className="px-2 py-1 rounded-lg text-[10px] text-[#64748B] hover:text-[#F1F5F9] hover:bg-[#1E293B] transition-all"
            title="已保存报告"
          >
            报告
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#F1F5F9] hover:bg-[#1E293B] transition-all"
            title="设置"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M13.5 8a5.5 5.5 0 01-.3 1.8l1.3 1-1 1.7-1.5-.6a5.5 5.5 0 01-1.6.9L10 14H8l-.4-2.2a5.5 5.5 0 01-1.6-.9l-1.5.6-1-1.7 1.3-1A5.5 5.5 0 014.5 8c0-.6.1-1.2.3-1.8l-1.3-1 1-1.7 1.5.6A5.5 5.5 0 017.6 3.2L8 1h2l.4 2.2a5.5 5.5 0 011.6.9l1.5-.6 1 1.7-1.3 1c.2.6.3 1.2.3 1.8z" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <SearchBar onSearch={handleSearch} loading={loading} />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {/* Empty */}
        {!result && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-40 text-[#475569]">
            <span className="text-3xl mb-3">🔍</span>
            <p className="text-xs">输入品类关键词开始分析</p>
            <p className="text-[10px] mt-1">如"蓝牙耳机""储能电源""筋膜枪"</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && !result && (
          <div className="flex flex-col items-center justify-center h-40">
            <span className="text-3xl mb-3">⚠️</span>
            <p className="text-xs text-[#FF6B6B] mb-3 text-center px-4">{error}</p>
            <button
              onClick={handleClear}
              className="px-4 py-1.5 rounded-lg bg-[#1E293B] border border-[#334155] text-xs text-[#94A3B8] hover:border-[#FF6B6B] hover:text-[#FF6B6B] transition-all"
            >
              重试
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Data */}
        {result && !loading && (
          <>
            {result.customs && <CustomsCard data={result.customs} />}
            {result.result1688 && <Price1688Card data={result.result1688} />}
            {result.shopee && <ShopeeCard data={result.shopee} />}
            {result.profit && <ProfitAnalysis data={result.profit} />}
            <ReportGenerator keyword={result.keyword} searchResult={result} />

            {/* Partial data notice */}
            {(!result.customs || !result.result1688 || !result.shopee) && (
              <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl p-3 text-[11px] text-[#F59E0B] text-center">
                部分数据源暂不可用。已用可用数据生成分析。
                {!result.customs && <span className="block mt-1 text-[10px] opacity-70">海关 API 未响应，请在设置中配置 API Key</span>}
              </div>
            )}
          </>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 animate-pulse">
      <div className="h-4 bg-[#334155] rounded w-1/3 mb-3" />
      <div className="h-3 bg-[#334155] rounded w-full mb-2" />
      <div className="h-3 bg-[#334155] rounded w-2/3" />
    </div>
  )
}
