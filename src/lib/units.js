// A lineup unit's players in the order the reader last saw them: clicking a teammate's
// tile carries that unit's order (profile slugs, by position) to his page, where anyone
// in it keeps his spot (the clicked player too) and the rest fill the open spots in
// their usual order. Without an order of the same size, the usual order.
export const arrange = (players, order) => {
  if (!order || order.length !== players.length) return players
  const out = new Array(players.length).fill(null)
  const rest = []
  for (const pl of players) {
    const i = pl && pl.slug ? order.indexOf(pl.slug) : -1
    if (i >= 0 && !out[i]) out[i] = pl
    else rest.push(pl)
  }
  return out.map(x => x || rest.shift())
}
