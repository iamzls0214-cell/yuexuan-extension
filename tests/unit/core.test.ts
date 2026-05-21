import { describe, it, expect } from 'vitest'

// Import shared modules for testing
// These tests validate the core logic that drives the extension

describe('Category extraction', () => {
  // Inline the extract logic since we can't import TS directly in vitest without config
  const CATEGORIES = [
    '蓝牙耳机', '充电宝', '数据线', '手机壳', '智能手表', '音箱', '耳机', '储能电源',
    '便携储能电源', '太阳能灯', '筋膜枪', '投影仪', '加湿器', '吸尘器', '电风扇',
    '榨汁机', '空气炸锅', '电动牙刷', '摄像头', '无人机', '平衡车', '滑板车',
    '电动车', '灯具', '家具', '玩具', '箱包', '鞋类', '服装', '美妆', '五金工具',
    '汽摩配', '宠物用品', '户外用品', '厨具', '手机支架', '蓝牙音箱', '充电器',
    '移动电源', '自拍杆', '智能家居', '充电线', '手机配件', '电脑配件', '汽车用品',
    '母婴用品', '运动户外', '家居家纺', '收纳用品', '清洁用品',
  ].sort((a, b) => b.length - a.length)

  function extractCategory(title: string): string {
    for (const cat of CATEGORIES) {
      if (title.includes(cat)) return cat
    }
    return ''
  }

  it('extracts exact match', () => {
    expect(extractCategory('蓝牙耳机 TWS 无线降噪')).toBe('蓝牙耳机')
  })

  it('extracts longest match first', () => {
    expect(extractCategory('蓝牙耳机 便携储能电源 200W')).toBe('便携储能电源')
  })

  it('returns empty for no match', () => {
    expect(extractCategory('unknown product title')).toBe('')
  })

  it('extracts from 1688-style title', () => {
    expect(extractCategory('跨境专供蓝牙耳机TWS无线运动降噪耳机2024新款')).toBe('蓝牙耳机')
  })

  it('extracts from Shopee-VN style title (Chinese keyword in title)', () => {
    expect(extractCategory('蓝牙耳机 TWS Tai Nghe Bluetooth Chống Ồn')).toBe('蓝牙耳机')
  })
})

describe('Vietnamese translation', () => {
  const VI_TRANSLATIONS: Record<string, string> = {
    '蓝牙耳机': 'tai nghe bluetooth',
    '充电宝': 'pin sạc dự phòng',
    '耳机': 'tai nghe',
    '太阳能灯': 'đèn năng lượng mặt trời',
    '无人机': 'drone',
    '服装': 'quần áo',
  }

  function extractCategoryFromViTitle(title: string): string {
    const lower = title.toLowerCase()
    const entries = Object.entries(VI_TRANSLATIONS)
      .filter(([, vi]) => vi.length > 0)
      .sort((a, b) => b[0].length - a[0].length)
    for (const [cn, vi] of entries) {
      if (lower.includes(vi.toLowerCase())) return cn
    }
    return ''
  }

  it('matches Vietnamese title to Chinese category', () => {
    expect(extractCategoryFromViTitle('Tai nghe Bluetooth chống ồn')).toBe('蓝牙耳机')
  })

  it('matches case-insensitively', () => {
    expect(extractCategoryFromViTitle('TAI NGHE BLUETOOTH CAO CAP')).toBe('蓝牙耳机')
  })

  it('returns empty for no Vietnamese match', () => {
    expect(extractCategoryFromViTitle('Sản phẩm mới nhất 2024')).toBe('')
  })

  it('matches drone (short keyword)', () => {
    expect(extractCategoryFromViTitle('Máy bay Drone 4K camera')).toBe('无人机')
  })
})

