/* 中文教學：設定功能的 Model / View / Controller。
 * Model 驗證並保存白名單偏好；View 只處理表單與畫面；Controller 協調儲存及還原。
 * localStorage 只屬於這個瀏覽器與網站來源，不是會員資料庫，也不提供登入權限。
 */
"use strict";
class PreferenceStore {
  static key = "travel-demo-preferences-v1";
  static defaults() { return {theme:"warm", airport:"any", category:"tour", sort:"price-asc", siteReminders:true, dropPercent:10, clearance:true}; }
  // 封裝：只接受已定義的欄位；外部字串或舊資料不直接影響畫面及權限。
  static normalize(raw = {}) {
    const defaults = this.defaults();
    const choose = (key, choices) => choices.includes(raw[key]) ? raw[key] : defaults[key];
    return {
      theme:choose("theme", ["warm","sage","night"]), airport:choose("airport", ["any","桃園","松山","台中","高雄"]),
      category:choose("category", ["tour","bundle","flight"]), sort:choose("sort", ["price-asc","price-desc","days-asc"]),
      siteReminders:typeof raw.siteReminders === "boolean" ? raw.siteReminders : defaults.siteReminders,
      dropPercent:Number.isInteger(raw.dropPercent) && raw.dropPercent >= 1 && raw.dropPercent <= 50 ? raw.dropPercent : defaults.dropPercent,
      clearance:typeof raw.clearance === "boolean" ? raw.clearance : defaults.clearance
    };
  }
  static load() {
    // 讀取失敗不使商品頁中斷；儲存時另向使用者明確回報失敗。
    try { const raw = JSON.parse(localStorage.getItem(this.key) || "{}"); return this.normalize(raw && typeof raw === "object" ? raw : {}); }
    catch { return this.defaults(); }
  }
  static save(value) { const clean = this.normalize(value); localStorage.setItem(this.key, JSON.stringify(clean)); return clean; }
  // 只刪自己的命名鍵，禁止 localStorage.clear() 誤刪其他展示功能的資料。
  static reset() { localStorage.removeItem(this.key); return this.defaults(); }
}

class SettingsView {
  constructor() { this.form = document.getElementById("settings-form"); }
  // 套色屬於 View 責任；Model 僅保存設定，避免資料物件直接操控 DOM。
  static applyTheme(theme) { document.documentElement.dataset.theme = theme; }
  fill(value) {
    this.form.querySelector(`[name="theme"][value="${value.theme}"]`).checked = true;
    for (const key of ["airport", "category", "sort"]) document.getElementById(key).value = value[key];
    document.getElementById("site-reminders").checked = value.siteReminders;
    document.getElementById("drop-percent").value = value.dropPercent;
    document.getElementById("clearance").checked = value.clearance;
  }
  read() {
    return {theme:this.form.elements.theme.value, airport:this.form.elements.airport.value, category:this.form.elements.category.value,
      sort:this.form.elements.sort.value, siteReminders:document.getElementById("site-reminders").checked,
      dropPercent:Number(document.getElementById("drop-percent").value), clearance:document.getElementById("clearance").checked};
  }
  status(message) { document.getElementById("settings-status").textContent = message; }
  error(message = "") {
    const output = document.getElementById("settings-error"); output.textContent = message; output.hidden = !message;
    document.getElementById("drop-percent").removeAttribute("aria-invalid");
  }
}

// 在畫面載入前套用已儲存色調，避免先閃過白底；各頁共用此 View 方法。
SettingsView.applyTheme(PreferenceStore.load().theme);

