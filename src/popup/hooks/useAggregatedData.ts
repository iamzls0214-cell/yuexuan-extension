import { useState, useCallback } from 'react'
import { browser } from '../../shared/browser-polyfill'
import type {
  ExtensionMessage,
  ExtensionResponse,
  SearchResult,
  CustomsResult,
  Result1688,
  ShopeeResult,
  ProfitAnalysis,
} from '../../shared/types'
import { MessageType } from '../../shared/types'
import { calcGrossMargin } from '../../shared/utils'
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../../shared/constants'

export interface MultiSearchResult extends SearchResult {
  shopees: ShopeeResult[]
}

interface AggregatedState {
  loading: boolean
  error: string | null
  result: MultiSearchResult | null
}

export function useAggregatedData() {
  const [state, setState] = useState<AggregatedState>({
    loading: false,
    error: null,
    result: null,
  })

  const search = useCallback(async (keyword: string) => {
    setState({ loading: true, error: null, result: null })

    try {
      const stored = await browser.storage.local.get(STORAGE_KEYS.SETTINGS)
      const settings = { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEYS.SETTINGS] || {}) }

      // 1. Fetch customs data
      let customs: CustomsResult | null = null
      try {
        const customsResp: ExtensionResponse = await browser.runtime.sendMessage({
          type: MessageType.FETCH_CUSTOMS,
          payload: { keyword },
        } as ExtensionMessage)
        if (customsResp.success) {
          customs = customsResp.data as CustomsResult
        }
      } catch {
        // Customs API may be unavailable — not fatal
      }

      // 2. Fetch 1688 & multi-country Shopee
      let result1688: Result1688 | null = null
      let shopees: ShopeeResult[] = []

      try {
        const searchResp: ExtensionResponse = await browser.runtime.sendMessage({
          type: MessageType.SEARCH_KEYWORD,
          payload: { keyword, countries: settings.enabledCountries },
        } as ExtensionMessage)
        if (searchResp.success) {
          const data = searchResp.data as {
            result1688: Result1688 | null
            shopees?: ShopeeResult[]
            shopee?: ShopeeResult
          }
          result1688 = data.result1688
          // Handle both legacy (single shopee) and new (shopees array) formats
          if (data.shopees?.length) {
            shopees = data.shopees
          } else if (data.shopee) {
            shopees = [data.shopee]
          }
        }
      } catch {
        // Search may fail — not fatal
      }

      if (!customs && !result1688 && shopees.length === 0) {
        setState({
          loading: false,
          error: '未获取到任何数据，请检查网络和 API 配置',
          result: null,
        })
        return
      }

      // 3. Calculate profit (primary country = first in list)
      const primaryShopee = shopees[0] || null
      let profit: ProfitAnalysis | null = null
      if (result1688?.priceMedian && primaryShopee?.priceMedianCny) {
        const cost = result1688.priceMedian
        const sell = primaryShopee.priceMedianCny
        const calc = calcGrossMargin(cost, sell, settings.freightCostPerKg, settings.tariffRate)
        profit = {
          costPrice: cost,
          exchangeRate: settings.exchangeRate,
          freightCost: settings.freightCostPerKg,
          tariffCost: cost * settings.tariffRate,
          totalCost: calc.totalCost,
          shopeePrice: sell,
          grossProfit: calc.grossProfit,
          grossMargin: calc.grossMargin,
          rating: calc.grossMargin > 40 ? 'high' : calc.grossMargin > 15 ? 'medium' : 'low',
        }
      }

      const result: MultiSearchResult = {
        keyword,
        customs,
        result1688,
        shopee: primaryShopee,
        shopees,
        profit,
        searchedAt: Date.now(),
      }

      setState({ loading: false, error: null, result })
    } catch (err) {
      setState({
        loading: false,
        error: `搜索失败: ${(err as Error).message}`,
        result: null,
      })
    }
  }, [])

  const clear = useCallback(() => {
    setState({ loading: false, error: null, result: null })
  }, [])

  return { ...state, search, clear }
}
