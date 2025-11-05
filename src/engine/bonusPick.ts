import { randomInt } from './random.js'

export interface BonusPickBoardCell {
  index: number
  multiplier: number
  picked: boolean
}

export interface BonusPickOutcome {
  picksAllowed: number
  baseBet: number
  board: BonusPickBoardCell[]
  picksMade: number
  revealedMultipliers: number[]
  totalMultiplier: number
  win: number
  complete: boolean
}

// Wave 1: Trim bonus multipliers to lower expected value; will scale to reach 20% RTP target for feature.
const ALL_MULTIPLIERS = [1,2,3,5,8,10,15,25]
// Increased scale to offset reduced base & free spin returns; aiming for ~20% RTP share.
// Option B initial downscale (was 0.68). Lowered to reduce bonus RTP share after increasing other feature frequency.
// Increase scale to lift bonus pick share from ~15% toward 20% target after paytable uplift.
export const BONUS_PICK_SCALE = 0.66

// Build a board of six hidden multipliers selected randomly from ALL_MULTIPLIERS (allow duplicates)
export function createBonusPickBoard(picksAllowed: number, baseBet: number): BonusPickOutcome {
  const board: BonusPickBoardCell[] = []
  for (let i=0;i<6;i++) {
    const m = ALL_MULTIPLIERS[randomInt(ALL_MULTIPLIERS.length)]
    board.push({ index: i, multiplier: m, picked: false })
  }
  return {
    picksAllowed,
    baseBet,
    board,
    picksMade: 0,
    revealedMultipliers: [],
    totalMultiplier: 0,
    win: 0,
    complete: false
  }
}

// Pick a square; returns updated outcome object (immutable style optional)
export function pickBonusSquare(state: BonusPickOutcome, cellIndex: number): BonusPickOutcome {
  if (state.complete) return state // already finished
  if (state.picksMade >= state.picksAllowed) return state // no picks left
  const cell = state.board.find(c => c.index === cellIndex)
  if (!cell || cell.picked) return state
  cell.picked = true
  const revealed = [...state.revealedMultipliers, cell.multiplier]
  const picksMade = state.picksMade + 1
  const totalMultiplier = revealed.reduce((a,b)=>a+b,0)
  const win = totalMultiplier * state.baseBet * BONUS_PICK_SCALE
  const complete = picksMade >= state.picksAllowed
  return {
    ...state,
    picksMade,
    revealedMultipliers: revealed,
    totalMultiplier,
    win,
    complete
  }
}

// Convenience: autocomplete (used for forced results or simulation)
export function resolveBonusPickAuto(picksAllowed: number, baseBet: number): BonusPickOutcome {
  let state = createBonusPickBoard(picksAllowed, baseBet)
  for (let i=0;i<picksAllowed;i++) {
    // pick random remaining cell
    const remaining = state.board.filter(c=>!c.picked)
    const choice = remaining[randomInt(remaining.length)]
    state = pickBonusSquare(state, choice.index)
  }
  return state
}
