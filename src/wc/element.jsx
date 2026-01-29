import React from 'react';
import { createRoot } from 'react-dom/client';
import { EditorModal } from '../core/EditorModal';

/**
 * AI Image Editor Web Component
 * Bridges React component to Custom Element for framework-agnostic usage
 * Uses iframe for complete CSS isolation
 */
class AIImageEditorElement extends HTMLElement {
  constructor() {
    super();
    this._root = null;
    this._reactRoot = null;
    this._container = null;
    this._iframeSrc = null;
    this._state = {
      isOpen: false,
      imageSrc: null,
      apiKey: '',
      baseUrl: '',
      modelName: '',
      useGeminiNative: false,
      onComplete: null,
      onClose: null,
      onError: null,
    };
  }

  connectedCallback() {
    // Use Light DOM - iframe provides CSS isolation
    this._root = this;

    // Determine iframe source URL
    this._iframeSrc = this._getIframeSrc();

    // Create React mount point
    this._container = document.createElement('div');
    this._container.id = 'ai-editor-container';
    this._container.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 99999;
      pointer-events: none;
    `;
    this._root.appendChild(this._container);

    // Mount React
    this._reactRoot = createRoot(this._container);
    this._render();
  }

  disconnectedCallback() {
    if (this._reactRoot) {
      this._reactRoot.unmount();
      this._reactRoot = null;
    }
    if (this._container) {
      this._container.remove();
      this._container = null;
    }
  }

  _getIframeSrc() {
    // Method 1: Use import.meta.url to get the current module's location
    try {
      const moduleUrl = new URL(import.meta.url);
      // Go up from chunks/xxx.js or ai-image-editor.es.mjs to dist/
      const basePath = moduleUrl.href.replace(/\/[^/]+$/, '').replace(/\/chunks$/, '');
      return `${basePath}/iframe/index.html`;
    } catch {
      // import.meta.url not available
    }

    // Method 2: Try to find script tag
    const scripts = document.querySelectorAll('script[src*="ai-image-editor"]');
    if (scripts.length > 0) {
      const scriptUrl = scripts[0].src;
      return scriptUrl.replace(/\/[^/]+$/, '/iframe/index.html');
    }

    // Method 3: Fallback to common paths
    return '/node_modules/ai-image-editor/dist/iframe/index.html';
  }

  _render() {
    if (!this._reactRoot) return;

    // Update container pointer-events based on open state
    if (this._container) {
      this._container.style.pointerEvents = this._state.isOpen ? 'auto' : 'none';
    }

    this._reactRoot.render(
      React.createElement(EditorModal, {
        isOpen: this._state.isOpen,
        imageSrc: this._state.imageSrc,
        apiKey: this._state.apiKey,
        baseUrl: this._state.baseUrl,
        modelName: this._state.modelName,
        useGeminiNative: this._state.useGeminiNative,
        iframeSrc: this._iframeSrc,
        onComplete: (result) => {
          this._state.onComplete?.(result);
          this.dispatchEvent(new CustomEvent('complete', { detail: result }));
        },
        onClose: () => {
          this._state.isOpen = false;
          this._state.onClose?.();
          this.dispatchEvent(new CustomEvent('close'));
          this._render();
        },
        onError: (error) => {
          this._state.onError?.(error);
          this.dispatchEvent(new CustomEvent('error', { detail: error }));
        },
      })
    );
  }

  /**
   * Open the editor with specified options
   */
  open(options) {
    const {
      image,
      apiKey,
      baseUrl = '',
      modelName = '',
      useGeminiNative = false,
      iframeSrc,
      onComplete,
      onClose,
      onError,
    } = options;

    // Allow custom iframe source
    if (iframeSrc) {
      this._iframeSrc = iframeSrc;
    }

    // Get image source
    let imageSrc = image;
    if (image instanceof HTMLImageElement) {
      imageSrc = image.src;
    }

    this._state = {
      isOpen: true,
      imageSrc,
      apiKey,
      baseUrl,
      modelName,
      useGeminiNative,
      onComplete,
      onClose,
      onError,
    };

    this._render();
  }

  /**
   * Close the editor
   */
  close() {
    this._state.isOpen = false;
    this._render();
  }
}

// Register the custom element
if (!customElements.get('ai-image-editor')) {
  customElements.define('ai-image-editor', AIImageEditorElement);
}

export { AIImageEditorElement };
