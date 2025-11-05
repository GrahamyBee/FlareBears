# Fluffy Favourites Slot Game

Prototype slot math/engine targeting 95% RTP, 25 win lines, 10 paying symbols + Wild + Bonus (scatter) triggering free spins.

## Features
- 5x3 reel layout (modifiable)
- 25 fixed paylines
- 10 paying symbols (S1-S10) ascending in value
- Wild symbol (W) substitutes all except Bonus (B)
- Bonus scatter symbol (B); 3+ trigger Free Spins
- Medium volatility target
- RTP target: 95%

## Structure
- `src/config/paytable.ts` – payout definitions
- `src/config/lines.ts` – line definitions
- `src/config/reels.ts` – base game reel strips
- `src/engine/spin.ts` – spin resolution logic
- `src/engine/freeSpins.ts` – free spins feature
- `src/math/rtp.ts` – RTP aggregation helpers
- `src/sim/simulate.ts` – Monte Carlo simulation for RTP/volatility

## Getting Started
```
npm install
npm run build
npm run simulate
```

## Adjusting Math
Edit `reels.ts`, `paytable.ts`, or free spin awards in `freeSpins.ts`. Then rerun simulation.

## Disclaimer
This is a prototype for educational purposes and not production-ready gambling software.
