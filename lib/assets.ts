// Resolves public asset paths correctly for both dev and GitHub Pages static export.
// Next.js Image with `unoptimized: true` does NOT auto-prepend basePath to src,
// so we handle it manually here.
const BASE = process.env.NODE_ENV === 'production' ? '/taries-beauty-emporium' : ''

export const logoSrc = `${BASE}/images/logo.jpg`
