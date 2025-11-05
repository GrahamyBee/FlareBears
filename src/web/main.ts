import { performSpin } from '../engine/spin'
import { playFreeSpins } from '../engine/freeSpins'
import { createBonusPickBoard, pickBonusSquare, resolveBonusPickAuto, BonusPickOutcome } from '../engine/bonusPick'
import { symbolImage } from './symbolImages'

// Preload images to reduce first-spin flicker
const preloadImages = () => {
  Object.values(symbolImage).forEach(src => {
    const img = new Image();
    img.src = src;
  })
}
preloadImages()
import { lines } from '../config/lines'

const slotEl = document.getElementById('slot')!
const spinBtn = document.getElementById('spinBtn') as HTMLButtonElement
const autoBtn = document.getElementById('autoBtn') as HTMLButtonElement
const forceFSBtn = document.getElementById('forceFSBtn') as HTMLButtonElement | null
const forceBonusBtn = document.getElementById('forceBonusBtn') as HTMLButtonElement | null
const bonusWinPanel = document.getElementById('bonusWinPanel') as HTMLDivElement | null
const bonusWinDetails = document.getElementById('bonusWinDetails') as HTMLParagraphElement | null
const bonusWinCloseBtn = document.getElementById('bonusWinCloseBtn') as HTMLButtonElement | null
// Pick game elements
const pickModal = document.getElementById('pickModal') as HTMLDivElement | null
const pickGrid = document.getElementById('pickGrid') as HTMLDivElement | null
const pickInfo = document.getElementById('pickInfo') as HTMLSpanElement | null
const pickSummary = document.getElementById('pickSummary') as HTMLDivElement | null
const pickCloseBtn = document.getElementById('pickCloseBtn') as HTMLButtonElement | null
const pickRevealRestBtn = document.getElementById('pickRevealRestBtn') as HTMLButtonElement | null

let activePickGame: BonusPickOutcome | null = null
const betInput = document.getElementById('bet') as HTMLInputElement
const lastWinEl = document.getElementById('lastWin')!
const logEl = document.getElementById('log')!
const balanceEl = document.getElementById('balance')!
const rtpEl = document.getElementById('rtp')!
const spinsEl = document.getElementById('spins')!
const fsState = document.getElementById('fsState')!
const fsRemainEl = document.getElementById('fsRemain')!

let balance = 100 // £100 starting balance
let totalBet = 0
let totalWin = 0
let spins = 0
let autoRemaining = 0
let freeSpinsQueue: string[] = [] // placeholder to show FS state
let pendingFreeSpins = 0
let spinning = false
let winLinesTimeout: number | null = null

function clearWinLines() {
  const overlay = document.getElementById('lineOverlay') as SVGSVGElement | null
  if (overlay) overlay.innerHTML = ''
  // Also remove win highlights
  slotEl.querySelectorAll('.cell').forEach(c=>c.classList.remove('win'))
}

// Base fast spin timings
let SPIN_TIME_PER_REEL = 280 // faster base reel reveal baseline (mutable via sliders)
let REEL_STAGGER = 120 // tighter stagger for rapid feel (mutable)
// Tease slowdown configuration (mutable)
let TEASE_EXTRA_DELAY_FIRST = 900 // large pause immediately after tease triggers
let TEASE_EXTRA_DELAY_PER_REEL = 450 // added on top of normal timing for subsequent reels

