export function GET() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <defs>
    <linearGradient id="g" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0f172a" />
      <stop offset="1" stop-color="#0ea5e9" />
    </linearGradient>
  </defs>
  <rect width="48" height="48" rx="14" fill="url(#g)" />
  <path d="M14 16h20a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H24l-8 6v-6h-2a4 4 0 0 1-4-4V20a4 4 0 0 1 4-4Z" fill="#fff" fill-opacity="0.95"/>
  <path d="M18 24h12M18 29h8" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}