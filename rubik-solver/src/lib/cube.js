// Cube model helpers: colors, faces, validation, plain-English moves, 3D geometry.
import Cube from 'cubejs/lib/cube.js'

// Sticker colors the user can pick. Ids are single letters.
export const COLORS = {
  W: { name: 'White', hex: '#ffffff' },
  Y: { name: 'Yellow', hex: '#ffd500' },
  R: { name: 'Red', hex: '#d0102b' },
  O: { name: 'Orange', hex: '#ff6a00' },
  G: { name: 'Green', hex: '#00a651' },
  B: { name: 'Blue', hex: '#0057d9' },
}
export const COLOR_IDS = Object.keys(COLORS)

// Kociemba facelet order used by cubejs.
export const KOCIEMBA_ORDER = ['U', 'R', 'F', 'D', 'L', 'B']

// The order we ask the user to scan, with how to hold the cube for each.
// The grid on screen always maps to cubejs's facelet layout for that face.
export const SCAN_STEPS = [
  {
    face: 'F',
    title: 'Front',
    how: 'Pick any side to be the front. Hold it facing the camera. Remember which side is on top.',
  },
  {
    face: 'R',
    title: 'Right side',
    how: 'Turn the whole cube a quarter turn to the left, so its right side now faces you. Keep the top on top.',
  },
  {
    face: 'B',
    title: 'Back',
    how: 'Turn the whole cube left again. The back now faces you. Top stays on top.',
  },
  {
    face: 'L',
    title: 'Left side',
    how: 'Turn the whole cube left once more. The left side now faces you.',
  },
  {
    face: 'U',
    title: 'Top',
    how: 'Turn left once more so the front faces you again. Then tip the top toward you so it faces the camera.',
  },
  {
    face: 'D',
    title: 'Bottom',
    how: 'Tip the cube back so the front faces you, then tip the bottom up toward you so it faces the camera.',
  },
]

export const FACE_NAMES = {
  U: 'Top',
  D: 'Bottom',
  F: 'Front',
  B: 'Back',
  L: 'Left side',
  R: 'Right side',
}

export function emptyFaces() {
  const f = {}
  for (const k of KOCIEMBA_ORDER) f[k] = Array(9).fill(null)
  return f
}

// Rotate a 3x3 grid 90 degrees clockwise.
export function rotateGrid(g) {
  const out = Array(9)
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) out[c * 3 + (2 - r)] = g[r * 3 + c]
  return out
}

// faces: { U: [9 color ids], ... } -> map of face letter -> color id of its center
export function centerColors(faces) {
  const m = {}
  for (const k of KOCIEMBA_ORDER) m[k] = faces[k][4]
  return m
}

export function facesToString(faces) {
  const centers = centerColors(faces)
  const colorToFace = {}
  for (const k of KOCIEMBA_ORDER) colorToFace[centers[k]] = k
  return KOCIEMBA_ORDER.map((k) => faces[k].map((c) => colorToFace[c] ?? '?').join('')).join('')
}

function permParity(p) {
  let parity = 0
  const seen = Array(p.length).fill(false)
  for (let i = 0; i < p.length; i++) {
    if (seen[i]) continue
    let len = 0
    for (let j = i; !seen[j]; j = p[j]) {
      seen[j] = true
      len++
    }
    parity += len - 1
  }
  return parity % 2
}

// Returns { ok, error, state } where state is the cubejs facelet string.
export function validateFaces(faces) {
  for (const k of KOCIEMBA_ORDER) {
    if (faces[k].some((c) => !c)) return { ok: false, error: `The ${FACE_NAMES[k].toLowerCase()} still has unset squares.` }
  }
  const counts = {}
  for (const k of KOCIEMBA_ORDER) for (const c of faces[k]) counts[c] = (counts[c] || 0) + 1
  const wrong = COLOR_IDS.filter((c) => (counts[c] || 0) !== 9)
  if (wrong.length) {
    const parts = wrong.map((c) => `${COLORS[c].name}: ${counts[c] || 0}`)
    return { ok: false, error: `Each color should appear exactly 9 times. Check these: ${parts.join(', ')}.` }
  }
  const centers = Object.values(centerColors(faces))
  if (new Set(centers).size !== 6) {
    return { ok: false, error: 'Two sides have the same center color. Every center square must be a different color.' }
  }
  const state = facesToString(faces)
  const cube = Cube.fromString(state)
  const unique = (a) => new Set(a).size === a.length
  if (cube.asString() !== state || !unique(cube.cp) || !unique(cube.ep)) {
    return {
      ok: false,
      error: "Some corner or edge pieces don't match a real cube. A square's color is probably wrong, or a side was scanned turned the wrong way.",
    }
  }
  if (cube.co.reduce((a, b) => a + b, 0) % 3 !== 0) {
    return { ok: false, error: 'One corner looks twisted. Double-check the corner squares.' }
  }
  if (cube.eo.reduce((a, b) => a + b, 0) % 2 !== 0) {
    return { ok: false, error: 'One edge looks flipped. Double-check the edge squares.' }
  }
  if (permParity(cube.cp) !== permParity(cube.ep)) {
    return { ok: false, error: 'Two pieces look swapped. Double-check the colors.' }
  }
  return { ok: true, state }
}

