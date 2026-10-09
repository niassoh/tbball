// Playoffs mode: the whole profile in playoff numbers. It lives in the URL (?playoffs),
// so a link opens in the mode it was shared in, and the browser remembers the reader's
// last choice for links without it.
export const PARAM = 'playoffs'
export const STORE_KEY = 'tbb.mode'

// A ?playoffs in the URL decides (?playoffs=0 means off); otherwise the stored choice.
export const readMode = (search, stored) => {
  const q = new URLSearchParams(search)
  return q.has(PARAM) ? q.get(PARAM) !== '0' : stored === 'playoffs'
}

// A path in the given mode.
export const withMode = (path, playoffs) => (playoffs ? `${path}?${PARAM}` : path)

// Browser storage can be missing or blocked (private windows); the mode then lasts as
// long as the URL carries it.
export const storedMode = () => {
  try {
    return window.localStorage.getItem(STORE_KEY)
  } catch {
    return null
  }
}
export const storeMode = playoffs => {
  try {
    window.localStorage.setItem(STORE_KEY, playoffs ? 'playoffs' : 'regular')
  } catch {
    // Not remembered; the URL still carries it.
  }
}
