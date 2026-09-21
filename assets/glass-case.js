/* The flower fridge, seen through fogged glass.
 *
 * Two stacked canvases: the shelf, drawn once, and the glass over it. Wiping erases
 * the glass where the hand went; the glass breathes back a little every frame, so a
 * cleared patch closes on its own. Condensation runs down and carves clear trails.
 * All of the art direction lives in CONFIG.
 */

export const CONFIG = {
  cols: 4, rows: 2, gap: 14,        // the shelf behind the glass
  shelfColor: '#d8d3c0',

  fogColor: '#eeece4', fogAlpha: 0.66,   // the glass
  blur: 18, grain: 0.055, streaks: 0.5,

  brush: 92, brushSoft: 0.52,       // the hand
  refog: 0.0042,                    // how fast the glass closes again
  autoWipe: 0.34,                   // stroke length per second when there is no cursor

  drops: 7, dropSize: 4.5, dropSpeed: 20, dropWobble: 9,

  ink: '#14130f', paper: '#f4f2ed', accent: '#c40f2e',
  labelSize: 15, priceSize: 12
}

const clamp = (v, a, b) => v < a ? a : v > b ? b : v

export function initGlass (canvasWall, canvasGlass, items, overrides = {}) {
  const cfg = { ...CONFIG, ...overrides }
  const wall = canvasWall.getContext('2d')
  const glass = canvasGlass.getContext('2d')
  const fog = document.createElement('canvas').getContext('2d')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const noHover = matchMedia('(hover: none)').matches

  let w = 0, h = 0, dpr = 1, alive = true, ready = false
  let lastX = null, lastY = null, cleared = 0
  let autoT = 0
  const drops = []

  /* ---- the photographs on the shelf ---- */
  const images = []
  let loaded = 0
  items.forEach((item, i) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = img.onerror = () => {
      loaded++
      overrides.onProgress && overrides.onProgress(loaded / items.length)
      if (loaded === items.length) start()
    }
    img.src = item.src
    images[i] = img
  })

  function cell (i) {
    const cw = (w - cfg.gap * (cfg.cols - 1)) / cfg.cols
    const ch = (h - cfg.gap * (cfg.rows - 1)) / cfg.rows
    const cx = i % cfg.cols, cy = Math.floor(i / cfg.cols) % cfg.rows
    return { x: cx * (cw + cfg.gap), y: cy * (ch + cfg.gap), w: cw, h: ch }
  }

  function drawWall () {
    wall.setTransform(dpr, 0, 0, dpr, 0, 0)
    wall.fillStyle = cfg.shelfColor
    wall.fillRect(0, 0, w, h)

    const total = cfg.cols * cfg.rows
    for (let i = 0; i < total; i++) {
      const c = cell(i)
      const img = images[i % images.length]
      if (img && img.width) {
        const scale = Math.max(c.w / img.width, c.h / img.height)
        const dw = img.width * scale, dh = img.height * scale
        wall.save()
        wall.beginPath(); wall.rect(c.x, c.y, c.w, c.h); wall.clip()
        wall.drawImage(img, c.x + (c.w - dw) / 2, c.y + (c.h - dh) / 2, dw, dh)
        wall.restore()
      }

      const item = items[i % items.length]
      const padX = 18, baseY = c.y + c.h - 20
      wall.save()
      wall.shadowColor = 'rgba(0,0,0,.35)'; wall.shadowBlur = 16
      wall.fillStyle = cfg.paper
      wall.font = `500 ${cfg.labelSize}px Cormorant, Georgia, serif`
      wall.fillText(item.name, c.x + padX, baseY - cfg.priceSize - 6)
      wall.font = `800 ${cfg.priceSize}px Manrope, system-ui, sans-serif`
      wall.fillText(item.price, c.x + padX, baseY)
      wall.restore()
    }
  }

  function buildFog () {
    fog.canvas.width = canvasGlass.width; fog.canvas.height = canvasGlass.height
    fog.setTransform(dpr, 0, 0, dpr, 0, 0)
    fog.clearRect(0, 0, w, h)

    if (typeof fog.filter === 'string') fog.filter = `blur(${cfg.blur}px)`
    fog.drawImage(canvasWall, 0, 0, w, h)
    fog.filter = 'none'

    fog.globalAlpha = cfg.fogAlpha
    fog.fillStyle = cfg.fogColor
    fog.fillRect(0, 0, w, h)
    fog.globalAlpha = 1

    /* the grain and the old streaks that never quite wipe off */
    for (let i = 0; i < w * h * cfg.grain / 90; i++) {
      const x = Math.random() * w, y = Math.random() * h
      fog.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.05})`
      fog.fillRect(x, y, 1.6, 1.6)
    }
    for (let i = 0; i < cfg.streaks * 18; i++) {
      const x = Math.random() * w, y = Math.random() * h
      const len = 40 + Math.random() * 190
      fog.strokeStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.05})`
      fog.lineWidth = 6 + Math.random() * 22
      fog.lineCap = 'round'
      fog.beginPath(); fog.moveTo(x, y); fog.lineTo(x + (Math.random() - 0.5) * 60, y + len); fog.stroke()
    }
  }

  function resize () {
    dpr = Math.min(devicePixelRatio || 1, 2)
    w = canvasGlass.clientWidth; h = canvasGlass.clientHeight
    for (const c of [canvasWall, canvasGlass]) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr)
    }
    drawWall()
    buildFog()
    glass.setTransform(dpr, 0, 0, dpr, 0, 0)
    glass.clearRect(0, 0, w, h)
    glass.drawImage(fog.canvas, 0, 0, w, h)
    cleared = 0
    drops.length = 0
    for (let i = 0; i < cfg.drops; i++) spawnDrop(Math.random() * h)
  }

  function spawnDrop (y) {
    drops.push({
      x: Math.random() * w,
      y: y === undefined ? -20 : y,
      r: cfg.dropSize * (0.5 + Math.random()),
      v: cfg.dropSpeed * (0.45 + Math.random() * 1.1),
      p: Math.random() * 6.28
    })
  }

  function erase (x, y, r, soft) {
    const g = glass.createRadialGradient(x, y, r * soft, x, y, r)
    g.addColorStop(0, 'rgba(0,0,0,1)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    glass.globalCompositeOperation = 'destination-out'
    glass.fillStyle = g
    glass.beginPath(); glass.arc(x, y, r, 0, 6.2832); glass.fill()
    glass.globalCompositeOperation = 'source-over'
  }

  function wipe (x, y) {
    if (lastX === null) { erase(x, y, cfg.brush, cfg.brushSoft); lastX = x; lastY = y; return }
    const d = Math.hypot(x - lastX, y - lastY)
    const steps = Math.max(1, Math.ceil(d / (cfg.brush * 0.28)))
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      erase(lastX + (x - lastX) * t, lastY + (y - lastY) * t, cfg.brush, cfg.brushSoft)
    }
    cleared = clamp(cleared + d / (w * 0.9), 0, 1)
    lastX = x; lastY = y
  }

  let last = performance.now()
  function loop (now) {
    if (!alive) return
    const dt = Math.min((now - last) / 1000, 0.05); last = now

    /* the glass breathes back */
    if (!reduced) {
      glass.globalAlpha = cfg.refog * (dt * 60)
      glass.drawImage(fog.canvas, 0, 0, w, h)
      glass.globalAlpha = 1
      cleared = clamp(cleared - dt * 0.12, 0, 1)
    }

    /* condensation running down */
    for (const drop of drops) {
      drop.y += drop.v * dt
      drop.x += Math.sin(now / 900 + drop.p) * cfg.dropWobble * dt
      erase(drop.x, drop.y, drop.r, 0.06)
      if (drop.y > h + 30) { drop.y = -20; drop.x = Math.random() * w; drop.v = cfg.dropSpeed * (0.45 + Math.random() * 1.1) }
    }

    /* no cursor: a hand wipes it for you */
    if ((noHover || reduced) && cfg.autoWipe) {
      autoT += dt * cfg.autoWipe
      wipe(w * (0.5 + 0.42 * Math.sin(autoT * 2.1)), h * (0.5 + 0.30 * Math.cos(autoT * 1.35)))
    }

    if (!ready) { ready = true; overrides.onReady && overrides.onReady() }
    requestAnimationFrame(loop)
  }

  function start () {
    resize()
    requestAnimationFrame(loop)
  }

  function onMove (e) { wipe(e.clientX, e.clientY) }
  function onLeave () { lastX = lastY = null }

  addEventListener('pointermove', onMove, { passive: true })
  addEventListener('pointerleave', onLeave)
  addEventListener('resize', resize)

  return {
    config: cfg,
    get cleared () { return cleared },
    get ready () { return ready },
    dispose () {
      alive = false
      removeEventListener('pointermove', onMove)
      removeEventListener('pointerleave', onLeave)
      removeEventListener('resize', resize)
    }
  }
}
