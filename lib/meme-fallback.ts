/** SVG meme card fallback when Gemini image API is unavailable or over quota. */
export function generateMemeFallbackSvg(
  caption: string,
  score: number
): string {
  const safeCaption = caption
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const lines = wrapText(safeCaption, 28);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#16213e"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect x="24" y="24" width="464" height="464" rx="16" fill="none" stroke="#e94560" stroke-width="3" stroke-dasharray="8 6"/>
  <text x="256" y="56" text-anchor="middle" fill="#e94560" font-family="Arial,sans-serif" font-size="14" font-weight="bold">PARODY MEME (TEXT PREVIEW)</text>
  ${lines
    .map(
      (line, i) =>
        `<text x="256" y="${200 + i * 32}" text-anchor="middle" fill="#ffffff" font-family="Arial,sans-serif" font-size="22" font-weight="bold">${line}</text>`
    )
    .join("\n  ")}
  <text x="256" y="460" text-anchor="middle" fill="#94a3b8" font-family="Arial,sans-serif" font-size="13">Memeability ${score}/100 · Image gen unavailable</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 5);
}
