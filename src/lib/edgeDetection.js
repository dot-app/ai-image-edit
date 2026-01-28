/**
 * Edge Detection Utility for Magnetic Lasso
 * Uses Sobel operator for edge detection
 */

/**
 * Convert image to grayscale
 */
function toGrayscale(imageData) {
    const data = imageData.data;
    const gray = new Uint8ClampedArray(imageData.width * imageData.height);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    return gray;
}

/**
 * Apply Sobel edge detection
 */
function sobelEdgeDetection(gray, width, height) {
    const edges = new Float32Array(width * height);

    // Sobel kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gx = 0, gy = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = (y + ky) * width + (x + kx);
                    const kernelIdx = (ky + 1) * 3 + (kx + 1);
                    gx += gray[idx] * sobelX[kernelIdx];
                    gy += gray[idx] * sobelY[kernelIdx];
                }
            }

            edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
        }
    }

    return edges;
}

/**
 * Find nearest edge point within radius
 */
export function findNearestEdge(canvas, x, y, radius = 20, threshold = 50) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(
        Math.max(0, x - radius),
        Math.max(0, y - radius),
        Math.min(canvas.width, radius * 2),
        Math.min(canvas.height, radius * 2)
    );

    const gray = toGrayscale(imageData);
    const edges = sobelEdgeDetection(gray, imageData.width, imageData.height);

    let maxEdge = 0;
    let bestX = x;
    let bestY = y;

    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > radius) continue;

            const px = x + dx;
            const py = y + dy;

            if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) continue;

            const localX = dx + radius;
            const localY = dy + radius;
            const idx = localY * imageData.width + localX;

            if (edges[idx] > maxEdge && edges[idx] > threshold) {
                maxEdge = edges[idx];
                bestX = px;
                bestY = py;
            }
        }
    }

    return { x: bestX, y: bestY, strength: maxEdge };
}

/**
 * Get edge map for the entire canvas
 */
export function getEdgeMap(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const gray = toGrayscale(imageData);
    const edges = sobelEdgeDetection(gray, canvas.width, canvas.height);

    return edges;
}
