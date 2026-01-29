import React, { useEffect, useState, useCallback, useRef } from 'react';

/**
 * EditorModal - Modal wrapper using iframe for complete CSS isolation
 * Uses inline styles to avoid any CSS conflicts with host application
 */
export function EditorModal({
  isOpen,
  imageSrc,
  apiKey,
  baseUrl,
  modelName,
  useGeminiNative,
  onComplete,
  onClose,
  onError,
  iframeSrc,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const iframeRef = useRef(null);
  const configSentRef = useRef(false);

  // Reset config sent flag when modal opens with new image
  useEffect(() => {
    if (isOpen) {
      configSentRef.current = false;
    }
  }, [isOpen, imageSrc]);

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

    if (isOpen) {
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [isOpen, sendConfig, onComplete, onClose, onError]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  }, [onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose?.();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isVisible) return null;

  // All styles are inline to avoid CSS pollution
  const backdropStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    backgroundColor: isAnimating ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0)',
    backdropFilter: isAnimating ? 'blur(4px)' : 'none',
    WebkitBackdropFilter: isAnimating ? 'blur(4px)' : 'none',
  };

  const contentStyle = {
    width: '95vw',
    height: '90vh',
    maxWidth: '1800px',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    transition: 'all 0.3s ease',
    opacity: isAnimating ? 1 : 0,
    transform: isAnimating ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(16px)',
  };

  const iframeStyle = {
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block',
  };

  return (
    <div style={backdropStyle} onClick={handleBackdropClick}>
      <div style={contentStyle}>
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          style={iframeStyle}
          title="AI Image Editor"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
