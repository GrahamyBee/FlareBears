export interface SymbolPayouts { [count: number]: number }
export interface Paytable { [symbol: string]: SymbolPayouts }

// Payouts are in multiples of bet per line
// UPDATED tiering: High = S1-S4, Medium = S8-S10 (promoted), Low = S5-S7 (demoted). Wild = S11, Free Spins Scatter = S12, Bonus Scatter = S13.
// NOTE: RTP will shift; run simulation to recalibrate if necessary.
// Wave 1 RTP reduction: scaled line pays (~25% of previous) and re-tiered values.
// Total stake basis (original per-line pays scaled by 0.04 since £1 total stake / 25 lines ⇒ betPerLine=0.04)
// Example: original S1 5OAK 1160 per line → 1160 * 0.04 = 46.4x total stake.
// RTP uplift wave: scale all line pays by 0.75 (previous 0.55) to raise overall RTP while monitoring bonus share.
// Original (total stake basis) values multiplied by 0.75.
// Option B paytable uplift: increase scale from 0.75 to 0.95 to raise overall RTP while retaining current symbol tiering.
export const paytable: Paytable = {
  S1:{3:1.84*1.02,4:9.28*1.02,5:46.4*1.02},
  S2:{3:1.4*1.02,4:6.96*1.02,5:23.2*1.02},
  S3:{3:0.92*1.02,4:4.64*1.02,5:13.92*1.02},
  S4:{3:0.68*1.02,4:3.72*1.02,5:11.6*1.02},
  S5:{3:0.56*1.02,4:2.8*1.02,5:9.28*1.02},
  S6:{3:0.48*1.02,4:2.32*1.02,5:6.96*1.02},
  S7:{3:0.36*1.02,4:1.84*1.02,5:5.56*1.02},
  S8:{3:0.28*1.02,4:1.4*1.02,5:4.64*1.02},
  S9:{3:0.24*1.02,4:1.16*1.02,5:3.72*1.02},
  S10:{3:0.2*1.02,4:0.92*1.02,5:2.8*1.02},
  S11:{}, S12:{}, S13:{}
}

// Scatter pays reduced (apply only in base & free spins without global FS multiplier).
// Scatter pays scaled by same 0.75 factor.
export const scatterPayout: { [count: number]: number } = { 3:2.0*1.02,4:10.0*1.02,5:50*1.02 }

// Free spin counts trimmed.
// Slightly uplift free spin counts to restore feature presence.
// Adjusted per user request: reduced free spin awards to 5 / 10 / 15 for 3/4/5 scatters.
export const freeSpinAwards: { [count: number]: number } = { 3:5,4:10,5:15 }

// Second bonus feature awards (pick game) triggered by B2 scatters
// Bonus pick awards capped: 5 now yields 4 picks to moderate feature value.
export const bonusPickAwards: { [count: number]: number } = { 3:3,4:4,5:5 }
