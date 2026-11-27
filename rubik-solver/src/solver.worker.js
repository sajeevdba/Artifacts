// Runs the Kociemba two-phase solver (cubejs) off the main thread.
import Cube from 'cubejs'

let ready = false
function init() {
  if (!ready) {
    Cube.initSolver()
    ready = true
  }
}

self.onmessage = (e) => {
  const { type, id, state } = e.data
  try {
    if (type === 'init') {
      init()
      self.postMessage({ type: 'ready' })
    } else if (type === 'solve') {
      init()
      const cube = Cube.fromString(state)
      const solution = cube.isSolved() ? '' : cube.solve()
      self.postMessage({ type: 'solution', id, moves: solution.trim() ? solution.trim().split(/\s+/) : [] })
    }
  } catch (err) {
    self.postMessage({ type: 'error', id, message: String(err && err.message ? err.message : err) })
  }
}
