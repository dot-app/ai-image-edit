import React, { useRef, useState } from 'react';
import { Download, Image as ImageIcon, ImageOff, Upload } from 'lucide-react';
import { CanvasEditor } from './components/CanvasEditor';
import { ControlPanel } from './components/ControlPanel';
import { LayerPanel } from './components/LayerPanel';
import { Layout } from './components/Layout';
import { Button } from './components/ui/Button';
import {
  editImage,
  editImageViaChatCompletions,
  generateImage,
  generateImageViaChatCompletions,
  uploadFile,
} from './lib/api';
import { removeImageBackground } from './lib/backgroundRemoval';

function App() {
  // 图层管理
  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const nextLayerIdRef = useRef(1);

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('apiKey') || '');
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('baseUrl') || 'https://foxi-ai.top');
  const [modelName, setModelName] = useState(() => localStorage.getItem('modelName') || 'gemini-2.5-flash-image');
  const [useGeminiNative, setUseGeminiNative] = useState(() => localStorage.getItem('useGeminiNative') === 'true');

  const [mode, setMode] = useState('generate'); // 'generate' | 'edit'
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState('brush'); // 'brush' | 'rectangle' | 'eraser' | 'select'
  const [brushSize, setBrushSize] = useState(30);

  const [imageSize, setImageSize] = useState(() => localStorage.getItem('imageSize') || '1024x1024');
  const [aspectRatio, setAspectRatio] = useState(() => localStorage.getItem('aspectRatio') || '1:1');

  // 抠图相关
  const [isRemoving, setIsRemoving] = useState(false);
  const [removalProgress, setRemovalProgress] = useState(null);

  const canvasRef = useRef(null);
  const [regions, setRegions] = useState([]);
  const [regionInstructions, setRegionInstructions] = useState({});

  // 添加新图层
  const addLayer = async (layerData) => {
    // Parse base64 from data URL if needed
    const mime = String(layerData.url).split(';')[0].split(':')[1] || 'image/png';
    const base64 = String(layerData.url).split(',')[1];

    // Get image dimensions
    const img = new Image();
    img.src = layerData.url;
    await new Promise((resolve) => { img.onload = resolve; });

    const newLayer = {
      id: nextLayerIdRef.current++,
      name: layerData.name || `图层 ${nextLayerIdRef.current - 1}`,
      visible: true,
      locked: false,
      url: layerData.url,
      base64,
      mimeType: mime,
      width: img.width,
      height: img.height,
      x: layers.length * 20,
      y: layers.length * 20,
      ...layerData,
    };
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    return newLayer;
  };

  // 删除图层
  const deleteLayer = (layerId) => {
    setLayers(prev => prev.filter(l => l.id !== layerId));
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
  };

  // 切换图层可见性
  const toggleLayerVisibility = (layerId) => {
    setLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    ));
  };

  // 切换图层锁定
  const toggleLayerLock = (layerId) => {
    setLayers(prev => prev.map(l =>
      l.id === layerId ? { ...l, locked: !l.locked } : l
    ));
  };

  // 上移图层
  const moveLayerUp = (layerId) => {
    setLayers(prev => {
      const index = prev.findIndex(l => l.id === layerId);
      if (index <= 0) return prev;
      const newLayers = [...prev];
      [newLayers[index - 1], newLayers[index]] = [newLayers[index], newLayers[index - 1]];
      return newLayers;
    });
  };

  // 下移图层
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

  // 抠图功能
  const handleRemoveBackground = async (layerId) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !layer.url) return;

    try {
      setIsRemoving(true);
      setRemovalProgress({ key: 'fetch:model', current: 0, total: 100 });

      const resultDataUrl = await removeImageBackground(layer.url, (progress) => {
        setRemovalProgress(progress);
      });

      // 解析结果
      const mime = String(resultDataUrl).split(';')[0].split(':')[1] || 'image/png';
      const base64 = String(resultDataUrl).split(',')[1];

      // 创建新图层
      addLayer({
        url: resultDataUrl,
        base64,
        mimeType: mime,
        width: layer.width,
        height: layer.height,
        x: layer.x + 20,
        y: layer.y + 20,
        name: `${layer.name} (抠图)`,
      });

      alert('抠图完成！新图层已添加到画布');
    } catch (err) {
      console.error('抠图失败:', err);
      alert(`抠图失败: ${err.message}`);
    } finally {
      setIsRemoving(false);
      setRemovalProgress(null);
    }
  };

  // 下载图层
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

  React.useEffect(() => {
    localStorage.setItem('apiKey', apiKey);
  }, [apiKey]);

  React.useEffect(() => {
    localStorage.setItem('baseUrl', baseUrl);
  }, [baseUrl]);

  React.useEffect(() => {
    localStorage.setItem('modelName', modelName);
  }, [modelName]);

  React.useEffect(() => {
    localStorage.setItem('imageSize', imageSize);
  }, [imageSize]);

  React.useEffect(() => {
    localStorage.setItem('aspectRatio', aspectRatio);
  }, [aspectRatio]);

  React.useEffect(() => {
    localStorage.setItem('useGeminiNative', useGeminiNative);
  }, [useGeminiNative]);

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

      // 获取图片尺寸
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      // 添加为新图层
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
      console.error('上传失败', err);
      alert('上传失败: ' + err.message);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('请输入提示词');
      return;
    }

    try {
      setIsGenerating(true);
      let resultDataUrl;

      // 编辑模式：对选中的图层进行编辑
      if (mode === 'edit') {
        // 获取选中的图层
        const selectedLayer = layers.find(l => l.id === selectedLayerId);
        if (!selectedLayer) {
          alert('请先选择要编辑的图层');
          return;
        }

        // 获取图层的 dataUrl
        const imageDataUrl = `data:${selectedLayer.mimeType};base64,${selectedLayer.base64}`;

        // 检查是否有绘制的遮罩
        const canvas = canvasRef.current;
        const objects = canvas?.getObjects().filter(obj => !obj.layerId) || [];
        const hasMask = objects.length > 0;

        let maskDataUrl = null;
        if (hasMask) {
          // 有遮罩：构建遮罩 base64
          try {
            const maskBase64 = buildMaskBase64();
            maskDataUrl = `data:image/png;base64,${maskBase64}`;
          } catch (err) {
            console.error('构建遮罩失败:', err);
            alert(`构建遮罩失败: ${err.message}`);
            return;
          }
        }

        // 调用编辑 API（支持有遮罩或无遮罩）
        if (isChatImageModel(modelName)) {
          const result = await editImageViaChatCompletions({
            imageDataUrl,
            maskDataUrl, // 可以为 null
            prompt,
            apiKey,
            baseUrl,
            model: modelName,
          });
          resultDataUrl = `data:${result.mimeType};base64,${result.base64}`;
        } else {
          if (!hasMask) {
            alert('当前模型仅支持有遮罩的编辑，请先绘制遮罩区域');
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
          if (!firstImage?.b64_json) throw new Error('编辑失败：未返回图片数据');
          resultDataUrl = `data:image/png;base64,${firstImage.b64_json}`;
        }
      } else {
        // 生成模式：生成新图片
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
          if (!firstImage?.b64_json) throw new Error('生成失败：未返回图片数据');
          resultDataUrl = `data:image/png;base64,${firstImage.b64_json}`;
        }
      }

      const mime = String(resultDataUrl).split(';')[0].split(':')[1] || 'image/png';
      const base64 = String(resultDataUrl).split(',')[1];

      // 获取图片尺寸
      const img = new Image();
      img.src = resultDataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      if (mode === 'edit') {
        // 编辑模式：替换选中的图层
        setLayers(prev => prev.map(layer =>
          layer.id === selectedLayerId
            ? { ...layer, url: resultDataUrl, base64, mimeType: mime, width: img.width, height: img.height }
            : layer
        ));

        // 清除画布上的遮罩绘制
        const canvas = canvasRef.current;
        if (canvas) {
          const objects = canvas.getObjects().filter(obj => !obj.layerId);
          objects.forEach(obj => canvas.remove(obj));
          canvas.requestRenderAll();
        }
      } else {
        // 生成模式：添加为新图层
        addLayer({
          url: resultDataUrl,
          base64,
          mimeType: mime,
          width: img.width,
          height: img.height,
          x: layers.length * 20,
          y: layers.length * 20,
          name: `生成图片 ${layers.length + 1}`,
        });

        setMode('edit');
      }
    } catch (err) {
      console.error(mode === 'edit' ? '编辑失败:' : '生成失败:', err);
      alert(`${mode === 'edit' ? '编辑' : '生成'}失败: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const buildMaskBase64 = (previewMode = false) => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('画布未就绪');

    // 获取选中图层的原始尺寸
    const selectedLayer = layers.find(l => l.id === selectedLayerId);
    if (!selectedLayer) throw new Error('请先选择要编辑的图层');

    const imgWidth = selectedLayer.width;
    const imgHeight = selectedLayer.height;

    // 获取所有绘制对象（不包括图层）
    const objects = canvas.getObjects().filter(obj => !obj.layerId);
    if (objects.length === 0) throw new Error('请先绘制遮罩区域');

    // 获取选中图层的 Fabric 对象，用于计算相对坐标
    const layerObj = canvas.getObjects().find(obj => obj.layerId === selectedLayerId);
    if (!layerObj) throw new Error('未找到选中的图层对象');

    const layerLeft = layerObj.left;
    const layerTop = layerObj.top;

    // 创建一个新的离屏 canvas，尺寸与原图一致
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = imgWidth;
    maskCanvas.height = imgHeight;
    const ctx = maskCanvas.getContext('2d');

    // 填充黑色背景
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, imgWidth, imgHeight);

    const expandRatio = 0.01; // 1% 扩张

    // 绘制白色遮罩区域
    ctx.fillStyle = 'white';
    objects.forEach((obj) => {
      if (obj.type === 'rect') {
        const bounds = obj.getBoundingRect();

        // 转换为相对于图层的坐标
        const relativeX = bounds.left - layerLeft;
        const relativeY = bounds.top - layerTop;

        // 计算 1% 扩张
        const expansion = Math.max(bounds.width, bounds.height) * expandRatio;

        const x = Math.max(0, relativeX - expansion);
        const y = Math.max(0, relativeY - expansion);
        const w = Math.min(imgWidth - x, bounds.width + expansion * 2);
        const h = Math.min(imgHeight - y, bounds.height + expansion * 2);

        ctx.fillRect(x, y, w, h);
      } else if (obj.type === 'path') {
        // 对于路径，需要转换坐标并绘制
        const path = obj.path;
        if (!path) return;

        ctx.beginPath();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = obj.strokeWidth || 30;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        path.forEach((cmd, i) => {
          const type = cmd[0];
          if (type === 'M') {
            const x = cmd[1] - layerLeft;
            const y = cmd[2] - layerTop;
            ctx.moveTo(x, y);
          } else if (type === 'L') {
            const x = cmd[1] - layerLeft;
            const y = cmd[2] - layerTop;
            ctx.lineTo(x, y);
          } else if (type === 'Q') {
            const cpX = cmd[1] - layerLeft;
            const cpY = cmd[2] - layerTop;
            const endX = cmd[3] - layerLeft;
            const endY = cmd[4] - layerTop;
            ctx.quadraticCurveTo(cpX, cpY, endX, endY);
          }
        });
        ctx.stroke();
      }
    });

    const dataUrl = maskCanvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];

    // 如果是预览模式，将遮罩添加为新图层
    if (previewMode) {
      addLayer({
        url: dataUrl,
        base64,
        mimeType: 'image/png',
        width: imgWidth,
        height: imgHeight,
        x: 0,
        y: 0,
        name: '遮罩预览',
      });
    }

    return base64;
  };

  const handlePreviewMask = () => {
    try {
      buildMaskBase64(true); // 传入 true 启用预览模式
    } catch (err) {
      console.error('预览遮罩失败:', err);
      throw err;
    }
  };

  return (
    <Layout
      toolbar={
        <div className="flex flex-col gap-3 items-center">
          {/* Upload Button - macOS style with spring interaction */}
          <div className="relative group">
            <button
              className="w-12 h-12 rounded-[10px] flex items-center justify-center
                         bg-white/90 dark:bg-white/10
                         shadow-[0_0_0_0.5px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.08)]
                         hover:shadow-[0_0_0_0.5px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.12)]
                         active:scale-[0.96]
                         transition-all duration-200 ease-out
                         border border-black/[0.05] dark:border-white/10"
            >
              <Upload size={20} className="text-gray-700 dark:text-gray-300" strokeWidth={1.5} />
            </button>
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileUpload}
              accept="image/*"
            />
          </div>
        </div>
      }
      layerPanel={
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
      }
      properties={
        <ControlPanel
          prompt={prompt}
          setPrompt={setPrompt}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          apiKey={apiKey}
          setApiKey={setApiKey}
          baseUrl={baseUrl}
          setBaseUrl={setBaseUrl}
          modelName={modelName}
          setModelName={setModelName}
          useGeminiNative={useGeminiNative}
          setUseGeminiNative={setUseGeminiNative}
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
        />
      }
    >
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
    </Layout>
  );
}

export default App;