class SettingsController {
  constructor(view) { this.view = view; }
  bind() {
    this.view.fill(PreferenceStore.load());
    this.view.form.addEventListener("change", () => {
      // 色調先預覽，其他偏好在使用者按儲存後才生效；沒有成功寫入不顯示已保存。
      SettingsView.applyTheme(this.view.read().theme); this.view.error(); this.view.status("有變更尚未儲存。");
    });
    this.view.form.addEventListener("submit", event => { event.preventDefault(); this.save(); });
    document.getElementById("open-reset").addEventListener("click", () => document.getElementById("reset-dialog").showModal());
    document.getElementById("confirm-reset").addEventListener("click", () => {
      try {
        const defaults = PreferenceStore.reset(); this.view.fill(defaults); SettingsView.applyTheme(defaults.theme);
        this.view.error(); this.view.status("已恢復預設設定。商品與帳號資料不受影響。"); document.getElementById("reset-dialog").close();
      } catch { document.getElementById("reset-dialog").close(); this.view.error("無法清除瀏覽器設定，請檢查儲存權限後重試。"); }
    });
    this.bindAccount();
    document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => document.getElementById(button.dataset.close).close()));
  }
  save() {
    const value = this.view.read(); this.view.error();
    // 先驗證再寫入：空白、負數、小數或超界都不得被轉成有效提醒設定。
    if (!Number.isInteger(value.dropPercent) || value.dropPercent < 1 || value.dropPercent > 50) {
      this.view.error("降價幅度請填 1～50 的整數，例如 10 代表降價 10%。設定尚未儲存。");
      const field = document.getElementById("drop-percent"); field.closest("details").open = true; field.setAttribute("aria-invalid", "true"); field.focus(); return;
    }
    try { PreferenceStore.save(value); this.view.status("已儲存在這台瀏覽器。帳號與通知服務尚未串接。"); }
    catch { this.view.error("瀏覽器無法儲存設定。請允許網站儲存資料後再試，目前變更僅供預覽。"); }
  }
  bindAccount() {
    const dialog = document.getElementById("account-dialog"), form = document.getElementById("account-form");
    const mode = document.getElementById("account-mode"), role = document.getElementById("account-role");
    const email = document.getElementById("account-email"), password = document.getElementById("account-password"), status = document.getElementById("account-status");
    const update = () => {
      const reset = mode.value === "reset", register = mode.value === "register";
      role.querySelector('[value="admin"]').disabled = register;
      if (register && role.value === "admin") role.value = "traveler";
      document.getElementById("password-field").hidden = reset; password.disabled = reset;
      document.getElementById("login-title").textContent = {login:"帳號登入", register:"建立帳號", reset:"忘記密碼"}[mode.value];
      document.getElementById("account-submit").textContent = {login:"確認登入", register:"確認註冊", reset:"寄送重設連結"}[mode.value];
      document.getElementById("role-help").textContent = {traveler:"旅客可規劃收藏行程與價格追蹤。", agency:"旅行社需經平台審核，才可管理自己的商品。", admin:"管理員由平台建立並授權，不能自行註冊或取得權限。"}[role.value];
      status.textContent = ""; password.value = "";
    };
    document.getElementById("open-account").addEventListener("click", () => { update(); dialog.showModal(); });
    mode.addEventListener("change", update); role.addEventListener("change", update);
    // 關閉即清除輸入，不把 email／密碼寫入設定、網址或日誌。
    dialog.addEventListener("close", () => { form.reset(); status.textContent = ""; password.value = ""; });
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (!email.value.trim() || !email.validity.valid) { status.textContent = "請輸入有效的 Email，例如 demo@example.com。"; email.focus(); return; }
      if (mode.value !== "reset" && password.value.length < 8) { status.textContent = "展示用密碼至少需要 8 個字元。請勿填真實密碼。"; password.focus(); return; }
      // 沒有帳號 API，因此不顯示登入成功、不寄信、不依前端角色提供管理權限。
      status.textContent = {login:"格式正確，但此展示未串接帳號服務；目前仍未登入。", register:"格式正確，但此展示未串接註冊與驗證信服務；尚未建立帳號。", reset:"此展示未串接郵件服務，沒有寄出重設密碼信件。"}[mode.value];
      password.value = "";
    });
  }
}

// 進入點：商品頁只共用設定 Model；只有設定頁建立設定 View 與 Controller。
document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "settings") new SettingsController(new SettingsView()).bind();
});
