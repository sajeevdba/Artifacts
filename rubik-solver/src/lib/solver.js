// Small promise wrapper around the solver worker.
// Inlined so the app also works as a single self-contained page.
import SolverWorker from '../solver.worker.js?worker&inline'

let worker
let readyPromise
let nextId = 1
const pending = new Map()

function getWorker() {
  if (!worker) {
    worker = new SolverWorker()
    readyPromise = new Promise((resolve) => {
      worker.addEventListener('message', (e) => {
        const m = e.data
        if (m.type === 'ready') resolve()
        else if (pending.has(m.id)) {
          const { res, rej } = pending.get(m.id)
          pending.delete(m.id)
          m.type === 'error' ? rej(new Error(m.message)) : res(m.moves)
        }
      })
    })
    worker.postMessage({ type: 'init' })
  }
  return worker
}

export function warmUpSolver() {
  getWorker()
  return readyPromise
}

export function solve(state) {
  const w = getWorker()
  const id = nextId++
  return new Promise((res, rej) => {
    pending.set(id, { res, rej })
    w.postMessage({ type: 'solve', id, state })
  })
}
