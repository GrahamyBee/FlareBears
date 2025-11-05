import { performSpin } from './spin.js'
import { SpinResult } from './types'

export interface FreeSpinsOutcome {
  entryTriggerSpins: number
  spins: SpinResult[]
  totalWin: number
}

export function playFreeSpins(triggered: number, betPerLine: number): FreeSpinsOutcome {
  const spins: SpinResult[] = []
  let totalWin = 0
  for (let i = 0; i < triggered; i++) {
    const res = performSpin({ betPerLine, isFreeSpin: true })
    totalWin += res.totalWin
    spins.push(res)
  }
  return { entryTriggerSpins: triggered, spins, totalWin }
}