export function applyMove(state, move) {
  return Cube.fromString(state).move(move).asString()
}

export function randomState() {
  return Cube.random().asString()
}

// cubejs facelet string -> faces of color ids, using standard color scheme.
export function stateToFaces(state, scheme = { U: 'W', R: 'R', F: 'G', D: 'Y', L: 'O', B: 'B' }) {
  const faces = {}
  KOCIEMBA_ORDER.forEach((k, i) => {
    faces[k] = state.slice(i * 9, i * 9 + 9).split('').map((f) => scheme[f])
  })
  return faces
}

// ---------- Plain-English moves ----------
// Directions are described as the user sees them, holding the cube with the
// scanned front facing them and top on top.
const MOVE_TEXT = {
  U: { layer: 'Top layer', cw: 'turn left', ccw: 'turn right' },
  D: { layer: 'Bottom layer', cw: 'turn right', ccw: 'turn left' },
  R: { layer: 'Right side', cw: 'turn up', ccw: 'turn down' },
  L: { layer: 'Left side', cw: 'turn down', ccw: 'turn up' },
  F: { layer: 'Front face', cw: 'turn clockwise', ccw: 'turn counter-clockwise' },
  B: { layer: 'Back face', cw: 'turn counter-clockwise (as seen from the front)', ccw: 'turn clockwise (as seen from the front)' },
}

export function parseMove(m) {
  const face = m[0]
  const mod = m.slice(1)
  const turns = mod === '2' ? 2 : 1
  const prime = mod === "'"
  return { face, turns, prime }
}

export function describeMove(m) {
  const { face, turns, prime } = parseMove(m)
  const t = MOVE_TEXT[face]
  if (turns === 2) {
    return { layer: t.layer, action: 'turn twice (either way)', count: 2, short: `${t.layer} — 2 turns` }
  }
  const dir = prime ? t.ccw : t.cw
  return { layer: t.layer, action: dir, count: 1, short: `${t.layer} ${dir.replace('turn ', '')} — 1 turn` }
}

// ---------- 3D geometry for the cube picture ----------
export const FACE_AXIS = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  R: [1, 0, 0],
  L: [-1, 0, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
}

// Center of sticker (row r, col c) on face, in a cube spanning -1.5..1.5,
// matching cubejs facelet layout. Returns { p, du, dv } where du/dv are the
// in-plane axes for columns and rows.
export function stickerFrame(face, r, c) {
  const a = c - 1
  const b = r - 1
  switch (face) {
    case 'U': return { p: [a, 1.5, b], du: [1, 0, 0], dv: [0, 0, 1] }
    case 'D': return { p: [a, -1.5, -b], du: [1, 0, 0], dv: [0, 0, -1] }
    case 'F': return { p: [a, -b, 1.5], du: [1, 0, 0], dv: [0, -1, 0] }
    case 'B': return { p: [-a, -b, -1.5], du: [-1, 0, 0], dv: [0, -1, 0] }
    case 'R': return { p: [1.5, -b, -a], du: [0, 0, -1], dv: [0, -1, 0] }
    case 'L': return { p: [-1.5, -b, a], du: [0, 0, 1], dv: [0, -1, 0] }
    default: throw new Error(face)
  }
}

export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s]
export const norm = (a) => scale(a, 1 / Math.hypot(...a))

// Rodrigues rotation of v around unit axis k by angle t.
export function rotate(v, k, t) {
  const c = Math.cos(t)
  const s = Math.sin(t)
  return add(add(scale(v, c), scale(cross(k, v), s)), scale(k, dot(k, v) * (1 - c)))
}
