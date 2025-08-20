import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

interface ImageInfo {
  base64: string;
  mimeType: string;
  dataUrl: string;
}

export function useDiagramAsImage(
  mermaidSvg: string | null,
  setImage: Dispatch<SetStateAction<ImageInfo | null>>,
  setIsMermaidOpen: Dispatch<SetStateAction<boolean>>
) {
  return useCallback(async () => {
    if (!mermaidSvg) return;

    try {
      // Load fonts first
      await Promise.all([
        document.fonts.load('normal 16px Arial'),
        document.fonts.load('bold 16px Arial')
      ]);
      
      const { convertSvgToPng } = await import('./DiagramUtils');
      const dataUrl = await convertSvgToPng(mermaidSvg);
      const base64 = dataUrl.split(',')[1];
      setImage({ base64, mimeType: 'image/png', dataUrl });
      setIsMermaidOpen(false);
    } catch (error) {
      console.error('Failed to convert diagram to image:', error);
      alert('Could not convert diagram to image. Please try again.');
    }
  }, [mermaidSvg, setImage, setIsMermaidOpen]);
}
