import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { browser } from '../../shared/browser-polyfill'
import { STORAGE_KEYS } from '../../shared/constants'
import type { ExtensionMessage, ExtensionResponse } from '../../shared/types'
import { MessageType } from '../../shared/types'

export default function ActivatePage() {
  const navigate = useNavigate()
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    // Auto-insert dashes
    if (value.length > 4) value = value.slice(0, 4) + '-' + value.slice(4)
    if (value.length > 9) value = value.slice(0, 9) + '-' + value.slice(9)
    if (value.length > 14) value = value.slice(0, 14) + '-' + value.slice(14)
    if (value.length > 19) value = value.slice(0, 19)
    setKey(value)
    setError('')
  }

  const handleActivate = async () => {
    const cleanKey = key.replace(/-/g, '')
    if (cleanKey.length < 16) {
      setError('请输入完整的16位激活码')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response: ExtensionResponse = await browser.runtime.sendMessage({
        type: MessageType.VERIFY_LICENSE,
        payload: { key: key },
      } as ExtensionMessage)

      if (response.success) {
        await browser.storage.local.set({
          [STORAGE_KEYS.LICENSE]: {
            key,
            activatedAt: Date.now(),
          },
        })
        navigate('/onboarding')
      } else {
        setError(response.error || '激活码无效')
      }
    } catch {
      setError('校验失败，请检查网络后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center px-8 py-10 h-full">
      <button
        onClick={() => navigate('/')}
        className="self-start text-[#94A3B8] hover:text-[#F1F5F9] text-xs mb-6 transition-colors"
      >
        ← 返回
      </button>

      <h2 className="text-lg font-bold text-[#F1F5F9] mb-2">激活产品</h2>
      <p className="text-xs text-[#64748B] mb-8 text-center">请输入您的16位激活码以继续使用</p>

      <div className="w-full mb-4">
        <input
          type="text"
          value={key}
          onChange={handleKeyChange}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          maxLength={19}
          className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-3 text-[#F1F5F9] text-sm text-center tracking-widest placeholder:text-[#475569] focus:outline-none focus:border-[#00D4AA] transition-colors"
          autoFocus
        />
        {error && (
          <p className="text-[#FF6B6B] text-xs mt-2 text-center">{error}</p>
        )}
      </div>

      <button
        onClick={handleActivate}
        disabled={loading || key.length < 19}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00D4AA] to-[#0ea878] text-white font-semibold text-sm hover:shadow-lg hover:shadow-[#00D4AA]/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '校验中...' : '激活'}
      </button>

      <p className="text-[10px] text-[#475569] mt-6">
        还没有激活码？<span className="text-[#3B82F6] cursor-pointer hover:underline">联系客服</span>
      </p>
    </div>
  )
}
