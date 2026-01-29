/**
 * Iframe Entry Point
 * This file is the entry point for the iframe-based editor.
 * It receives configuration via postMessage and renders the editor.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorApp } from '../core/EditorApp';
import { removeImageBackground } from '../lib/backgroundRemoval';
import '../index.css';

function IframeEditor() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleMessage = (event) => {
      const { type, payload } = event.data || {};

      if (type === 'INIT_EDITOR') {
        setConfig(payload);
      }
    };

    window.addEventListener('message', handleMessage);

    // Notify parent that iframe is ready
    window.parent.postMessage({ type: 'EDITOR_READY' }, '*');

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleComplete = useCallback((result) => {
    window.parent.postMessage({
      type: 'EDITOR_COMPLETE',
      payload: {
        base64: result.base64,
        dataUrl: result.dataUrl,
        width: result.width,
        height: result.height,
        format: result.format,
        metadata: result.metadata,
      },
    }, '*');
  }, []);

  const handleClose = useCallback(() => {
    window.parent.postMessage({ type: 'EDITOR_CLOSE' }, '*');
  }, []);

  const handleError = useCallback((err) => {
    setError(err.message || String(err));
    window.parent.postMessage({
      type: 'EDITOR_ERROR',
      payload: { message: err.message || String(err) },
    }, '*');
  }, []);

  if (error) {
    return (
      <div className="ai-editor-app flex items-center justify-center h-screen bg-red-50 text-red-600 p-4">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Error</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="ai-editor-app flex items-center justify-center h-screen bg-gray-100">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <EditorApp
      imageSrc={config.imageSrc}
      apiKey={config.apiKey}
      baseUrl={config.baseUrl}
      modelName={config.modelName}
      useGeminiNative={config.useGeminiNative}
      onComplete={handleComplete}
      onClose={handleClose}
      onError={handleError}
      onRemoveBackground={removeImageBackground}
    />
  );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<IframeEditor />);
}
