import { removeBackground } from '@imgly/background-removal';

let isModelLoaded = false;

/**
 * 移除图片背景，返回透明背景的 PNG base64
 * @param {string} imageUrl - 图片 URL 或 data URL
 * @param {function} onProgress - 进度回调函数 ({ key, current, total })
 * @returns {Promise<string>} - 返回 data URL (data:image/png;base64,...)
 */
export async function removeImageBackground(imageUrl, onProgress) {
    try {
        // 调用 @imgly/background-removal
        const blob = await removeBackground(imageUrl, {
            progress: (key, current, total) => {
                if (!isModelLoaded && key === 'compute:inference') {
                    isModelLoaded = true;
                }
                onProgress?.({ key, current, total, isModelLoaded });
            }
        });

        // 转换 Blob 为 base64 data URL
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onloadend = () => {
                resolve(reader.result);
            };
            reader.onerror = () => {
                reject(new Error('读取抠图结果失败'));
            };
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Background removal failed:', error);
        throw new Error(`抠图失败: ${error.message || '未知错误'}`);
    }
}

/**
 * 检查是否已加载模型
 */
export function isBackgroundRemovalModelLoaded() {
    return isModelLoaded;
}
