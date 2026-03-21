'use strict';

// One-Euro Filter — Jitter reduction for landmark tracking
// Based on: https://cristal.univ-lille.fr/~casiez/1euro/
//
// Provides smooth, low-latency filtering of noisy signals (e.g., face landmarks).
// fc = minimum cutoff frequency (lower = smoother, more lag)
// beta = speed coefficient (higher = less lag during fast movement)
// d_cutoff = cutoff frequency for derivative

function createOneEuroFilter(fc = 0.4, beta = 0.0025, d_cutoff = 1.0) {
  let xPrev = null;
  let dxPrev = 0;
  let tPrev = null;

  function smoothingFactor(te, cutoff) {
    const r = 2 * Math.PI * cutoff * te;
    return r / (r + 1);
  }

  function exponentialSmoothing(a, x, xPrev) {
    return a * x + (1 - a) * xPrev;
  }

  return function filter(x, timestamp) {
    if (tPrev === null) {
      tPrev = timestamp;
      xPrev = x;
      return x;
    }

    const te = (timestamp - tPrev) / 1000; // seconds
    if (te <= 0) return xPrev;

    tPrev = timestamp;

    // Derivative
    const dx = (x - xPrev) / te;
    const a_d = smoothingFactor(te, d_cutoff);
    const dxSmooth = exponentialSmoothing(a_d, dx, dxPrev);
    dxPrev = dxSmooth;

    // Adaptive cutoff
    const cutoff = fc + beta * Math.abs(dxSmooth);
    const a = smoothingFactor(te, cutoff);
    const xSmooth = exponentialSmoothing(a, x, xPrev);
    xPrev = xSmooth;

    return xSmooth;
  };
}

if (typeof window !== 'undefined') {
  window.createOneEuroFilter = createOneEuroFilter;
}
