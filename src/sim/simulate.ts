import { performSpin } from '../engine/spin.js'
import { playFreeSpins } from '../engine/freeSpins.js'
import { resolveBonusPickAuto, BONUS_PICK_SCALE } from '../engine/bonusPick.js'
import { calculateRTP } from '../math/rtp.js'

// Final validation run size increased for stability
const TOTAL_SPINS = 1000000
// Game uses fixed £1 total stake across 25 lines => betPerLine = 1/25
const BET_PER_LINE = 1/25

interface OutcomeRec { bet: number; win: number; baseLineWin?: number; scatterWin?: number; freeSpinMultApplied?: boolean; wildDoubled?: boolean; isTrigger?: boolean; isFreeSpin?: boolean; isBonusPick?: boolean }

const outcomes: OutcomeRec[] = []

let bonusTotalWin = 0
let bonusTotalTriggers = 0
let bonusTotalMultiplier = 0
let bonusTotalPicks = 0

for (let i = 0; i < TOTAL_SPINS; i++) {
  const base = performSpin({ betPerLine: BET_PER_LINE })
  // Derive wild involvement flag (any line win doubled) by comparing payout to theoretical non-wild version (approx: if payout not divisible by betPerLine multiples in paytable)
  const wildDoubled = base.lineWins.some(l => (l as any).wild)
  outcomes.push({
    bet: BET_PER_LINE * 25,
    win: base.totalWin,
    baseLineWin: base.lineWins.reduce((a,b)=>a+b.payout,0),
    scatterWin: base.scatterWin,
    freeSpinMultApplied: base.isFreeSpin,
    wildDoubled,
    isTrigger: base.triggeredFreeSpins > 0
  })
  if (base.bonusPickCount > 0) {
    const bonus = resolveBonusPickAuto(base.bonusPickCount, BET_PER_LINE * 25)
    bonusTotalWin += bonus.win
    bonusTotalTriggers++
    bonusTotalMultiplier += bonus.totalMultiplier
    bonusTotalPicks += bonus.picksAllowed
    outcomes.push({ bet: 0, win: bonus.win, isBonusPick: true })
  }
  if (base.triggeredFreeSpins > 0) {
    const fs = playFreeSpins(base.triggeredFreeSpins, BET_PER_LINE)
    for (const spin of fs.spins) {
      // In free spins performSpin sets isFreeSpin true (tripling applied inside spin)
  outcomes.push({ bet: 0, win: spin.totalWin, baseLineWin: spin.lineWins.reduce((a,b)=>a+b.payout,0), scatterWin: spin.scatterWin, freeSpinMultApplied: true, wildDoubled: spin.lineWins.some(l=> (l as any).wild), isFreeSpin: true })
    }
  }
  if ((i+1) % 20000 === 0) {
    console.log(`Progress ${(i+1)}`)
  }
}

const stats = calculateRTP(outcomes)
console.log('Simulation Results')
console.log(stats)
// Additional derived metrics
const totalWildDoubledSpins = outcomes.filter(o=>o.wildDoubled).length
const freeSpinTotalWin = outcomes.filter(o=>o.isFreeSpin).reduce((a,b)=>a+b.win,0)
const baseTotalWin = outcomes.filter(o=>!o.isFreeSpin && !o.isBonusPick).reduce((a,b)=>a+b.win,0)
const scatterTotal = outcomes.reduce((a,b)=>a+(b.scatterWin||0),0)
const bonusWinTotal = outcomes.filter(o=>o.isBonusPick).reduce((a,b)=>a+b.win,0)
const otherWin = stats.totalWin - bonusWinTotal
const targetShare = 0.20
// Recommended scale factor to adjust future BONUS_PICK_SCALE so feature ~= targetShare of total RTP.
// f = targetShare * otherWin / (bonusWin * (1 - targetShare))
const recommendedScale = bonusWinTotal > 0 ? (targetShare * otherWin) / (bonusWinTotal * (1 - targetShare)) : 0
const bonusPickRTPPctOfTotalBet = (bonusWinTotal / stats.totalBet * 100).toFixed(2) + '%'
const avgBonusWinPerTrigger = bonusTotalTriggers > 0 ? (bonusTotalWin / bonusTotalTriggers) : 0
const avgBonusMultiplier = bonusTotalTriggers > 0 ? (bonusTotalMultiplier / bonusTotalTriggers) : 0
const avgBonusPicks = bonusTotalTriggers > 0 ? (bonusTotalPicks / bonusTotalTriggers) : 0
console.log({
  wildDoubledSpinPct: (totalWildDoubledSpins / outcomes.length * 100).toFixed(2)+'%',
  freeSpinWinPct: (freeSpinTotalWin / stats.totalWin * 100).toFixed(2)+'%',
  baseWinPct: (baseTotalWin / stats.totalWin * 100).toFixed(2)+'%',
  scatterWinPct: (scatterTotal / stats.totalWin * 100).toFixed(2)+'%',
  bonusPickWinPct: (bonusWinTotal / stats.totalWin * 100).toFixed(2)+'%',
  bonusPickRTPPctOfTotalBet,
  avgBonusWinPerTrigger: avgBonusWinPerTrigger.toFixed(4),
  avgBonusMultiplier: avgBonusMultiplier.toFixed(3),
  avgBonusPicks: avgBonusPicks.toFixed(3),
  currentBonusPickScale: BONUS_PICK_SCALE,
  recommendedBonusPickScale: recommendedScale.toFixed(3)
})
