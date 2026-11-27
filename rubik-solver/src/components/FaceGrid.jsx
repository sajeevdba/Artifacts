import { COLORS, COLOR_IDS } from '../lib/cube.js'

export function FaceGrid({ colors, selected, onTap, size = 'lg', label }) {
  const cell = size === 'lg' ? 'w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20' : size === 'md' ? 'w-9 h-9' : 'w-6 h-6'
  const gap = size === 'lg' ? 'gap-1.5 p-1.5 rounded-xl' : 'gap-0.5 p-0.5 rounded-md'
  return (
    <div className={`inline-grid grid-cols-3 bg-black ring-2 ring-white/20 ${gap}`} aria-label={label}>
      {colors.map((c, i) => (
        <button
          key={i}
          type="button"
          disabled={!onTap}
          onClick={() => onTap?.(i)}
          aria-label={`Square ${i + 1}: ${c ? COLORS[c].name : 'not set'}`}
          className={`${cell} rounded-[22%] flex items-center justify-center font-bold text-black/60 ${
            selected === i ? 'ring-4 ring-[#ff2d95] ring-offset-2 ring-offset-black z-10' : ''
          }`}
          style={{ background: c ? COLORS[c].hex : '#3a3a44' }}
        >
          {!c && size !== 'sm' && <span className="text-white/70">?</span>}
        </button>
      ))}
    </div>
  )
}

export function Palette({ onPick, current }) {
  return (
    <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Pick a color">
      {COLOR_IDS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onPick(id)}
          className={`flex flex-col items-center gap-1 rounded-xl px-1.5 py-1.5 ${current === id ? 'bg-white/15 ring-2 ring-white' : 'bg-white/5'}`}
        >
          <span className="block w-10 h-10 rounded-lg ring-2 ring-black" style={{ background: COLORS[id].hex }} />
          <span className="text-xs font-semibold">{COLORS[id].name}</span>
        </button>
      ))}
    </div>
  )
}
