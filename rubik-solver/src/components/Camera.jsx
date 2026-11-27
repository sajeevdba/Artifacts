import { useEffect, useRef, useState } from 'react'
import { classify, sampleGrid } from '../lib/color.js'
import { COLORS } from '../lib/cube.js'

const GRID_START = 0.15
const GRID_SIZE = 0.7

// Live camera with a 3x3 overlay. Calls onCapture(rgbSamples, colorIds).
export default function Camera({ calib, onCapture, onUnavailable }) {
  const videoRef = useRef(null)
  const boxRef = useRef(null)
  const canvasRef = useRef(null)
  const [live, setLive] = useState(Array(9).fill(null))
  const [status, setStatus] = useState('starting')

  useEffect(() => {
    let stream
    let cancelled = false
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unavailable')
        onUnavailable?.('This browser has no camera access. You can enter the colors by hand.')
        return
      }
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
        setStatus('unavailable')
        onUnavailable?.('Camera is blocked or not found. Allow camera access, or enter the colors by hand.')
      }
    }
    start()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onUnavailable])

  function grab() {
    const v = videoRef.current
    const box = boxRef.current
    if (!v || !box || !v.videoWidth) return null
    const W = v.videoWidth
    const H = v.videoHeight
    const S = box.clientWidth
    const sc = Math.max(S / W, S / H)
    const offX = (W - S / sc) / 2
    const offY = (H - S / sc) / 2
    const canvas = canvasRef.current || (canvasRef.current = document.createElement('canvas'))
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(v, 0, 0, W, H)
    return sampleGrid(ctx, { x: offX + (S * GRID_START) / sc, y: offY + (S * GRID_START) / sc, size: (S * GRID_SIZE) / sc })
  }

  useEffect(() => {
    if (status !== 'live') return
    const t = setInterval(() => {
      const s = grab()
      if (s) setLive(s.map((rgb) => classify(rgb, calib)))
    }, 300)
    return () => clearInterval(t)
  }, [status, calib])

  function capture() {
    const s = grab()
    if (s) onCapture(s, s.map((rgb) => classify(rgb, calib)))
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div ref={boxRef} className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-neutral-900 ring-2 ring-white/20">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        {status === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center text-white/80">Starting camera…</div>
        )}
        <div
          className="absolute grid grid-cols-3 grid-rows-3 border-4 border-white rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
          style={{ left: `${GRID_START * 100}%`, top: `${GRID_START * 100}%`, width: `${GRID_SIZE * 100}%`, height: `${GRID_SIZE * 100}%` }}
        >
          {live.map((c, i) => (
            <div key={i} className="border-2 border-white/80 flex items-center justify-center">
              {c && <span className="w-5 h-5 rounded-full ring-2 ring-black" style={{ background: COLORS[c].hex }} />}
            </div>
          ))}
        </div>
      </div>
      <p className="text-sm text-white/80 text-center max-w-xs">Fill the white grid with the side. The dots show the colors we see.</p>
      <button
        type="button"
        onClick={capture}
        disabled={status !== 'live'}
        className="w-full max-w-sm rounded-2xl bg-white text-black font-extrabold text-lg py-4 disabled:opacity-40"
      >
        📸 Snap this side
      </button>
    </div>
  )
}
