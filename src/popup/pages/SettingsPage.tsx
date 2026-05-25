import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { browser } from '../../shared/browser-polyfill'
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../../shared/constants'
import { ALL_COUNTRIES, SHOPEE_COUNTRIES, type CountryCode } from '../../shared/countries'
import type { Settings } from '../../shared/types'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    browser.storage.local.get(STORAGE_KEYS.SETTINGS).then((result) => {
      if (result[STORAGE_KEYS.SETTINGS]) {
        setSettings({ ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] as Record<string, unknown> })
      } else {
        setSettings({ ...DEFAULT_SETTINGS })
      }
    })
  }, [])

  const handleSave = async () => {
    await browser.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const update = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const toggleCountry = (code: CountryCode) => {
    const current = (settings.enabledCountries as CountryCode[]) || ['VN']
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code]
    // Don't allow deselecting all
    if (next.length === 0) return
    update('enabledCountries', next)
  }

  const inputClass = 'w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-[#F1F5F9] text-xs placeholder:text-[#475569] focus:outline-none focus:border-[#00D4AA] transition-colors'
  const labelClass = 'text-xs text-[#94A3B8] mb-1.5 block'

  const enabledCountries = (settings.enabledCountries as CountryCode[]) || ['VN']

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#334155]">
        <button onClick={() => navigate('/dashboard')} className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors">
          ←
        </button>
        <h2 className="text-sm font-semibold text-[#F1F5F9]">设置</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* API 中转服务器 */}
        <section>
          <h3 className="text-xs font-semibold text-[#00D4AA] mb-3">API 中转服务器</h3>
          <label className={labelClass}>服务器地址</label>
          <input
            type="text"
            value={(settings.apiServerUrl as string) || ''}
            onChange={(e) => update('apiServerUrl', e.target.value)}
            className={inputClass}
            placeholder="http://localhost:3000"
          />
          <label className={`${labelClass} mt-3`}>API Key</label>
          <input
            type="password"
            value={(settings.serverApiKey as string) || ''}
            onChange={(e) => update('serverApiKey', e.target.value)}
            className={inputClass}
            placeholder="Bearer token"
          />
        </section>

        {/* 目标国家 */}
        <section>
          <h3 className="text-xs font-semibold text-[#00D4AA] mb-3">目标国家</h3>
          <div className="grid grid-cols-2 gap-2">
            {ALL_COUNTRIES.map((code) => {
              const cfg = SHOPEE_COUNTRIES[code]
              const active = enabledCountries.includes(code)
              return (
                <button
                  key={code}
                  onClick={() => toggleCountry(code)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    active
                      ? 'bg-[#00D4AA]/10 border-[#00D4AA] text-[#00D4AA]'
                      : 'bg-[#0F172A] border-[#334155] text-[#64748B] hover:border-[#475569]'
                  }`}
                >
                  <span>{cfg?.flag}</span>
                  <span>{cfg?.name}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* 海关数据 API */}
        <section>
          <h3 className="text-xs font-semibold text-[#00D4AA] mb-3">海关数据 API</h3>
          <label className={labelClass}>API Endpoint</label>
          <input
            type="text"
            value={(settings.customsApiEndpoint as string) || ''}
            onChange={(e) => update('customsApiEndpoint', e.target.value)}
            className={inputClass}
            placeholder="https://api.customsdata.net/v1"
          />
          <label className={`${labelClass} mt-3`}>API Key</label>
          <input
            type="password"
            value={(settings.customsApiKey as string) || ''}
            onChange={(e) => update('customsApiKey', e.target.value)}
            className={inputClass}
            placeholder="输入 API Key"
          />
        </section>

        {/* 成本参数 */}
        <section>
          <h3 className="text-xs font-semibold text-[#00D4AA] mb-3">成本参数</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>VND/CNY 汇率</label>
              <input
                type="number"
                value={(settings.exchangeRate as number) || 3500}
                onChange={(e) => update('exchangeRate', Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>运费 (¥/kg)</label>
              <input
                type="number"
                value={(settings.freightCostPerKg as number) || 15}
                onChange={(e) => update('freightCostPerKg', Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className={labelClass}>关税税率</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={((settings.tariffRate as number) || 0.1) * 100}
                onChange={(e) => update('tariffRate', Number(e.target.value) / 100)}
                className={inputClass}
                min={0}
                max={100}
                step={1}
              />
              <span className="text-xs text-[#64748B]">%</span>
            </div>
          </div>
        </section>

        {/* 缓存 */}
        <section>
          <h3 className="text-xs font-semibold text-[#00D4AA] mb-3">缓存</h3>
          <label className={labelClass}>数据缓存时间（小时）</label>
          <input
            type="number"
            value={(settings.cacheTtlHours as number) || 24}
            onChange={(e) => update('cacheTtlHours', Number(e.target.value))}
            className={inputClass}
            min={1}
            max={168}
          />
        </section>
      </div>

      <div className="px-4 py-3 border-t border-[#334155]">
        <button
          onClick={handleSave}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00D4AA] to-[#0ea878] text-white font-semibold text-sm hover:shadow-lg hover:shadow-[#00D4AA]/30 transition-all active:scale-[0.98]"
        >
          {saved ? '已保存 ✓' : '保存设置'}
        </button>
      </div>
    </div>
  )
}
