import { useEffect, useRef, useState } from 'react'
import { classify, sampleGrid } from '../lib/color.js'
import { COLORS } from '../lib/cube.js'

const GRID_START = 0.15
const GRID_SIZE = 0.7

function GridOverlay({ dots }) {
  return (
    <div
      className="absolute grid grid-cols-3 grid-rows-3 border-4 border-white rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] pointer-events-none"
      style={{ left: `${GRID_START * 100}%`, top: `${GRID_START * 100}%`, width: `${GRID_SIZE * 100}%`, height: `${GRID_SIZE * 100}%` }}
    >
      {dots.map((c, i) => (
        <div key={i} className="border-2 border-white/80 flex items-center justify-center">
          {c && <span className="w-5 h-5 rounded-full ring-2 ring-black" style={{ background: COLORS[c].hex }} />}
        </div>
      ))}
    </div>
  )
}

// Grid region of a W x H source shown with object-cover in a square box.
function gridRegion(W, H) {
  const side = Math.min(W, H)
  const offX = (W - side) / 2
  const offY = (H - side) / 2
  return { x: offX + side * GRID_START, y: offY + side * GRID_START, size: side * GRID_SIZE }
}

// Live camera with a 3x3 overlay. Falls back to taking a photo with the
// phone's camera app when live video isn't allowed (for example inside an
// embedded page). Calls onCapture(rgbSamples, colorIds).
export default function Camera({ calib, onCapture }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const [live, setLive] = useState(Array(9).fill(null))
  const [status, setStatus] = useState('starting') // starting | live | photo
  const [photo, setPhoto] = useState(null) // { url, samples, ids }

  useEffect(() => {
    let stream
    let cancelled = false
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) return setStatus('photo')
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        })
        if (cancelled) return stream.getTracks().forEach((t) => t.stop())
        const v = videoRef.current
        v.srcObject = stream
        await v.play().catch(() => {})
        setStatus('live')
      } catch {
        if (!cancelled) setStatus('photo')
      }
    }
    start()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function samplesFrom(source, W, H) {
    const canvas = canvasRef.current || (canvasRef.current = document.createElement('canvas'))
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(source, 0, 0, W, H)
    return sampleGrid(ctx, gridRegion(W, H))
  }

  function grab() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return null
    return samplesFrom(v, v.videoWidth, v.videoHeight)
  }

  useEffect(() => {
    if (status !== 'live') return
    const t = setInterval(() => {
      const s = grab()
      if (s) setLive(s.map((rgb) => classify(rgb, calib)))
    }, 300)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, calib])

  function capture() {
    const s = grab()
    if (s) onCapture(s, s.map((rgb) => classify(rgb, calib)))
  }

  function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      // Scale down big photos so sampling stays fast.
      const k = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight))
      const samples = samplesFrom(img, Math.round(img.naturalWidth * k), Math.round(img.naturalHeight * k))
      setPhoto((old) => {
        if (old) URL.revokeObjectURL(old.url)
        return { url, samples, ids: samples.map((rgb) => classify(rgb, calib)) }
      })
    }
    img.src = url
  }

  useEffect(() => () => photo && URL.revokeObjectURL(photo.url), [photo])

  const btn = 'w-full max-w-sm rounded-2xl font-extrabold text-lg py-4 disabled:opacity-40'

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-neutral-900 ring-2 ring-white/20">
        <video ref={videoRef} playsInline muted className={`absolute inset-0 w-full h-full object-cover ${status === 'live' ? '' : 'hidden'}`} />
        {status === 'photo' && photo && <img src={photo.url} alt="Your photo of this side" className="absolute inset-0 w-full h-full object-cover" />}
        {status === 'starting' && <div className="absolute inset-0 flex items-center justify-center text-white/80">Starting camera…</div>}
        {status === 'photo' && !photo && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-white/80">
            Take a photo with the side filling the middle of the picture.
          </div>
        )}
        <GridOverlay dots={status === 'live' ? live : photo?.ids ?? Array(9).fill(null)} />
      </div>

      {status === 'live' && (
        <>
          <p className="text-sm text-white/80 text-center max-w-xs">Fill the white grid with the side. The dots show the colors we see.</p>
          <button type="button" onClick={capture} className={`${btn} bg-white text-black`}>
            📸 Snap this side
          </button>
        </>
      )}

      {status === 'photo' && (
        <>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
          {photo && <p className="text-sm text-white/80 text-center max-w-xs">The side should fill the white grid. If it doesn&apos;t, take it again closer.</p>}
          <button type="button" onClick={() => fileRef.current?.click()} className={`${btn} ${photo ? 'bg-white/10 text-white ring-1 ring-white/30' : 'bg-white text-black'}`}>
            📷 {photo ? 'Take it again' : 'Take a photo of this side'}
          </button>
          {photo && (
            <button type="button" onClick={() => onCapture(photo.samples, photo.ids)} className={`${btn} bg-white text-black`}>
              Use this photo
            </button>
          )}
        </>
      )}
    </div>
  )
}
