import type { Buffer } from 'claude-code/shader'
import {
  abs,
  buffer,
  clamp,
  mod,
  cos,
  dot,
  exp,
  floor,
  fract,
  length,
  max,
  min,
  mix,
  picture,
  pointers,
  range,
  scene,
  shader,
  sin,
  size,
  smoothstep,
  step,
  table,
  time,
  vec2,
  vec3,
  vec4,
} from 'claude-code/shader'

// The whole sky is painted here. The Svg underneath is a flat ground with code on
// it: the shader reads the ground color to tell night from day, and scrolls the code.

// A pseudo-random number from 0 to 1 for a grid cell.
function hash(c: vec2): number {
  return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453)
}

// Pastel glows that wander the dawn sky, and where each one starts.
const BLOBS = table([
  [0.77, 0.71, 0.99],
  [0.98, 0.66, 0.83],
  [0.6, 0.96, 0.89],
  [0.99, 0.73, 0.45],
  [0.58, 0.77, 0.99],
  [0.86, 0.7, 0.99],
])
const HOMES = table([
  [0.13, 0.8],
  [0.87, 0.84],
  [0.84, 0.2],
  [0.5, 0.97],
  [0.16, 0.2],
  [0.55, 0.5],
])

// The ground color, read once a frame: the middle of three spots, so a letter
// of code that lands on one of them doesn't change it.
const ground: ReturnType<typeof buffer> = buffer({ size: [1, 1] }, () => {
  const a = scene.sample(vec2(0.13, 0.37)).rgb
  const b = scene.sample(vec2(0.61, 0.83)).rgb
  const c = scene.sample(vec2(0.87, 0.21)).rgb

  return vec4(max(min(a, b), min(max(a, b), c)), 1)
})

// Every click, kept here so its ring plays out in full however fast the clicks
// come (the app hands the shader only a few pointers at a time). Texel 0 holds
// how many clicks there have been; texels 1 to 12 hold the latest ones, each as
// x, y (0 to 1), the time it came, and 1 once it is set.
const SLOTS = 12
const clicks: Buffer = buffer({ size: [SLOTS + 1, 1], float: 32, filter: 'nearest' }, p => {
  const i = p.cell.x
  const before = clicks.at(vec2(i, 0))
  const count = clicks.at(vec2(0, 0)).x
  let fresh = 0
  let at = vec2(0)

  for (const q of pointers) {
    const isNew = q.down * step(q.age, 0)
    fresh = max(fresh, isNew)
    at = vec2(mix(at, q.where.xy, isNew))
  }

  const slot = 1 + mod(count, SLOTS)
  const mine = step(abs(i - slot), 0.5) * fresh
  const kept = vec4(mix(before, vec4(at.x, at.y, time, 1), mine))

  return vec4(mix(kept, vec4(count + fresh, 0, 0, 0), step(i, 0.5)))
})

// A soft oval glow, from 1 at its center to 0.
function oval(uv: vec2, c: vec2, r: vec2): number {
  const q = vec2((uv - c) / r)

  return exp(-dot(q, q))
}

// A cloud of four soft puffs, in points.
function puff(pt: vec2, c: vec2, r: vec2): number {
  const q = vec2((pt - c) / r)

  return exp(-dot(q, q) * 1.6)
}

function cloud(pt: vec2, c: vec2, s: number): number {
  const sum =
    puff(pt, c, vec2(vec2(90, 32) * s)) +
    puff(pt, vec2(c + vec2(58, 20) * s), vec2(vec2(68, 40) * s)) +
    puff(pt, vec2(c + vec2(128, -2) * s), vec2(vec2(82, 30) * s)) +
    puff(pt, vec2(c + vec2(60, -12) * s), vec2(vec2(110, 24) * s))

  return smoothstep(0.2, 0.8, sum)
}

