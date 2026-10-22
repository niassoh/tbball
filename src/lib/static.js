// The site can be served from a base path (VITE_BASE in vite.config.js), so
// files in public/ are addressed through it.
export const asset = path => `${import.meta.env.BASE_URL}${path}`

// A stat label as the static export's file name ('Pts / 75' -> 'pts-75'). The
// export's copy is in thinking-bball lib/stats.js; the two must agree.
export const statKey = label => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
