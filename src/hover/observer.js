/**
 * Image observer and hover button injection system
 * Detects images in the DOM and adds AI edit buttons on hover
 */

const BUTTON_STYLES = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  width: '36px',
  height: '36px',
  padding: '0',
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: '#6366f1',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  opacity: '0',
  transform: 'scale(0.9)',
  transition: 'opacity 0.2s ease, transform 0.2s ease',
  zIndex: '1000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
  pointerEvents: 'auto',
};

const BUTTON_HOVER_STYLES = {
  opacity: '1',
  transform: 'scale(1)',
};

// Sparkles icon (matches lucide-react Sparkles)
const SPARKLES_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>`;

/**
 * Create and attach hover button to an image
 */
function attachButton(img, openFn, options = {}) {
  const { render, buttonStyle = {} } = options;

  // Allow custom rendering
  if (render) {
    render(img, () => openFn(img));
    return;
  }

  // Ensure parent has positioning context
  const parent = img.parentElement;
  if (!parent) return;

  const parentPosition = getComputedStyle(parent).position;
  if (parentPosition === 'static') {
    parent.style.position = 'relative';
  }

  // Create button (icon only, no text)
  const btn = document.createElement('button');
  btn.className = 'ai-image-edit-btn';
  btn.setAttribute('data-ai-edit-btn', 'true');
  btn.setAttribute('title', 'AI Edit');
  btn.innerHTML = SPARKLES_SVG;

  // Apply styles
  Object.assign(btn.style, BUTTON_STYLES, buttonStyle);

  // Show/hide on hover
  const showButton = () => {
    Object.assign(btn.style, BUTTON_HOVER_STYLES);
  };

  const hideButton = () => {
    btn.style.opacity = '0';
    btn.style.transform = 'scale(0.9)';
  };

  // Button hover effect (color change)
  btn.addEventListener('mouseenter', () => {
    btn.style.background = 'rgba(99, 102, 241, 1)';
    btn.style.color = '#ffffff';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = 'rgba(255, 255, 255, 0.9)';
    btn.style.color = '#6366f1';
  });

  img.addEventListener('pointerenter', showButton);
  img.addEventListener('pointerleave', (e) => {
    if (!btn.contains(e.relatedTarget)) {
      hideButton();
    }
  });

  btn.addEventListener('pointerenter', showButton);
  btn.addEventListener('pointerleave', (e) => {
    if (e.relatedTarget !== img) {
      hideButton();
    }
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    openFn(img);
  });

  // Prevent button from triggering image click
  btn.addEventListener('mousedown', (e) => e.stopPropagation());

  parent.appendChild(btn);

  // Return cleanup function
  return () => {
    img.removeEventListener('pointerenter', showButton);
    btn.remove();
  };
}

/**
 * Observe images in the DOM and attach hover buttons
 *
 * @param {Object} options
 * @param {string} options.selector - CSS selector for target images
 * @param {Function} options.detect - Custom detection function (img) => boolean
 * @param {Function} options.render - Custom button render function
 * @param {Object} options.buttonStyle - Custom button styles
 * @param {string} options.buttonText - Custom button text
 * @param {Function} openFn - Function to call when button is clicked
 * @returns {Function} Cleanup function to stop observing
 */
export function observeImages(options, openFn) {
  const {
    selector = 'img:not([data-ai-ignore])',
    detect,
    minWidth = 100,
    minHeight = 100,
  } = options;

  const seen = new WeakSet();
  const cleanups = new Map();

  const shouldProcess = (img) => {
    if (seen.has(img)) return false;
    if (img.hasAttribute('data-ai-ignore')) return false;
    if (img.hasAttribute('data-ai-edit-btn')) return false;

    // Wait for image to load
    if (!img.complete || !img.naturalWidth) return false;

    // Check minimum dimensions
    if (img.naturalWidth < minWidth || img.naturalHeight < minHeight) return false;

    // Custom detection
    if (detect && !detect(img)) return false;

    return true;
  };

  const processImage = (img) => {
    if (!shouldProcess(img)) return;

    seen.add(img);
    const cleanup = attachButton(img, openFn, options);
    if (cleanup) {
      cleanups.set(img, cleanup);
    }
  };

  // Handle lazy-loaded images
  const handleImageLoad = (e) => {
    if (e.target.tagName === 'IMG') {
      processImage(e.target);
    }
  };

  // Initial scan
  document.querySelectorAll(selector).forEach(processImage);

  // Listen for image loads
  document.addEventListener('load', handleImageLoad, true);

  // Observe DOM mutations
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;

        // Check if the node itself is an image
        if (node.tagName === 'IMG' && node.matches(selector)) {
          if (node.complete) {
            processImage(node);
          } else {
            node.addEventListener('load', () => processImage(node), { once: true });
          }
        }

        // Check descendant images
        node.querySelectorAll?.(selector).forEach((img) => {
          if (img.complete) {
            processImage(img);
          } else {
            img.addEventListener('load', () => processImage(img), { once: true });
          }
        });
      });

      // Handle removed nodes
      mutation.removedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;

        if (node.tagName === 'IMG') {
          const cleanup = cleanups.get(node);
          if (cleanup) {
            cleanup();
            cleanups.delete(node);
          }
        }

        node.querySelectorAll?.('img').forEach((img) => {
          const cleanup = cleanups.get(img);
          if (cleanup) {
            cleanup();
            cleanups.delete(img);
          }
        });
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Return cleanup function
  return () => {
    observer.disconnect();
    document.removeEventListener('load', handleImageLoad, true);
    cleanups.forEach((cleanup) => cleanup());
    cleanups.clear();
  };
}

/**
 * Remove all injected buttons
 */
export function removeAllButtons() {
  document.querySelectorAll('[data-ai-edit-btn]').forEach((btn) => btn.remove());
}
