import { useMemo } from 'react'
import { COLORS, FACE_AXIS, KOCIEMBA_ORDER, stickerFrame, parseMove, add, scale, cross, dot, norm, rotate } from '../lib/cube.js'

// Fixed view: looking at the front, a bit from the right and above.
const V = norm([0.85, 0.8, 1.15])
const RIGHT = norm(cross([0, 1, 0], V))
const UP = cross(V, RIGHT)
const proj = (p) => [dot(p, RIGHT), -dot(p, UP)]
const pt = (p) => proj(p).map((n) => n.toFixed(3)).join(',')

const VISIBLE = ['U', 'F', 'R']
const ARROW = '#ff2d95'

function quad(center, du, dv, h) {
  const a = add(add(center, scale(du, -h)), scale(dv, -h))
  const b = add(add(center, scale(du, h)), scale(dv, -h))
  const c = add(add(center, scale(du, h)), scale(dv, h))
  const d = add(add(center, scale(du, -h)), scale(dv, h))
  return [a, b, c, d].map(pt).join(' ')
}

function arcFor(move) {
  const { face, turns, prime } = parseMove(move)
  const n = FACE_AXIS[face]
  const center = scale(n, face === 'F' || face === 'B' ? 1.2 : 1)
  const d = norm(add(V, scale(n, -dot(V, n))))
  const radius = face === 'F' || face === 'B' ? 2.05 : 2.3
  const span = ((face === 'F' || face === 'B' ? 230 : 150) * Math.PI) / 180
  // Clockwise (seen from outside the face) is a negative turn about the outward axis.
  const sign = turns === 2 ? -1 : prime ? 1 : -1
  const N = 48
  const pts = []
  for (let i = 0; i <= N; i++) {
    const a = sign * (-span / 2 + (span * i) / N)
    pts.push(proj(add(center, scale(rotate(d, n, a), radius))))
  }
  const mid = proj(add(center, scale(d, radius + 0.95)))
  return { pts, mid, turns }
}

function arrowHead(pts, size) {
  const [x2, y2] = pts[pts.length - 1]
  const [x1, y1] = pts[pts.length - 4]
  const ang = Math.atan2(y2 - y1, x2 - x1)
  const tip = [x2 + Math.cos(ang) * size * 0.9, y2 + Math.sin(ang) * size * 0.9]
  const l = [x2 + Math.cos(ang + Math.PI / 2) * size * 0.75, y2 + Math.sin(ang + Math.PI / 2) * size * 0.75]
  const r = [x2 + Math.cos(ang - Math.PI / 2) * size * 0.75, y2 + Math.sin(ang - Math.PI / 2) * size * 0.75]
  return [tip, l, r].map((p) => p.map((n) => n.toFixed(3)).join(',')).join(' ')
}

// state: cubejs facelet string; scheme: face letter -> color id; move: e.g. "R'" or null
export default function CubeView({ state, scheme, move, className = '' }) {
  const { stickers, arc, body } = useMemo(() => {
    const layerAxis = move ? FACE_AXIS[move[0]] : null
    const stickers = []
    for (const f of VISIBLE) {
      const base = KOCIEMBA_ORDER.indexOf(f) * 9
      for (let i = 0; i < 9; i++) {
        const { p, du, dv } = stickerFrame(f, Math.floor(i / 3), i % 3)
        const inLayer = layerAxis ? dot(p, layerAxis) > 0.5 : true
        stickers.push({ key: f + i, points: quad(p, du, dv, 0.43), fill: COLORS[scheme[state[base + i]]]?.hex ?? '#555', inLayer })
      }
    }
    const body = VISIBLE.map((f) => {
      const { du, dv } = stickerFrame(f, 1, 1)
      return { key: f, points: quad(scale(FACE_AXIS[f], 1.5), du, dv, 1.53) }
    })
    return { stickers, body, arc: move ? arcFor(move) : null }
  }, [state, scheme, move])

  const path = arc ? 'M' + arc.pts.map((p) => p.map((n) => n.toFixed(3)).join(',')).join(' L') : null
  const head = arc ? arrowHead(arc.pts, 0.42) : null

  return (
    <svg viewBox="-3.7 -3.6 7.4 7.2" className={className} role="img" aria-label="Cube picture showing which layer to turn">
      {body.map((b) => (
        <polygon key={b.key} points={b.points} fill="#000" stroke="#000" strokeWidth="0.12" strokeLinejoin="round" />
      ))}
      {stickers.map((s) => (
        <polygon
          key={s.key}
          points={s.points}
          fill={s.fill}
          opacity={s.inLayer ? 1 : 0.5}
          stroke={s.inLayer && move ? '#fff' : 'none'}
          strokeWidth="0.05"
          strokeLinejoin="round"
        />
      ))}
      {arc && (
        <g>
          <path d={path} fill="none" stroke="#000" strokeWidth="0.42" strokeLinecap="round" strokeLinejoin="round" />
          <polygon points={head} fill="#000" stroke="#000" strokeWidth="0.2" strokeLinejoin="round" />
          <path d={path} fill="none" stroke={ARROW} strokeWidth="0.24" strokeLinecap="round" strokeLinejoin="round" />
          <polygon points={head} fill={ARROW} />
          <circle cx={arc.mid[0]} cy={arc.mid[1]} r="0.5" fill={ARROW} stroke="#000" strokeWidth="0.08" />
          <text x={arc.mid[0]} y={arc.mid[1]} textAnchor="middle" dominantBaseline="central" fontSize="0.58" fontWeight="800" fill="#fff">
            {arc.turns}×
          </text>
        </g>
      )}
    </svg>
  )
}