// One shooting star: a short streak from `from` to `to` (0 to 1 of the window),
// once every `period` seconds.
function meteor(pt: vec2, t: number, period: number, shift: number, from: vec2, to: vec2): number {
  const ph = fract((t + shift) / period)
  const prog = clamp(ph / 0.07, 0, 1)
  const live = step(ph, 0.07)
  const a = vec2(from * size)
  const b = vec2(to * size)
  const head = vec2(mix(a, b, prog))
  const dir = vec2((b - a) / max(length(b - a), 1))
  const rel = vec2(pt - head)
  const along = dot(rel, dir)
  const across = length(rel - dir * along)
  const tail = clamp(1 + along / 170, 0, 1) * smoothstep(4, -2, along)
  const spark = exp(-dot(rel, rel) / 10) * 0.6

  return live * (tail * exp(-(across * across) / 2.5) + spark) * sin(prog * 3.14159)
}

const sky = picture(p => {
  const t = time
  const uv = p.uv
  const pt = p.point

  const flat = ground.at(vec2(0, 0)).rgb
  const night = 1 - smoothstep(0.35, 0.65, dot(flat, vec3(0.299, 0.587, 0.114)))
  const day = 1 - night

  // The pointer: a soft glow that follows it.
  let near = 0

  for (const q of pointers) {
    const d = length(pt - q.at)
    near += exp(-(d * d) / 26000) * (1 - clamp(q.gone, 0, 1))
  }

  // A ring for every click, each living its full second. They are soft and dim,
  // and their sum is capped, so a burst of clicks can't add up to the bright
  // flicker that makes the app freeze the shader.
  let ring = 0

  for (const k of range(SLOTS)) {
    const c = clicks.at(vec2(k + 1, 0))
    const age = time - c.z
    const live = c.w * step(age, 1) * step(0, age)
    const rel = vec2(pt - c.xy * size)
    const d = length(rel)
    const r = age * 480
    const w = exp(-((d - r) * (d - r)) / 900) * (1 - min(age, 1)) * live
    ring += w
  }

  ring = min(ring, 1)

  // A slow wave through the whole scene, so everything sways like water.
  const wave = vec2(
    sin(uv.y * 8 + t * 0.55) * 0.0045 + sin(uv.y * 21 - t * 0.8) * 0.0018,
    cos(uv.x * 6 + t * 0.45) * 0.0035 + sin((uv.x + uv.y) * 15 + t * 0.7) * 0.0012,
  )
  const w = vec2(uv + wave)

  // The sky's gradient, night or day.
  const top = vec3(mix(vec3(0.902, 0.878, 1), vec3(0.02, 0.024, 0.102), night))
  const mid = vec3(mix(vec3(0.965, 0.902, 0.953), vec3(0.047, 0.055, 0.18), night))
  const low = vec3(mix(vec3(1, 0.941, 0.894), vec3(0.11, 0.082, 0.282), night))
  let col = vec3(mix(mix(low, mid, smoothstep(0, 0.45, uv.y)), top, smoothstep(0.45, 1, uv.y)))

  // Day: pastel glows wandering slowly.
  for (const i of range(6)) {
    const home = HOMES.at(i)
    const center = vec2(home.x + 0.14 * sin(t * 0.05 + i * 1.9), home.y + 0.1 * cos(t * 0.04 + i * 2.7))
    const amount = oval(w, center, vec2(0.3, 0.3)) * 0.5 * day
    col = vec3(mix(col, BLOBS.at(i), amount))
  }

  // A warm glow on the horizon.
  const horizon = oval(uv, vec2(0.5, 0), vec2(0.62, 0.3))
  col = vec3(mix(col, mix(vec3(1, 0.81, 0.72), vec3(0.43, 0.29, 0.85), night), horizon * mix(0.6, 0.45, night)))

  // Night: broad aurora glows that breathe.
  const glows =
    vec3(0.18, 0.89, 0.69) * oval(w, vec2(0.3 + 0.05 * sin(t * 0.05), 0.78), vec2(0.38, 0.085)) * (0.3 + 0.1 * sin(t * 0.2)) +
    vec3(0.22, 0.74, 0.97) * oval(w, vec2(0.72 - 0.04 * sin(t * 0.06), 0.84), vec2(0.33, 0.07)) * (0.24 + 0.08 * sin(t * 0.17 + 1)) +
    vec3(0.55, 0.36, 0.96) * oval(w, vec2(0.5, 0.68), vec2(0.5, 0.12)) * (0.26 + 0.08 * sin(t * 0.15 + 2)) +
    vec3(0.93, 0.29, 0.6) * oval(w, vec2(0.86, 0.66), vec2(0.25, 0.08)) * (0.17 + 0.06 * sin(t * 0.22 + 3))
  col = vec3(col + glows * night)

  // Northern lights: two ribbons with hanging curtains that ripple sideways.
  const x = w.x
  const c1 = 0.76 + 0.06 * sin(x * 3.2 + t * 0.12) + 0.025 * sin(x * 9 - t * 0.21)
  const d1 = w.y - c1
  const band1 = exp(-(d1 * d1) / 0.003)
  const hang1 = smoothstep(-0.24, 0, d1) * smoothstep(0.05, 0, d1)
  const streak1 = 0.55 + 0.45 * sin(x * 140 + sin(x * 6 + t * 0.35) * 5)
  const tint1 = vec3(mix(vec3(0.18, 0.9, 0.68), vec3(0.55, 0.36, 0.98), smoothstep(0.15, 0.95, x + 0.15 * sin(t * 0.1))))
  const glow1 = (band1 * 0.5 + hang1 * streak1 * 0.32) * (0.6 + 0.4 * sin(t * 0.5 + x * 4))

  const c2 = 0.88 + 0.035 * sin(x * 4.5 - t * 0.15) + 0.02 * sin(x * 13 + t * 0.18)
  const d2 = w.y - c2
  const band2 = exp(-(d2 * d2) / 0.0018)
  const hang2 = smoothstep(-0.16, 0, d2) * smoothstep(0.04, 0, d2)
  const streak2 = 0.55 + 0.45 * sin(x * 190 - sin(x * 5 - t * 0.3) * 6)
  const tint2 = vec3(mix(vec3(0.22, 0.74, 0.97), vec3(0.93, 0.3, 0.6), smoothstep(0.3, 1, x)))
  const glow2 = (band2 * 0.4 + hang2 * streak2 * 0.22) * (0.6 + 0.4 * sin(t * 0.42 - x * 3))

  col = vec3(col + (tint1 * glow1 + tint2 * glow2) * night)

  // Twinkling stars, each kept well inside its cell so no glow is cut off.
  const g = 46
  const cell = vec2(floor(pt / g))
  const h = hash(cell)
  const spot = vec2(vec2(hash(vec2(cell + 1.3)), hash(vec2(cell + 9.1))) * 20 + 13)
  const sd = length(pt - cell * g - spot)
  const twinkle = 0.5 + 0.5 * sin(t * (0.8 + h * 1.6) + h * 40)
  const star = step(0.86, h) * (exp(-(sd * sd) / 1.4) + exp(-(sd * sd) / 28) * 0.25) * smoothstep(13, 9, sd) * twinkle
  col = vec3(col + vec3(0.9, 0.93, 1) * star * smoothstep(0.25, 0.6, uv.y) * night)

  // Shooting stars.
  const m = meteor(pt, t, 11, 0, vec2(0.86, 0.92), vec2(0.5, 0.7)) + meteor(pt, t, 17, 6, vec2(0.3, 0.95), vec2(0.08, 0.76))
  col = vec3(col + vec3(1) * m * night)

  // Day: soft clouds drifting across, wrapping round off screen.
  const span = size.x + 520
  const cl =
    cloud(pt, vec2(fract(0.1 + t * 0.0035) * span - 260, size.y * 0.86), 1) +
    cloud(pt, vec2(fract(0.55 + t * 0.0026) * span - 260, size.y * 0.92), 0.8) +
    cloud(pt, vec2(fract(0.8 + t * 0.0042) * span - 260, size.y * 0.76), 0.6)
  col = vec3(mix(col, vec3(1), min(cl, 1) * 0.6 * day))

  // The code: read from the picture, scrolling down endlessly, fading in at the
  // top and out at the foot of each pass, and lit up as the sweep crosses it.
  const fall = fract(uv.y + t * 9 / max(size.y, 1) + wave.y)
  const code = scene.sample(vec2(uv.x + wave.x, fall)).rgb
  const fadeIn = smoothstep(0, 0.08, fall) * smoothstep(1, 0.92, fall)
  const sweep = mix(1.25, -0.25, fract(t / 9))
  const sw = uv.y + uv.x * 0.25 - sweep
  const lift = 1 + exp(-(sw * sw) / 0.004) * mix(0.5, 1.4, night)

  // Hills, edges kept to a pixel and a half so they stay smooth.
  const e = 1.5 / max(size.y, 1)
  const hb = 0.1 + 0.025 * sin(uv.x * 5.1 + 0.7) + 0.015 * sin(uv.x * 11.3 + 2.1)
  const hf = 0.055 + 0.02 * sin(uv.x * 6.7 + 1.9) + 0.012 * sin(uv.x * 14.1 + 0.4)
  const backHill = smoothstep(hb + e, hb - e, uv.y)
  const frontHill = smoothstep(hf + e, hf - e, uv.y)

  col = vec3(col + (code - flat) * fadeIn * lift * (1 - backHill))
  col = vec3(mix(col, mix(vec3(0.89, 0.84, 0.965), vec3(0.082, 0.075, 0.22), night), backHill))
  col = vec3(mix(col, mix(vec3(0.835, 0.769, 0.937), vec3(0.039, 0.039, 0.114), night), frontHill))

  // Rising lights: fireflies at night, bubbles by day. Each stays inside its
  // cell with room to spare, and fades to nothing before the cell's edge.
  const fp = vec2(pt.x + sin(t * 0.3 + pt.y * 0.01) * 10, pt.y - t * 20)
  const pc = vec2(floor(fp / 80))
  const ph = hash(vec2(pc + 17))
  const pspot = vec2(vec2(hash(vec2(pc + 2.2)), hash(vec2(pc + 5.5))) * 20 + 30)
  const pd = length(fp - pc * 80 - pspot)
  const pr = 1.6 + ph * 2
  const present = step(0.78, ph)
  const edge = smoothstep(29, 18, pd)
  const pulse = 0.55 + 0.45 * sin(t * 0.9 + ph * 30)
  const firefly = (exp(-(pd * pd) / (pr * pr * 0.6)) + exp(-(pd * pd) / (pr * pr * 6)) * 0.5) * pulse * edge
  const br = pr * 1.8
  const bubble = (exp(-((pd - br) * (pd - br)) / 1.2) * 0.5 + exp(-(pd * pd) / (br * br)) * 0.1) * edge
  col = vec3(col + vec3(0.55, 1, 0.82) * firefly * present * night * 0.8)
  col = vec3(mix(col, vec3(1), bubble * present * day))

  // The pointer's glow and ripple ring, in the theme's violet.
  col = vec3(col + vec3(0.49, 0.36, 1) * near * mix(0.14, 0.1, day))
  col = vec3(col + vec3(0.49, 0.36, 1) * ring * 0.22 * night)
  col = vec3(mix(col, vec3(0.55, 0.42, 0.98), ring * 0.18 * day))

  // A trace of noise keeps the wide gradients free of bands.
  col = vec3(col + (hash(vec2(p.pixel)) - 0.5) / 255)

  return vec4(clamp(col, vec3(0), vec3(1)), 1)
})

export default shader({ fps: 60, passes: [ground, clicks, sky] })
