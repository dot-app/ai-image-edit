/**
 * IframeEditor - Renders the editor in an iframe for complete CSS isolation
 */
import React, { useRef, useEffect, useCallback } from 'react';

/**
 * @param {Object} props
 * @param {string} props.iframeSrc - URL to the iframe editor HTML
 * @param {string} props.imageSrc - Image to edit
 * @param {string} props.apiKey - API key
 * @param {string} props.baseUrl - API base URL
 * @param {string} props.modelName - Model name
 * @param {boolean} props.useGeminiNative - Use Gemini native API
 * @param {Function} props.onComplete - Called with edited image result
 * @param {Function} props.onClose - Called when editor closes
 * @param {Function} props.onError - Called on error
 */
export function IframeEditor({
  iframeSrc,
  imageSrc,
  apiKey,
  baseUrl,
  modelName,
  useGeminiNative,
  onComplete,
  onClose,
  onError,
}) {
  const iframeRef = useRef(null);
  const configSentRef = useRef(false);

  const sendConfig = useCallback(() => {
    if (configSentRef.current) return;
    if (!iframeRef.current?.contentWindow) return;

    iframeRef.current.contentWindow.postMessage({
      type: 'INIT_EDITOR',
      payload: {
        imageSrc,
        apiKey,
        baseUrl,
        modelName,
        useGeminiNative,
      },
    }, '*');
    configSentRef.current = true;
  }, [imageSrc, apiKey, baseUrl, modelName, useGeminiNative]);

  useEffect(() => {
    const handleMessage = (event) => {
      const { type, payload } = event.data || {};

      switch (type) {
        case 'EDITOR_READY':
          sendConfig();
          break;
        case 'EDITOR_COMPLETE':
          onComplete?.(payload);
          break;
        case 'EDITOR_CLOSE':
          onClose?.();
          break;
        case 'EDITOR_ERROR':
          onError?.(new Error(payload?.message || 'Unknown error'));
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sendConfig, onComplete, onClose, onError]);

  return (
    <iframe
      ref={iframeRef}
      src={iframeSrc}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
      }}
      title="AI Image Editor"
      allow="clipboard-read; clipboard-write"
    />
  );
}
