/**
 * Lazy loader for heavy dependencies
 * Keeps initial bundle small, loads fabric.js and background removal on demand
 */

let depsPromise = null;
let bgRemovalPromise = null;

/**
 * Load core dependencies (fabric.js)
 * Called when editor modal opens
 */
export async function loadCoreDeps() {
  if (depsPromise) return depsPromise;

  depsPromise = import('fabric').then((mod) => ({
    fabric: mod,
  }));

  return depsPromise;
}

/**
 * Load background removal dependencies
 * Called only when user triggers background removal
 */
export async function loadBackgroundRemoval() {
  if (bgRemovalPromise) return bgRemovalPromise;

  bgRemovalPromise = import('@imgly/background-removal').then((mod) => ({
    removeBackground: mod.removeBackground,
  }));

  return bgRemovalPromise;
}

/**
 * Create a background removal handler with lazy loading
 */
export function createBackgroundRemovalHandler() {
  return async (imageUrl, onProgress) => {
    const { removeBackground } = await loadBackgroundRemoval();

    const result = await removeBackground(imageUrl, {
      progress: onProgress,
      output: {
        format: 'image/png',
        quality: 1,
      },
    });

    // Convert blob to data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(result);
    });
  };
}

/**
 * Warmup: preload dependencies without blocking
 */
export function warmupDeps() {
  loadCoreDeps();
}

/**
 * Check if dependencies are loaded
 */
export function areDepsLoaded() {
  return depsPromise !== null;
}
