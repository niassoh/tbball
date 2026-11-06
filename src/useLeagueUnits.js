import { useEffect, useState } from 'react'
import { fetchUnits } from './api.js'
import { combine, statsOf } from './lib/unitsView.js'

// Each season's 30 unit files, fetched once a session.
const FILES = new Map()
const unitsFile = (season, team) => {
  const key = `${season}|${team}`
  if (!FILES.has(key)) FILES.set(key, fetchUnits(season, team).catch(() => null))
  return FILES.get(key)
}
// Every team's units over `seasons`, combined (lib/unitsView.js combine), with how many of
// its files are in (`got` of `of`) so the table fills in as they arrive.
export function useLeagueUnits(seasons, teams) {
  const [state, setState] = useState({ key: null, views: new Map(), got: 0 })
  const key = `${seasons.join()}|${teams.join()}`
  useEffect(() => {
    let live = true
    let got = 0
    const views = new Map()
    Promise.all(teams.map(team => Promise.all(seasons.map(s => unitsFile(s, team))).then(docs => {
      const have = docs.filter(Boolean)
      if (have.length) {
        const v = combine(have)
        views.set(team, { ...v, teamStats: statsOf(v.total, v.fields) })
      }
      got++
      // In batches, so 30 arrivals don't each redraw the board.
      if (live && (got % 10 === 0 || got === teams.length)) setState({ key, views: new Map(views), got })
    })))
    return () => { live = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps -- seasons and teams are key's
  return { views: state.key === key ? state.views : new Map(), loading: state.key !== key || state.got < teams.length }
}
