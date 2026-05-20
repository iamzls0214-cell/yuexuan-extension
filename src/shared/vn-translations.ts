/**
 * 中文→越南语品类词映射表。
 * 内置 34 个初始词，支持外部导入用户自有词库。
 */

export const VI_TRANSLATIONS: Record<string, string> = {
  '蓝牙耳机': 'tai nghe bluetooth',
  '充电宝': 'pin sạc dự phòng',
  '数据线': 'cáp sạc',
  '手机壳': 'ốp điện thoại',
  '智能手表': 'đồng hồ thông minh',
  '音箱': 'loa',
  '蓝牙音箱': 'loa bluetooth',
  '耳机': 'tai nghe',
  '储能电源': 'trạm sạc di động',
  '便携储能电源': 'trạm sạc di động',
  '太阳能灯': 'đèn năng lượng mặt trời',
  '筋膜枪': 'súng massage cơ',
  '投影仪': 'máy chiếu',
  '加湿器': 'máy tạo độ ẩm',
  '吸尘器': 'máy hút bụi',
  '电风扇': 'quạt điện',
  '榨汁机': 'máy ép trái cây',
  '空气炸锅': 'nồi chiên không dầu',
  '电动牙刷': 'bàn chải điện',
  '摄像头': 'camera',
  '无人机': 'drone',
  '平衡车': 'xe cân bằng',
  '滑板车': 'xe trượt',
  '电动车': 'xe điện',
  '灯具': 'đèn',
  '家具': 'nội thất',
  '玩具': 'đồ chơi',
  '箱包': 'túi xách',
  '鞋类': 'giày dép',
  '服装': 'quần áo',
  '美妆': 'mỹ phẩm',
  '五金工具': 'dụng cụ',
  '汽摩配': 'phụ tùng ô tô',
  '宠物用品': 'đồ dùng thú cưng',
  '户外用品': 'đồ dã ngoại',
  '厨具': 'đồ nhà bếp',
  '手机支架': 'giá đỡ điện thoại',
  '充电器': 'bộ sạc',
  '移动电源': 'pin sạc dự phòng',
  '自拍杆': 'gậy selfie',
  '智能家居': 'nhà thông minh',
  '汽车用品': 'phụ kiện ô tô',
  '母婴用品': 'đồ dùng mẹ và bé',
}

/**
 * 获取越南语翻译。无映射时返回原词。
 */
export function translateToVietnamese(keyword: string): string {
  // 精确匹配
  if (VI_TRANSLATIONS[keyword]) {
    return VI_TRANSLATIONS[keyword]
  }
  // 最长子串匹配
  const keys = Object.keys(VI_TRANSLATIONS).sort((a, b) => b.length - a.length)
  for (const k of keys) {
    if (keyword.includes(k)) {
      return VI_TRANSLATIONS[k]
    }
  }
  return keyword
}

/**
 * 反向查找：从越南语文本中提取中文品类关键词。
 * 用于 Shopee VN 商品页（标题是越南语）。
 */
export function extractCategoryFromViTitle(title: string): string {
  const lower = title.toLowerCase()
  // Sort by key length descending for longest match first
  const entries = Object.entries(VI_TRANSLATIONS)
    .filter(([, vi]) => vi.length > 0)
    .sort((a, b) => b[0].length - a[0].length)
  for (const [cn, vi] of entries) {
    if (lower.includes(vi.toLowerCase())) {
      return cn
    }
  }
  return ''
}

/**
 * 导入外部翻译词库（合并覆盖）。
 */
export function importTranslations(external: Record<string, string>): void {
  Object.assign(VI_TRANSLATIONS, external)
}
