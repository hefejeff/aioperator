import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  imageUrl: string;
  onClose: () => void;
  workflowExplanation?: string; // optional: if provided, we can re-render Mermaid with alternate direction
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const ZoomableImageModal: React.FC<Props> = ({ imageUrl, onClose, workflowExplanation }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [renderedUrl, setRenderedUrl] = useState<string>(imageUrl);
  const [direction, setDirection] = useState<'TD' | 'LR'>('TD');
  const [isRendering, setIsRendering] = useState(false);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const offsetRef = useRef(offset);

  useEffect(() => { offsetRef.current = offset; }, [offset]);

  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
  const img = imgRef.current;
    if (!container || !img) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih || !cw || !ch) return;
    const s = Math.min(cw / iw, ch / ih);
    const fit = Math.min(1, s); // don't upscale above 1
    setMinScale(fit);
    setScale(fit);
    setOffset({ x: 0, y: 0 });
  }, []);

  const onImageLoad = useCallback(() => {
    fitToScreen();
  }, [fitToScreen]);

  useEffect(() => {
    const onResize = () => fitToScreen();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fitToScreen]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsPanning(true);
    startRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    setOffset({ x: offsetRef.current.x + dx, y: offsetRef.current.y + dy });
    startRef.current = { x: e.clientX, y: e.clientY };
  }, [isPanning]);

  const endPan = useCallback(() => {
    setIsPanning(false);
    startRef.current = null;
  }, []);

  const zoomIn = useCallback(() => setScale(s => clamp(s + 0.25, minScale, 6)), [minScale]);
  const zoomOut = useCallback(() => setScale(s => clamp(s - 0.25, minScale, 6)), [minScale]);
  const reset = useCallback(() => { setScale(minScale); setOffset({ x: 0, y: 0 }); }, [minScale]);

  // Simple builder for Mermaid from workflowExplanation; similar to OperatorConsole's logic
  const buildMermaidFromSteps = useCallback((text: string, dir: 'TD' | 'LR') => {
    const lines = text
      .split(/\n+/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
    const stepLines = lines.filter(l => /^(Step\s*\d+\s*:|\d+\.|\d+\))/i.test(l));
    const useLines = stepLines.length > 0 ? stepLines : lines;
    const ids: string[] = [];
    const nodes: string[] = [];
    const classLines: string[] = [];
    const idFor = (i: number) => `S${i+1}`;
    const cleanLabel = (s: string) => s
      .replace(/^Step\s*\d+\s*:\s*/i,'')
      .replace(/^\d+[\.)]\s*/,'')
      .trim();
    const esc = (s: string) => s.replace(/"/g, '\\"');
    useLines.forEach((l, i) => {
      const id = idFor(i);
      ids.push(id);
      const label = esc(cleanLabel(l)).slice(0, 160);
      nodes.push(`${id}["${label}"]`);
  // Detect role hints in various notations
  const isAI = /(\(ai\)|\bai\b|\[ai\]|\(a\)|\[a\])/i.test(l);
  const isHuman = /(\(human\)|\bhuman\b|\[human\]|\(h\)|\[h\])/i.test(l);
  if (isAI && !isHuman) classLines.push(`class ${id} ai`);
  else if (isHuman && !isAI) classLines.push(`class ${id} human`);
    });
    const edges: string[] = [];
    for (let i = 0; i < ids.length - 1; i++) edges.push(`${ids[i]} --> ${ids[i+1]}`);
    const classDefs = [
      'classDef human fill:#fde68a,stroke:#b45309,color:#111827,stroke-width:2px',
      'classDef ai fill:#bfdbfe,stroke:#1d4ed8,color:#111827,stroke-width:2px',
    ];
    // De-duplicate class lines in case we rebuild multiple times
    const uniqueClassLines = Array.from(new Set(classLines));
    return [`flowchart ${dir}`, ...classDefs, ...nodes, ...edges, ...uniqueClassLines].join('\n');
  }, []);

  const rerenderDirection = useCallback(async (dir: 'TD' | 'LR') => {
    if (!workflowExplanation) return;
    setIsRendering(true);
    try {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({ startOnLoad: false, theme: 'base', securityLevel: 'loose', flowchart: { useMaxWidth: false } });
      const code = buildMermaidFromSteps(workflowExplanation, dir);
      const { svg } = await mermaid.render(`mmd-${Date.now()}`, code);
      const { convertSvgToPng } = await import('./DiagramUtils');
      const dataUrl = await convertSvgToPng(svg);
      setRenderedUrl(dataUrl);
      setDirection(dir);
      // reset view to fit
      setTimeout(() => fitToScreen(), 0);
    } catch (e) {
      console.error('Re-render LR/TD failed:', e);
    } finally {
      setIsRendering(false);
    }
  }, [workflowExplanation, buildMermaidFromSteps, fitToScreen]);

  useEffect(() => { setRenderedUrl(imageUrl); }, [imageUrl]);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden" onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 border-b border-slate-700">
          <div className="text-slate-200 font-semibold">Submitted Diagram</div>
          <div className="flex items-center gap-2">
            {workflowExplanation && (
              <div className="flex items-center gap-1 mr-2">
                <span className="text-slate-400 text-xs">Flow:</span>
                <button onClick={() => rerenderDirection('TD')} disabled={isRendering || direction==='TD'} className={`px-2 py-1 rounded-md border ${direction==='TD' ? 'bg-sky-700/40 border-sky-600 text-white' : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'}`}>TD</button>
                <button onClick={() => rerenderDirection('LR')} disabled={isRendering || direction==='LR'} className={`px-2 py-1 rounded-md border ${direction==='LR' ? 'bg-sky-700/40 border-sky-600 text-white' : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'}`}>LR</button>
              </div>
            )}
            <button onClick={zoomOut} className="px-3 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700" aria-label="Zoom out">−</button>
            <button onClick={zoomIn} className="px-3 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700" aria-label="Zoom in">+</button>
            <button onClick={reset} className="px-3 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700" aria-label="Fit">Fit</button>
            <button onClick={onClose} className="px-3 py-1.5 rounded-md bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700" aria-label="Close">×</button>
          </div>
        </div>
        <div
          ref={containerRef}
          className={`flex-1 overflow-hidden bg-slate-950 relative ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endPan}
          onMouseLeave={endPan}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              ref={imgRef}
              src={renderedUrl}
              onLoad={onImageLoad}
              alt="Submitted workflow diagram"
              draggable={false}
              style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: 'center center', userSelect: 'none' }}
              className="max-w-none select-none"
            />
            {isRendering && (
              <div className="absolute bottom-4 right-4 text-xs bg-slate-800/80 text-slate-200 px-2 py-1 rounded border border-slate-600">Rendering…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoomableImageModal;
