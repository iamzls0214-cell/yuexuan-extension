"""
越海选品 API Relay Server (Python + cloudscraper)
Proxies 1688 + multi-country Shopee scraping with Cloudflare bypass.

Usage:
  python3 server/server.py
  PORT=3000 python3 server/server.py
"""
import os
import json
import time
import random
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import wraps

import cloudscraper
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

PORT = int(os.environ.get("PORT", 3000))
API_KEY = os.environ.get("API_KEY", "yuexuan-server-key-2026")

# ---- Country config ----
COUNTRIES = {
    "VN": {"name": "越南", "domain": "shopee.vn", "exchangeRate": 3500},
    "TH": {"name": "泰国", "domain": "shopee.co.th", "exchangeRate": 5.0},
    "ID": {"name": "印尼", "domain": "shopee.co.id", "exchangeRate": 2200},
    "PH": {"name": "菲律宾", "domain": "shopee.ph", "exchangeRate": 7.6},
}

# ---- Translations ----
TRANSLATIONS = {
    "VN": {
        "蓝牙耳机": "tai nghe bluetooth", "充电宝": "pin sạc dự phòng", "数据线": "cáp sạc",
        "手机壳": "ốp điện thoại", "智能手表": "đồng hồ thông minh", "音箱": "loa",
        "蓝牙音箱": "loa bluetooth", "耳机": "tai nghe", "储能电源": "trạm sạc di động",
        "便携储能电源": "trạm sạc di động", "太阳能灯": "đèn năng lượng mặt trời",
        "筋膜枪": "súng massage cơ", "投影仪": "máy chiếu", "加湿器": "máy tạo độ ẩm",
        "吸尘器": "máy hút bụi", "电风扇": "quạt điện", "榨汁机": "máy ép trái cây",
        "空气炸锅": "nồi chiên không dầu", "电动牙刷": "bàn chải điện", "摄像头": "camera",
        "无人机": "drone", "平衡车": "xe cân bằng", "滑板车": "xe trượt", "电动车": "xe điện",
        "灯具": "đèn", "家具": "nội thất", "玩具": "đồ chơi", "箱包": "túi xách",
        "鞋类": "giày dép", "服装": "quần áo", "美妆": "mỹ phẩm", "五金工具": "dụng cụ",
        "汽摩配": "phụ tùng ô tô", "宠物用品": "đồ dùng thú cưng", "户外用品": "đồ dã ngoại",
        "厨具": "đồ nhà bếp", "手机支架": "giá đỡ điện thoại", "充电器": "bộ sạc",
        "移动电源": "pin sạc dự phòng", "自拍杆": "gậy selfie", "智能家居": "nhà thông minh",
        "汽车用品": "phụ kiện ô tô", "母婴用品": "đồ dùng mẹ và bé",
    },
    "TH": {
        "蓝牙耳机": "หูฟังบลูทูธ", "充电宝": "พาวเวอร์แบงค์", "数据线": "สายชาร์จ",
        "手机壳": "เคสมือถือ", "智能手表": "สมาร์ทวอทช์", "音箱": "ลำโพง", "耳机": "หูฟัง",
        "太阳能灯": "ไฟโซล่าเซลล์", "投影仪": "โปรเจคเตอร์", "加湿器": "เครื่องเพิ่มความชื้น",
        "吸尘器": "เครื่องดูดฝุ่น", "电风扇": "พัดลม", "空气炸锅": "หม้อทอดไร้น้ำมัน",
        "电动牙刷": "แปรงสีฟันไฟฟ้า", "摄像头": "กล้องวงจรปิด", "无人机": "โดรน",
        "服装": "เสื้อผ้า", "鞋类": "รองเท้า", "箱包": "กระเป๋า", "玩具": "ของเล่น", "美妆": "เครื่องสำอาง",
    },
    "ID": {
        "蓝牙耳机": "earphone bluetooth", "充电宝": "power bank", "数据线": "kabel data",
        "手机壳": "casing hp", "智能手表": "smartwatch", "音箱": "speaker", "耳机": "earphone",
        "太阳能灯": "lampu tenaga surya", "投影仪": "proyektor", "加湿器": "humidifier",
        "吸尘器": "vacuum cleaner", "电风扇": "kipas angin", "空气炸锅": "air fryer",
        "电动牙刷": "sikat gigi elektrik", "摄像头": "kamera", "无人机": "drone",
        "服装": "pakaian", "鞋类": "sepatu", "箱包": "tas", "玩具": "mainan", "美妆": "kosmetik",
    },
    "PH": {
        "蓝牙耳机": "bluetooth earphones", "充电宝": "power bank", "数据线": "charging cable",
        "手机壳": "phone case", "智能手表": "smartwatch", "音箱": "speaker", "耳机": "earphones",
        "太阳能灯": "solar light", "投影仪": "projector", "加湿器": "humidifier",
        "吸尘器": "vacuum cleaner", "电风扇": "electric fan", "空气炸锅": "air fryer",
        "电动牙刷": "electric toothbrush", "摄像头": "camera", "无人机": "drone",
        "服装": "clothing", "鞋类": "shoes", "箱包": "bags", "玩具": "toys", "美妆": "cosmetics",
    },
}

