# Cube Solver

A mobile-friendly web app that scans a 3x3 Rubik's Cube with the phone camera and walks you through solving it in plain English.

- **Scan**: one side at a time with a 3x3 grid overlay and live color dots. Tap any square to fix its color; rotate a side if it was held turned.
- **Check**: an unfolded view of all 6 sides that catches impossible cubes (wrong color counts, twisted corners, flipped edges, swapped pieces).
- **Solve**: the Kociemba two-phase solver from [`cubejs`](https://github.com/ldez/cubejs), run in a Web Worker. Usually about 20 moves.
- **Steps**: no cube notation. Each step shows a cube picture with the moving layer highlighted, a bold curved arrow for the direction, a turn count, and text like "Right side · turn up · 1 turn". Back, Next, Auto-Play, and "Step 2 of 18".

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static files in dist/
```

The camera needs HTTPS (or localhost). To try it on a phone, deploy `dist/` to any static host (GitHub Pages, Netlify, Vercel), or run `npm run dev -- --host` and open it over a tunnel that provides HTTPS.

No camera? Every side can be filled in by hand, and the home screen has a random demo cube.

## How the sides map to the solver

Scan order is Front, Right, Back, Left, Top, Bottom. The user turns the whole cube left between the first four, then tips it to show the top and bottom. The solution is then described while holding the cube with the same front and top, so "Right side · turn up" means the right column moves away from you over the top.
