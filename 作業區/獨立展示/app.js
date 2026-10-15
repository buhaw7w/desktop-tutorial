/* 中文說明：本檔只有範例資料、畫面渲染與本機互動。
 * 沒有 AI 回覆、自然語言解析、登入、付款、真實旅行社資料或網路 API。
 * 商品類別由 models.js 提供；日期與報價透過 Departure 物件綁在一起。
 */
"use strict";

// 固定設計資料：範例業者不對應真實公司，以下不是可販售商品。
const exampleProducts = [
  // 將獨立資料檔的純資料轉成商品與報價物件，列表和詳情共用同一份資料。
  ...SAMPLE_TOURS.map(createProduct),
  createProduct({id:"DEMO-04", category:"bundle", title:"東京・機票＋四晚住宿", agency:"範例旅行社 D", destination:"東京", airport:"桃園", days:5, art:"city", word:"TOKYO", highlight:"機加酒・自由安排", hotel:"範例東京市區飯店四晚", meals:"範例內容：住宿方案未註明是否含早餐。", itinerary:["搭乘範例航班抵達東京。","自由安排。","自由安排。","自由安排。","搭乘回程航班返回桃園。"], departures:[new Departure("2026-12-23","2026-12-27",32900,"範例上架內文：來回機票與四晚住宿；稅費未註明。")]}),
  createProduct({id:"DEMO-05", category:"flight", title:"桃園 ⇄ 東京・來回機票", agency:"範例旅行社 E", destination:"東京", airport:"桃園", days:null, art:"snow", word:"TOKYO", highlight:"機票・停留五天", hotel:"此機票範例不提供住宿。", meals:"餐食與行李條件未註明。", itinerary:["12/23 桃園出發，抵達東京。","12/27 東京出發，返回桃園。"], departures:[new Departure("2026-12-23","2026-12-27",15900,"範例上架內文：來回機票；稅費、行李與餐食未註明。")]}),
];

// 旅行社擁有這批商品，詳情頁以旅行社和商品編號查找。
const exampleAgencies = buildAgencies(exampleProducts);

// 畫面輸出前跳脫文字，網址參數及輸入內容不會直接變成 HTML。
const escapeText = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

// 自製向量景色僅作為版面插畫，不使用旅行社未授權照片。
function coverMarkup(product) {
  const scenes = {
    snow:'<rect width="500" height="220" fill="#b7d9dd"/><circle cx="397" cy="52" r="26" fill="#f9f5da"/><path d="M0 175L90 78 180 149 271 58 423 165 500 107V220H0Z" fill="#829fae"/><path d="M52 119L90 78 131 113 105 106 92 94 76 118ZM216 110L271 58 337 105 293 93 275 72 249 107Z" fill="#f4f7f4"/><path d="M0 194Q120 161 240 195T500 171V220H0Z" fill="#ecf3ed"/><path d="M0 208Q180 178 500 210V220H0Z" fill="#648f84"/>',
    city:'<rect width="500" height="220" fill="#f2d9b2"/><circle cx="370" cy="56" r="33" fill="#faf0d7"/><path d="M0 181Q170 153 500 190V220H0Z" fill="#b4c7ba"/><path d="M39 152V103H96V152M99 152V75H159V152M329 169V96H389V169M394 178V70H441V178" fill="#b69c80"/><path d="M211 175V114H278V175Z" fill="#84694e"/><path d="M190 115L245 83 302 115Z" fill="#a1553f"/><path d="M203 94L245 63 288 94Z" fill="#a1553f"/><path d="M217 74L245 49 274 74Z" fill="#a1553f"/><path d="M0 204Q145 165 500 196V220H0Z" fill="#618c78"/>',
    mountain:'<rect width="500" height="220" fill="#cadbcb"/><circle cx="390" cy="57" r="30" fill="#f0dfa8"/><path d="M0 175L111 62 223 175 328 88 500 182V220H0Z" fill="#819c87"/><path d="M0 197L169 108 309 205 500 124V220H0Z" fill="#507c67"/><path d="M0 214Q240 143 500 208V220H0Z" fill="#284f43"/><path d="M188 220Q221 173 281 179T372 163" fill="none" stroke="#dec49b" stroke-width="6"/>'
  };
  return `<div class="cover"><svg viewBox="0 0 500 220" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${escapeText(product.destination)}風景示意插畫">${scenes[product.art]}</svg><span class="cover-label">${escapeText(product.destination)} · 範例</span><span class="cover-word" aria-hidden="true">${product.word}</span></div>`;
}

