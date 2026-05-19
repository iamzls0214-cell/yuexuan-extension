import { useState, useRef, useEffect } from 'react'
import { browser } from '../../shared/browser-polyfill'
import { STORAGE_KEYS } from '../../shared/constants'

interface Props {
  onSearch: (keyword: string) => void
  loading: boolean
}

export default function SearchBar({ onSearch, loading }: Props) {
  const [keyword, setKeyword] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    browser.storage.local.get(STORAGE_KEYS.SEARCH_HISTORY).then((r) => {
      if (r[STORAGE_KEYS.SEARCH_HISTORY]) {
        setHistory(r[STORAGE_KEYS.SEARCH_HISTORY] as string[])
      }
    })
  }, [])

  const handleSubmit = async () => {
    const trimmed = keyword.trim()
    if (!trimmed || loading) return

    // Save to history
    const updated = [trimmed, ...history.filter((h) => h !== trimmed)].slice(0, 20)
    setHistory(updated)
    await browser.storage.local.set({ [STORAGE_KEYS.SEARCH_HISTORY]: updated })

    setShowHistory(false)
    onSearch(trimmed)
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onFocus={() => setShowHistory(true)}
          onBlur={() => setTimeout(() => setShowHistory(false), 150)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder={'输入品类关键词，如"蓝牙耳机"...'}
          className="flex-1 bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-2.5 text-[#F1F5F9] text-sm placeholder:text-[#475569] focus:outline-none focus:border-[#00D4AA] transition-colors"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !keyword.trim()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00D4AA] to-[#0ea878] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[#00D4AA]/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? '搜索中...' : '搜索'}
        </button>
      </div>

      {showHistory && history.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1E293B] border border-[#334155] rounded-xl shadow-xl z-50 overflow-hidden">
          {history.map((h) => (
            <button
              key={h}
              onMouseDown={() => {
                setKeyword(h)
                setShowHistory(false)
              }}
              className="w-full text-left px-4 py-2 text-xs text-[#94A3B8] hover:bg-[#0F172A] hover:text-[#F1F5F9] transition-colors"
            >
              {h}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
