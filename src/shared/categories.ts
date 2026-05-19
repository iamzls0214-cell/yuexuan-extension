/**
 * 品类关键词词典 — 用于从商品标题中提取品类。
 * 支持外部导入和增量更新。
 * 子串匹配：标题中包含词典中的词 → 提取为品类关键词。
 */
const CATEGORIES_BASE: string[] = [
  '蓝牙耳机',
  '充电宝',
  '数据线',
  '手机壳',
  '智能手表',
  '音箱',
  '耳机',
  '储能电源',
  '便携储能电源',
  '太阳能灯',
  '筋膜枪',
  '投影仪',
  '加湿器',
  '吸尘器',
  '电风扇',
  '榨汁机',
  '空气炸锅',
  '电动牙刷',
  '摄像头',
  '无人机',
  '平衡车',
  '滑板车',
  '电动车',
  '灯具',
  '家具',
  '玩具',
  '箱包',
  '鞋类',
  '服装',
  '美妆',
  '五金工具',
  '汽摩配',
  '宠物用品',
  '户外用品',
  '厨具',
  '手机支架',
  '蓝牙音箱',
  '充电器',
  '移动电源',
  '自拍杆',
  '智能家居',
  '充电线',
  '手机配件',
  '电脑配件',
  '汽车用品',
  '母婴用品',
  '运动户外',
  '家居家纺',
  '收纳用品',
  '清洁用品',
]

// Sort by length descending for longest match first
const CATEGORIES = [...CATEGORIES_BASE].sort((a, b) => b.length - a.length)

/**
 * 从标题中提取品类关键词。返回最长匹配，无匹配返回空字符串。
 */
export function extractCategory(title: string): string {
  for (const cat of CATEGORIES) {
    if (title.includes(cat)) {
      return cat
    }
  }
  return ''
}

/**
 * 导入外部品类词库（合并去重，按长度倒序）。
 */
export function importCategories(external: string[]): void {
  const merged = new Set([...CATEGORIES_BASE, ...external])
  CATEGORIES.length = 0
  const sorted = [...merged].sort((a, b) => b.length - a.length)
  CATEGORIES.push(...sorted)
}

export function getAllCategories(): string[] {
  return [...CATEGORIES]
}
