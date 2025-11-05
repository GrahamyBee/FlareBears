export interface RTPStats {
  spins: number
  totalBet: number
  totalWin: number
  rtp: number
  hitRate: number
  freeSpinTriggers: number
  bonusPickTriggers: number
  bonusPickContribution: number
  freeSpinContribution: number
  baseGameContribution: number
  averageWin: number
  variance: number
  stdDev: number
}

export function calculateRTP(outcomes: { bet: number; win: number; isTrigger?: boolean; isFreeSpin?: boolean; isBonusPick?: boolean }[]): RTPStats {
  let totalBet = 0, totalWin = 0
  let hits = 0
  let freeSpinTriggers = 0
  let bonusPickTriggers = 0
  let baseWins = 0
  let freeWins = 0
  const wins: number[] = []

  for (const o of outcomes) {
    totalBet += o.bet
    totalWin += o.win
    if (o.win > 0) hits++
    wins.push(o.win)
    if (o.isTrigger) freeSpinTriggers++
  if (o.isFreeSpin) freeWins += o.win
  if (o.isBonusPick) { bonusPickTriggers++; }
    else baseWins += o.win
  }

  const rtp = totalWin / totalBet
  const hitRate = hits / outcomes.length
  const freeSpinContribution = freeWins / totalWin || 0
  const bonusPickContribution = outcomes.filter(o=>o.isBonusPick).reduce((a,b)=>a+b.win,0) / totalWin || 0
  const baseGameContribution = baseWins / totalWin || 0
  const averageWin = totalWin / outcomes.length
  const mean = averageWin
  const variance = wins.reduce((acc, w) => acc + (w - mean) ** 2, 0) / wins.length
  const stdDev = Math.sqrt(variance)

  return { spins: outcomes.length, totalBet, totalWin, rtp, hitRate, freeSpinTriggers, bonusPickTriggers, bonusPickContribution, freeSpinContribution, baseGameContribution, averageWin, variance, stdDev }
}
