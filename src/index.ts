import { PDFDocument } from 'pdf-lib';

export interface MarginOptions {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export async function applyMargins(
  pdfBuffer: ArrayBuffer | Uint8Array, 
  margins: MarginOptions
): Promise<Uint8Array> {
  const originalDoc = await PDFDocument.load(pdfBuffer);
  const newDoc = await PDFDocument.create();
  
  const pages = originalDoc.getPages();
  const embeddedPages = await newDoc.embedPages(pages);

  const top = margins.top ?? 0;
  const bottom = margins.bottom ?? 0;
  const left = margins.left ?? 0;
  const right = margins.right ?? 0;

  for (let i = 0; i < pages.length; i++) {
    const originalPage = pages[i];
    const embeddedPage = embeddedPages[i];
    const { width, height } = originalPage.getSize();
    
    const targetWidth = width - left - right;
    const targetHeight = height - top - bottom;
    
    const scale = Math.min(targetWidth / width, targetHeight / height);
    
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    
    const xOffset = left + (targetWidth - scaledWidth) / 2;
    const yOffset = bottom + (targetHeight - scaledHeight) / 2;
    
    const newPage = newDoc.addPage([width, height]);
    newPage.drawPage(embeddedPage, {
      x: xOffset,
      y: yOffset,
      xScale: scale,
      yScale: scale,
    });
  }

  return await newDoc.save();
}