// utils/staticMode.js
// Determines whether the app is running in static (GitHub Pages) mode.
// Vite automatically injects env vars prefixed with VITE_ into import.meta.env.
export const isStatic = () => {
  // Prefer the VITE_STATIC flag (set via cross-env VITE_STATIC=true)
  if (import.meta.env?.VITE_STATIC) {
    return import.meta.env.VITE_STATIC === 'true' || import.meta.env.VITE_STATIC === true;
  }
  // Fallback to plain process.env (for any non‑Vite usage)
  return process?.env?.STATIC === 'true' || process?.env?.VITE_STATIC === 'true';
};
