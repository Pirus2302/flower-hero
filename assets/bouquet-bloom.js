/* ============================================================
   SCENE - BOUQUET BLOOM
   An original GetLayers-contract scene authored for the flower
   hero: a wrapped bouquet that stands closed as a tight bud and
   unfurls, layer by layer, from the TRAVEL of the pointer.
   Stop moving and it slowly folds back.

   House contract: every art-direction value lives in CONFIG.
   Colours are '#rrggbb' strings, everything else is a number.
   Tint by editing CONFIG, never the material code.
============================================================ */
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export const CONFIG = {
  /* ---- colour ---- */
  bgColor:      '#edeae2',   // paper ground (Halden paper)
  petalDeep:    '#a80c24',   // the flower red at the heart of a petal
  petalLight:   '#f7c9cf',   // blush at the petal rim
  petalCream:   '#f7f2ea',   // the pale heads that break up the red
  coreColor:    '#e8b23c',   // pollen core
  stemColor:    '#5c7350',   // stems
  leafColor:    '#6f8a5c',   // leaves in the collar
  ribbonColor:  '#c8b89a',   // ribbon band
  shadowColor:  '#c9c3b6',   // contact shadow on the paper

  /* ---- bouquet build (structural - change needs a rebuild) ---- */
  heads:          13,        // flower heads in the bouquet
  layers:         3,         // petal rings per head
  petalsPerLayer: 9,         // petals in the outer ring
  leaves:         14,        // leaves in the collar

  /* ---- shape ---- */
  headRadius:     1.40,      // how wide the open bouquet spreads
  budRadius:      0.20,      // how tight the closed bud packs
  headSize:       0.66,      // scale of one flower head
  petalLength:    1.00,      // petal length multiplier
  petalWidth:     0.62,      // petal width multiplier
  petalCup:       0.30,      // how cupped a petal is
  petalArc:       0.34,      // how much a petal arcs backwards

  /* ---- the bloom itself ---- */
  openClosed:     10,        // petal tilt in degrees when closed
  openFull:       82,        // petal tilt in degrees when fully open
  layerStagger:   0.30,      // how late the inner rings start opening
  headStagger:    0.45,      // how late the far heads start opening
  scaleClosed:    0.52,      // petal scale when closed

  /* ---- interaction ---- */
  openPerPixel:   0.0016,    // how much pointer travel opens the bouquet
  closeRate:      0.16,      // how fast it folds back when the hand stops
  openDamp:       2.6,       // smoothing of the opening (higher = snappier)
  leanAmount:     0.10,      // how far the bouquet leans toward the cursor
  parallax:       0.30,      // camera drift with the cursor

  /* ---- idle motion ---- */
  swaySpeed:      0.55,      // breathing speed
  swayAmount:     0.045,     // breathing amplitude
  spinIdle:       0.045,     // slow turn of the whole bouquet

  /* ---- staging ---- */
  camDist:        6.60,      // camera distance
  camHeight:      0.25,      // camera height
  lookY:         -0.20,      // what the camera is aimed at (lower = bouquet sits higher)
  fov:            34,        // lens
  exposure:       0.95,      // tone-mapping exposure
  entrance:       1.60,      // seconds of the entrance rise
  stemBase:      -2.05       // where the stems are gathered
}

const DEG = Math.PI / 180
const hex = h => new THREE.Color(h)

