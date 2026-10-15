# chalkboard: notes for agents

- Each aid lives in `aids/<name>/` and must work from a static file server with
  no build step: vanilla ES modules, canvas, and no dependencies at runtime.
- Algorithms are generators yielding trace events (`enter`/`leave`/`op`/`unwind`;
  see `aids/pressure-solver/src/linear.js` header). Keep the visualised code
  and the tested code the same code; never fork a "display copy".
- Every colour comes from CSS tokens in the aid's `style.css` (light =
  whiteboard, dark = chalkboard). Canvas code reads them via `readPalette`.
  Never hard-code a colour that only works in one theme.
- Pages must work at phone width (≈390 px). Check with
  `node tools/screenshot.mjs --width 390 --height 844`.
- `npm test` must pass. When you change physics or solver behaviour, keep the
  pressure-solver tests (convergence per scenario, mass conservation, Jacobian
  vs finite differences, V-cycle energy reduction, BiCGStab forcing) green.
- When an aid models a real algorithm, keep the README's code map and
  simplifications list in step with the code.
