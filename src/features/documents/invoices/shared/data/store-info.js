export const SHOW_FOOTER_PERSIST_KEY = "accountingShowFooter";

export function getPersistedShowFooter() {
  try {
    const raw = localStorage.getItem(SHOW_FOOTER_PERSIST_KEY);
    if (raw === null) return true;
    if (raw === "false") return false;
    if (raw === "true") return true;
    return raw ? JSON.parse(raw) : true;
  } catch {
    return true;
  }
}

export function setPersistedShowFooter(value) {
  try {
    localStorage.setItem(SHOW_FOOTER_PERSIST_KEY, JSON.stringify(Boolean(value)));
  } catch {}
}

export function setShowFooterToggleUI(checked) {
  try {
    const cb = document.querySelector('input[id$="ShowFooter"]');
    if (cb) cb.checked = Boolean(checked);
    const editorCb = document.querySelector('input[name="toggleShowFooter"], input[id$="toggleShowFooter"], input[id$="ShowFooter"]');
    if (editorCb) editorCb.checked = Boolean(checked);
  } catch {}
}

export function getDefaultStoreInfo() {
  return {
    storeName:    localStorage.getItem("businessName")    || localStorage.getItem("documentStoreName")    || "اسم المتجر",
    storeAddress: localStorage.getItem("businessAddress") || localStorage.getItem("documentStoreAddress") || "الأحساء - بلدة الدالوة",
    storePhone:   localStorage.getItem("businessPhone")   || localStorage.getItem("documentStorePhone")   || "054289300",
    taxNumber:    localStorage.getItem("taxNumber")       || localStorage.getItem("documentTaxNumber")    || "32555555253",
    logoUrl:      localStorage.getItem("businessLogo")    || localStorage.getItem("documentLogoUrl")      || "",
    commercialReg: localStorage.getItem("commercialReg")  || localStorage.getItem("documentCommercialReg") || "10000000012",
    branch:       localStorage.getItem("businessBranch")  || localStorage.getItem("documentBranch")  || ""
  };
}