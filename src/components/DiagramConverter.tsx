import { Canvg } from 'canvg';

export async function convertSvgToPng(svgString: string): Promise<string> {
  // Create an off-screen canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not get canvas context');

  // Parse SVG
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = svgDoc.querySelector('svg');
  if (!svgElement) throw new Error('No SVG element found');

  // Get dimensions from viewBox or attributes
  let width = 800;
  let height = 600;
  
  const viewBox = svgElement.getAttribute('viewBox');
  if (viewBox) {
    const [, , w, h] = viewBox.split(' ').map(Number);
    if (!isNaN(w) && !isNaN(h)) {
      width = w;
      height = h;
    }
  }

  // Set explicit dimensions on SVG
  svgElement.setAttribute('width', String(width));
  svgElement.setAttribute('height', String(height));

  // Add styles to ensure proper rendering
  const style = document.createElement('style');
  style.textContent = `
    .node rect { 
      stroke-width: 2px !important;
      fill: #bfdbfe !important;
      stroke: #1d4ed8 !important;
    }
    .node.human rect { 
      fill: #fde68a !important;
      stroke: #b45309 !important;
    }
    .node.ai rect { 
      fill: #bfdbfe !important;
      stroke: #1d4ed8 !important;
    }
    .node text { 
      fill: #111827 !important;
      font-family: Arial, sans-serif !important;
      font-size: 14px !important;
    }
    .edgePath path { 
      stroke: #475569 !important;
      stroke-width: 2px !important;
    }
  `;
  document.head.appendChild(style);

  // Add background
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', '#0f172a');
  svgElement.insertBefore(bgRect, svgElement.firstChild);

  // Set canvas size with padding and scaling
  const padding = 40;
  const scale = window.devicePixelRatio * 2;
  canvas.width = (width + padding) * scale;
  canvas.height = (height + padding) * scale;

  // Fill background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Scale and translate for padding
  ctx.scale(scale, scale);
  ctx.translate(padding/2, padding/2);

  try {
    // Convert SVG to string
    const serializer = new XMLSerializer();
    const modifiedSvgString = serializer.serializeToString(svgDoc);

    // Use Canvg for rendering
    const v = await Canvg.fromString(ctx, modifiedSvgString);
    await v.render({
      enableRedraw: true,
      ignoreMouse: true,
      ignoreAnimation: true,
      ignoreDimensions: true,
      ignoreClear: true,
    });

    // Clean up
    document.head.removeChild(style);

    return canvas.toDataURL('image/png');
  } catch (error) {
    // Clean up even if there's an error
    document.head.removeChild(style);
    console.error('SVG conversion failed:', error);
    throw error;
  }
}
