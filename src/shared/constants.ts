// Brand colors
export const COLORS = {
  primary: '#00D4AA',
  danger: '#FF6B6B',
  warning: '#F59E0B',
  info: '#3B82F6',
  bg: '#0F172A',
  surface: '#1E293B',
  border: '#334155',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  growth: '#00D4AA',
  decline: '#FF6B6B',
} as const

// Default settings
export const DEFAULT_SETTINGS = {
  customsApiEndpoint: 'https://api.customsdata.net/v1',
  customsApiKey: '',
  apiServerUrl: '',
  serverApiKey: '',
  enabledCountries: ['VN'] as string[],
  exchangeRate: 3500,
  freightCostPerKg: 15,
  tariffRate: 0.1,
  cacheTtlHours: 24,
} as const

// Popup dimensions
export const POPUP_WIDTH = 420
export const POPUP_HEIGHT = 580

// Sidebar dimensions
export const SIDEBAR_WIDTH = 380

// Limits
export const MAX_SEARCH_HISTORY = 20
export const MAX_REPORTS = 50
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000

// Sidebar
export const SKELETON_PULSE = 'animate-pulse'

// Local storage keys
export const STORAGE_KEYS = {
  LICENSE: 'license',
  SETTINGS: 'settings',
  SEARCH_HISTORY: 'searchHistory',
  REPORTS: 'reports',
  CACHE: 'cache',
  UI: 'ui',
} as const

// Product name
export const APP_NAME = '越海选品'
export const APP_NAME_EN = 'YueXuan'
export const APP_TAGLINE = '三源数据交叉分析，发现东南亚蓝海品类'
