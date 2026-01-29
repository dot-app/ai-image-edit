/**
 * AI Image Editor - Main API Entry
 *
 * Usage:
 *   import AIImageEdit from 'ai-image-editor';
 *
 *   AIImageEdit.init({ hover: true });
 *   AIImageEdit.open({
 *     image: document.querySelector('#my-image'),
 *     apiKey: 'your-api-key',
 *     baseUrl: 'https://api.example.com',
 *     modelName: 'gpt-image-1',
 *     onComplete: (result) => console.log(result),
 *   });
 */

// No CSS import needed - CSS is isolated in iframe

import { observeImages, removeAllButtons } from './hover/observer';
import { warmupDeps } from './lib/loader';
import './wc/element.jsx';

let editorElement = null;
let hoverCleanup = null;
let isInitialized = false;
let globalConfig = {};

/**
 * Ensure the web component element exists
 */
function ensureElement(modalRoot) {
  if (editorElement) return editorElement;

  editorElement = document.createElement('ai-image-editor');
  (modalRoot || document.body).appendChild(editorElement);

  return editorElement;
}

/**
 * Initialize the AI Image Editor
 *
 * @param {Object} options
 * @param {boolean|Object} options.hover - Enable hover buttons on images
 * @param {HTMLElement} options.modalRoot - Modal mount point (default: document.body)
 * @param {boolean} options.warmup - Preload heavy dependencies
 * @param {string} options.iframeSrc - Custom iframe source URL
 * @param {Object} options.defaults - Default API config for all open() calls
 */
function init(options = {}) {
  if (isInitialized) {
    console.warn('AIImageEdit already initialized. Call destroy() first to reinitialize.');
    return AIImageEdit;
  }

  const {
    hover = false,
    modalRoot,
    warmup = false,
    iframeSrc,
    defaults = {},
  } = options;

  globalConfig = { ...defaults };
  if (iframeSrc) {
    globalConfig.iframeSrc = iframeSrc;
  }

  // Create the editor element
  ensureElement(modalRoot);

  // Setup hover buttons if enabled
  if (hover) {
    const hoverOptions = typeof hover === 'object' ? hover : {};

    // Get API config from hover options or use a callback
    const getOpenOptions = hoverOptions.getConfig || (() => ({}));

    hoverCleanup = observeImages(hoverOptions, (img) => {
      const config = getOpenOptions(img);
      open({
        image: img,
        ...globalConfig,
        ...config,
      });
    });
  }

  // Preload dependencies if requested
  if (warmup) {
    warmupDeps();
  }

  isInitialized = true;
  return AIImageEdit;
}

/**
 * Open the editor with an image
 *
 * @param {Object} options
 * @param {HTMLImageElement|string} options.image - Image element or URL
 * @param {string} options.apiKey - API key (required)
 * @param {string} options.baseUrl - API base URL
 * @param {string} options.modelName - Model name
 * @param {boolean} options.useGeminiNative - Use Gemini native format
 * @param {Function} options.onComplete - Called with result when editing completes
 * @param {Function} options.onClose - Called when editor closes
 * @param {Function} options.onError - Called on error
 */
async function open(options) {
  const mergedOptions = {
    ...globalConfig,
    ...options,
  };

  if (!mergedOptions.apiKey) {
    console.error('AIImageEdit: apiKey is required');
    mergedOptions.onError?.(new Error('apiKey is required'));
    return;
  }

  if (!mergedOptions.image) {
    console.error('AIImageEdit: image is required');
    mergedOptions.onError?.(new Error('image is required'));
    return;
  }

  const element = ensureElement();
  element.open(mergedOptions);
}

/**
 * Close the editor
 */
function close() {
  if (editorElement) {
    editorElement.close();
  }
}

/**
 * Destroy the editor and cleanup
 */
function destroy() {
  // Cleanup hover observers
  if (hoverCleanup) {
    hoverCleanup();
    hoverCleanup = null;
  }

  removeAllButtons();

  // Remove editor element
  if (editorElement) {
    editorElement.remove();
    editorElement = null;
  }

  globalConfig = {};
  isInitialized = false;
}

/**
 * Check if the editor is initialized
 */
function isReady() {
  return isInitialized;
}

const AIImageEdit = {
  init,
  open,
  close,
  destroy,
  isReady,
  version: '__VERSION__',
};

export default AIImageEdit;
export { init, open, close, destroy, isReady };