function initGrid() {
  // Preserve backdrop element (#reelBack) and line overlay if present
  const backdrop = slotEl.querySelector('#reelBack') || (() => { const d=document.createElement('div'); d.id='reelBack'; slotEl.appendChild(d); return d })();
  // Remove previous reelTracks
  slotEl.querySelectorAll("[id^='reelTrack_']").forEach(e=>e.remove())
  // Ensure absolute positioned cell placeholders for final symbol bounce overlay
  slotEl.querySelectorAll('.cell').forEach(e=>e.remove())
  for (let c=0;c<5;c++) {
    for (let r=0;r<3;r++) {
      const cell=document.createElement('div')
      cell.className='cell'
      cell.dataset.pos=`${c}-${r}`
      cell.style.left=(c*(100+6))+ 'px'
      cell.style.top=(r*(100+6))+ 'px'
      slotEl.appendChild(cell)
    }
  }
}
// Seed initial visible 3x5 window from reel strips (custom first two reels)
function seedInitialWindow() {
  const customStarts: Record<number,string[]> = {
    0: ['S10','S7','S4'], // Reel1 desired starting triple
    1: ['S13','S9','S12'] // Reel2 desired starting triple
  }
  for (let c=0;c<5;c++) {
    const windowSyms = customStarts[c] || reels[c].slice(0,3)
    for (let r=0;r<3;r++) {
      const cell = slotEl.querySelector(`.cell[data-pos='${c}-${r}']`) as HTMLDivElement | null
      if (!cell) continue
      cell.innerHTML = ''
      const sym = windowSyms[r]
      const img = document.createElement('img'); img.className='symbol-img'; img.src = symbolImage[sym]; img.alt = sym; cell.appendChild(img)
    }
  }
  logReelWindow('Initial Reel Window')
}

// Log the current top 3 symbols for each reel referencing underlying strip indices
function logReelWindow(label: string) {
  try {
    const parts: string[] = []
    for (let c=0;c<5;c++) {
      const top3 = [] as string[]
      for (let r=0;r<3;r++) {
        const cell = slotEl.querySelector(`.cell[data-pos='${c}-${r}']`) as HTMLDivElement | null
        if (cell) {
          const img = cell.querySelector('img') as HTMLImageElement | null
          if (img) top3.push(img.alt)
        }
      }
      // Determine the index(es) in the reel strip that match the first symbol to give position reference
      const strip = reels[c]
      const firstSym = top3[0]
      let idx = strip.indexOf(firstSym)
      parts.push(`R${c+1}[${idx>=0?idx: '?'}]: ${top3.join(',')}`)
    }
    log(`${label}: ${parts.join(' | ')}`)
  } catch(e){ /* ignore */ }
}

function renderWinLines(grid: string[][], lineWins: { lineIndex:number; symbol:string; count:number }[]) {
  slotEl.querySelectorAll('.cell').forEach(c=>c.classList.remove('win'))
  const overlay = document.getElementById('lineOverlay') as SVGSVGElement | null
  if (overlay) overlay.innerHTML=''
  const allLines = (window as any).slotLines as number[][] | undefined
  if (overlay && allLines) {
    for (const w of lineWins) {
      const pattern = allLines[w.lineIndex]
      const pts: string[] = []
      for (let reel=0; reel<w.count; reel++) {
        const row = pattern[reel]
        const x = reel*100 + reel*6 + 50
        const y = row*100 + row*6 + 50
        pts.push(`${x},${y}`)
      }
      const pl=document.createElementNS('http://www.w3.org/2000/svg','polyline')
      pl.setAttribute('points', pts.join(' '))
      pl.setAttribute('fill','none')
      pl.setAttribute('stroke','#ffeb3b')
      pl.setAttribute('stroke-width','6')
      pl.setAttribute('stroke-linecap','round')
      overlay.appendChild(pl)
    }
  }
  if (winLinesTimeout) window.clearTimeout(winLinesTimeout)
  winLinesTimeout = window.setTimeout(()=>clearWinLines(),5000)
}

function randomSymbol(): string {
  const keys = Object.keys(symbolImage)
  return keys[Math.floor(Math.random() * keys.length)]
}

// --- Physical Reel Scroll Implementation (ported from standalone) ---
import { reels } from '../config/reels'
function ensureReelTracks() {
  for (let c=0;c<5;c++) {
    let existing = slotEl.querySelector('#reelTrack_'+c)
    if (existing) existing.remove()
    const track = document.createElement('div')
    track.id='reelTrack_'+c
    Object.assign(track.style, { position:'absolute', left:(c*(100+6))+'px', top:'0', width:'100px', height:'312px', overflow:'hidden', pointerEvents:'none' })
    const inner = document.createElement('div')
    inner.className='stripInner'
    Object.assign(inner.style, { position:'absolute', top:'0', left:'0', width:'100%', willChange:'transform' })
    const stripSymbols = reels[c]
    const loop = stripSymbols.concat(stripSymbols.slice(0,6))
    loop.forEach(sym => {
      const holder = document.createElement('div')
      Object.assign(holder.style, { width:'100px', height:'100px', display:'flex', alignItems:'center', justifyContent:'center' })
      const img=document.createElement('img'); img.className='symbol-img'; img.src=symbolImage[sym]; img.alt=sym; holder.appendChild(img)
      inner.appendChild(holder)
    })
    track.appendChild(inner)
    slotEl.appendChild(track)
  }
}

