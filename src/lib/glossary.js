// What each stat label means, in a sentence or two, for the hover definitions (Gloss.jsx)
// and the boards' column-head titles. Keyed by the label as the profile and boards name
// it. Grounded in the sheet's own descriptions (the boards' `desc`), its formulas
// (thinking-bball docs/tracking-data-audit.md) and Ben Taylor's published definitions.
const GLOSSARY = {
  // Impact
  'BPM': 'Backpicks Box Plus-Minus: Ben Taylor’s box-score estimate of a player’s impact, in points per 100 possessions above an average player.',
  'AuPM': 'Augmented Plus-Minus: an estimate of adjusted plus-minus (RAPM) built from his box score, his on/off numbers and his teammates’ on/off, in points per 100 possessions above average.',
  'AuPM / g': 'AuPM scaled by his minutes into points per game above average, so heavy minutes count for more.',
  'Net On': 'His team’s point differential per 100 possessions while he’s on the floor.',
  'Net On/Off': 'His team’s point differential per 100 possessions with him on the floor, minus with him off it.',

  // Load & Creation
  'Load': 'Offensive Load: how many plays per 100 possessions he’s directly involved in: his shots, free-throw trips and turnovers, plus the shots and assists he creates for teammates.',
  'Box Creation': 'An estimate, from the box score, of the open shots he creates for teammates per 100 possessions.',
  'Passer Rating': 'An estimate of his passing ability on a rough 1–10 scale, from his assists, creation and turnovers against how much of the offense he handles.',
  'Time of Poss %': 'The share of his team’s offensive time on the floor that the ball is in his hands (player tracking).',
  'cTOV%': 'Creation-adjusted turnovers: his turnovers as a share of his Load, so a player who handles more of the offense isn’t penalised for simply having the ball more.',

  // Offense
  'Pts / 75': 'Points per 75 possessions, about a starter’s game, so fast and slow teams compare fairly.',
  'rTS%': 'Relative true shooting: his points per shot attempt (free throws counted) above or below the league average that season.',
  'OBPM': 'The offensive half of BPM: his box-score impact on offense, in points per 100 possessions above average.',
  'ScoreVal': 'Scoring value: an estimate of his impact from scoring alone, in points per 100 possessions above average.',
  'PlayVal': 'Playmaking value: an estimate of his impact from playmaking alone, in points per 100 possessions above average.',
  'ORTG On': 'His team’s points scored per 100 possessions while he’s on the floor.',
  'rOS%': 'Relative overall scoring: true shooting that also counts his scoring turnovers and the misses he rebounds himself, above or below the league that season.',
  'Good:Bad Pass': 'His passing plays (the assists and created shots in his Load) for each bad-pass turnover: 3.7 is 3.7 to 1.',
  'Handle TOV%': 'His lost-ball (ball-handling) turnovers as a share of his Load.',
  'Non-Pass TOV%': 'His turnovers other than bad passes (lost balls, offensive fouls, travels and the like) as a share of his Load.',

  // Rim
  'Drives / 36': 'Drives to the basket per 36 minutes (player tracking).',
  'Drives TS%': 'True shooting on his drives: the points his drives produce per shot, free throws counted.',
  'Rim FGA': 'Shot attempts at the rim per 75 possessions.',
  'Rim FG%': 'His field-goal percentage at the rim.',
  'Touches / Drive': 'Frontcourt touches for each drive: the lower it is, the more often a touch turns into a drive.',
  'Rim+FT TSA%': 'The share of his true shot attempts that come at the rim or from the free-throw line.',
  'Fouls Drawn': 'Fouls drawn per 75 possessions.',
  'FTA': 'Free-throw attempts per 75 possessions.',
  'FTA : Rim FGA': 'Free-throw attempts for every shot at the rim: how often his attacks end at the line.',

  // Shooting
  'Midrange FGA': 'Short and long midrange attempts per 75 possessions.',
  'Midrange FG%': 'His field-goal percentage on midrange shots.',
  'Wide Open 3s/36': 'Wide-open threes (nearest defender six or more feet away) per 36 minutes (player tracking).',
  'Wide Open 3%': 'His percentage on wide-open threes.',
  'Pullup 3s/36': 'Pull-up threes, shot off his own dribble, per 36 minutes (player tracking).',
  'Pullup 3%': 'His percentage on pull-up threes.',
  'C&S 3s/36': 'Catch-and-shoot threes, shot without a dribble, per 36 minutes (player tracking).',
  'C&S 3%': 'His percentage on catch-and-shoot threes.',
  'FT%': 'His free-throw percentage.',
  'Corner 3 Share': 'The share of his three-point attempts taken from the corners.',

  // Defense
  'Def FGA <6ft /36': 'Shots within six feet of the rim he defends as the nearest defender, per 36 minutes (player tracking).',
  'Def FGA Diff%': 'Opponents’ field-goal percentage on those shots minus what they’d be expected to make; below zero, they shoot worse with him there.',
  'Forced TOV': 'Turnovers he forces (steals, charges and offensive fouls drawn) per 75 possessions.',
  'DRTG On': 'Opponents’ points per 100 possessions while he’s on the floor.',
  'Rim2FT': 'Opponents’ points on shots under 5 feet, with their free throws, per 100 possessions while he’s on the floor (runouts left out).',
  'rRim2FT': 'Rim2FT against the league’s that season: below zero, opponents score less at the rim and the line with him on the floor.',

  // Team
  'Team Net': 'His team’s point differential per 100 possessions against the league, adjusted for opponent quality and blending the regular season with the playoffs.',
  'Team Off': 'His team’s offense against the league, per 100 possessions, adjusted for opponent quality and blending the regular season with the playoffs.',
  'Team Def': 'His team’s defense against the league, per 100 possessions (lower is better), adjusted for opponent quality and blending the regular season with the playoffs.',
  'Mates Spacing': 'An estimate of his teammates’ outside shooting, from their three-point and free-throw shooting weighted by minutes: the higher, the more room he has.'
}

// The boards' single-season tracking columns ("1yr Wide Open 3s/36") mean what their
// rolling-window namesakes do.
export const define = label => GLOSSARY[label.replace(/^1yr /, '')] || null
