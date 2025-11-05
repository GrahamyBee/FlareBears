// Reel strips updated from user-provided raw data (tab-separated rows) on 2025-10-28.
// Symbols: S1..S10 (value), S11 (wild), S12 (free spins scatter), S13 (bonus scatter)
// Lengths: Reel1=55, Reel2=64, Reel3=65, Reel4=56, Reel5=66
export type Reel = string[]
export const reels: Reel[] = [
  // Reel1 (no stacked wild/scatter)
  // Option B adjustment: introduce 2 spaced free spin scatters (S12) and 1 wild (S11) to raise FS trigger rate & wild involvement
  // Replacements (index-based original -> new): 10:S9->S12, 24:S10->S11, 38:S2->S12
  ['S10','S7','S4','S5','S6','S1','S7','S2','S8','S3','S12','S4','S10','S1','S5','S6','S1','S8','S2','S7','S3','S13','S4','S11','S7','S4','S5','S6','S1','S8','S2','S7','S3','S10','S4','S7','S6','S1','S8','S12','S7','S3','S10','S4','S9','S7','S4','S13','S7','S4','S10','S7','S4','S5','S13'],
  // Reel2 (remove S12,S12 duplicate & large S11 cluster -> single spaced wilds / scatters)
  ['S13','S9','S12','S6','S1','S7','S2','S8','S3','S9','S4','S10','S3','S5','S6','S1','S7','S2','S8','S3','S9','S4','S10','S8','S1','S5','S6','S1','S7','S2','S8','S3','S9','S4','S10','S8','S3','S11','S6','S2','S8','S11','S9','S3','S12','S6','S3','S8','S6','S1','S8','S2','S10','S3','S8','S13','S10','S8','S1','S8','S3','S5','S10'],
  // Reel3 (remove S12,S12 duplicate; keep single wild spacing)
  // Option B adjustment: add second wild (S11) early and keep spaced scatters
  // Replacements: 10:S10->S11 (new wild), retain existing wild at 36
  ['S13','S5','S6','S1','S7','S2','S8','S3','S9','S4','S11','S8','S1','S5','S6','S1','S7','S2','S8','S3','S9','S4','S10','S1','S8','S5','S6','S1','S7','S2','S8','S3','S9','S4','S10','S8','S11','S5','S2','S8','S5','S12','S1','S7','S2','S8','S3','S9','S4','S10','S5','S9','S1','S7','S13','S8','S3','S12','S1','S8','S9','S2'],
  // Reel4 (remove S12,S12 duplicate; ensure wilds separated)
  // Option B adjustment: add second scatter (S12) near tail for improved FS trigger frequency
  // Replacement: 49:S1->S12
  ['S13','S5','S6','S1','S7','S2','S8','S3','S9','S4','S10','S5','S6','S1','S7','S2','S8','S3','S9','S4','S10','S12','S6','S1','S7','S2','S8','S3','S9','S4','S5','S10','S11','S7','S2','S8','S4','S6','S1','S7','S2','S8','S3','S9','S4','S10','S5','S8','S12','S10','S4','S13','S1','S5','S4'],
  // Reel5 (wild occurrences single; no duplicates)
  // Option B adjustment: add 1 scatter (S12) and second wild (S11) spaced
  // Replacements: 31:S5->S12, 58:S5->S11
  ['S5','S9','S10','S5','S6','S1','S7','S2','S8','S3','S9','S4','S10','S9','S13','S5','S10','S6','S1','S7','S2','S8','S3','S9','S4','S10','S5','S9','S1','S5','S10','S12','S1','S7','S2','S8','S3','S9','S4','S10','S8','S11','S10','S9','S6','S4','S9','S2','S8','S3','S9','S4','S10','S8','S5','S2','S10','S5','S6','S2','S9','S4','S8','S13','S10']
]

// Utility: simple reel validation summary
export function summarizeReels() {
  const summary = reels.map((strip, i) => {
    const counts: Record<string, number> = {}
    strip.forEach(s => { counts[s] = (counts[s]||0)+1 })
    return { reel: i+1, length: strip.length, counts }
  })
  return summary
}