function startSpin() {
  slotEl.querySelectorAll('.cell').forEach(c=>{ c.classList.remove('bounce','finalSharp','reducingBlur'); c.classList.add('blurFast') })
  ensureReelTracks()
  slotEl.querySelectorAll('.stripInner').forEach(t=>t.classList.add('blurFast'))
}

interface ReelController { decelerate(finalSymbols:string[], extraSlow:boolean): void }
const reelControllers = new Map<number, ReelController>()
function beginReelCycle(reelIndex:number): ReelController {
  const strip = reels[reelIndex]
  const track = slotEl.querySelector('#reelTrack_'+reelIndex + ' .stripInner') as HTMLDivElement | null
  if (!track) return { decelerate(){}} as ReelController
  const index = 0 // deterministic start index
  let speed = 2400
  let spinningActive = true
  let pos = -index*100
  const loopLen = strip.length + 6
  const animate = (lastTs:number) => {
    if (!spinningActive) return
    requestAnimationFrame(ts => {
      const dt = (ts - lastTs)/1000
      pos += speed*dt
      const totalHeight = loopLen*100
      if (pos > 0) pos -= totalHeight
      track.style.transform = `translateY(${pos}px)`
      if (speed < 1600 && speed > 600) track.classList.add('midDecel')
      animate(ts)
    })
  }
  requestAnimationFrame(ts=>animate(ts))
  return {
    decelerate(finalSymbols:string[], extraSlow:boolean){
      let landingIndex = strip.findIndex((sym,i)=> sym===finalSymbols[0] && strip[(i+1)%strip.length]===finalSymbols[1] && strip[(i+2)%strip.length]===finalSymbols[2])
      if (landingIndex<0) landingIndex = index
      const targetPos = -landingIndex*100
      const duration = extraSlow? 1400 : 780
      const startPos = pos
      const startSpeed = speed
      const startTime = performance.now()
      function easeOutCubic(t:number){ return 1 - Math.pow(1 - t, 3) }
      const step = () => {
        const now = performance.now(); const elapsed = now - startTime; const progress = Math.min(elapsed/duration,1); const eased = easeOutCubic(progress)
        pos = startPos*(1-eased) + targetPos*eased
        if (track.classList.contains('blurFast')) {
          const blurPx = 4 - 2.5*eased // 4px -> ~1.5px
          track.querySelectorAll('img').forEach(im=>{ (im as HTMLImageElement).style.filter = `blur(${Math.max(blurPx,1.5).toFixed(1)}px)` })
        }
        speed = startSpeed*(1-progress)
        track.style.transform = `translateY(${pos}px)`
        if (progress < 1) { requestAnimationFrame(step) } else {
          spinningActive=false
          track.style.transform = `translateY(${targetPos}px)`
          track.classList.remove('midDecel','blurFast')
          track.querySelectorAll('img').forEach(im=>{ (im as HTMLImageElement).style.filter='' })
          for (let row=0; row<3; row++) {
            const cell = slotEl.querySelector(`.cell[data-pos='${reelIndex}-${row}']`) as HTMLDivElement | null
            if (cell) {
              cell.classList.remove('anticipate','blurFast'); cell.innerHTML=''
              const finalSym = finalSymbols[row]
              const img = document.createElement('img'); img.className='symbol-img'; img.src=symbolImage[finalSym]; img.alt=finalSym; cell.appendChild(img)
              cell.classList.add('reducingBlur')
              requestAnimationFrame(()=>{ setTimeout(()=>{ cell.classList.remove('reducingBlur'); cell.classList.add('finalSharp','bounce') },90) })
            }
          }
        }
      }
      step()
    }
  }
}

