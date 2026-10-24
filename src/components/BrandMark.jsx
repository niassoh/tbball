// The Thinking Basketball logo, linking back to the main site from each page's top left:
// a head in profile, a light bulb in it on its cord, the bulb's glass a basketball. Drawn
// as strokes: the head and cord one line (the centre of a trace of the site's logo), the
// bulb rebuilt from circles and arcs. Under the pointer the bulb flickers on, the ball
// glowing orange with its seams gone dark, in a warm halo; pressed, it throws out rays
// (index.css .brand). `large`: the home page's, bigger.
import { useState } from 'react'

const HEAD = 'M74.6 101.9C74.5 102.4 74.1 103.3 74.0 104.5C73.9 105.8 73.9 107.2 74.0 109.4C74.1 111.6 74.2 115.4 74.4 117.8C74.6 120.1 74.7 121.6 75.1 123.6C75.5 125.6 76.4 128.2 77.0 129.8C77.7 131.4 78.4 132.3 79.0 133.2C79.6 134.0 80.0 134.4 80.8 135.1C81.5 135.8 82.6 136.7 83.6 137.3C84.6 137.9 85.4 138.2 86.8 138.6C88.2 139.0 90.4 139.6 92.0 139.8C93.7 140.1 95.4 140.0 96.8 139.9C98.2 139.8 99.4 139.5 100.6 139.1C101.7 138.8 102.7 138.3 103.7 137.8C104.6 137.2 105.3 136.7 106.1 135.8C107.0 135.0 107.9 133.9 108.6 132.7C109.2 131.6 109.7 130.6 110.2 129.1C110.7 127.5 111.3 125.5 111.5 123.5C111.8 121.5 111.9 119.8 111.8 116.9C111.7 114.1 111.0 109.3 111.0 106.6C111.1 103.8 111.6 102.1 112.1 100.4C112.6 98.6 112.3 98.8 113.9 96.1C115.5 93.5 119.8 87.5 121.6 84.5C123.5 81.5 123.9 80.4 125.0 78.0C126.0 75.5 127.2 72.4 128.1 69.6C128.9 66.7 129.5 64.1 129.8 60.9C130.1 57.7 130.2 53.7 130.0 50.4C129.7 47.1 129.1 44.0 128.4 41.0C127.6 38.1 126.5 35.3 125.4 32.8C124.2 30.2 122.9 27.9 121.5 25.7C120.1 23.6 118.5 21.7 116.9 19.9C115.3 18.2 113.7 16.7 112.0 15.3C110.2 13.9 108.5 12.7 106.5 11.5C104.5 10.3 102.3 9.2 99.9 8.3C97.6 7.3 94.5 6.4 92.3 5.8C90.2 5.2 89.5 5.0 87.1 4.7C84.8 4.4 81.1 4.1 78.0 4.0C74.9 3.8 71.3 3.8 68.7 3.9C66.1 4.0 64.5 4.2 62.6 4.4C60.6 4.6 59.5 4.7 57.1 5.3C54.8 5.9 51.0 7.0 48.7 7.9C46.3 8.8 44.8 9.5 42.9 10.5C41.0 11.5 39.2 12.8 37.5 14.1C35.8 15.3 34.3 16.6 32.8 18.1C31.3 19.7 29.7 21.6 28.4 23.3C27.2 24.9 26.3 26.2 25.3 28.0C24.3 29.9 23.1 32.7 22.4 34.5C21.8 36.3 21.6 37.3 21.3 38.9C21.0 40.4 20.7 42.1 20.7 43.9C20.7 45.6 21.2 48.3 21.2 49.4C21.3 50.6 23.3 47.7 20.9 51.0C18.4 54.3 9.2 65.9 6.5 69.4C3.9 72.9 5.4 71.2 5.0 72.0C4.6 72.8 4.4 73.6 4.3 74.5C4.2 75.3 4.2 76.3 4.4 77.1C4.7 77.9 5.1 78.8 5.7 79.4C6.3 80.0 6.8 80.3 7.9 80.6C9.0 81.0 11.5 81.3 12.4 81.6C13.4 81.9 13.2 82.0 13.5 82.4C13.7 82.7 14.0 82.9 14.1 83.6C14.1 84.2 14.1 85.0 13.8 86.1C13.4 87.2 12.3 89.2 11.9 90.1C11.6 91.0 11.7 90.9 11.7 91.5C11.8 92.1 11.8 93.0 12.1 93.7C12.3 94.4 13.2 94.9 13.3 95.7C13.4 96.5 12.8 97.5 12.7 98.3C12.7 99.1 12.8 99.9 12.9 100.5C13.1 101.1 13.2 101.5 13.5 102.1C13.9 102.8 14.7 103.7 15.0 104.3C15.3 104.9 15.7 104.3 15.4 105.8C15.1 107.4 13.6 112.0 13.3 113.7C12.9 115.4 13.1 115.3 13.1 116.1C13.2 116.9 13.3 117.8 13.5 118.6C13.7 119.4 13.9 120.1 14.4 120.9C14.8 121.6 15.4 122.5 16.1 123.2C16.8 123.8 17.6 124.4 18.4 124.8C19.2 125.3 20.1 125.6 20.9 125.9C21.8 126.1 22.4 126.3 23.6 126.5C24.8 126.6 25.5 126.8 27.9 126.8C30.3 126.7 35.9 126.1 38.0 126.1C40.1 126.0 39.8 126.3 40.6 126.6C41.4 126.9 42.1 127.1 42.9 127.7C43.7 128.3 44.7 129.3 45.4 130.3C46.1 131.2 46.7 132.5 47.1 133.4C47.4 134.2 47.5 134.1 47.8 135.4C48.1 136.7 48.4 140.0 48.9 141.3C49.4 142.7 50.2 142.9 50.7 143.4C51.2 143.9 51.9 144.1 52.1 144.3'
// The bulb's glass (the ball and its neck), the line where they meet, the ball's seams
// (clipped to the ball), and the two bands of its base.
const GLASS = 'M62.2 71.4A22.2 22.2 0 1 1 85.9 71.4V84.3Q85.9 87.3 82.9 87.3H65.2Q62.2 87.3 62.2 84.3Z'
const CHORD = 'M62.2 73.4H85.9'
const SEAMS = 'M74.1 30V74M51.8 49Q74 45.2 96.3 49M65.6 33.3Q69.6 39 69.9 46.5M82.6 33.3Q78.6 39 78.3 46.5M69.6 49Q63 55.5 57.5 64.8M78.6 49Q85.2 55.5 90.7 64.8'
const BASE = 'M65.1 92.1H83.1M67.2 96.6H80.9'
// Rays round the top of the ball, from 28 to 37 out from its centre.
const RAYS = [-165, -135, -105, -75, -45, -15].map(a => {
  const c = Math.cos((a * Math.PI) / 180)
  const s = Math.sin((a * Math.PI) / 180)
  return `M${(74.05 + 28 * c).toFixed(1)} ${(52.6 + 28 * s).toFixed(1)}L${(74.05 + 37 * c).toFixed(1)} ${(52.6 + 37 * s).toFixed(1)}`
}).join('')

