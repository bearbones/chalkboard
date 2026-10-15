// Physical model: a small local-thermal-equilibrium (LTE) fluid of water,
// vapour and air, in mm-scale reference units.
//
//   length  1 mm   (one cell; cell volume = 1)
//   time    1/60 s (one outer update)
//   mass    1 mg
//   pressure 3.6 Pa — chosen so that one pressure unit accelerates one mg by one
//            cell per time-unit²: 3.6 Pa · 1 mm² = 3.6 µN = 1 mg · 1 mm/(1/60 s)².
//
// Energy is in µJ (mg · J/(kg·K) · K). Temperatures are kelvin.

export const PA_PER_UNIT = 3.6;
export const P_ATM = 101325 / PA_PER_UNIT; // ≈ 28146 units
export const RHO = 0.95837; // liquid water, mg per cell
export const GRAVITY = (9.80665 * 1000) / 3600; // ≈ 2.724 cells per time-unit²
export const CP_LIQ = 4186; // J/(kg·K)
export const CP_VAP = 2010;
export const CP_AIR = 1005;
export const R_VAP = 461.52; // J/(kg·K)
export const R_AIR = 287.05;
export const T_ATM = 300;
// Latent heat as L(T) = L0 + (cp_vap − cp_liq)·T, pinned to 2.257 MJ/kg at 373.15 K.
export const LATENT_0 = 2.257e6 - (CP_VAP - CP_LIQ) * 373.15;
// The pressure floor the line search enforces: p_sat(273.15 K).
export const P_FLOOR = 611.2 / PA_PER_UNIT;

// Gas volume in cells for `gasR` = Σ m·R_specific (mg·J/(kg·K)) at T and p:
// V[mm³] = m[mg]·1e-6 · R · T / (p·3.6 Pa) · 1e9.
export function gasVolume(gasR, T, p) {
  return (gasR * T * 1000) / (PA_PER_UNIT * p);
}

// Ambient air density, mg per cell.
export const RHO_AIR_ATM = 1 / gasVolume(R_AIR, T_ATM, P_ATM);

// IAPWS-IF97 region-4 saturation pressure (Pa); valid 273.15–647.096 K, mildly extrapolated
// below.
const N = [
  0.11670521452767e4, -0.72421316703206e6, -0.17073846940092e2, 0.1202082470247e5,
  -0.32325550322333e7, 0.1491510861353e2, -0.48232657361591e4, 0.40511340542057e6,
  -0.23855557567849, 0.65017534844798e3,
];
export function saturationPressurePa(T) {
  // Below the triple point, a Clausius–Clapeyron tail keeps the curve positive
  // and monotone, so the phase-split bisection stays bracketed even when a
  // trial split would drive a parcel's temperature absurdly low.
  if (T < 273.16) return T > 0 ? 611.657 * Math.exp((2.5e6 / R_VAP) * (1 / 273.16 - 1 / T)) : 0;
  // Above the critical point (647 K) the same applies on the other side: a
  // trial split that condenses a steam parcel releases latent heat into a tiny
  // heat capacity and can push T far past it. Continue the curve steeply.
  if (T > 640) return saturationPressurePa(640) * Math.pow(T / 640, 40);
  const th = T + N[8] / (T - N[9]);
  const A = th * th + N[0] * th + N[1];
  const B = N[2] * th * th + N[3] * th + N[4];
  const C = N[5] * th * th + N[6] * th + N[7];
  const x = (2 * C) / (-B + Math.sqrt(B * B - 4 * A * C));
  return x * x * x * x * 1e6;
}

// Saturation temperature at pressure pPa (inverse of the above, by bisection).
export function saturationTemperature(pPa) {
  let lo = 250,
    hi = 640;
  for (let k = 0; k < 80; k++) {
    const mid = 0.5 * (lo + hi);
    if (saturationPressurePa(mid) < pPa) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

// Total enthalpy of a parcel (µJ): sensible heat of every phase plus the
// latent content banked in its vapour.
export function enthalpy(ml, mv, ma, T) {
  return ml * CP_LIQ * T + mv * (CP_VAP * T + LATENT_0) + ma * CP_AIR * T;
}

export function temperatureOf(H, water, mv, ma) {
  return (H - mv * LATENT_0) / ((water - mv) * CP_LIQ + mv * CP_VAP + ma * CP_AIR);
}

// The per-cell source: local thermal/phase equilibrium at a trial pressure p.
// Purely local — it reads only this cell's own p and its frozen inventory.
//
// Find vapour mass mv ∈ [0, water] with  p_sat(T(mv)) = p · x_vap(mv), where
// x_vap is vapour's share of the gas by moles (Σ m·R). More vapour means a lower
// temperature (latent heat) and a larger vapour share, so the condition is
// monotone and bisection is safe.
export function phaseSplit(water, ma, H, p) {
  const pPa = p * PA_PER_UNIT;
  const f = (mv) => {
    const T = temperatureOf(H, water, mv, ma);
    const gasR = mv * R_VAP + ma * R_AIR;
    const x = gasR > 0 ? (mv * R_VAP) / gasR : 1;
    return saturationPressurePa(T) - pPa * x;
  };
  let mv;
  if (water <= 0) mv = 0;
  else if (f(0) <= 0) mv = 0; // subcooled: all liquid
  else if (f(water) >= 0) mv = water; // superheated: all vapour
  else {
    let lo = 0,
      hi = water;
    for (let k = 0; k < 80; k++) {
      const mid = 0.5 * (lo + hi);
      if (f(mid) > 0) lo = mid;
      else hi = mid;
    }
    mv = 0.5 * (lo + hi);
  }
  const T = temperatureOf(H, water, mv, ma);
  const gasR = mv * R_VAP + ma * R_AIR;
  const Vg = gasR > 0 ? gasVolume(gasR, T, p) : 0;
  const ml = water - mv;
  return { mv, ml, T, Vg, occupancy: ml / RHO + Vg };
}
