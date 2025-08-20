import { Canvg } from 'canvg';

/**
 * Converts a Mermaid-generated SVG string into a PNG data URL.
 * - Loads fonts (best-effort)
 * - Embeds CSS inside the SVG so styles are preserved
 * - Forces node shapes to have visible fills/strokes
 * - Renders via Canvg first; falls back to Image() if needed
 */
export async function convertSvgToPng(svgString: string): Promise<string> {
  // Best-effort font readiness
  try {
    await Promise.all([
      document.fonts.load('14px Arial'),
      document.fonts.load('bold 14px Arial'),
      (document.fonts as any).ready?.then(() => undefined).catch(() => undefined),
    ]);
  } catch {
    // non-fatal
  }

  // Parse SVG
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgEl = svgDoc.querySelector('svg') as SVGSVGElement | null;
  if (!svgEl) throw new Error('No SVG element found');

  // Dimensions: width/height > style > viewBox > defaults
  const getPx = (v: string | null): number | null => {
    if (!v) return null;
    const m = v.match(/([0-9]+\.?[0-9]*)/);
    return m ? parseFloat(m[1]) : null;
  };

  let width = 800;
  let height = 600;
  const attrW = getPx(svgEl.getAttribute('width'));
  const attrH = getPx(svgEl.getAttribute('height'));
  if (attrW && attrH) {
    width = attrW; height = attrH;
  } else {
    const styleAttr = svgEl.getAttribute('style') || '';
    const styleW = getPx(styleAttr.match(/width:\s*([^;]+)/)?.[1] || null);
    const styleH = getPx(styleAttr.match(/height:\s*([^;]+)/)?.[1] || null);
    if (styleW && styleH) {
      width = styleW; height = styleH;
    } else {
      const vb = svgEl.getAttribute('viewBox');
      if (vb) {
        const parts = vb.trim().split(/\s+/).map(Number);
        if (parts.length === 4 && !isNaN(parts[2]) && !isNaN(parts[3])) {
          width = parts[2]; height = parts[3];
        }
      } else {
        // As a last resort, use getBBox on a cloned, attached SVG to compute size
        try {
          const temp = svgEl.cloneNode(true) as SVGSVGElement;
          temp.style.position = 'absolute';
          temp.style.left = '-10000px';
          document.body.appendChild(temp);
          const bbox = temp.getBBox();
          if (bbox.width && bbox.height) { width = bbox.width; height = bbox.height; }
          document.body.removeChild(temp);
        } catch {}
      }
    }
  }

  // Normalize attributes & namespaces
  svgEl.setAttribute('width', String(width));
  svgEl.setAttribute('height', String(height));
  svgEl.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  if (!svgEl.getAttribute('xmlns')) svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  if (!svgEl.getAttribute('xmlns:xlink')) svgEl.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  // Background
  const bg = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '100%');
  bg.setAttribute('height', '100%');
  bg.setAttribute('fill', '#0f172a');
  svgEl.insertBefore(bg, svgEl.firstChild);

  // Embedded CSS for nodes/edges/text
  const styleEl = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleEl.textContent = `
    .label text, text, .node text { fill: #111827 !important; font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif !important; font-size: 14px !important; }
    .node rect, .node polygon, .node path, .node circle, .node ellipse { stroke-width: 2px !important; fill: #bfdbfe !important; stroke: #1d4ed8 !important; }
    .node.human rect, .node.human polygon, .node.human path, .node.human circle, .node.human ellipse { fill: #fde68a !important; stroke: #b45309 !important; }
    .edgePath path { stroke: #475569 !important; stroke-width: 2px !important; fill: none !important; }
    .marker, .arrowMarkerPath { fill: #475569 !important; stroke: #475569 !important; }
  `;
  svgEl.insertBefore(styleEl, svgEl.firstChild);

  // Remove any pre-existing style tags to prevent conflicting rules (Mermaid often injects id-scoped styles)
  Array.from(svgEl.querySelectorAll('style')).forEach((s) => {
    if (!s.isEqualNode(styleEl)) s.parentNode?.removeChild(s);
  });

  // Replace foreignObject labels with SVG <text> for reliable canvas rendering
  const nodeGroups = svgEl.querySelectorAll('g.node');
  nodeGroups.forEach((node) => {
    const fo = node.querySelector('foreignObject');
    if (!fo) return;
    const labelGroup = fo.closest('g.label');
    const textContent = fo.textContent?.trim() || '';
    if (labelGroup) labelGroup.remove();
    if (textContent) {
      const textEl = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text');
      textEl.textContent = textContent;
      textEl.setAttribute('text-anchor', 'middle');
      textEl.setAttribute('dominant-baseline', 'middle');
      textEl.setAttribute('x', '0');
      textEl.setAttribute('y', '0');
      textEl.setAttribute('fill', '#111827');
      textEl.setAttribute('font-family', 'Arial, -apple-system, BlinkMacSystemFont, sans-serif');
      textEl.setAttribute('font-size', '14px');
      node.appendChild(textEl);
    }
  });

  // Force inline fills/strokes on node shapes (some themes set fill:none inline)
  const applyPaint = (el: SVGElement, fill: string, stroke: string) => {
    // Inline styles
    el.style.setProperty('fill', fill, 'important');
    el.style.setProperty('stroke', stroke, 'important');
    el.style.setProperty('stroke-width', '2px', 'important');
    el.style.setProperty('fill-opacity', '1', 'important');
    // Presentation attributes for renderers that prefer them
    el.setAttribute('fill', fill);
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', '2');
  };

  // Colorize shapes based on nearest .node ancestor
  const allShapes = svgEl.querySelectorAll<SVGElement>('rect, polygon, path, circle, ellipse');
  allShapes.forEach((shape) => {
    // Find nearest ancestor with class 'node'
    let p: Element | null = shape;
    let nodeAncestor: Element | null = null;
    while ((p = p.parentElement)) {
      if (p.classList && p.classList.contains('node')) { nodeAncestor = p; break; }
    }
    if (!nodeAncestor) return; // skip non-node shapes (edges etc.)
    // Heuristic: human if class says so OR label text contains '(human)'
    let isHuman = nodeAncestor.classList.contains('human');
    if (!isHuman) {
      const textNode = (nodeAncestor.querySelector('text')?.textContent || '').toLowerCase();
      const foText = (nodeAncestor.querySelector('foreignObject')?.textContent || '').toLowerCase();
      if (textNode.includes('(human)') || foText.includes('(human)')) isHuman = true;
    }
    const fill = isHuman ? '#fde68a' : '#bfdbfe';
    const stroke = isHuman ? '#b45309' : '#1d4ed8';
    applyPaint(shape, fill, stroke);
  });

  // Ensure text is visible
  svgEl.querySelectorAll<SVGTextElement>('text').forEach((t) => {
    t.style.setProperty('fill', '#111827', 'important');
    t.style.setProperty('font-family', 'Arial, -apple-system, BlinkMacSystemFont, sans-serif', 'important');
    t.style.setProperty('font-size', '14px', 'important');
    t.setAttribute('fill', '#111827');
  });

  // Prepare canvas (hi-DPI + padding)
  const padding = 40;
  const totalWidth = width + padding;
  const totalHeight = height + padding;
  const scale = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
  const canvas = document.createElement('canvas');
  canvas.width = totalWidth * scale;
  canvas.height = totalHeight * scale;
  canvas.style.width = `${totalWidth}px`;
  canvas.style.height = `${totalHeight}px`;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Could not get canvas context');
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.translate(padding / 2, padding / 2);

  // Serialize SVG
  const finalSvg = new XMLSerializer().serializeToString(svgDoc);

  // Prefer Image() path first (best support for foreignObject), then fall back to Canvg
  try {
    const blob = new Blob([finalSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = url;
      });
      ctx.drawImage(img, 0, 0, width, height);
      return canvas.toDataURL('image/png');
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    const v = await Canvg.fromString(ctx as unknown as CanvasRenderingContext2D, finalSvg, {
      ignoreMouse: true,
      ignoreAnimation: true,
    });
    await v.render();
    return canvas.toDataURL('image/png');
  }
}
