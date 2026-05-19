import { useState, useEffect } from 'react'
import { browser } from '../../shared/browser-polyfill'
import { STORAGE_KEYS } from '../../shared/constants'
import type { Report } from '../../shared/types'

interface Props {
  onClose: () => void
  onSelect: (report: Report) => void
}

export default function ReportsList({ onClose, onSelect }: Props) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    const result = await browser.storage.local.get(STORAGE_KEYS.REPORTS)
    const list = (result[STORAGE_KEYS.REPORTS] as Report[]) || []
    setReports(list)
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    const updated = reports.filter((r) => r.id !== id)
    setReports(updated)
    await browser.storage.local.set({ [STORAGE_KEYS.REPORTS]: updated })
  }

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content)
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#334155]">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors text-sm">
            ←
          </button>
          <h2 className="text-sm font-semibold text-[#F1F5F9]">已保存的报告</h2>
        </div>
        <span className="text-[10px] text-[#64748B]">{reports.length}/50</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#1E293B] rounded-xl p-4 animate-pulse">
                <div className="h-3 bg-[#334155] rounded w-2/3 mb-2" />
                <div className="h-3 bg-[#334155] rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {!loading && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-[#475569]">
            <span className="text-3xl mb-3">📄</span>
            <p className="text-xs">暂无保存的报告</p>
            <p className="text-[10px] mt-1">搜索品类后点击「保存报告」即可</p>
          </div>
        )}

        {!loading &&
          reports.map((report) => (
            <div
              key={report.id}
              className="bg-[#1E293B] border border-[#334155] rounded-xl p-3 mb-2 hover:border-[#334155]/80 transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={() => onSelect(report)}
                  className="text-xs font-semibold text-[#00D4AA] hover:underline text-left"
                >
                  {report.keyword} · 交叉分析报告
                </button>
                <span className="text-[10px] text-[#475569]">{formatDate(report.createdAt)}</span>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleCopy(report.content)}
                  className="text-[10px] px-2 py-1 rounded-md bg-[#0F172A] text-[#64748B] hover:text-[#94A3B8] transition-colors"
                >
                  复制
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([report.content], { type: 'text/markdown' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${report.keyword}_${new Date(report.createdAt).toISOString().slice(0, 10)}.md`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="text-[10px] px-2 py-1 rounded-md bg-[#0F172A] text-[#64748B] hover:text-[#94A3B8] transition-colors"
                >
                  下载
                </button>
                <button
                  onClick={() => handleDelete(report.id)}
                  className="text-[10px] px-2 py-1 rounded-md bg-[#0F172A] text-[#64748B] hover:text-[#FF6B6B] transition-colors ml-auto"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
