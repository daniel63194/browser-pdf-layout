import { PDFDocument } from 'pdf-lib';

export interface MarginOptions {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

/**
 * Shrinks every page's content to fit inside the given margins (in PDF
 * points, 1/72 inch), keeping the original page sizes and centring the content.
 *
 * @throws {RangeError} if a margin is negative or not a number, or if the
 * margins leave no room on a page.
 */
export async function applyMargins(
  pdfBuffer: ArrayBuffer | Uint8Array,
  margins: MarginOptions
): Promise<Uint8Array> {
  const top = margins.top ?? 0;
  const bottom = margins.bottom ?? 0;
  const left = margins.left ?? 0;
  const right = margins.right ?? 0;
  for (const [name, value] of Object.entries({ top, bottom, left, right })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`Margin "${name}" must be a number of points >= 0, got ${value}`);
    }
  }

  const originalDoc = await PDFDocument.load(pdfBuffer);
  const newDoc = await PDFDocument.create();
  const pages = originalDoc.getPages();

  // pdf-lib cannot embed a page that has no content stream (a blank page), so
  // only pages with content are embedded; blank pages are copied as blank pages.
  const hasContent = pages.map((page) => page.node.Contents() !== undefined);
  const embeddedPages = await newDoc.embedPages(pages.filter((_, i) => hasContent[i]));

  let nextEmbedded = 0;
  for (let i = 0; i < pages.length; i++) {
    const { width, height } = pages[i].getSize();

    const targetWidth = width - left - right;
    const targetHeight = height - top - bottom;
    if (targetWidth <= 0 || targetHeight <= 0) {
      throw new RangeError(
        `Margins leave no room on page ${i + 1} (${width} x ${height} pt)`
      );
    }

    const newPage = newDoc.addPage([width, height]);
    if (!hasContent[i]) continue;

    const scale = Math.min(targetWidth / width, targetHeight / height);
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    const xOffset = left + (targetWidth - scaledWidth) / 2;
    const yOffset = bottom + (targetHeight - scaledHeight) / 2;

    newPage.drawPage(embeddedPages[nextEmbedded++], {
      x: xOffset,
      y: yOffset,
      xScale: scale,
      yScale: scale,
    });
  }

  return await newDoc.save();
}
