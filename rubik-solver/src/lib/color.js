// Color detection for camera frames.

export function rgbToHsv([r, g, b]) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return [h, max ? d / max : 0, max]
}

function rgbToLab([r, g, b]) {
  const lin = (c) => {
    c /= 255
    return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92
  }
  const R = lin(r), G = lin(g), B = lin(b)
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}

const labDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

// Rule-based guess from hue/saturation. GUESS: thresholds tuned for typical
// stickers under indoor light; orange vs red is the usual weak spot.
export function guessByHue(rgb) {
  const [h, s, v] = rgbToHsv(rgb)
  if (s < 0.28 && v > 0.35) return 'W'
  if (h < 12 || h >= 330) return 'R'
  if (h < 38) return v < 0.45 && s > 0.6 ? 'R' : 'O'
  if (h < 72) return 'Y'
  if (h < 165) return 'G'
  if (h < 265) return 'B'
  return 'R'
}

// calib: { colorId: [rgb, ...] } center samples seen so far. When a sample is
// close to a calibrated center, trust that; otherwise fall back to hue rules.
export function classify(rgb, calib = {}) {
  const lab = rgbToLab(rgb)
  let best = null
  let bestD = Infinity
  for (const [id, samples] of Object.entries(calib)) {
    for (const s of samples) {
      const d = labDist(lab, rgbToLab(s))
      if (d < bestD) { bestD = d; best = id }
    }
  }
  if (best && bestD < 14) return best
  return guessByHue(rgb)
}

// Sample the 9 cells of a grid region from a video frame.
// region: { x, y, size } in video pixel coordinates.
export function sampleGrid(ctx, region) {
  const out = []
  const cell = region.size / 3
  const patch = Math.max(4, Math.floor(cell * 0.35))
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cx = region.x + cell * (c + 0.5)
      const cy = region.y + cell * (r + 0.5)
      const img = ctx.getImageData(Math.round(cx - patch / 2), Math.round(cy - patch / 2), patch, patch).data
      const rs = [], gs = [], bs = []
      for (let i = 0; i < img.length; i += 4) { rs.push(img[i]); gs.push(img[i + 1]); bs.push(img[i + 2]) }
      const med = (a) => a.sort((x, y) => x - y)[a.length >> 1]
      out.push([med(rs), med(gs), med(bs)])
    }
  }
  return out
}
