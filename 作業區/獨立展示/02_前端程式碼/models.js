/* 中文說明：商品展示頁使用的資料物件。
 * 旅行社擁有商品，商品擁有梯次，梯次擁有報價。
 * 資料只在瀏覽器記憶體中使用，不代表資料庫、登入權限或真實交易。
 */
"use strict";

// 報價：私有欄位不能從外面直接改；建立時檢查金額，未知價格保留 null。
class PriceQuote {
  #amount;
  #feeText;
  constructor(amount, feeText) {
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      throw new TypeError("報價必須是非負數字或 null");
    }
    this.#amount = amount;
    this.#feeText = String(feeText);
  }
  get amount() { return this.#amount; }
  get feeText() { return this.#feeText; }
  get label() { return this.#amount === null ? "洽詢業者" : `NT$${this.#amount.toLocaleString("zh-TW")}`; }
}

// 出發梯次：一組出回程日期擁有一筆報價，換日期時取整個梯次，避免價格錯配。
class Departure {
  constructor(date, returnDate, amount, feeText) {
    this.date = date;
    this.returnDate = returnDate;
    this.quote = new PriceQuote(amount, feeText);
  }
  get dateLabel() { return this.date.slice(5).replace("-", "/"); }
  // 提供原畫面需要的讀取介面，金額與費用仍由同一個報價物件保存。
  get price() { return this.quote.amount; }
  get priceLabel() { return this.quote.label; }
  get feeText() { return this.quote.feeText; }
}

// 商品父類別：保存共用資料與梯次。回傳陣列副本，避免外面誤刪內部集合。
class TravelProduct {
  #departures;
  constructor(data) {
    const {departures, ...fields} = data;
    if (!Array.isArray(departures) || departures.length === 0 ||
        !departures.every(item => item instanceof Departure)) {
      throw new TypeError("商品至少需要一個有效梯次");
    }
    Object.assign(this, fields);
    this.#departures = [...departures];
  }
  get departures() { return [...this.#departures]; }
  // 為了沿用原畫面命名，selectedQuote 回傳的是含有報價的第一個梯次。
  get selectedQuote() { return this.#departures[0]; }
  quoteAt(index) { return this.#departures[index] || this.selectedQuote; }
  getSummary() { return this.title; }
}

// 繼承：三種商品共用父類別資料，各自提供同名的摘要方法。
class PackageTour extends TravelProduct {
  constructor(data) { super({...data, category:"tour"}); }
  getSummary() { return `${this.days} 天套裝行程`; }
}
class FlightHotelPackage extends TravelProduct {
  constructor(data) { super({...data, category:"bundle"}); }
  getSummary() { return `${this.days} 天機加酒`; }
}
class FlightTicket extends TravelProduct {
  constructor(data) { super({...data, category:"flight"}); }
  getSummary() { return "來回機票"; }
}

// 旅行社：在自己的商品集合內，以 productId 為限定鍵查找商品。
// 這是資料查找與一致性檢查；真正的使用者權限必須由未來後端驗證。
class Agency {
  #products = new Map();
  constructor(id, name) { this.id = id; this.name = name; }
  addProduct(product) {
    if (!(product instanceof TravelProduct) || product.agency !== this.name) {
      throw new TypeError("商品業者與旅行社不一致");
    }
    if (this.#products.has(product.id)) throw new Error("同一旅行社的商品編號不能重複");
    if (product.agencyId && product.agencyId !== this.id) throw new Error("商品已屬於其他旅行社");
    product.agencyId = this.id;
    this.#products.set(product.id, product);
  }
  findProduct(productId) { return this.#products.get(productId) || null; }
  get products() { return [...this.#products.values()]; }
}

// 轉換入口：將純資料建立為正確的商品子類別；未知類型停止，不默認成套裝行程。
function createProduct(data) {
  const prepared = {...data, departures:data.departures.map(q =>
    q instanceof Departure ? q : new Departure(q.date, q.returnDate, q.price, q.feeText))};
  switch (data.category) {
    case "tour": return new PackageTour(prepared);
    case "bundle": return new FlightHotelPackage(prepared);
    case "flight": return new FlightTicket(prepared);
    default: throw new TypeError("不支援的商品類型");
  }
}

// 將商品交給對應旅行社保存，列表與詳情使用同一批物件，不複製整批商品內容。
function buildAgencies(products) {
  const agencies = new Map();
  for (const product of products) {
    if (!agencies.has(product.agency)) {
      agencies.set(product.agency, new Agency(`AGENCY-${String(agencies.size+1).padStart(2,"0")}`, product.agency));
    }
    agencies.get(product.agency).addProduct(product);
  }
  return [...agencies.values()];
}
