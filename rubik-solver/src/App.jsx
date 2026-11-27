import { useEffect, useMemo, useRef, useState } from 'react'
import Camera from './components/Camera.jsx'
import CubeView from './components/CubeView.jsx'
import { FaceGrid, Palette } from './components/FaceGrid.jsx'
import {
  COLORS,
  FACE_NAMES,
  KOCIEMBA_ORDER,
  SCAN_STEPS,
  applyMove,
  centerColors,
  describeMove,
  emptyFaces,
  randomState,
  rotateGrid,
  stateToFaces,
  validateFaces,
} from './lib/cube.js'
import { solve, warmUpSolver } from './lib/solver.js'

function Btn({ children, variant = 'primary', className = '', ...rest }) {
  const styles = {
    primary: 'bg-white text-black',
    accent: 'bg-[#ff2d95] text-white',
    ghost: 'bg-white/10 text-white ring-1 ring-white/30',
  }
  return (
    <button
      type="button"
      className={`rounded-2xl font-extrabold py-3.5 px-4 text-base disabled:opacity-40 active:scale-[0.98] transition ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

function Header({ title, onBack, right }) {
  return (
    <header className="flex items-center gap-3 px-4 pt-4 pb-2">
      {onBack ? (
        <button type="button" onClick={onBack} className="w-10 h-10 rounded-full bg-white/10 text-xl font-bold" aria-label="Back">
          ←
        </button>
      ) : (
        <span className="w-10" />
      )}
      <h1 className="flex-1 text-center text-lg font-extrabold">{title}</h1>
      <span className="w-10 text-right">{right}</span>
    </header>
  )
}

// ---------------- Home ----------------
function Home({ onScan, onDemo }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      <CubeView
        state={'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'}
        scheme={{ U: 'W', R: 'R', F: 'G', D: 'Y', L: 'O', B: 'B' }}
        move="R"
        className="w-56 h-56"
      />
      <div>
        <h1 className="text-3xl font-black">Cube Solver</h1>
        <p className="mt-3 text-white/80 max-w-xs mx-auto">
          Snap a photo of each of the 6 sides. We&apos;ll show you short, simple turns to solve it.
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Btn onClick={onScan}>📷 Scan my cube</Btn>
        <Btn variant="ghost" onClick={onDemo}>
          Try a random demo cube
        </Btn>
      </div>
    </div>
  )
}

// ---------------- Scan ----------------
function Scan({ index, faces, setFaces, calib, onNext, onBack, onJump }) {
  const step = SCAN_STEPS[index]
  const [captured, setCaptured] = useState(() => faces[step.face].every(Boolean))
  const [selected, setSelected] = useState(null)
  const [noCamera, setNoCamera] = useState(null)
  const rawRef = useRef(null)

  useEffect(() => {
    setCaptured(faces[step.face].every(Boolean))
    setSelected(null)
    rawRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  const grid = faces[step.face]
  const setGrid = (g) => setFaces((f) => ({ ...f, [step.face]: g }))

  const showGrid = captured || noCamera
  const complete = grid.every(Boolean)

  return (
    <div className="min-h-full flex flex-col">
      <Header title={`Side ${index + 1} of 6`} onBack={onBack} />
      <div className="flex justify-center gap-2 px-4 pb-3">
        {SCAN_STEPS.map((s, i) => (
          <button
            key={s.face}
            type="button"
            onClick={() => onJump(i)}
            aria-label={`Go to ${s.title}`}
            className={`rounded-md p-0.5 ${i === index ? 'ring-2 ring-[#ff2d95]' : ''}`}
          >
            <FaceGrid colors={faces[s.face]} size="sm" />
          </button>
        ))}
      </div>
      <main className="flex-1 flex flex-col items-center gap-4 px-4 pb-8">
        <div className="w-full max-w-sm rounded-2xl bg-white/5 ring-1 ring-white/15 p-4">
          <h2 className="text-2xl font-black">{step.title}</h2>
          <p className="mt-1 text-white/85 leading-snug">{step.how}</p>
        </div>

        {!showGrid && (
          <>
            <Camera
              calib={calib}
              onCapture={(raw, ids) => {
                rawRef.current = raw
                setGrid(ids)
                setCaptured(true)
              }}
            />
            <button type="button" className="text-sm font-semibold text-white/80 underline underline-offset-4" onClick={() => setNoCamera('Tap each square and pick its color.')}>
              Enter the colors by hand instead
            </button>
          </>
        )}

        {showGrid && (
          <>
            {noCamera && !captured && <p className="text-sm text-amber-300 text-center max-w-sm">{noCamera}</p>}
            <p className="text-sm text-white/80 text-center">Tap any square that looks wrong, then pick its real color.</p>
            <FaceGrid colors={grid} selected={selected} onTap={(i) => setSelected(i)} label={`${step.title} colors`} />
            {selected !== null && (
              <Palette
                current={grid[selected]}
                onPick={(c) => {
                  const g = [...grid]
                  g[selected] = c
                  setGrid(g)
                  setSelected(selected < 8 && !noCamera ? null : selected < 8 ? selected + 1 : null)
                }}
              />
            )}
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              {!noCamera ? (
                <Btn variant="ghost" onClick={() => { setCaptured(false); setSelected(null) }}>
                  ↺ Retake
                </Btn>
              ) : (
                <Btn variant="ghost" onClick={() => setSelected(0)}>
                  Start at square 1
                </Btn>
              )}
              <Btn variant="ghost" onClick={() => setGrid(rotateGrid(grid))} title="Use if the side was held turned">
                ⟳ Rotate
              </Btn>
            </div>
            <Btn
              className="w-full max-w-sm text-lg"
              disabled={!complete}
              onClick={() => onNext(step.face, rawRef.current)}
            >
              {index < 5 ? 'Looks right → Next side' : 'Looks right → Check cube'}
            </Btn>
          </>
        )}
      </main>
    </div>
  )
}

// ---------------- Review ----------------
const NET = [
  [null, 'U', null, null],
  ['L', 'F', 'R', 'B'],
  [null, 'D', null, null],
]

function Review({ faces, setFaces, onBack, onRescan, onSolved }) {
  const [sel, setSel] = useState(null) // { face, i }
  const [busy, setBusy] = useState(false)
  const [solveError, setSolveError] = useState(null)
  const check = useMemo(() => validateFaces(faces), [faces])

  async function doSolve() {
    setBusy(true)
    setSolveError(null)
    try {
      const moves = await solve(check.state)
      onSolved(check.state, moves)
    } catch (e) {
      setSolveError("Couldn't solve this cube: " + e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      <Header title="Check your cube" onBack={onBack} />
      <main className="flex-1 flex flex-col items-center gap-4 px-3 pb-8">
        <p className="text-sm text-white/80 text-center max-w-sm">
          All 6 sides, unfolded. Tap a square to fix it, or tap a side&apos;s name to scan it again.
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {NET.flat().map((f, idx) =>
            f ? (
              <div key={idx} className="flex flex-col items-center gap-0.5">
                <button
                  type="button"
                  className="text-[11px] font-bold text-white/80 underline underline-offset-2"
                  onClick={() => onRescan(SCAN_STEPS.findIndex((s) => s.face === f))}
                >
                  {FACE_NAMES[f]}
                </button>
                <FaceGrid
                  size="md"
                  colors={faces[f]}
                  selected={sel?.face === f ? sel.i : null}
                  onTap={(i) => setSel({ face: f, i })}
                />
              </div>
            ) : (
              <div key={idx} />
            ),
          )}
        </div>
        {sel && (
          <Palette
            current={faces[sel.face][sel.i]}
            onPick={(c) => {
              setFaces((fs) => {
                const g = [...fs[sel.face]]
                g[sel.i] = c
                return { ...fs, [sel.face]: g }
              })
              setSel(null)
            }}
          />
        )}
        <div
          className={`w-full max-w-sm rounded-2xl p-4 font-semibold ${
            check.ok ? 'bg-emerald-500/15 ring-2 ring-emerald-400 text-emerald-200' : 'bg-amber-500/15 ring-2 ring-amber-400 text-amber-100'
          }`}
          role="status"
        >
          {check.ok ? '✓ This looks like a real cube. Ready to solve!' : `⚠ ${check.error}`}
        </div>
        {solveError && <p className="text-red-300 text-sm">{solveError}</p>}
        <Btn variant="accent" className="w-full max-w-sm text-lg" disabled={!check.ok || busy} onClick={doSolve}>
          {busy ? 'Working out the shortest way…' : 'Solve it!'}
        </Btn>
      </main>
    </div>
  )
}

// ---------------- Solution steps ----------------
function Steps({ start, moves, scheme, onRestart }) {
  const [step, setStep] = useState(0) // 0..moves.length (== done)
  const [playing, setPlaying] = useState(false)
  const states = useMemo(() => {
    const s = [start]
    for (const m of moves) s.push(applyMove(s[s.length - 1], m))
    return s
  }, [start, moves])

  const total = moves.length
  const done = step >= total

  useEffect(() => {
    if (!playing) return
    if (done) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setStep((s) => Math.min(total, s + 1)), 3000)
    return () => clearTimeout(t)
  }, [playing, step, done, total])

  const move = done ? null : moves[step]
  const info = move ? describeMove(move) : null
  const faceColor = move ? COLORS[scheme[move[0]]].name.toLowerCase() : null

  return (
    <div className="min-h-full flex flex-col">
      <Header title={done ? 'Solved!' : `Step ${step + 1} of ${total}`} onBack={onRestart} />
      <div className="px-4">
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-[#ff2d95] transition-all" style={{ width: `${total ? (Math.min(step, total) / total) * 100 : 100}%` }} />
        </div>
        <p className="mt-3 text-center text-sm text-white/85">
          Hold the cube with the <b className="text-white">{COLORS[scheme.F].name}</b> center facing you and the{' '}
          <b className="text-white">{COLORS[scheme.U].name}</b> center on top. Keep it that way for every step.
        </p>
      </div>
      <main className="flex-1 flex flex-col items-center gap-3 px-4 pb-6">
        <CubeView state={states[step]} scheme={scheme} move={move} className="w-full max-w-[20rem] aspect-square" />
        {info ? (
          <div className="w-full max-w-sm rounded-2xl bg-white text-black p-4 text-center" aria-live="polite">
            <div className="text-2xl font-black leading-tight">{info.layer}</div>
            <div className="text-sm font-semibold text-black/60">(the side with the {faceColor} center)</div>
            <div className="mt-2 text-xl font-extrabold">{info.action}</div>
            <div className="mt-2 inline-block rounded-full bg-[#ff2d95] text-white font-black px-4 py-1 text-lg">
              {info.count} {info.count === 1 ? 'turn' : 'turns'}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm rounded-2xl bg-emerald-400 text-black p-5 text-center">
            <div className="text-3xl font-black">🎉 All done!</div>
            <div className="mt-1 font-semibold">
              {total === 0 ? 'Your cube was already solved.' : `Solved in ${total} moves.`}
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 w-full max-w-sm mt-1">
          <Btn variant="ghost" disabled={step === 0} onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)) }}>
            ◀ Back
          </Btn>
          <Btn
            variant={playing ? 'accent' : 'ghost'}
            disabled={done}
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={playing}
          >
            {playing ? '❚❚ Pause' : '▶ Auto'}
          </Btn>
          <Btn disabled={done} onClick={() => { setPlaying(false); setStep((s) => Math.min(total, s + 1)) }}>
            Next ▶
          </Btn>
        </div>
        {done && (
          <Btn variant="ghost" className="w-full max-w-sm" onClick={onRestart}>
            Solve another cube
          </Btn>
        )}
      </main>
    </div>
  )
}

// ---------------- App ----------------
export default function App() {
  const [screen, setScreen] = useState('home')
  const [faces, setFaces] = useState(emptyFaces)
  const [scanIndex, setScanIndex] = useState(0)
  const [calib, setCalib] = useState({})
  const [solution, setSolution] = useState(null)

  useEffect(() => {
    warmUpSolver()
  }, [])

  function reset() {
    setFaces(emptyFaces())
    setCalib({})
    setScanIndex(0)
    setSolution(null)
    setScreen('home')
  }

  if (screen === 'home') {
    return (
      <Home
        onScan={() => setScreen('scan')}
        onDemo={() => {
          setFaces(stateToFaces(randomState()))
          setScreen('review')
        }}
      />
    )
  }

  if (screen === 'scan') {
    return (
      <Scan
        index={scanIndex}
        faces={faces}
        setFaces={setFaces}
        calib={calib}
        onBack={() => (scanIndex === 0 ? setScreen('home') : setScanIndex(scanIndex - 1))}
        onJump={setScanIndex}
        onNext={(face, raw) => {
          if (raw) {
            const c = faces[face][4]
            setCalib((cal) => ({ ...cal, [c]: [...(cal[c] || []), raw[4]] }))
          }
          const nextMissing = SCAN_STEPS.findIndex((s, i) => i > scanIndex && !faces[s.face].every(Boolean))
          if (nextMissing !== -1) setScanIndex(nextMissing)
          else if (KOCIEMBA_ORDER.every((k) => faces[k].every(Boolean))) setScreen('review')
          else setScanIndex(SCAN_STEPS.findIndex((s) => !faces[s.face].every(Boolean)))
        }}
      />
    )
  }

  if (screen === 'review') {
    return (
      <Review
        faces={faces}
        setFaces={setFaces}
        onBack={() => setScreen('scan')}
        onRescan={(i) => {
          setScanIndex(i)
          setScreen('scan')
        }}
        onSolved={(state, moves) => {
          setSolution({ state, moves, scheme: centerColors(faces) })
          setScreen('steps')
        }}
      />
    )
  }

  return <Steps start={solution.state} moves={solution.moves} scheme={solution.scheme} onRestart={reset} />
}
