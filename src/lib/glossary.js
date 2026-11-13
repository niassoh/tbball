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
  'Layup Ast%': 'The share of his assists that set up layups, above or below the league’s.',
  '% of 2s Assisted': 'The share of his made twos that were assisted.',
  '% of 3s Assisted': 'The share of his made threes that were assisted.',

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
  'ORTG Off': 'His team’s points scored per 100 possessions while he’s off the floor.',
  'ORTG On/Off': 'His team’s points scored per 100 possessions with him on the floor, minus with him off it.',

  // Rim
  'Drives / 36': 'Drives to the basket per 36 minutes (player tracking).',
  'Drives TS%': 'True shooting on his drives: the points his drives produce per shot, free throws counted.',
  'Rim FGA': 'Shot attempts at the rim per 75 possessions.',
  'Rim FG%': 'His field-goal percentage at the rim.',
  'Rim+FT TSA%': 'The share of his true shot attempts that come at the rim or from the free-throw line.',
  'Fouls Drawn': 'Fouls drawn per 75 possessions.',
  'FTA / 75': 'Free-throw attempts per 75 possessions.',
  'FTA : Rim FGA': 'Free-throw attempts for every shot at the rim: how often his attacks end at the line.',
  'Rim Assisted%': 'The share of his made shots at the rim that were assisted.',

  // Shooting
  'Midrange FGA': 'Short and long midrange attempts per 75 possessions.',
  'Midrange FG%': 'His field-goal percentage on midrange shots.',
  'rMidrange FG%': 'His midrange field-goal percentage above or below the league average that season.',
  'Wide Open 3s/36': 'Wide-open threes (nearest defender six or more feet away) per 36 minutes (player tracking).',
  'Wide Open 3%': 'His percentage on wide-open threes.',
  'Pullup 3s/36': 'Pull-up threes, shot off his own dribble, per 36 minutes (player tracking).',
  'Pullup 3%': 'His percentage on pull-up threes.',
  'C&S 3s/36': 'Catch-and-shoot threes, shot without a dribble, per 36 minutes (player tracking).',
  'C&S 3%': 'His percentage on catch-and-shoot threes.',
  'FT%': 'His free-throw percentage.',
  'Corner 3 Share': 'The share of his three-point attempts taken from the corners.',
  'Off-Ball Scoring%': 'An estimate of the share of his points from off-ball shots: spot-ups, cuts, lobs, pops, short rolls and putbacks (less precise before 2013-14).',
  'Movement Scoring%': 'An estimate of the share of his points from coming off off-ball screens (less precise before 2013-14; it underrates the heaviest screen users).',

  // Defense
  'Def FGA <6ft /36': 'Shots within six feet of the rim he defends as the nearest defender, per 36 minutes (player tracking).',
  'Def FGA Diff%': 'Opponents’ field-goal percentage on those shots minus what they’d be expected to make; below zero, they shoot worse with him there.',
  'Forced TOV': 'Turnovers he forces (steals, charges and offensive fouls drawn) per 75 possessions.',
  'DRTG On': 'Opponents’ points per 100 possessions while he’s on the floor.',
  'DRTG Off': 'Opponents’ points per 100 possessions while he’s off the floor.',
  'DRTG On/Off': 'Opponents’ points per 100 possessions with him on the floor, minus with him off it; below zero, his team defends better with him.',
  'Positions Guarded': 'How many positions he commonly guards, on a 1–5 scale: 1 guards one position all the time, 5 guards each position equally (since 2013-14).',
  'Primary Matchup': 'The position he guards most, on a 1–5 scale from point guard (1) to center (5) (since 2013-14).',
  'Opp Load': 'The average Load of the players he guards: whether he takes on the primary creators or lower-usage threats (since 2013-14).',
  'Matchup Scoring': 'How much his primary matchup’s scoring rate (points per 75 half-court possessions) changes against him, against that player’s season-long rate; below zero, they score less (since 2013-14).',
  'Matchup Scoring rPos': 'Matchup Scoring against his position’s average; players who help more tend to look worse (since 2013-14).',
  'Adj Matchup Scoring': 'Matchup Scoring adjusted for his position and how often he helps: the fairest single read of how his matchups score (since 2013-14).',
  'Def FGA <6ft rPos': 'Shots within six feet of the rim he contests as the nearest defender per 36 minutes, over two seasons, against his position’s average (since 2013-14).',
  'Def FGA Diff rPos': 'Opponents’ field-goal percentage on the rim shots he contests, over two seasons, against his position’s average; below zero is better (since 2013-14).',
  'Goaltend%': 'The share of his blocks that are goaltends.',
  'Pass Steals': 'Steals off opponents’ passes per 75 possessions.',
  'Strip Steals': 'Steals off strips and recovered lost balls per 75 possessions.',
  'Rim2FT': 'Opponents’ points on shots under 5 feet, with their free throws, per 100 possessions while he’s on the floor (runouts left out).',
  'rRim2FT': 'Rim2FT against the league’s that season: below zero, opponents score less at the rim and the line with him on the floor.',

  // Team
  'Team Net': 'His team’s point differential per 100 possessions against the league, adjusted for opponent quality and blending the regular season with the playoffs.',
  'Team Off': 'His team’s offense against the league, per 100 possessions, adjusted for opponent quality and blending the regular season with the playoffs.',
  'Team Def': 'His team’s defense against the league, per 100 possessions (lower is better), adjusted for opponent quality and blending the regular season with the playoffs.',
  'Mates Spacing': 'An estimate of the quality of his teammates’ outside shooting: the higher, the more room he has.'
}

// The boards' single-season tracking columns ("1yr Wide Open 3s/36") mean what their
// rolling-window namesakes do.
export const define = label => GLOSSARY[label.replace(/^1yr /, '')] || null