# ---- UA Pool ----
UA_POOL = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
]
_ua_lock = threading.Lock()
_ua_index = 0

def rotated_ua():
    global _ua_index
    with _ua_lock:
        ua = UA_POOL[_ua_index % len(UA_POOL)]
        _ua_index += 1
    return ua

# ---- Rate limiting ----
def delay(min_ms=1500, max_ms=2500):
    time.sleep(min_ms / 1000 + random.random() * ((max_ms - min_ms) / 1000))

# ---- Scraper pool (one per thread, reused) ----
_scraper_local = threading.local()

def get_scraper():
    """Get or create a cloudscraper instance for the current thread."""
    s = getattr(_scraper_local, "scraper", None)
    if s is None:
        s = cloudscraper.create_scraper(
            browser={"custom": rotated_ua()},
            delay=0,  # we handle delays ourselves
        )
        _scraper_local.scraper = s
    # Rotate UA per request while reusing the TLS session
    s.headers["User-Agent"] = rotated_ua()
    return s

# ---- Cache ----
_cache = {}
_cache_lock = threading.Lock()
CACHE_TTL = 30 * 60  # 30 min

def cache_get(key):
    with _cache_lock:
        entry = _cache.get(key)
        if entry and time.time() - entry["ts"] < CACHE_TTL:
            return entry["data"]
        if entry:
            del _cache[key]
    return None

def cache_set(key, data):
    with _cache_lock:
        _cache[key] = {"data": data, "ts": time.time()}

# ---- Auth ----
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = (request.headers.get("Authorization") or "").replace("Bearer ", "")
        if token != API_KEY:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

# ---- Routes ----

