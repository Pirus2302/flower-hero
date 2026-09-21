/* Bouquet of real flowers, opened by the hand.
 *
 * The art direction lives in CONFIG — the scene itself never hard-codes a colour,
 * an angle or a speed. Every stem is the same photographed alstroemeria, keyed off
 * black and scrubbed through 44 frames of a real timelapse; a stem's own frame is
 * picked from the shared openness, so the outer ones lag behind the middle and the
 * bouquet unfurls instead of switching on.
 */

export const CONFIG = {
  frames: 44,
  framePath: '../assets/bloom/',
  frameW: 760, frameH: 665,
  pivotX: 44, pivotY: 665,        // where the cut stem meets the bottom of its frame
  imageLean: 32,                  // degrees the photographed stem already leans right

  stemWidth: 0.255,               // widest stem, as a share of the viewport width
  anchorX: 0.5, anchorY: 1.02,    // the hand that holds them, in viewport units
  gatherX: 0.012, gatherY: 0.02,  // how loosely the stems are gathered there

  fanClosed: 0.17,                // share of the open fan the bouquet keeps when shut
  lift: 0.035,                    // how far the whole bunch rises as it opens
  grow: 0.06,                     // and how much bigger it reads

  swaySpeed: 0.42, swayAmount: 1.0,   // degrees
  blurScale: 1,                       // 0 drops the depth blur (software rendering, screenshots)
  parallax: 0.02, leanToPointer: 2.2, // degrees

  openPerPixel: 0.00135, closeRate: 0.13, openDamp: 2.8,
  entrance: 1.25,
  shadowColor: '#c9c3b6', shadowAlpha: 0, shadowWidth: 0.42, shadowHeight: 0.05
}

/* back to front: apparent angle closed/open, scale, opacity, depth blur, hue shift,
 * how late this stem starts blooming, and where it sits in the gathered bunch */
const STEMS = [
  { a0: -11, a1: -58, s: 0.70, alpha: 0.58, blur: 3.2, hue: 0, delay: 0.42, dx: -0.10, dy: 0.012 },
  { a0: 12, a1: 57, s: 0.68, alpha: 0.56, blur: 3.2, hue: 0, delay: 0.46, dx: 0.11, dy: 0.016 },
  { a0: -6, a1: -30, s: 0.66, alpha: 0.72, blur: 0, hue: 0, delay: 0.34, dx: -0.03, dy: 0.030 },
  { a0: 7, a1: 33, s: 0.64, alpha: 0.70, blur: 0, hue: 0, delay: 0.38, dx: 0.04, dy: 0.034 },
  { a0: -8, a1: -41, s: 0.85, alpha: 0.90, blur: 0, hue: 0, delay: 0.24, dx: -0.05, dy: 0.004 },
  { a0: 9, a1: 43, s: 0.87, alpha: 0.90, blur: 0, hue: 0, delay: 0.28, dx: 0.06, dy: 0.006 },
  { a0: -4, a1: -15, s: 0.78, alpha: 0.95, blur: 0, hue: 0, delay: 0.19, dx: -0.015, dy: 0.052 },
  { a0: 5, a1: 18, s: 0.76, alpha: 0.95, blur: 0, hue: 0, delay: 0.22, dx: 0.02, dy: 0.056 },
  { a0: -5, a1: -22, s: 0.96, alpha: 1, blur: 0, hue: 0, delay: 0.11, dx: -0.02, dy: 0 },
  { a0: 6, a1: 24, s: 0.98, alpha: 1, blur: 0, hue: 0, delay: 0.15, dx: 0.03, dy: 0.002 },
  { a0: 1, a1: 3, s: 1.08, alpha: 1, blur: 0, hue: 0, delay: 0, dx: 0, dy: -0.006 }
]

const clamp = (v, a, b) => v < a ? a : v > b ? b : v
const lerp = (a, b, t) => a + (b - a) * t
const RAD = Math.PI / 180