/* ---------- petal geometry: a cupped, back-arcing blade ---------- */
function buildPetal(cfg) {
  const NU = 16, NV = 9
  const pos = [], idx = [], uv = []
  for (let i = 0; i <= NU; i++) {
    const u = i / NU
    const w = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 0.75) * cfg.petalWidth * 0.5
    for (let j = 0; j <= NV; j++) {
      const v = (j / NV) * 2 - 1
      const x = v * w
      const y = u * cfg.petalLength
      // arc backwards along the length + cup across the width
      const z = -cfg.petalArc * u * u + cfg.petalCup * v * v * (0.35 + 0.65 * u)
      pos.push(x, y, z); uv.push(j / NV, u)
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
    const a = i * (NV + 1) + j, b = a + NV + 1
    idx.push(a, b, a + 1, b, b + 1, a + 1)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function buildLeaf() {
  const NU = 10, NV = 5
  const pos = [], idx = [], uv = []
  for (let i = 0; i <= NU; i++) {
    const u = i / NU
    const w = Math.sin(Math.PI * Math.pow(u, 0.7)) * 0.13
    for (let j = 0; j <= NV; j++) {
      const v = (j / NV) * 2 - 1
      pos.push(v * w, u * 0.82, -0.26 * u * u + 0.09 * v * v * u)
      uv.push(j / NV, u)
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
    const a = i * (NV + 1) + j, b = a + NV + 1
    idx.push(a, b, a + 1, b, b + 1, a + 1)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx); g.computeVertexNormals()
  return g
}

/* ---------- contact shadow texture ---------- */
function shadowTexture(color) {
  const c = document.createElement('canvas'); c.width = c.height = 256
  const x = c.getContext('2d')
  const g = x.createRadialGradient(128, 128, 8, 128, 128, 126)
  const col = new THREE.Color(color)
  const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`
  g.addColorStop(0, `rgba(${rgb},0.62)`); g.addColorStop(0.45, `rgba(${rgb},0.26)`); g.addColorStop(1, `rgba(${rgb},0)`)
  x.fillStyle = g; x.fillRect(0, 0, 256, 256)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

/* ---------- the scene ---------- */
class Bouquet {
  constructor(scene, cfg) {
    this.cfg = cfg
    this.root = new THREE.Group()
    scene.add(this.root)
    this.open = 0
    this.target = 0
    this.time = 0
    this.pointer = new THREE.Vector2(0, 0)
    this.build()
  }

  build() {
    const cfg = this.cfg
    const root = this.root
    while (root.children.length) root.remove(root.children[0])

    /* heads: closed spire vs open dome */
    this.heads = []
    for (let i = 0; i < cfg.heads; i++) {
      const t = (i + 0.5) / cfg.heads
      // fibonacci-ish dome for the open state
      const phi = i * 2.399963
      const r = cfg.headRadius * Math.sqrt(t) * 0.92
      const openPos = new THREE.Vector3(Math.cos(phi) * r, 0.10 + (1 - t) * 0.80, Math.sin(phi) * r * 0.86)
      const openAxis = new THREE.Vector3(openPos.x * 0.62, 0.9 - t * 0.25, openPos.z * 0.62).normalize()
      // tight spire for the closed state
      const budPos = new THREE.Vector3(Math.cos(phi) * cfg.budRadius * (0.3 + t * 0.7),
                                       0.42 + (1 - t) * 0.34,
                                       Math.sin(phi) * cfg.budRadius * (0.3 + t * 0.7))
      const budAxis = new THREE.Vector3(openPos.x * 0.10, 1, openPos.z * 0.10).normalize()
      this.heads.push({
        openPos, openAxis, budPos, budAxis,
        delay: t * cfg.headStagger,
        phase: i * 1.7,
        cream: i % 4 === 1,
        tone: (i * 0.37) % 1
      })
    }

    /* petals - one instanced mesh for the whole bouquet */
    this.petalSpec = []
    for (let h = 0; h < cfg.heads; h++) {
      for (let l = 0; l < cfg.layers; l++) {
        const n = Math.max(4, Math.round(cfg.petalsPerLayer - l * 2))
        for (let p = 0; p < n; p++) {
          this.petalSpec.push({
            head: h, layer: l,
            az: (p / n) * Math.PI * 2 + l * 0.55 + h * 0.31,
            rand: Math.sin(h * 12.9898 + l * 78.233 + p * 37.719) * 0.5 + 0.5
          })
        }
      }
    }
    const petalGeo = buildPetal(cfg)
    const petalMat = new THREE.MeshPhysicalMaterial({
      side: THREE.DoubleSide, roughness: 0.46, metalness: 0.0,
      sheen: 0.30, sheenRoughness: 0.55, sheenColor: new THREE.Color('#ffffff'),
      clearcoat: 0.12, clearcoatRoughness: 0.6
    })
    this.petals = new THREE.InstancedMesh(petalGeo, petalMat, this.petalSpec.length)
    this.petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.petals.frustumCulled = false
    root.add(this.petals)

    /* per-petal colour: deep at the heart, blush at the rim, cream heads */
    const col = new THREE.Color()
    const deep = hex(cfg.petalDeep), light = hex(cfg.petalLight), cream = hex(cfg.petalCream)
    this.petalSpec.forEach((s, i) => {
      const head = this.heads[s.head]
      const k = s.layer / Math.max(1, cfg.layers - 1)          // 0 outer -> 1 inner
      if (head.cream) col.copy(cream).lerp(light, 0.22 + k * 0.30)
      else col.copy(deep).lerp(light, 0.04 + k * 0.40 * (0.35 + head.tone))
      this.petals.setColorAt(i, col)
    })
    if (this.petals.instanceColor) this.petals.instanceColor.needsUpdate = true

    /* pollen cores */
    this.cores = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.09, 14, 10),
      new THREE.MeshStandardMaterial({ color: hex(cfg.coreColor), roughness: 0.75 }),
      cfg.heads)
    this.cores.frustumCulled = false
    root.add(this.cores)

    /* stems */
    this.stems = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.022, 0.032, 1, 7, 1, true),
      new THREE.MeshStandardMaterial({ color: hex(cfg.stemColor), roughness: 0.8, side: THREE.DoubleSide }),
      cfg.heads)
    this.stems.frustumCulled = false
    root.add(this.stems)

    /* leaf collar */
    this.leafSpec = []
    for (let i = 0; i < cfg.leaves; i++) {
      this.leafSpec.push({ az: (i / cfg.leaves) * Math.PI * 2 + 0.4, rand: (i * 0.53) % 1 })
    }
    this.leaves = new THREE.InstancedMesh(
      buildLeaf(),
      new THREE.MeshStandardMaterial({ color: hex(cfg.leafColor), roughness: 0.78, side: THREE.DoubleSide }),
      this.leafSpec.length)
    this.leaves.frustumCulled = false
    root.add(this.leaves)

    /* the tie - a hand-tied bunch, no paper cup */
    const ribbon = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.028, 8, 24),
      new THREE.MeshStandardMaterial({ color: hex(cfg.ribbonColor), roughness: 0.7 })
    )
    ribbon.rotation.x = Math.PI / 2
    ribbon.position.y = cfg.stemBase + 0.62
    root.add(ribbon)

    /* contact shadow */
    const sh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 4.4),
      new THREE.MeshBasicMaterial({ map: shadowTexture(cfg.shadowColor), transparent: true, depthWrite: false })
    )
    sh.rotation.x = -Math.PI / 2
    sh.position.y = cfg.stemBase - 0.02
    root.add(sh)

    this._m = new THREE.Matrix4()
    this._q = new THREE.Quaternion()
    this._q2 = new THREE.Quaternion()
    this._v = new THREE.Vector3()
    this._v2 = new THREE.Vector3()
    this._v3 = new THREE.Vector3()
    this._s = new THREE.Vector3()
    this._up = new THREE.Vector3(0, 1, 0)
  }

  /* pointer travel opens it; stillness closes it */
  travel(px) {
    this.target = Math.min(1, this.target + px * this.cfg.openPerPixel)
  }

  render(dt) {
    const cfg = this.cfg
    this.time += dt
    this.target = Math.max(0, this.target - cfg.closeRate * dt)
    const k = 1 - Math.exp(-cfg.openDamp * Math.min(dt, 0.1))
    this.open += (this.target - this.open) * k

    const entrance = Math.min(1, this.time / cfg.entrance)
    const ease = 1 - Math.pow(1 - entrance, 3)

    // the whole bouquet leans toward the hand and breathes
    this.root.rotation.z = -this.pointer.x * cfg.leanAmount
    this.root.rotation.x = this.pointer.y * cfg.leanAmount * 0.5
    this.root.rotation.y = this.time * cfg.spinIdle + this.pointer.x * 0.18
    this.root.position.y = (1 - ease) * -1.1 + Math.sin(this.time * cfg.swaySpeed) * cfg.swayAmount
    this.root.scale.setScalar(0.88 + 0.12 * ease)

    const m = this._m, q = this._q, q2 = this._q2, v = this._v, v2 = this._v2, v3 = this._v3, s = this._s

    /* heads: position + axis interpolate between bud and dome */
    for (let i = 0; i < this.heads.length; i++) {
      const h = this.heads[i]
      const o = smooth((this.open - h.delay) / Math.max(0.05, 1 - h.delay))
      const sway = Math.sin(this.time * cfg.swaySpeed + h.phase) * cfg.swayAmount
      h.k = o
      h.pos = h.pos || new THREE.Vector3()
      h.axis = h.axis || new THREE.Vector3()
      h.pos.lerpVectors(h.budPos, h.openPos, o)
      h.pos.y += sway * (0.4 + o)
      h.pos.x += Math.sin(this.time * 0.7 + h.phase) * cfg.swayAmount * o
      h.axis.lerpVectors(h.budAxis, h.openAxis, o).normalize()

      // core
      q.setFromUnitVectors(this._up, h.axis)
      v.copy(h.pos).addScaledVector(h.axis, cfg.headSize * 0.16)
      m.compose(v, q, s.setScalar(0.6 + 0.6 * o))
      this.cores.setMatrixAt(i, m)

      // stem from the gathered base to the head
      v2.set(0, cfg.stemBase + 0.35, 0)
      v3.copy(h.pos).sub(v2)
      const len = v3.length()
      v3.normalize()
      q2.setFromUnitVectors(this._up, v3)
      v.copy(v2).addScaledVector(v3, len * 0.5)
      m.compose(v, q2, s.set(1, len, 1))
      this.stems.setMatrixAt(i, m)
    }
    this.cores.instanceMatrix.needsUpdate = true
    this.stems.instanceMatrix.needsUpdate = true

    /* petals */
    const tiltClosed = cfg.openClosed * DEG, tiltOpen = cfg.openFull * DEG
    for (let i = 0; i < this.petalSpec.length; i++) {
      const p = this.petalSpec[i]
      const h = this.heads[p.head]
      const lk = p.layer / Math.max(1, cfg.layers - 1)
      const d = lk * cfg.layerStagger
      const o = smooth((h.k - d) / Math.max(0.05, 1 - d))
      const flutter = Math.sin(this.time * 1.1 + p.rand * 6.28 + p.head) * 0.05 * o

      const tilt = tiltClosed + (tiltOpen * (1 - lk * 0.42) - tiltClosed) * o + flutter
      const scale = cfg.headSize * (1 - lk * 0.2) * (cfg.scaleClosed + (1 - cfg.scaleClosed) * o) * (0.9 + p.rand * 0.2)

      // local: tilt away from the head axis, then spin to the azimuth
      q.setFromAxisAngle(XAXIS, tilt)
      q2.setFromAxisAngle(YAXIS, p.az + o * 0.22)
      q2.multiply(q)
      // head frame
      q.setFromUnitVectors(this._up, h.axis)
      q2.premultiply(q)

      v.set(0, 0, 0)
        .addScaledVector(h.axis, cfg.headSize * (0.10 + 0.05 * lk))
        .add(h.pos)
      // push the ring out a touch as it opens so layers do not intersect
      v2.set(Math.cos(p.az), 0, Math.sin(p.az)).applyQuaternion(q)
      v.addScaledVector(v2, cfg.headSize * (0.04 + 0.12 * o * (1 - lk * 0.5)))

      m.compose(v, q2, s.setScalar(scale))
      this.petals.setMatrixAt(i, m)
    }
    this.petals.instanceMatrix.needsUpdate = true

    /* leaf collar - fans out with the bloom */
    for (let i = 0; i < this.leafSpec.length; i++) {
      const l = this.leafSpec[i]
      const o = smooth(this.open)
      const tilt = (104 + 26 * o) * DEG
      q.setFromAxisAngle(XAXIS, tilt)
      q2.setFromAxisAngle(YAXIS, l.az + o * 0.3)
      q2.multiply(q)
      v.set(Math.cos(l.az) * (0.10 + 0.30 * o), -0.02 + 0.10 * o, Math.sin(l.az) * (0.10 + 0.30 * o))
      m.compose(v, q2, s.setScalar(0.50 + 0.26 * o + l.rand * 0.26))
      this.leaves.setMatrixAt(i, m)
    }
    this.leaves.instanceMatrix.needsUpdate = true
  }
}

const XAXIS = new THREE.Vector3(1, 0, 0)
const YAXIS = new THREE.Vector3(0, 1, 0)
function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x) }

/* ============================================================
   init - mount the scene on a canvas
============================================================ */
export function initBouquet(canvas, overrides = {}) {
  const cfg = Object.assign({}, CONFIG, overrides)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = cfg.exposure

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

  const camera = new THREE.PerspectiveCamera(cfg.fov, 1, 0.1, 60)

  const key = new THREE.DirectionalLight(0xffffff, 2.1)
  key.position.set(2.4, 4.2, 3.2); scene.add(key)
  const fill = new THREE.DirectionalLight(0xffe9dd, 0.8)
  fill.position.set(-3.2, 1.4, -2.0); scene.add(fill)
  scene.add(new THREE.AmbientLight(0xffffff, 0.42))

  const bouquet = new Bouquet(scene, cfg)

  /* pointer: TRAVEL opens the bouquet */
  const ptr = { x: 0, y: 0, lx: null, ly: null }
  const host = canvas.parentElement || window
  function move(e) {
    const r = canvas.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height
    if (ptr.lx !== null) {
      const dx = (x - ptr.lx) * r.width, dy = (y - ptr.ly) * r.height
      bouquet.travel(Math.hypot(dx, dy))
    }
    ptr.lx = x; ptr.ly = y
    ptr.x = x * 2 - 1; ptr.y = y * 2 - 1
  }
  window.addEventListener('pointermove', move, { passive: true })
  window.addEventListener('touchmove', e => { if (e.touches[0]) move(e.touches[0]) }, { passive: true })

  function resize() {
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const narrow = Math.min(2.0, Math.max(1, 1.45 / camera.aspect))   // a portrait phone needs the camera further back
    camera.position.set(0, cfg.camHeight, cfg.camDist * narrow)
    camera.lookAt(0, cfg.lookY, 0)
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', resize); resize()

  const clock = new THREE.Clock()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const noHover = window.matchMedia('(hover: none)').matches
  let raf = 0
  let announced = false
  function frame() {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(clock.getDelta(), 0.1)
    bouquet.pointer.set(ptr.x, ptr.y)
    if (reduce) { bouquet.target = 1; bouquet.open = 1 }
    else if (noHover) bouquet.travel(420 * dt)   // no cursor here - it breathes open on its own
    bouquet.render(dt)
    // camera parallax
    camera.position.x += (ptr.x * cfg.parallax - camera.position.x) * 0.05
    camera.position.y += (cfg.camHeight - ptr.y * cfg.parallax * 0.6 - camera.position.y) * 0.05
    camera.lookAt(0, cfg.lookY, 0)
    renderer.render(scene, camera)
    // READY means one drawn frame, not a resolved promise
    if (!announced) { announced = true; if (typeof cfg.onReady === 'function') cfg.onReady() }
  }
  frame()

  return {
    config: cfg,
    get openness() { return bouquet.open },
    bloom(amount = 1) { bouquet.target = Math.min(1, bouquet.target + amount) },
    dispose() { cancelAnimationFrame(raf); renderer.dispose() }
  }
}