@app.route("/health")
def health():
    return jsonify({"status": "ok", "time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})

@app.route("/api/search", methods=["POST"])
@require_auth
def api_search():
    body = request.get_json(silent=True) or {}
    keyword = body.get("keyword", "")
    countries = body.get("countries", ["VN"])
    if not keyword:
        return jsonify({"error": "keyword required"}), 400

    cache_key = f"search:{keyword}:{','.join(countries)}"
    cached = cache_get(cache_key)
    if cached:
        cached["_cached"] = True
        return jsonify(cached)

    # Fetch sequentially with throttle
    result1688 = fetch_1688(keyword)
    delay()

    shopees = []
    for c in countries:
        result = fetch_shopee(keyword, c)
        if result:
            shopees.append(result)
        if c != countries[-1]:
            delay()

    result = {"result1688": result1688, "shopees": shopees, "keyword": keyword}
    cache_set(cache_key, result)
    return jsonify(result)

@app.route("/api/report", methods=["POST"])
@require_auth
def api_report():
    body = request.get_json(silent=True) or {}
    keyword = body.get("keyword", "")
    countries = body.get("countries", ["VN"])
    if not keyword:
        return jsonify({"error": "keyword required"}), 400

    result1688 = fetch_1688(keyword)
    delay()

    shopees = []
    for c in countries:
        result = fetch_shopee(keyword, c)
        if result:
            shopees.append(result)
        if c != countries[-1]:
            delay()

    content = build_report(keyword, result1688, shopees)
    return jsonify({"content": content})

@app.route("/api/customs", methods=["POST"])
@require_auth
def api_customs():
    return jsonify({
        "keyword": (request.get_json(silent=True) or {}).get("keyword", ""),
        "dataPoints": [], "totalExport": 0, "avgGrowth": 0,
        "topProvinces": [], "rating": "stable",
    })

# ---- 1688 Search ----

def fetch_1688(keyword):
    from urllib.parse import quote
    url = f"https://s.1688.com/selloffer/offer_search.htm?keywords={quote(keyword)}"
    try:
        scraper = get_scraper()
        resp = scraper.get(url, headers={
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "zh-CN,zh;q=0.9",
        }, timeout=15)
        if resp.status_code != 200:
            return None

        html = resp.text

        # Try JSON extraction
        import re
        m = re.search(r"(?:window\.__INIT_DATA__|window\.__data__|window\.__PRELOADED_STATE__)\s*=\s*(\{.+?\});", html, re.DOTALL)
        if m:
            try:
                data = json.loads(m.group(1))
                products = _extract_1688_json(data)
                if products:
                    return _build_1688_result(keyword, products)
            except Exception:
                pass

        # Try HTML parsing
        products = _parse_1688_html(html)
        if products:
            return _build_1688_result(keyword, products)

        return None
    except Exception as e:
        print(f"[1688] {keyword}: {e}")
        return None

def _extract_1688_json(data):
    products = []
    paths = [
        data.get("data", {}).get("offers"),
        data.get("offers"),
        data.get("data", {}).get("result", {}).get("list"),
        data.get("result", {}).get("list"),
        data.get("data", {}).get("items"),
        data.get("items"),
    ]
    for lst in paths:
        if not isinstance(lst, list):
            continue
        for item in lst:
            title = item.get("title") or item.get("name") or item.get("offerTitle") or ""
            price = float(item.get("price") or item.get("priceMin") or item.get("amount") or 0)
            offer_id = item.get("offerId") or item.get("id") or ""
            if title and price > 0:
                products.append({
                    "title": title,
                    "priceMin": price, "priceMax": price, "priceMedian": price,
                    "moq": item.get("moq") or 0,
                    "supplier": item.get("supplierName") or "",
                    "supplierRegion": item.get("supplierAddress") or "",
                    "soldCount": item.get("soldCount") or 0,
                    "url": f"https://detail.1688.com/offer/{offer_id}.html" if offer_id else (item.get("url") or ""),
                })
        if products:
            break
    return products

def _parse_1688_html(html):
    import re
    products = []
    seen = set()
    pattern = r'<a[^>]*href="(https://detail\.1688\.com/offer/\d+\.html)"[^>]*title="([^"]+)"[^>]*>'
    for m in re.finditer(pattern, html):
        url, title = m.group(1), m.group(2)
        if url in seen:
            continue
        seen.add(url)

        ctx = html[m.start():m.start() + 2000]
        # Price range
        pm = re.search(r'[¥￥]\s*(\d+(?:\.\d{1,2})?)\s*-\s*[¥￥]?\s*(\d+(?:\.\d{1,2})?)', ctx)
        sm = re.search(r'[¥￥]\s*(\d+(?:\.\d{1,2})?)', ctx)
        if pm:
            pmin, pmax = float(pm.group(1)), float(pm.group(2))
        elif sm:
            pmin = pmax = float(sm.group(1))
        else:
            continue

        if pmin > 0:
            products.append({
                "title": title,
                "priceMin": pmin, "priceMax": pmax, "priceMedian": (pmin + pmax) / 2,
                "moq": 0, "supplier": "", "supplierRegion": "", "soldCount": 0,
                "url": url,
            })
    return products

def _build_1688_result(keyword, products):
    valid = [p for p in products if p["title"] and p["url"]][:20]
    prices = [p["priceMedian"] for p in valid if p["priceMedian"] > 0]
    return {
        "keyword": keyword,
        "products": valid,
        "priceRange": {"min": min(prices) if prices else 0, "max": max(prices) if prices else 0},
        "priceMedian": _median(prices),
        "totalResults": len(valid),
    }

# ---- Shopee Search ----

def fetch_shopee(keyword, country):
    cfg = COUNTRIES.get(country)
    if not cfg:
        return None

    translated = translate_keyword(keyword, country)
    from urllib.parse import urlencode
    params = urlencode({
        "by": "relevancy",
        "keyword": translated,
        "limit": "30",
        "newest": "0",
        "order": "desc",
        "page_type": "search",
        "version": "2",
    })
    url = f"https://{cfg['domain']}/api/v4/search/search_items?{params}"

    try:
        scraper = get_scraper()
        resp = scraper.get(url, headers={
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-Api-Source": "rn-search",
        }, timeout=15)

        if resp.status_code == 429:
            delay(2000, 2500)
            scraper = get_scraper()
            resp = scraper.get(url, headers={
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest",
            }, timeout=15)

        if resp.status_code != 200:
            return None

        return _parse_shopee(resp.json(), translated, cfg["exchangeRate"], country, cfg["domain"])
    except Exception as e:
        print(f"[Shopee {country}] {keyword}: {e}")
        return None

def _parse_shopee(data, keyword_vi, exchange_rate, country, domain):
    items = data.get("items") or []
    if not items:
        return None

    products = []
    for item in items:
        b = item.get("item_basic") or {}
        price = b.get("price") or 0
        price_local = price / 100000 if price > 1000 else price

        ctime = b.get("ctime") or 0
        listed_days = (time.time() - ctime) / 86400 if ctime else 0

        products.append({
            "title": b.get("name") or "",
            "priceVnd": price_local,
            "priceCny": round(price_local / exchange_rate * 100) / 100 if exchange_rate else 0,
            "soldCount": b.get("sold") or b.get("historical_sold") or 0,
            "shopName": b.get("shop_name") or "",
            "rating": b.get("item_rating", {}).get("rating_star") or 0,
            "reviewCount": (b.get("item_rating", {}).get("rating_count") or [0])[0] if b.get("item_rating", {}).get("rating_count") else 0,
            "listedDays": round(listed_days),
            "url": f"https://{domain}/product/{b['shopid']}/{b['itemid']}" if b.get("shopid") and b.get("itemid") else "",
        })

    valid = [p for p in products if p["title"] and (p["priceVnd"] or p["priceCny"]) > 0]
    if not valid:
        return None

    prices_cny = [p["priceCny"] for p in valid]
    sellers = set(p["shopName"] for p in valid)
    new_sellers = [p for p in valid if 0 < p["listedDays"] <= 90]
    recent = [p for p in valid if p["listedDays"] <= 30]
    avg_velocity = (sum(p["reviewCount"] for p in recent) / len(recent)) * 3.3 if recent else 0

    seller_count = len(sellers)
    return {
        "keyword": keyword_vi, "keywordVi": keyword_vi, "country": country,
        "products": valid[:20],
        "priceRangeVnd": {"min": 0, "max": 0},
        "priceRangeCny": {"min": min(prices_cny), "max": max(prices_cny)},
        "priceMedianCny": _median(prices_cny),
        "sellerCount": seller_count,
        "totalListings": len(valid),
        "competitionLevel": "low" if seller_count < 50 else "medium" if seller_count < 150 else "high",
        "demandTrend": "accelerating" if avg_velocity > 15 else "stable" if avg_velocity > 5 else "slowing",
        "newSellerRatio": len(new_sellers) / len(valid) if valid else 0,
        "avgReviewVelocity": round(avg_velocity * 10) / 10,
    }

# ---- Helpers ----

def translate_keyword(keyword, country):
    mp = TRANSLATIONS.get(country, {})
    if keyword in mp:
        return mp[keyword]
    keys = sorted(mp.keys(), key=len, reverse=True)
    for k in keys:
        if k in keyword:
            return mp[k]
    return keyword

def _median(values):
    if not values:
        return 0
    s = sorted(values)
    mid = len(s) // 2
    return s[mid] if len(s) % 2 else (s[mid - 1] + s[mid]) / 2

def build_report(keyword, data1688, shopees):
    now = time.strftime("%Y-%m-%d", time.gmtime())
    shopee_blocks = []
    for s in shopees:
        cfg = COUNTRIES.get(s.get("country", ""), {})
        comp = "🟢低" if s["competitionLevel"] == "low" else "🟡中" if s["competitionLevel"] == "medium" else "🔴高"
        trend = "↗️加速" if s["demandTrend"] == "accelerating" else "➡️平稳" if s["demandTrend"] == "stable" else "↘️放缓"
        shopee_blocks.append(
            f"### {cfg.get('name', s.get('country', ''))}\n"
            f"- 在售商品数：{s['totalListings']} 件\n"
            f"- 售价区间：¥{s['priceRangeCny']['min']:.0f} - ¥{s['priceRangeCny']['max']:.0f}\n"
            f"- 卖家数量：{s['sellerCount']} 家\n"
            f"- 竞争度：{comp}\n"
            f"- 需求趋势：{trend}"
        )

    return (
        f"# {keyword} 东南亚市场交叉分析报告\n"
        f"> 生成时间：{now}\n\n"
        f"## 一、1688 采购成本\n"
        f"{_fmt_1688(data1688)}\n\n"
        f"## 二、Shopee 各国市场\n"
        f"{chr(10).join(shopee_blocks) if shopee_blocks else '- 暂无数据'}\n"
    )

def _fmt_1688(d):
    if not d:
        return "- 暂无数据"
    return (
        f"- 价格区间：¥{d['priceRange']['min']:.0f} - ¥{d['priceRange']['max']:.0f}\n"
        f"- 中位数出厂价：¥{d['priceMedian']:.0f}\n"
        f"- 搜索结果数：{d['totalResults']} 件"
    )

# ---- Start ----
if __name__ == "__main__":
    print(f"🚀 越海选品 API Server (cloudscraper) running on http://localhost:{PORT}")
    print(f"   Health: http://localhost:{PORT}/health")
    print(f"   API Key: {API_KEY}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
