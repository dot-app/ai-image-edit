/**
 * AI Image Editor - TypeScript Type Definitions
 */

export interface InitOptions {
  /** Enable hover buttons on images (default: false) */
  hover?: boolean | HoverOptions;
  /** Modal mount point (default: document.body) */
  modalRoot?: HTMLElement;
  /** Preload heavy dependencies (default: false) */
  warmup?: boolean;
  /** Default API config for all open() calls */
  defaults?: Partial<OpenOptions>;
}

export interface HoverOptions {
  /** CSS selector for target images (default: 'img:not([data-ai-ignore])') */
  selector?: string;
  /** Custom detection function */
  detect?: (img: HTMLImageElement) => boolean;
  /** Custom button render function */
  render?: (target: HTMLElement, open: () => void) => void;
  /** Custom button styles */
  buttonStyle?: Partial<CSSStyleDeclaration>;
  /** Custom button text (default: 'AI Edit') */
  buttonText?: string;
  /** Minimum image width to show button (default: 100) */
  minWidth?: number;
  /** Minimum image height to show button (default: 100) */
  minHeight?: number;
  /** Callback to get API config for each image */
  getConfig?: (img: HTMLImageElement) => Partial<OpenOptions>;
}

export interface OpenOptions {
  /** Image element or URL/DataURL */
  image: HTMLImageElement | string;
  /** API key (required) */
  apiKey: string;
  /** API base URL */
  baseUrl?: string;
  /** Model name */
  modelName?: string;
  /** Use Gemini native format */
  useGeminiNative?: boolean;
  /** Initial mode: 'edit' or 'generate' */
  mode?: 'edit' | 'generate';
  /** Called with result when editing completes */
  onComplete?: (result: EditResult) => void;
  /** Called when editor closes */
  onClose?: () => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

export interface EditResult {
  /** Base64 encoded image data */
  base64: string;
  /** Complete data URL */
  dataUrl: string;
  /** Blob for uploading */
  blob: Blob;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Image format */
  format: 'png' | 'jpeg' | 'webp';
  /** Additional metadata */
  metadata?: {
    layerName?: string;
    layerId?: number;
    [key: string]: any;
  };
}

export interface AIImageEditAPI {
  /**
   * Initialize the AI Image Editor
   * @param options - Configuration options
   * @returns The API object for chaining
   */
  init(options?: InitOptions): AIImageEditAPI;

  /**
   * Open the editor with an image
   * @param options - Open options including image and API config
   */
  open(options: OpenOptions): Promise<void>;

  /**
   * Close the editor
   */
  close(): void;

  /**
   * Destroy the editor and cleanup all resources
   */
  destroy(): void;

  /**
   * Check if the editor is initialized
   */
  isReady(): boolean;

  /** Library version */
  version: string;
}

declare const AIImageEdit: AIImageEditAPI;

export default AIImageEdit;
export { AIImageEdit };

// Named exports
export declare function init(options?: InitOptions): AIImageEditAPI;
export declare function open(options: OpenOptions): Promise<void>;
export declare function close(): void;
export declare function destroy(): void;
export declare function isReady(): boolean;