const Bulb = ({ seams, chord }) => <>
  <path d={CHORD} stroke={chord} strokeWidth={2} />
  <path d={SEAMS} stroke={seams} strokeWidth={3.4} clipPath="url(#bm-ball)" />
</>

export default function BrandMark({ large = false }) {
  // Each press throws a fresh burst of rays (remounted by its count).
  const [burst, setBurst] = useState(0)
  return (
    <a className={large ? 'brand brand-lg' : 'brand'} href="https://thinkingbasketball.net/" aria-label="Thinking Basketball" onPointerDown={() => setBurst(b => b + 1)}>
      <svg viewBox="0 0 134.1 147.86" aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <clipPath id="bm-ball"><circle cx={74.05} cy={52.6} r={22.4} /></clipPath>
          <radialGradient id="bm-glow" cx={72} cy={47} r={30} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffe2a0" />
            <stop offset=".45" stopColor="#f59a3e" />
            <stop offset="1" stopColor="#c95f22" />
          </radialGradient>
          <radialGradient id="bm-halo">
            <stop offset="0" stopColor="#ffb85c" stopOpacity=".7" />
            <stop offset=".5" stopColor="#ff9a3c" stopOpacity=".22" />
            <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle className="bm-halo" cx={74.05} cy={55} r={46} fill="url(#bm-halo)" />
        <g stroke="currentColor">
          <path d={HEAD} strokeWidth={3.8} />
          <path d={BASE} strokeWidth={3.8} />
          <path d={GLASS} strokeWidth={3.8} />
          <Bulb seams="currentColor" chord="currentColor" />
        </g>
        <g className="bm-lit">
          <path d={GLASS} fill="url(#bm-glow)" stroke="#ffe9bd" strokeWidth={3.8} />
          <Bulb seams="#4a2410" chord="#8a4a1c" />
        </g>
        {burst > 0 && <path key={burst} className="bm-rays" d={RAYS} stroke="#ffd27a" strokeWidth={4.5} />}
      </svg>
    </a>
  )
}
