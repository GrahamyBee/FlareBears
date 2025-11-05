// Updated mapping after symbol tier & code remap:
// High: S1-S4 -> user images symbol 1-4.jpg
// Medium: S5-S7 -> now mapped to user images symbol 5-7.jpg
// Low: S8-S10 -> user images symbol 8,9,10.jpg
// Wild: S11 -> wild symbol.jpg
// Free Spins Scatter: S12 -> free spins symbol.jpg
// Bonus Scatter: S13 -> Bonus symbol.jpg (newly provided)
export const symbolImage: Record<string,string> = {
  // High
  S1: '/symbols/symbol 1.jpg',
  S2: '/symbols/symbol 2.jpg',
  S3: '/symbols/symbol 3.jpg',
  S4: '/symbols/symbol 4.jpg',
  // Medium
  S5: '/symbols/symbol 5.jpg',
  S6: '/symbols/symbol 6.jpg',
  S7: '/symbols/symbol 7.jpg',
  // Low
  S8: '/symbols/symbol 8.jpg',
  S9: '/symbols/symbol 9.jpg',
  S10:'/symbols/symbol 10.jpg',
  // Feature symbols
  S11: '/symbols/wild symbol.jpg',
  S12: '/symbols/free spins symbol.jpg',
  S13: '/symbols/Bonus symbol.jpg'
}