export function initBloom (canvas, overrides = {}) {
  const cfg = { ...CONFIG, ...overrides }
  const ctx = canvas.getContext('2d')
  const canBlur = typeof ctx.filter === 'string'
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const noHover = matchMedia('(hover: none)').matches

  let w = 0, h = 0, dpr = 1
  let openness = reduced ? 1 : 0, target = openness
  let aimX = 0, aimY = 0, lastX = null, lastY = null
  let born = -1, alive = true, ready = false

  /* ---- the timelapse ---- */
  const images = []
  let loaded = 0
  for (let i = 0; i < cfg.frames; i++) {
    const img = new Image()
    img.decoding = 'async'
    img.onload = img.onerror = () => {
      loaded++
      overrides.onProgress && overrides.onProgress(loaded / cfg.frames)
      if (loaded === cfg.frames) start()
    }
    img.src = cfg.framePath + String(i).padStart(2, '0') + '.webp'
    images.push(img)
  }

  function resize () {
    dpr = Math.min(devicePixelRatio || 1, 2)
    w = canvas.clientWidth; h = canvas.clientHeight
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function frameFor (stem, o) {
    const t = clamp((o - stem.delay) / (1 - stem.delay), 0, 1)
    return images[Math.min(cfg.frames - 1, Math.round(t * (cfg.frames - 1)))]
  }

  function draw (now) {
    const o = openness
    const birth = born < 0 ? 0 : clamp((now - born) / 1000 / cfg.entrance, 0, 1)
    const entr = reduced ? 1 : birth * birth * (3 - 2 * birth)

    ctx.clearRect(0, 0, w, h)

    const unit = w * cfg.stemWidth / cfg.frameW           // one image pixel, on screen
    const ax = w * (cfg.anchorX + aimX * cfg.parallax)
    const ay = h * (cfg.anchorY - cfg.lift * o) + (1 - entr) * h * 0.06 + aimY * h * cfg.parallax * 0.4
    const bunch = 1 + cfg.grow * o

    if (cfg.shadowAlpha > 0) {
      const g = ctx.createRadialGradient(ax, h * 0.985, 0, ax, h * 0.985, w * cfg.shadowWidth * 0.5)
      g.addColorStop(0, cfg.shadowColor); g.addColorStop(1, 'rgba(201,195,182,0)')
      ctx.save()
      ctx.globalAlpha = cfg.shadowAlpha * entr * (0.45 + 0.55 * o)
      ctx.translate(ax, h * 0.985); ctx.scale(1, cfg.shadowHeight / cfg.shadowWidth); ctx.translate(-ax, -h * 0.985)
      ctx.fillStyle = g
      ctx.fillRect(ax - w * cfg.shadowWidth, h * 0.985 - w * cfg.shadowWidth, w * cfg.shadowWidth * 2, w * cfg.shadowWidth * 2)
      ctx.restore()
    }

    const t = now / 1000
    for (let i = 0; i < STEMS.length; i++) {
      const stem = STEMS[i]
      const img = frameFor(stem, o)
      if (!img || !img.width) continue

      const open = lerp(cfg.fanClosed, 1, o)
      const sway = reduced ? 0 : Math.sin(t * cfg.swaySpeed + i * 1.7) * cfg.swayAmount * (0.35 + 0.65 * o)
      const angle = lerp(stem.a0, stem.a1, open) + sway + aimX * cfg.leanToPointer
      const mirror = angle < 0 ? -1 : 1
      const scale = unit * stem.s * bunch * lerp(0.94, 1, entr)

      ctx.save()
      ctx.globalAlpha = stem.alpha * entr
      const blur = stem.blur * cfg.blurScale
      if (canBlur && (blur || stem.hue)) {
        const parts = []
        if (blur) parts.push(`blur(${blur}px)`)
        if (stem.hue) parts.push(`hue-rotate(${stem.hue}deg)`)
        ctx.filter = parts.join(' ')
      }
      ctx.translate(ax + w * stem.dx * open, ay + h * stem.dy)
      ctx.rotate((angle - cfg.imageLean * mirror) * RAD)
      ctx.scale(scale * mirror, scale)
      ctx.drawImage(img, -cfg.pivotX, -cfg.pivotY)
      ctx.restore()
    }
    if (canBlur) ctx.filter = 'none'
  }

  let last = performance.now()
  function loop (now) {
    if (!alive) return
    const dt = Math.min((now - last) / 1000, 0.05); last = now

    if (noHover && !reduced) target += 0.42 * dt              // no cursor: it opens on its own
    if (!reduced) target = clamp(target - cfg.closeRate * dt, 0, 1)
    openness += (target - openness) * Math.min(1, cfg.openDamp * dt)

    draw(now)
    if (born < 0) { born = now; ready = true; overrides.onReady && overrides.onReady() }
    requestAnimationFrame(loop)
  }

  function start () {
    resize()
    requestAnimationFrame(loop)
  }

  function onMove (e) {
    const x = e.clientX, y = e.clientY
    aimX = (x / w - 0.5) * 2; aimY = (y / h - 0.5) * 2
    if (lastX !== null && !reduced) {
      const d = Math.hypot(x - lastX, y - lastY)
      target = clamp(target + d * cfg.openPerPixel, 0, 1)
    }
    lastX = x; lastY = y
  }

  addEventListener('pointermove', onMove, { passive: true })
  addEventListener('resize', resize)

  return {
    config: cfg,
    get openness () { return openness },
    get ready () { return ready },
    bloom (amount) { target = clamp(amount, 0, 1) },
    travel (px) { target = clamp(target + px * cfg.openPerPixel, 0, 1) },
    dispose () {
      alive = false
      removeEventListener('pointermove', onMove)
      removeEventListener('resize', resize)
    }
  }
}
