import { reels } from '../config/reels.js'
import { lines } from '../config/lines.js'
import { paytable, scatterPayout, freeSpinAwards, bonusPickAwards } from '../config/paytable.js'
import { randomInt } from './random.js'
import { SpinResult, LineWin } from './types.js'

const WILD = 'S11'
// Conditional multipliers per user request:
// Base game: wild lines x2; Free spins: wild lines x3; Non-wild lines unaffected.
const WILD_LINE_MULT_BASE = 2
const WILD_LINE_MULT_FS = 3
const SCATTER = 'S12'
const SCATTER2 = 'S13'
const ROWS = 3

export interface SpinOptions {
  betPerLine: number
  isFreeSpin?: boolean
  forceBonusMin?: number // ensure at least this many B2 symbols
  forceScatterMin?: number // ensure at least this many B symbols
}

export function performSpin(opts: SpinOptions): SpinResult {
  const { betPerLine, isFreeSpin = false, forceBonusMin, forceScatterMin } = opts
  const grid: string[][] = []
  for (let r=0; r<reels.length; r++) {
    const strip = reels[r]
    const start = randomInt(strip.length)
    grid.push([0,1,2].map(o => strip[(start + o) % strip.length]))
  }
  // Initial scatter counts
  let scatterCount = 0
  let scatter2Count = 0
  for (let c=0;c<grid.length;c++) {
    for (let r=0;r<ROWS;r++) {
      const sym = grid[c][r]
      if (sym === SCATTER) scatterCount++
      else if (sym === SCATTER2) scatter2Count++
    }
  }
  // Forced injection BEFORE line evaluation so lines reflect injected scatters
  if (forceScatterMin && scatterCount < forceScatterMin) {
    let needed = forceScatterMin - scatterCount
    for (let c=0;c<grid.length && needed>0;c++) {
      for (let r=0;r<ROWS && needed>0;r++) {
        const sym = grid[c][r]
        if (sym !== SCATTER && sym !== SCATTER2) { grid[c][r] = SCATTER; needed--; }
      }
    }
    scatterCount = forceScatterMin
  }
  if (forceBonusMin && scatter2Count < forceBonusMin) {
    let needed = forceBonusMin - scatter2Count
    for (let c=0;c<grid.length && needed>0;c++) {
      for (let r=0;r<ROWS && needed>0;r++) {
        const sym = grid[c][r]
        if (sym !== SCATTER && sym !== SCATTER2) { grid[c][r] = SCATTER2; needed--; }
      }
    }
    scatter2Count = forceBonusMin
  }
  const lineWins: LineWin[] = []
  let totalLineWin = 0
  for (let li=0; li<lines.length; li++) {
    const pattern = lines[li]
    let bestSymbol = grid[0][pattern[0]]
    if (bestSymbol === WILD) {
      for (let c=1;c<grid.length;c++) {
        const peek = grid[c][pattern[c]]
        if (peek !== WILD && peek !== SCATTER && peek !== SCATTER2) { bestSymbol = peek; break }
      }
    }
    if (bestSymbol === SCATTER || bestSymbol === SCATTER2) continue
    let count = 0
    let wildInLine = false
    for (let c=0;c<grid.length;c++) {
      const sym = grid[c][pattern[c]]
      if (sym === bestSymbol || sym === WILD) {
        if (sym === WILD) wildInLine = true
        count++
      }
      else break
    }
    if (count >= 3) {
  const linePay = paytable[bestSymbol]?.[count]
      if (linePay) {
  // Total stake basis: multiply paytable multiplier by base stake (betPerLine * lines.length)
  const baseStake = betPerLine * lines.length
  let win = linePay * baseStake
        // Conditional wild multiplier depending on free spin state
        if (wildInLine) {
          win *= isFreeSpin ? WILD_LINE_MULT_FS : WILD_LINE_MULT_BASE
        }
        lineWins.push({ lineIndex: li, symbol: bestSymbol, count, payout: win, wild: wildInLine })
        totalLineWin += win
      }
    }
  }
  const baseStake = betPerLine * lines.length
  const scatterWin = scatterPayout[scatterCount] ? scatterPayout[scatterCount] * baseStake : 0 // not boosted by free spin multiplier now
  const triggeredFreeSpins = freeSpinAwards[scatterCount] || 0
  const bonusPickCount = bonusPickAwards[scatter2Count] || 0
  // Free spins no longer apply generic line multiplier; only wild lines boosted above.
  let totalWin = totalLineWin + scatterWin
  // Cap maximum theoretical win at 5000x base stake (removed *3 since no global multiplier)
  const maxAllowed = 5000 * baseStake
  if (totalWin > maxAllowed) totalWin = maxAllowed
  return { grid, lineWins, scatterCount, scatter2Count, scatterWin, totalWin, triggeredFreeSpins, bonusPickCount, isFreeSpin }
}