// View：只負責把商品及其選定梯次顯示成一致的商品卡。
class ProductCardView {
  static render(product) {
    const quote = product.selectedQuote;
    // 多型：畫面呼叫同一個方法，由商品子類別回傳自己的摘要。
    const duration = product.getSummary();
    return `<article class="product-card">${coverMarkup(product)}<div class="card-body"><div class="date-price"><div class="date-block"><strong>${quote.dateLabel} 出發</strong>${quote.returnDate.slice(5).replace("-", "/")} 返回</div><div class="price">${quote.priceLabel}<small>每人・範例報價</small></div></div><h3>${escapeText(product.title)}</h3><p class="meta">${duration} · ${escapeText(product.airport)}出發 · ${escapeText(product.agency)}</p><span class="highlight">${escapeText(product.highlight)}</span><div class="card-bottom"><span class="other-dates">${product.departures.length > 1 ? `另有 ${product.departures.length - 1} 個出發日` : "費用內容見詳情"}</span><a class="card-link" href="detail.html?agency=${encodeURIComponent(product.agencyId)}&amp;id=${encodeURIComponent(product.id)}" aria-label="查看${escapeText(product.title)}詳情">查看詳情 →</a></div></div></article>`;
  }
}

// Controller：分類與價格排序僅用固定資料；輸入框不假裝具備 AI 搜尋能力。
class CatalogController {
  constructor() { this.category = "tour"; this.pageSize = 6; this.visibleLimit = this.pageSize; }
  render() {
    const visible = exampleProducts.filter(p => p.category === this.category)
      .sort((a,b) => (a.selectedQuote.price ?? Infinity) - (b.selectedQuote.price ?? Infinity));
    const shown = visible.slice(0,this.visibleLimit);
    const grid = document.getElementById("product-grid");
    // 只補上新卡片，保留原有連結和鍵盤焦點；分類切換時由事件清空列表。
    const previousCount = grid.childElementCount;
    grid.insertAdjacentHTML("beforeend", shown.slice(previousCount).map(ProductCardView.render).join(""));
    document.getElementById("result-count").textContent = `${visible.length} 個範例商品 · 已顯示 ${shown.length} 個 · 12/23 出發`;
    const moreButton = document.getElementById("load-more");
    moreButton.hidden = shown.length >= visible.length;
    moreButton.textContent = `顯示更多行程（還有 ${visible.length-shown.length} 個）`;
    document.querySelectorAll("[data-category]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.category === this.category)));
  }
  bind() {
    document.querySelectorAll("[data-category]").forEach(button => button.addEventListener("click", () => {
      this.category = button.dataset.category; this.visibleLimit = this.pageSize;
      document.getElementById("product-grid").replaceChildren(); this.render();
    }));
    document.getElementById("load-more").addEventListener("click", () => {
      const previousCount = document.getElementById("product-grid").childElementCount;
      this.visibleLimit += this.pageSize; this.render();
      // 移至這一批第一張卡片的詳情連結，最後一批隱藏按鈕後仍有明確焦點。
      document.querySelectorAll(".card-link")[previousCount]?.focus({preventScroll:true});
    });
    document.querySelectorAll("[data-phrase]").forEach(button => button.addEventListener("click", () => {
      const input = document.getElementById("request");
      if (!input.value.includes(button.dataset.phrase)) input.value = `${input.value.trim()}，${button.dataset.phrase}`.slice(0,500);
      input.focus();
    }));
    document.getElementById("preview-form").addEventListener("submit", event => {
      event.preventDefault();
      const hasRequest = document.getElementById("request").value.trim().length > 0;
      document.getElementById("preview-status").textContent = hasRequest ? "需求文字留在此頁。以下仍是固定範例，不是 AI 搜尋結果。" : "可以先輸入需求；此版僅展示固定商品範例。";
      document.getElementById("results-title").scrollIntoView({block:"start"});
    });
    this.render();
  }
}

// View（介面物件）：只讀取畫面輸入、綁定事件及顯示結果；不搜尋商品或計算價格。
class ProductDetailView {
  constructor() { this.host = document.getElementById("product-detail"); }
  showMissing() {
    this.host.innerHTML = '<section class="invalid-product"><h1>找不到這個範例商品</h1><p>請返回列表，選擇商品查看。</p><a class="primary" href="index.html">返回列表</a></section>';
  }
  render(product) {
    // 商品內容來自模型；輸出文字沿用 escapeText，避免當成 HTML 執行。
    document.title = `${product.title}｜畫面提案`;
    this.host.innerHTML = `<div class="detail-layout"><article class="detail-content">${coverMarkup(product)}<p class="eyebrow">示範資料 · 非販售商品</p><h1>${escapeText(product.title)}</h1><p class="meta">${escapeText(product.agency)} · ${escapeText(product.airport)}出發 · ${product.days == null ? "來回機票" : `${product.days} 天`}</p><section class="detail-section"><h2>行程內容</h2><ol class="itinerary">${product.itinerary.map(text => `<li>${escapeText(text)}</li>`).join("")}</ol></section><section class="detail-section"><h2>住宿與餐點</h2><p>${escapeText(product.hotel)}</p><p>${escapeText(product.meals)}</p></section><section class="detail-section"><h2>費用與來源</h2><p id="fee-text"></p><p class="small muted">此處用範例上架文字展示。正式商品應依業者內文標示，未註明的內容不得自行推定。</p></section></article><aside class="booking-panel"><h2>選擇出發日期</h2><label for="departure-select">同一商品，不同日期</label><select id="departure-select">${product.departures.map((q,i) => `<option value="${i}">${q.date} · ${q.priceLabel}</option>`).join("")}</select><div id="booking-price" class="booking-price"></div><p id="booking-caption" class="booking-caption"></p><p class="contact-note">商品由 ${escapeText(product.agency)} 提供。平台負責展示與媒合。</p><button id="contact-button" class="primary full" type="button" aria-expanded="false" aria-controls="contact-preview">聯絡旅行社 →</button><p id="contact-preview" class="contact-preview" role="status" hidden>正式版將依業者設定，開啟商品網站或 LINE 窗口；本範例沒有真實聯絡連結。</p></aside></div>`;
    // 此按鈕只切換說明，不呼叫外部窗口；仍是前端展示功能。
    document.getElementById("contact-button").addEventListener("click", event => {
      const note = document.getElementById("contact-preview");
      note.hidden = !note.hidden;
      event.currentTarget.setAttribute("aria-expanded", String(!note.hidden));
    });
  }
  // 輸入：選單值是從 0 開始的梯次索引；1 表示第二個日期。
  get selectedIndex() { return Number(document.getElementById("departure-select").value); }
  onDepartureChange(handler) {
    document.getElementById("departure-select").addEventListener("change", handler);
  }
  // 輸出：同一梯次的日期、價格與費用一起顯示，沒有另一份畫面價格資料。
  showQuote(departure) {
    document.getElementById("booking-price").textContent = departure.priceLabel;
    document.getElementById("booking-caption").textContent = `每人範例報價 · ${departure.date} 出發，${departure.returnDate} 返回`;
    document.getElementById("fee-text").textContent = departure.feeText;
  }
}

// Controller（控制物件）：協調 View 和 Model；從網址找商品，從選單索引找梯次。
// 沒有查到商品就顯示錯誤入口並停止，避免對空物件呼叫方法。
class ProductDetailController {
  constructor(view) { this.view = view; this.product = null; }
  show(search) {
    const params = new URLSearchParams(search);
    const productId = params.get("id");
    const agencyId = params.get("agency");
    // 限定鍵：先找到旅行社，再查自己的商品；沿用只有 id 的舊連結。
    const agency = agencyId
      ? exampleAgencies.find(item => item.id === agencyId)
      : exampleAgencies.find(item => item.findProduct(productId));
    this.product = agency?.findProduct(productId) || null;
    if (!this.product) { this.view.showMissing(); return; }
    this.view.render(this.product);
    this.view.onDepartureChange(() => this.updateQuote());
    this.updateQuote();
  }
  updateQuote() {
    if (!this.product) return;
    const departure = this.product.quoteAt(this.view.selectedIndex);
    this.view.showQuote(departure);
  }
}

// 頁面進入點：建立兩個協作物件。Model 類別來自 models.js，不在此處重複定義。
function renderDetail() {
  const view = new ProductDetailView();
  new ProductDetailController(view).show(location.search);
}

// 進入點：同一份腳本依頁面標記啟動列表或詳情，避免重複範例資料。
if (document.body.dataset.page === "catalog") new CatalogController().bind();
else if (document.body.dataset.page === "detail") renderDetail();
