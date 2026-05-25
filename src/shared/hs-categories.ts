/**
 * Product category → HS section mapping for customs data lookup.
 * Key: product keyword (Chinese), Value: HS section name as appears in customs CSV.
 */
export const CATEGORY_HS_MAP: Record<string, string> = {
  '蓝牙耳机': '机电设备',
  '耳机': '机电设备',
  '蓝牙音箱': '机电设备',
  '音箱': '机电设备',
  '智能手表': '机电设备',
  '充电宝': '机电设备',
  '移动电源': '机电设备',
  '充电器': '机电设备',
  '数据线': '机电设备',
  '充电线': '机电设备',
  '手机壳': '机电设备',
  '手机支架': '机电设备',
  '手机配件': '机电设备',
  '自拍杆': '机电设备',
  '摄像头': '机电设备',
  '电脑配件': '机电设备',
  '储能电源': '机电设备',
  '便携储能电源': '机电设备',
  '无人机': '机电设备',
  '智能家居': '机电设备',
  '投影仪': '机电设备',
  '电风扇': '机电设备',
  '吸尘器': '机电设备',
  '电动牙刷': '机电设备',
  '平衡车': '机电设备',
  '滑板车': '机电设备',
  '电动车': '机电设备',

  '灯具': '杂项制品',
  '太阳能灯': '杂项制品',

  '家具': '杂项制品',
  '玩具': '杂项制品',
  '厨具': '杂项制品',

  '服装': '纺织原料及制品',
  '家居家纺': '纺织原料及制品',
  '箱包': '皮革;箱包',
  '鞋类': '鞋帽;羽毛制品',

  '美妆': '化学工业产品',
  '收纳用品': '塑料;橡胶',
  '清洁用品': '化学工业产品',

  '汽摩配': '运输设备',
  '汽车用品': '运输设备',

  '五金工具': '贱金属及其制品',

  '宠物用品': '杂项制品',
  '户外用品': '杂项制品',
  '运动户外': '杂项制品',

  '母婴用品': '杂项制品',
  '加湿器': '机电设备',
  '榨汁机': '机电设备',
  '空气炸锅': '机电设备',
  '筋膜枪': '机电设备',
}

export function lookupHsSection(keyword: string): string | null {
  // Exact match
  if (CATEGORY_HS_MAP[keyword]) {
    return CATEGORY_HS_MAP[keyword]
  }
  // Longest substring match
  const keys = Object.keys(CATEGORY_HS_MAP).sort((a, b) => b.length - a.length)
  for (const k of keys) {
    if (keyword.includes(k)) {
      return CATEGORY_HS_MAP[k]
    }
  }
  return null
}
