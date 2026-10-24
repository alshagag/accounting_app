// خطّاف حل الوحدات في Node: يربط مرادف الاستيراد @/ بالمجلد src/ | Node module-resolution hook: maps the app's @/ import alias to src/.
// يُسجَّل برمجيًا من الاختبارات عبر module.register | Registered programmatically from the tests via module.register.

const SRC_DIR = new URL("../src/", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2).replace(/^\//, "");
    return { url: new URL(rel, SRC_DIR).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
