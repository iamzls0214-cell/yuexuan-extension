/**
 * Multi-language product keyword translations (Chinese → local language).
 * Each country has its own mapping for Shopee search queries.
 */
import type { CountryCode } from './countries'

const TRANSLATIONS: Record<CountryCode, Record<string, string>> = {
  VN: {
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
  },
  TH: {
    '蓝牙耳机': 'หูฟังบลูทูธ',
    '充电宝': 'พาวเวอร์แบงค์',
    '数据线': 'สายชาร์จ',
    '手机壳': 'เคสมือถือ',
    '智能手表': 'สมาร์ทวอทช์',
    '音箱': 'ลำโพง',
    '耳机': 'หูฟัง',
    '太阳能灯': 'ไฟโซล่าเซลล์',
    '投影仪': 'โปรเจคเตอร์',
    '加湿器': 'เครื่องเพิ่มความชื้น',
    '吸尘器': 'เครื่องดูดฝุ่น',
    '电风扇': 'พัดลม',
    '空气炸锅': 'หม้อทอดไร้น้ำมัน',
    '电动牙刷': 'แปรงสีฟันไฟฟ้า',
    '摄像头': 'กล้องวงจรปิด',
    '无人机': 'โดรน',
    '服装': 'เสื้อผ้า',
    '鞋类': 'รองเท้า',
    '箱包': 'กระเป๋า',
    '玩具': 'ของเล่น',
    '美妆': 'เครื่องสำอาง',
  },
  ID: {
    '蓝牙耳机': 'earphone bluetooth',
    '充电宝': 'power bank',
    '数据线': 'kabel data',
    '手机壳': 'casing hp',
    '智能手表': 'smartwatch',
    '音箱': 'speaker',
    '耳机': 'earphone',
    '太阳能灯': 'lampu tenaga surya',
    '投影仪': 'proyektor',
    '加湿器': 'humidifier',
    '吸尘器': 'vacuum cleaner',
    '电风扇': 'kipas angin',
    '空气炸锅': 'air fryer',
    '电动牙刷': 'sikat gigi elektrik',
    '摄像头': 'kamera',
    '无人机': 'drone',
    '服装': 'pakaian',
    '鞋类': 'sepatu',
    '箱包': 'tas',
    '玩具': 'mainan',
    '美妆': 'kosmetik',
  },
  PH: {
    '蓝牙耳机': 'bluetooth earphones',
    '充电宝': 'power bank',
    '数据线': 'charging cable',
    '手机壳': 'phone case',
    '智能手表': 'smartwatch',
    '音箱': 'speaker',
    '耳机': 'earphones',
    '太阳能灯': 'solar light',
    '投影仪': 'projector',
    '加湿器': 'humidifier',
    '吸尘器': 'vacuum cleaner',
    '电风扇': 'electric fan',
    '空气炸锅': 'air fryer',
    '电动牙刷': 'electric toothbrush',
    '摄像头': 'camera',
    '无人机': 'drone',
    '服装': 'clothing',
    '鞋类': 'shoes',
    '箱包': 'bags',
    '玩具': 'toys',
    '美妆': 'cosmetics',
  },
}

export function translateKeyword(keyword: string, country: CountryCode): string {
  const map = TRANSLATIONS[country]
  if (!map) return keyword
  if (map[keyword]) return map[keyword]
  // Longest substring match
  const keys = Object.keys(map).sort((a, b) => b.length - a.length)
  for (const k of keys) {
    if (keyword.includes(k)) return map[k]
  }
  return keyword
}

/** Reverse lookup: Vietnamese text → Chinese category (backward compat) */
export function extractCategoryFromViTitle(title: string): string {
  const lower = title.toLowerCase()
  const entries = Object.entries(TRANSLATIONS.VN)
    .filter(([, vi]) => vi.length > 0)
    .sort((a, b) => b[0].length - a[0].length)
  for (const [cn, vi] of entries) {
    if (lower.includes(vi.toLowerCase())) return cn
  }
  return ''
}

export function importTranslations(country: CountryCode, external: Record<string, string>): void {
  Object.assign(TRANSLATIONS[country], external)
}
