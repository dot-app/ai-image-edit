import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Download, Upload, X } from 'lucide-react';
import { CanvasEditor } from '../components/CanvasEditor';
import { ControlPanel } from '../components/ControlPanel';
import { LayerPanel } from '../components/LayerPanel';
import { Button } from '../components/ui/Button';
import {
  editImage,
  editImageViaChatCompletions,
  generateImage,
  generateImageViaChatCompletions,
} from '../lib/api';

/**
 * EditorApp - Core editing component for library mode
 *
 * @param {Object} props
 * @param {string} props.imageSrc - Initial image source (URL or DataURL)
 * @param {string} props.apiKey - API key for image generation
 * @param {string} props.baseUrl - API base URL
 * @param {string} props.modelName - Model name
 * @param {Function} props.onComplete - Callback when editing completes
 * @param {Function} props.onClose - Callback when editor closes
 * @param {Function} props.onError - Callback on error
 * @param {Function} props.onRemoveBackground - Background removal handler (injected for lazy loading)
 */
export function EditorApp({
  imageSrc,
  apiKey,
  baseUrl = 'https://api.openai.com',
  modelName = 'dall-e-2',
  useGeminiNative = false,
  onComplete,
  onClose,
  onError,
  onRemoveBackground,
}) {
  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const nextLayerIdRef = useRef(1);

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [mode, setMode] = useState('edit');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState('select');
  const [brushSize, setBrushSize] = useState(30);

  const [imageSize, setImageSize] = useState('1024x1024');
  const [aspectRatio, setAspectRatio] = useState('1:1');

  const [isRemoving, setIsRemoving] = useState(false);
  const [removalProgress, setRemovalProgress] = useState(null);

  const canvasRef = useRef(null);
  const [regions, setRegions] = useState([]);
  const [regionInstructions, setRegionInstructions] = useState({});

  // Store original image dimensions for export
  const originalSizeRef = useRef(null);

  const addLayer = useCallback(async (layerData) => {
    const mime = String(layerData.url).split(';')[0].split(':')[1] || 'image/png';
    const base64 = String(layerData.url).split(',')[1];

    const img = new Image();
    img.src = layerData.url;
    await new Promise((resolve) => { img.onload = resolve; });

    const newLayer = {
      id: nextLayerIdRef.current++,
      name: layerData.name || `Layer ${nextLayerIdRef.current - 1}`,
      visible: true,
      locked: false,
      url: layerData.url,
      base64,
      mimeType: mime,
      width: img.width,
      height: img.height,
      x: layerData.x ?? 0,
      y: layerData.y ?? 0,
      ...layerData,
    };
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    return newLayer;
  }, []); // No dependencies - use refs and functional updates

  // Load initial image (only once)
  const imageLoadedRef = useRef(false);
  useEffect(() => {
    if (!imageSrc || imageLoadedRef.current) return;
    imageLoadedRef.current = true;

    const loadImage = async () => {
      try {
        let dataUrl = imageSrc;

        // If it's a URL (not data URL), fetch and convert
        if (!imageSrc.startsWith('data:')) {
          const response = await fetch(imageSrc);
          const blob = await response.blob();
          dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        }

        await addLayer({
          url: dataUrl,
          name: 'Original Image',
          x: 0,
          y: 0,
        });

        // Record original dimensions for export scaling
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => { img.onload = resolve; });
        originalSizeRef.current = { width: img.width, height: img.height };
      } catch (err) {
        console.error('Failed to load image:', err);
        onError?.(err);
      }
    };

    loadImage();
  }, [imageSrc, addLayer, onError]);

  const deleteLayer = (layerId) => {
    setLayers(prev => prev.filter(l => l.id !== layerId));
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
  };

  const toggleLayerVisibility = (layerId) => {
    setLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    ));
  };

  const toggleLayerLock = (layerId) => {
    setLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, locked: !l.locked } : l
    ));
  };

  const moveLayerUp = (layerId) => {
    setLayers(prev => {
      const index = prev.findIndex(l => l.id === layerId);
      if (index <= 0) return prev;
      const newLayers = [...prev];
      [newLayers[index - 1], newLayers[index]] = [newLayers[index], newLayers[index - 1]];
      return newLayers;
    });
  };

  const moveLayerDown = (layerId) => {
    setLayers(prev => {
      const index = prev.findIndex(l => l.id === layerId);
      if (index < 0 || index >= prev.length - 1) return prev;
      const newLayers = [...prev];
      [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
      return newLayers;
    });
  };

  const isChatImageModel = (name) =>
    name === 'gemini-3-pro-image-preview';

  const handleRemoveBackground = async (layerId) => {
    if (!onRemoveBackground) {
      onError?.(new Error('Background removal not available'));
      return;
    }

    const layer = layers.find(l => l.id === layerId);
    if (!layer || !layer.url) return;

    try {
      setIsRemoving(true);
      setRemovalProgress({ key: 'fetch:model', current: 0, total: 100 });

      const resultDataUrl = await onRemoveBackground(layer.url, (progress) => {
        setRemovalProgress(progress);
      });

      const mime = String(resultDataUrl).split(';')[0].split(':')[1] || 'image/png';
      const base64 = String(resultDataUrl).split(',')[1];

      addLayer({
        url: resultDataUrl,
        base64,
        mimeType: mime,
        width: layer.width,
        height: layer.height,
        x: layer.x + 20,
        y: layer.y + 20,
        name: `${layer.name} (No BG)`,
      });
    } catch (err) {
      console.error('Background removal failed:', err);
      onError?.(err);
    } finally {
      setIsRemoving(false);
      setRemovalProgress(null);
    }
  };

  const downloadLayer = (layerId) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !layer.url) return;

    const a = document.createElement('a');
    a.href = layer.url;
    const ext = layer.mimeType === 'image/jpeg' ? 'jpg' : layer.mimeType === 'image/webp' ? 'webp' : 'png';
    a.download = `${layer.name}_${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileUpload = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    try {
      input.value = '';

      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });

      const mime = String(dataUrl).split(';')[0].split(':')[1] || 'image/png';
      const base64 = String(dataUrl).split(',')[1];

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      addLayer({
        url: dataUrl,
        base64,
        mimeType: mime,
        width: img.width,
        height: img.height,
        x: 0,
        y: 0,
      });

      setMode('edit');
      setDrawMode('select');
    } catch (err) {
      console.error('Upload failed:', err);
      onError?.(err);
    }
  };

  const buildMaskBase64 = (previewMode = false) => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('Canvas not ready');

    const selectedLayer = layers.find(l => l.id === selectedLayerId);
    if (!selectedLayer) throw new Error('Please select a layer to edit');

    const imgWidth = selectedLayer.width;
    const imgHeight = selectedLayer.height;

    const objects = canvas.getObjects().filter(obj => !obj.layerId);
    if (objects.length === 0) throw new Error('Please draw mask regions first');

    const layerObj = canvas.getObjects().find(obj => obj.layerId === selectedLayerId);
    if (!layerObj) throw new Error('Layer object not found');

    const layerLeft = layerObj.left;
    const layerTop = layerObj.top;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = imgWidth;
    maskCanvas.height = imgHeight;
    const ctx = maskCanvas.getContext('2d');

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, imgWidth, imgHeight);

    const expandRatio = 0.01;

    ctx.fillStyle = 'white';
    objects.forEach((obj) => {
      if (obj.type === 'rect') {
        const bounds = obj.getBoundingRect();
        const relativeX = bounds.left - layerLeft;
        const relativeY = bounds.top - layerTop;
        const expansion = Math.max(bounds.width, bounds.height) * expandRatio;

        const x = Math.max(0, relativeX - expansion);
        const y = Math.max(0, relativeY - expansion);
        const w = Math.min(imgWidth - x, bounds.width + expansion * 2);
        const h = Math.min(imgHeight - y, bounds.height + expansion * 2);

        ctx.fillRect(x, y, w, h);
      } else if (obj.type === 'path') {
        const path = obj.path;
        if (!path) return;

        ctx.beginPath();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = obj.strokeWidth || 30;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        path.forEach((cmd) => {
          const type = cmd[0];
          if (type === 'M') {
            ctx.moveTo(cmd[1] - layerLeft, cmd[2] - layerTop);
          } else if (type === 'L') {
            ctx.lineTo(cmd[1] - layerLeft, cmd[2] - layerTop);
          } else if (type === 'Q') {
            ctx.quadraticCurveTo(
              cmd[1] - layerLeft, cmd[2] - layerTop,
              cmd[3] - layerLeft, cmd[4] - layerTop
            );
          }
        });
        ctx.stroke();
      }
    });

    const dataUrl = maskCanvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];

    if (previewMode) {
      addLayer({
        url: dataUrl,
        base64,
        mimeType: 'image/png',
        width: imgWidth,
        height: imgHeight,
        x: 0,
        y: 0,
        name: 'Mask Preview',
      });
    }

    return base64;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      onError?.(new Error('Please enter a prompt'));
      return;
    }

    try {
      setIsGenerating(true);
      let resultDataUrl;

      if (mode === 'edit') {
        const selectedLayer = layers.find(l => l.id === selectedLayerId);
        if (!selectedLayer) {
          onError?.(new Error('Please select a layer to edit'));
          return;
        }

        const imageDataUrl = `data:${selectedLayer.mimeType};base64,${selectedLayer.base64}`;
        const canvas = canvasRef.current;
        const objects = canvas?.getObjects().filter(obj => !obj.layerId) || [];
        const hasMask = objects.length > 0;

        let maskDataUrl = null;
        if (hasMask) {
          try {
            const maskBase64 = buildMaskBase64();
            maskDataUrl = `data:image/png;base64,${maskBase64}`;
          } catch (err) {
            console.error('Mask build failed:', err);
            onError?.(err);
            return;
          }
        }

        if (useGeminiNative || isChatImageModel(modelName)) {
          const result = await editImageViaChatCompletions({
            imageDataUrl,
            maskDataUrl,
            prompt,
            apiKey,
            baseUrl,
            model: modelName,
            useGeminiNative,
            aspectRatio,
            originalWidth: originalSizeRef.current?.width,
            originalHeight: originalSizeRef.current?.height,
          });
          resultDataUrl = `data:${result.mimeType};base64,${result.base64}`;
        } else {
          if (!hasMask) {
            onError?.(new Error('Current model requires mask. Please draw mask regions first.'));
            return;
          }
          const result = await editImage({
            imageBase64: selectedLayer.base64,
            maskBase64: buildMaskBase64(),
            prompt,
            apiKey,
            baseUrl,
            model: modelName,
            imageMimeType: selectedLayer.mimeType,
          });
          const firstImage = result?.data?.[0];
          if (!firstImage?.b64_json) throw new Error('Edit failed: No image data returned');
          resultDataUrl = `data:image/png;base64,${firstImage.b64_json}`;
        }
      } else {
        if (isChatImageModel(modelName)) {
          const result = await generateImageViaChatCompletions({
            prompt,
            apiKey,
            baseUrl,
            model: modelName,
            aspectRatio,
            imageSize,
            useGeminiNative,
          });
          resultDataUrl = `data:${result.mimeType};base64,${result.base64}`;
        } else {
          const result = await generateImage({
            prompt,
            apiKey,
            baseUrl,
            model: modelName,
            size: imageSize,
            aspectRatio,
            useGeminiNative,
          });
          const firstImage = result?.data?.[0];
          if (!firstImage?.b64_json) throw new Error('Generation failed: No image data returned');
          resultDataUrl = `data:image/png;base64,${firstImage.b64_json}`;
        }
      }

      const mime = String(resultDataUrl).split(';')[0].split(':')[1] || 'image/png';
      const base64 = String(resultDataUrl).split(',')[1];

      const img = new Image();
      img.src = resultDataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      if (mode === 'edit') {
        setLayers(prev => prev.map(layer =>
          layer.id === selectedLayerId
            ? { ...layer, url: resultDataUrl, base64, mimeType: mime, width: img.width, height: img.height }
            : layer
        ));

        const canvas = canvasRef.current;
        if (canvas) {
          const objects = canvas.getObjects().filter(obj => !obj.layerId);
          objects.forEach(obj => canvas.remove(obj));
          canvas.requestRenderAll();
        }
      } else {
        addLayer({
          url: resultDataUrl,
          base64,
          mimeType: mime,
          width: img.width,
          height: img.height,
          x: layers.length * 20,
          y: layers.length * 20,
          name: `Generated ${layers.length + 1}`,
        });
        setMode('edit');
      }
    } catch (err) {
      console.error('Generation failed:', err);
      onError?.(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewMask = () => {
    try {
      buildMaskBase64(true);
    } catch (err) {
      console.error('Mask preview failed:', err);
      onError?.(err);
    }
  };

  const handleConfirm = async () => {
    const selectedLayer = layers.find(l => l.id === selectedLayerId) || layers[0];
    if (!selectedLayer) {
      onError?.(new Error('No image to export'));
      return;
    }

    try {
      const base64 = selectedLayer.base64;
      const dataUrl = selectedLayer.url;
      const mimeType = selectedLayer.mimeType || 'image/png';

      // Convert to blob
      const byteString = atob(base64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeType });

      onComplete?.({
        base64,
        dataUrl,
        blob,
        width: selectedLayer.width,
        height: selectedLayer.height,
        format: mimeType.split('/')[1] || 'png',
        metadata: {
          layerName: selectedLayer.name,
          layerId: selectedLayer.id,
        },
      });

      // Close the modal after successful export
      onClose?.();
    } catch (err) {
      console.error('Export failed:', err);
      onError?.(err);
    }
  };

  return (
    <div className="ai-editor-app flex h-full w-full overflow-hidden bg-gradient-to-br from-[#f5f5f7] to-[#e8e8ed] p-3 gap-3">
      {/* Left: Toolbar + Layer Panel */}
      <div className="flex gap-3 flex-shrink-0">
        {/* Toolbar */}
        <aside className="w-[72px] flex-shrink-0 flex flex-col items-center py-4 gap-3 bg-white/50 backdrop-blur-xl rounded-[14px] shadow-lg border border-black/5">
          <div className="relative group">
            <button className="w-12 h-12 rounded-[10px] flex items-center justify-center bg-white/90 shadow-md hover:shadow-lg active:scale-95 transition-all border border-black/5">
              <Upload size={20} className="text-gray-700" strokeWidth={1.5} />
            </button>
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileUpload}
              accept="image/*"
            />
          </div>
        </aside>

        {/* Layer Panel */}
        <aside className="w-[280px] flex-shrink-0 flex flex-col bg-white/70 backdrop-blur-xl rounded-[14px] shadow-lg border border-black/5 overflow-hidden">
          <LayerPanel
            layers={layers}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            onDeleteLayer={deleteLayer}
            onToggleVisibility={toggleLayerVisibility}
            onToggleLock={toggleLayerLock}
            onMoveLayerUp={moveLayerUp}
            onMoveLayerDown={moveLayerDown}
            onRemoveBackground={handleRemoveBackground}
            onDownloadLayer={downloadLayer}
            isRemoving={isRemoving}
            removalProgress={removalProgress}
          />
        </aside>
      </div>

      {/* Center: Canvas */}
      <main className="flex-1 flex flex-col min-w-0 bg-white/40 backdrop-blur-2xl rounded-[14px] shadow-lg border border-black/5 overflow-hidden">
        <div className="flex-1 w-full h-full p-4">
          <CanvasEditor
            layers={layers}
            onLayersChange={(layerData) => {
              setLayers(prev => prev.map(layer => {
                const updated = layerData.find(d => d.id === layer.id);
                return updated ? { ...layer, ...updated } : layer;
              }));
            }}
            isDrawing={isDrawing}
            setIsDrawing={setIsDrawing}
            drawMode={drawMode}
            setDrawMode={setDrawMode}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            onRegionsChange={(next) => {
              setRegions(next);
              setRegionInstructions((prev) => {
                const keep = new Set(next.map((r) => r.id));
                const nextMap = {};
                Object.keys(prev).forEach((k) => {
                  const id = Number(k);
                  if (keep.has(id)) nextMap[id] = prev[id];
                });
                return nextMap;
              });
            }}
            onCanvasReady={(canvas) => {
              canvasRef.current = canvas;
            }}
            onRemoveBackground={handleRemoveBackground}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            onDeleteLayer={deleteLayer}
            onAddLayer={addLayer}
          />
        </div>
      </main>

      {/* Right: Control Panel */}
      <aside className="w-[360px] flex-shrink-0 flex flex-col bg-white/70 backdrop-blur-xl rounded-[14px] shadow-lg border border-black/5 overflow-y-auto">
        <ControlPanel
          prompt={prompt}
          setPrompt={setPrompt}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          apiKey={apiKey}
          setApiKey={() => {}}
          baseUrl={baseUrl}
          setBaseUrl={() => {}}
          modelName={modelName}
          setModelName={() => {}}
          useGeminiNative={useGeminiNative}
          setUseGeminiNative={() => {}}
          mode={mode}
          setMode={setMode}
          imageSize={imageSize}
          setImageSize={setImageSize}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          regions={regions}
          regionInstructions={regionInstructions}
          setRegionInstruction={(id, text) =>
            setRegionInstructions((prev) => ({ ...prev, [id]: text }))
          }
          focusRegion={(id) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getObjects().find((o) => o.type === 'rect' && o.regionId === id);
            if (!rect) return;
            setDrawMode('select');
            setIsDrawing(false);
            canvas.setActiveObject(rect);
            canvas.requestRenderAll();
          }}
          onPreviewMask={handlePreviewMask}
          disableSettings={true}
        />

        {/* Action Buttons */}
        <div className="p-4 border-t border-black/5 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            <X size={16} className="mr-2" />
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
          >
            <Download size={16} className="mr-2" />
            Confirm
          </Button>
        </div>
      </aside>
    </div>
  );
}
