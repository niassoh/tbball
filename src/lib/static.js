// The site is served from a base path on static hosts (GitHub Pages:
// /tbball/), so files in public/ are addressed through it.
export const asset = path => `${import.meta.env.BASE_URL}${path}`

// A stat label as the static export's file name ('Pts / 75' -> 'pts-75'). The
// export's copy is in thinking-bball lib/stats.js; the two must agree.
export const statKey = label => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
