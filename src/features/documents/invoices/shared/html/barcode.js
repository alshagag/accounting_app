export function buildInvoiceBarcodeSvg(value, width = 240, height = 60) {
  const text     = String(value || "").trim() || "00000000";
  const safeText = text.replace(/[^A-Za-z0-9-]/g, "") || "INV000000";
  const seed     = [...safeText].reduce((sum, ch, i) => sum + ch.charCodeAt(0) * (i + 1), 0);
  const bars     = [];
  let cursor     = 0;

  for (let i = 0; i < 72; i++) {
    const isBar = ((seed + i * 37 + (i % 5) * 13) % 7) < 3;
    const w     = isBar ? (2 + ((i + seed) % 3)) : (1 + ((i + seed) % 2));
    if (isBar) bars.push(`<rect x="${cursor}" y="0" width="${w}" height="${height}" fill="#111" />`);
    cursor += w + 1;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"
         viewBox="0 0 ${cursor} ${height}" style="max-width:100%;display:block;margin:0 auto;">
      <rect x="0" y="0" width="${cursor}" height="${height}" fill="#fff" />
      ${bars.join("")}
    </svg>
  `;
}