async function spinOnce(manual = true, forcedBonus: boolean = false, forcedFreeSpins: boolean = false) {
  const FIXED_TOTAL_STAKE = 1; const LINES_COUNT = 25; const betPerLine = FIXED_TOTAL_STAKE / LINES_COUNT;
  const totalSpinBet = pendingFreeSpins > 0 ? 0 : FIXED_TOTAL_STAKE;
  if (totalSpinBet > balance && pendingFreeSpins === 0) {
    log('Insufficient balance')
    autoRemaining = 0
    updateButtons()
    return
  }
  if (spinning) return
  spinning = true
  startSpin()

  if (pendingFreeSpins === 0) balance -= totalSpinBet
  totalBet += totalSpinBet
  const res = performSpin({ betPerLine, isFreeSpin: pendingFreeSpins>0, forceBonusMin: forcedBonus ? 3 : undefined, forceScatterMin: forcedFreeSpins ? 3 : undefined })
  if (forcedBonus || forcedFreeSpins) {
    log(`Debug: grid scatters S12=${res.scatterCount} S13=${res.scatter2Count}`)
  }
  // If bonus pick present add to log (payout after resolution below)
  if ((res as any).bonusPickCount && (res as any).bonusPickCount > 0) {
    log(`Bonus Pick Triggered: ${ (res as any).bonusPickCount } picks (stake £${FIXED_TOTAL_STAKE.toFixed(2)})`)
  }

  // Begin physical reel cycles (all start fast immediately)
  for (let reel=0; reel<5; reel++) reelControllers.set(reel, beginReelCycle(reel))
  // Sequential deceleration with tease slowdown
  let teaseActivated = false
  let teaseStartReel = -1
  for (let reel = 0; reel < res.grid.length; reel++) {
    // Determine delay for this reel
    let targetDelay = SPIN_TIME_PER_REEL + reel * REEL_STAGGER
    if (teaseActivated && reel > teaseStartReel) {
      // Apply stronger slowdown after tease has triggered
      targetDelay += TEASE_EXTRA_DELAY_PER_REEL
    }
    // Execute delay
    await new Promise(r => setTimeout(r, targetDelay))
  reelControllers.get(reel)?.decelerate(res.grid[reel], teaseActivated && reel>teaseStartReel)
    // Evaluate tease possibility only if not yet activated and more reels remain
    if (!teaseActivated && reel < res.grid.length - 1) {
      let countFS = 0, countBonus = 0
      for (let c = 0; c <= reel; c++) {
        for (let r = 0; r < res.grid[c].length; r++) {
          const sym = res.grid[c][r]
          if (sym === 'S12') countFS++
          else if (sym === 'S13') countBonus++
        }
      }
      if (countFS === 2 || countBonus === 2) {
        teaseActivated = true
        teaseStartReel = reel
        log(`Tease: two ${countFS === 2 ? 'free spins' : 'bonus'} symbols landed – slowing remaining reels...`)
        // Apply an immediate dramatic pause before next reel starts
        await new Promise(r => setTimeout(r, TEASE_EXTRA_DELAY_FIRST))
        // Mid-spin glow effect: add anticipation class to existing scatter cells immediately
        slotEl.querySelectorAll('.cell').forEach(c=>c.classList.remove('anticipate'))
        for (let cIndex = 0; cIndex <= reel; cIndex++) {
          for (let rIndex = 0; rIndex < res.grid[cIndex].length; rIndex++) {
            const sym = res.grid[cIndex][rIndex]
            if (sym === 'S12' || sym === 'S13') {
              const cell = slotEl.querySelector(`.cell[data-pos='${cIndex}-${rIndex}']`)
              if (cell) cell.classList.add('anticipate','pulse')
            }
          }
        }
        // Play tease sound if provided
        const teaseAudio = document.getElementById('teaseSound') as HTMLAudioElement | null
        if (teaseAudio) { try { teaseAudio.currentTime = 0; teaseAudio.play().catch(()=>{}) } catch(e) {} }
      }
    }
  }

  // After determining final grid but before win resolution, log the top window landing symbols per reel
  logReelWindow('Spin Result Window')

  // After all reels decelerate, resolve wins
  spins++
  // highlight wins using existing renderGrid highlight logic (re-render grid fully with win markup)
  renderWinLines(res.grid, res.lineWins)
  // Anticipation glow: if exactly two scatters total (S12 + S13) and no feature already triggered that consumes them
  const totalScatters = res.scatterCount + res.scatter2Count
  slotEl.querySelectorAll('.cell').forEach(c=>c.classList.remove('anticipate'))
  if (totalScatters === 2 && (res.triggeredFreeSpins === 0) && ((res as any).bonusPickCount === 0)) {
    // Mark the cells containing S12 or S13
    for (let cIndex=0; cIndex<res.grid.length; cIndex++) {
      for (let rIndex=0; rIndex<res.grid[cIndex].length; rIndex++) {
        const sym = res.grid[cIndex][rIndex]
        if (sym === 'S12' || sym === 'S13') {
          const cell = slotEl.querySelector(`.cell[data-pos='${cIndex}-${rIndex}']`)
          if (cell) cell.classList.add('anticipate')
        }
      }
    }
  }
  balance += res.totalWin
  totalWin += res.totalWin
  lastWinEl.textContent = res.totalWin.toFixed(2)
  spinsEl.textContent = spins.toString()
  balanceEl.textContent = balance.toFixed(2)
  rtpEl.textContent = (totalWin / (totalBet||1) * 100).toFixed(2) + '%'

  // If both bonus pick and free spins trigger, play bonus first then queue FS
  const bonusCount = (res as any).bonusPickCount || 0
  const fsAward = res.triggeredFreeSpins || 0
  if (bonusCount > 0) {
    startPickGame(bonusCount, FIXED_TOTAL_STAKE)
  }
  // Suppress free spins if this was a forced bonus spin wanting ONLY bonus
  if (fsAward > 0 && !(forcedBonus && bonusCount > 0)) {
    pendingFreeSpins += fsAward
    log(`Free Spins Triggered: +${fsAward} (total ${pendingFreeSpins})`)
  } else if (fsAward > 0 && forcedBonus && bonusCount > 0) {
    log('Free Spins also landed but deferred until bonus completes')
    pendingFreeSpins += fsAward
  }

  if (pendingFreeSpins > 0 && bonusCount === 0 && !activePickGame) {
    pendingFreeSpins--
    fsState.classList.add('active')
    fsRemainEl.textContent = pendingFreeSpins.toString()
  } else {
    fsState.classList.remove('active')
  }

  spinning = false

  if (autoRemaining > 0) {
    autoRemaining--
    if (autoRemaining > 0) setTimeout(()=>spinOnce(false), 300)
  }
  updateButtons()
}

