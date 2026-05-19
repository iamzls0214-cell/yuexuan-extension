import type { BrowserInfo, BrowserType } from './types'

export function detectBrowser(): BrowserInfo {
  const ua = navigator.userAgent

  let type: BrowserType = 'unknown'
  let version = 0
  let isCompatible = true
  let needsUpdate = false

  // Edge
  if (/Edg\/(\d+)/.test(ua)) {
    type = 'edge'
    version = parseInt(RegExp.$1)
    isCompatible = version >= 80
  }
  // 360 极速浏览器
  else if (/QIHU 360[ES]E/.test(ua)) {
    version = getChromiumVersion(ua)
    if (/360EE/.test(ua)) {
      type = '360speed'
      isCompatible = version >= 86
    } else if (/360SE/.test(ua)) {
      type = '360safe'
      isCompatible = version >= 80
      needsUpdate = version < 86
    }
  }
  // QQ 浏览器
  else if (/QQBrowser\/(\d+)/.test(ua)) {
    type = 'qq'
    version = getChromiumVersion(ua)
    isCompatible = version >= 86
    needsUpdate = version < 94
  }
  // 搜狗浏览器
  else if (/SogouExplorer/.test(ua) || /SE 2\.X MetaSr/.test(ua)) {
    type = 'sogou'
    version = getChromiumVersion(ua)
    isCompatible = version >= 80
    needsUpdate = version < 87
  }
  // 星愿浏览器
  else if (/StarBrowser\/(\d+)/.test(ua)) {
    type = 'star'
    version = parseInt(RegExp.$1)
    isCompatible = version >= 80
  }
  // Chrome
  else if (/Chrome\/(\d+)/.test(ua) && !/Edg|OPR|Brave/.test(ua)) {
    type = 'chrome'
    version = parseInt(RegExp.$1)
    isCompatible = version >= 86
  }

  return { type, version, isCompatible, needsUpdate }
}

function getChromiumVersion(ua: string): number {
  const m = ua.match(/Chrom(?:e|ium)\/(\d+)/)
  return m ? parseInt(m[1]) : 0
}

export function getBrowserName(type: BrowserType): string {
  const names: Record<BrowserType, string> = {
    chrome: 'Chrome',
    edge: 'Edge',
    '360safe': '360安全浏览器',
    '360speed': '360极速浏览器',
    qq: 'QQ浏览器',
    sogou: '搜狗浏览器',
    star: '星愿浏览器',
    unknown: '未知浏览器',
  }
  return names[type]
}