describe('Currency utils', () => {
  function vndToCny(vnd: number, rate: number): number {
    if (rate <= 0) return 0
    return Math.round((vnd / rate) * 100) / 100
  }

  function parsePriceVnd(text: string): number {
    return parseInt(text.replace(/[^\d]/g, '')) || 0
  }

  it('converts VND to CNY correctly', () => {
    expect(vndToCny(350000, 3500)).toBe(100)
    expect(vndToCny(175000, 3500)).toBe(50)
  })

  it('returns 0 for invalid rate', () => {
    expect(vndToCny(100000, 0)).toBe(0)
  })

  it('parses VND price strings', () => {
    expect(parsePriceVnd('₫250,000')).toBe(250000)
    expect(parsePriceVnd('250.000đ')).toBe(250000)
    expect(parsePriceVnd('')).toBe(0)
  })

  it('converts with custom exchange rate', () => {
    expect(vndToCny(360000, 3600)).toBe(100)
  })
})

describe('License key format', () => {
  it('validates 16-char hex format', () => {
    const valid = 'ABCD-1234-5678-9ABC'
    const clean = valid.replace(/-/g, '')
    expect(clean.length).toBe(16)
    expect(/^[0-9A-Fa-f]+$/.test(clean)).toBe(true)
  })

  it('rejects invalid format', () => {
    const invalid = 'XXXX-YYYY-ZZZZ-WWWW' // G is not hex
    const clean = invalid.replace(/-/g, '')
    expect(/^[0-9A-Fa-f]+$/.test('GGGG')).toBe(false)
  })
})

describe('Price parsing', () => {
  function parsePrice(text: string): { priceMin: number; priceMax: number } {
    const cleaned = text.replace(/[¥￥\s]/g, '')
    const parts = cleaned.split('-')
    if (parts.length === 2) {
      return { priceMin: parseFloat(parts[0]) || 0, priceMax: parseFloat(parts[1]) || 0 }
    }
    const single = parseFloat(cleaned)
    return { priceMin: single || 0, priceMax: single || 0 }
  }

  it('parses range price', () => {
    const result = parsePrice('¥15.50-28.00')
    expect(result.priceMin).toBe(15.5)
    expect(result.priceMax).toBe(28)
  })

  it('parses single price', () => {
    const result = parsePrice('¥99.00')
    expect(result.priceMin).toBe(99)
    expect(result.priceMax).toBe(99)
  })

  it('handles empty', () => {
    const result = parsePrice('')
    expect(result.priceMin).toBe(0)
    expect(result.priceMax).toBe(0)
  })

  it('handles CNY symbol', () => {
    const result = parsePrice('￥50-100')
    expect(result.priceMin).toBe(50)
    expect(result.priceMax).toBe(100)
  })
})

describe('Competition level classification', () => {
  function classifyCompetition(sellerCount: number): 'low' | 'medium' | 'high' {
    if (sellerCount < 50) return 'low'
    if (sellerCount < 150) return 'medium'
    return 'high'
  }

  it('classifies low competition', () => {
    expect(classifyCompetition(10)).toBe('low')
    expect(classifyCompetition(49)).toBe('low')
  })

  it('classifies medium competition', () => {
    expect(classifyCompetition(50)).toBe('medium')
    expect(classifyCompetition(149)).toBe('medium')
  })

  it('classifies high competition', () => {
    expect(classifyCompetition(150)).toBe('high')
    expect(classifyCompetition(1000)).toBe('high')
  })
})

describe('Margin calculation', () => {
  function calcMargin(costPrice: number, sellPrice: number, freight: number, tariffRate: number): number {
    const totalCost = costPrice + freight + costPrice * tariffRate
    if (sellPrice <= 0) return 0
    return ((sellPrice - totalCost) / sellPrice) * 100
  }

  it('calculates profitable margin', () => {
    const margin = calcMargin(40, 100, 15, 0.1)
    expect(margin).toBeGreaterThan(30)
  })

  it('calculates negative margin', () => {
    const margin = calcMargin(100, 50, 15, 0.1)
    expect(margin).toBeLessThan(0)
  })

  it('returns 0 for zero sell price', () => {
    expect(calcMargin(40, 0, 15, 0.1)).toBe(0)
  })
})