function updateButtons() {
  spinBtn.disabled = autoRemaining > 0 || spinning
  autoBtn.disabled = autoRemaining > 0 || spinning
}

function log(msg: string) {
  const line = document.createElement('div')
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`
  logEl.prepend(line)
}

spinBtn.addEventListener('click', () => {
  // Clear win lines immediately on manual spin start
  if (winLinesTimeout) { window.clearTimeout(winLinesTimeout); winLinesTimeout = null }
  clearWinLines()
  spinOnce()
});

autoBtn.addEventListener('click', () => {
  if (autoRemaining === 0) {
    autoRemaining = 50
    updateButtons()
    // Clear lines at start of auto sequence
    if (winLinesTimeout) { window.clearTimeout(winLinesTimeout); winLinesTimeout = null }
    clearWinLines()
    spinOnce(false)
  }
});

if (forceFSBtn) {
  forceFSBtn.addEventListener('click', () => {
    if (spinning) return
    log('Force: Attempting free spins spin (>=3 B)')
    spinOnce(false, false, true)
  })
}

if (forceBonusBtn) {
  forceBonusBtn.addEventListener('click', () => {
    if (spinning) return
    log('Force: Attempting bonus spin (>=3 B2)')
    spinOnce(false, true, false)
  })
}

// Expose lines for highlight
(window as any).slotLines = lines

initGrid(); seedInitialWindow(); renderWinLines([], [])

// Timing controls (if present in DOM)
const baseReelMs = document.getElementById('baseReelMs') as HTMLInputElement | null
const staggerMs = document.getElementById('staggerMs') as HTMLInputElement | null
const teaseFirstMs = document.getElementById('teaseFirstMs') as HTMLInputElement | null
const teasePerMs = document.getElementById('teasePerMs') as HTMLInputElement | null
const baseReelMsVal = document.getElementById('baseReelMsVal') as HTMLElement | null
const staggerMsVal = document.getElementById('staggerMsVal') as HTMLElement | null
const teaseFirstMsVal = document.getElementById('teaseFirstMsVal') as HTMLElement | null
const teasePerMsVal = document.getElementById('teasePerMsVal') as HTMLElement | null
const timingResetBtn = document.getElementById('timingReset') as HTMLButtonElement | null

function updateTimingDisplay() {
  if (baseReelMsVal) baseReelMsVal.textContent = SPIN_TIME_PER_REEL + 'ms'
  if (staggerMsVal) staggerMsVal.textContent = REEL_STAGGER + 'ms'
  if (teaseFirstMsVal) teaseFirstMsVal.textContent = TEASE_EXTRA_DELAY_FIRST + 'ms'
  if (teasePerMsVal) teasePerMsVal.textContent = TEASE_EXTRA_DELAY_PER_REEL + 'ms'
}
if (baseReelMs) baseReelMs.addEventListener('input', () => { SPIN_TIME_PER_REEL = parseInt(baseReelMs.value,10); updateTimingDisplay() })
if (staggerMs) staggerMs.addEventListener('input', () => { REEL_STAGGER = parseInt(staggerMs.value,10); updateTimingDisplay() })
if (teaseFirstMs) teaseFirstMs.addEventListener('input', () => { TEASE_EXTRA_DELAY_FIRST = parseInt(teaseFirstMs.value,10); updateTimingDisplay() })
if (teasePerMs) teasePerMs.addEventListener('input', () => { TEASE_EXTRA_DELAY_PER_REEL = parseInt(teasePerMs.value,10); updateTimingDisplay() })
if (timingResetBtn) timingResetBtn.addEventListener('click', () => {
  SPIN_TIME_PER_REEL = 280; REEL_STAGGER = 120; TEASE_EXTRA_DELAY_FIRST = 900; TEASE_EXTRA_DELAY_PER_REEL = 450
  if (baseReelMs) baseReelMs.value = '280'
  if (staggerMs) staggerMs.value = '120'
  if (teaseFirstMs) teaseFirstMs.value = '900'
  if (teasePerMs) teasePerMs.value = '450'
  updateTimingDisplay()
})
updateTimingDisplay()

// Expose for console tweaking
;(window as any).slotTiming = {
  setBase(v:number){ SPIN_TIME_PER_REEL = v; updateTimingDisplay() },
  setStagger(v:number){ REEL_STAGGER = v; updateTimingDisplay() },
  setTeasePause(v:number){ TEASE_EXTRA_DELAY_FIRST = v; updateTimingDisplay() },
  setTeasePer(v:number){ TEASE_EXTRA_DELAY_PER_REEL = v; updateTimingDisplay() }
}

// --- Bonus Pick Game UI Logic ---
function startPickGame(picksAllowed: number, baseBet: number) {
  if (!pickModal || !pickGrid || !pickInfo || !pickSummary) return
  activePickGame = createBonusPickBoard(picksAllowed, baseBet)
  pickInfo.textContent = `(Pick ${picksAllowed} of 6)`
  pickSummary.textContent = ''
  // Build cells
  pickGrid.innerHTML = ''
  activePickGame.board.forEach(cell => {
    const btn = document.createElement('button')
    btn.textContent = '?' // hidden state
    btn.style.height = '80px'
    btn.style.fontSize = '1.2rem'
    btn.style.fontWeight = '600'
    btn.style.background = '#333'
    btn.style.border = '2px solid #555'
    btn.style.borderRadius = '8px'
    btn.dataset.index = cell.index.toString()
    btn.addEventListener('click', () => onPickCell(cell.index, btn))
    pickGrid.appendChild(btn)
  })
  pickModal.style.display = 'flex'
}

function onPickCell(index: number, btn: HTMLButtonElement) {
  if (!activePickGame) return
  const beforePicks = activePickGame.picksMade
  activePickGame = pickBonusSquare(activePickGame, index)
  if (activePickGame.picksMade === beforePicks) return // no change (already picked or finished)
  // Reveal this cell
  const cell = activePickGame.board.find(c=>c.index===index)!
  btn.textContent = 'x' + cell.multiplier
  btn.style.background = '#ff4fa3'
  btn.style.borderColor = '#ff4fa3'
  btn.disabled = true
  updatePickSummary()
  if (activePickGame.complete) finalizePickGame()
}

function updatePickSummary() {
  if (!activePickGame || !pickSummary) return
  pickSummary.textContent = `Revealed: ${activePickGame.revealedMultipliers.map(m=>'x'+m).join(' + ')} = x${activePickGame.totalMultiplier}`
}

function finalizePickGame() {
  if (!activePickGame) return
  // Apply win to balance
  balance += activePickGame.win
  totalWin += activePickGame.win
  lastWinEl.textContent = (parseFloat(lastWinEl.textContent||'0') + activePickGame.win).toFixed(2)
  balanceEl.textContent = balance.toFixed(2)
  rtpEl.textContent = (totalWin / (totalBet||1) * 100).toFixed(2) + '%'
  log(`Bonus Pick Complete: picks=${activePickGame.picksAllowed} multipliers=[${activePickGame.revealedMultipliers.join(',')}] totalMult=x${activePickGame.totalMultiplier} win=${activePickGame.win.toFixed(2)}`)
  showBonusWinners(activePickGame)
  // If free spins are queued, start consuming immediately
  if (pendingFreeSpins > 0) {
    fsState.classList.add('active')
    fsRemainEl.textContent = pendingFreeSpins.toString()
    // Kick off next spin automatically after panel closes
    setTimeout(() => {
      if (pendingFreeSpins > 0) spinOnce(false)
    }, 5200)
  }
}
function showBonusWinners(result: BonusPickOutcome) {
  if (!bonusWinPanel || !bonusWinDetails) return
  bonusWinDetails.innerHTML = `You picked <strong>${result.picksAllowed}</strong> square(s)<br>Multipliers: ${result.revealedMultipliers.map(m=>'x'+m).join(' + ')} = <strong>x${result.totalMultiplier}</strong><br>Bonus Win: <strong>${result.win.toFixed(2)}</strong>`
  bonusWinPanel.style.display = 'flex'
  setTimeout(() => closeBonusPanel(), 5000)
}

function closeBonusPanel() {
  if (!bonusWinPanel) return
  bonusWinPanel.style.display = 'none'
  if (pickModal && pickModal.style.display !== 'none') pickModal.style.display = 'none'
  activePickGame = null
}

if (bonusWinCloseBtn) {
  bonusWinCloseBtn.addEventListener('click', () => closeBonusPanel())
}

if (pickCloseBtn) {
  pickCloseBtn.addEventListener('click', () => {
    if (!pickModal) return
    pickModal.style.display = 'none'
    activePickGame = null
  })
}

if (pickRevealRestBtn) {
  pickRevealRestBtn.addEventListener('click', () => {
    if (!activePickGame || !pickGrid) return
    // Reveal all remaining but do not affect win
    activePickGame.board.forEach(cell => {
      if (!cell.picked) {
        const btn = pickGrid.querySelector(`button[data-index='${cell.index}']`) as HTMLButtonElement | null
        if (btn) {
          btn.textContent = 'x' + cell.multiplier
          btn.style.background = '#222'
          btn.style.borderColor = '#444'
          btn.disabled = true
        }
      }
    })
  })
}
