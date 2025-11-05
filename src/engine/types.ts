export interface SpinResultSymbolGrid extends Array<Array<string>> {}
export interface LineWin { lineIndex: number; symbol: string; count: number; payout: number; wild: boolean }
export interface SpinResult {
  grid: string[][];
  lineWins: LineWin[];
  scatterCount: number;
  scatter2Count: number;
  scatterWin: number;
  totalWin: number;
  triggeredFreeSpins: number;
  bonusPickCount: number;
  isFreeSpin: boolean;
}

export interface FreeSpinState {
  remaining: number;
  totalWon: number;
}
