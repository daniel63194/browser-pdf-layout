import { describe, expect, it } from 'vitest';
import { PDFArray, PDFDocument, PDFRawStream, decodePDFRawStream, type PDFPage } from 'pdf-lib';
import { applyMargins } from './index';

const A4: [number, number] = [595, 842];

async function makePdf(pages: { size: [number, number]; text?: string }[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const { size, text } of pages) {
    const page = doc.addPage(size);
    if (text) page.drawText(text, { x: 50, y: size[1] - 50 });
  }
  return doc.save();
}

/** The page's decoded content stream(s) as text. */
function contentText(page: PDFPage): string {
  const contents = page.node.Contents();
  const streams =
    contents instanceof PDFArray
      ? contents.asArray().map((ref) => page.doc.context.lookup(ref))
      : [contents];
  return streams
    .filter((s): s is PDFRawStream => s instanceof PDFRawStream)
    .map((s) => new TextDecoder().decode(decodePDFRawStream(s).decode()))
    .join('\n');
}

describe('applyMargins', () => {
  it('keeps the page count and every page size', async () => {
    const input = await makePdf([{ size: A4, text: 'portrait' }, { size: [842, 595], text: 'landscape' }]);
    const out = await PDFDocument.load(await applyMargins(input, { top: 20, bottom: 20, left: 30, right: 30 }));
    expect(out.getPages().map((p) => p.getSize())).toEqual([
      { width: 595, height: 842 },
      { width: 842, height: 595 },
    ]);
  });

  it('scales and centres the content inside the margins', async () => {
    const input = await makePdf([{ size: A4, text: 'portrait' }]);
    const out = await PDFDocument.load(await applyMargins(input, { top: 20, bottom: 20, left: 30, right: 30 }));
    const text = contentText(out.getPage(0));

    // Width is the limiting side: (595 - 60) / 595.
    const scale = 535 / 595;
    const y = 20 + (802 - 842 * scale) / 2;
    // pdf-lib also writes identity matrices ("1 0 0 1 0 0 cm"); ignore those.
    const matrices = [...text.matchAll(/(\S+) 0 0 (\S+) (\S+) (\S+) cm/g)]
      .map((m) => m.slice(1).map(Number))
      .filter(([a, d, e, f]) => !(a === 1 && d === 1 && e === 0 && f === 0));
    const translate = matrices.find(([a, d]) => a === 1 && d === 1);
    const scaling = matrices.find(([a, d]) => a !== 1 || d !== 1);
    expect(translate).toBeDefined();
    expect(scaling).toBeDefined();
    expect(translate![2]).toBeCloseTo(30, 2);
    expect(translate![3]).toBeCloseTo(y, 2);
    expect(scaling![0]).toBeCloseTo(scale, 4);
    expect(scaling![1]).toBeCloseTo(scale, 4);
  });

  it('keeps blank pages instead of failing on them', async () => {
    const input = await makePdf([{ size: A4, text: 'one' }, { size: A4 }, { size: A4, text: 'three' }]);
    const out = await PDFDocument.load(await applyMargins(input, { top: 10, bottom: 10, left: 10, right: 10 }));
    expect(out.getPageCount()).toBe(3);
    expect(contentText(out.getPage(0))).toContain(' Do');
    expect(contentText(out.getPage(1))).not.toContain(' Do');
    expect(contentText(out.getPage(2))).toContain(' Do');
  });

  it('returns pages unchanged in size when no margins are given', async () => {
    const input = await makePdf([{ size: A4, text: 'x' }]);
    const out = await PDFDocument.load(await applyMargins(input, {}));
    expect(out.getPage(0).getSize()).toEqual({ width: 595, height: 842 });
  });

  it('rejects margins that leave no room on the page', async () => {
    const input = await makePdf([{ size: A4, text: 'x' }]);
    await expect(applyMargins(input, { left: 300, right: 300 })).rejects.toThrow(RangeError);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects an invalid margin (%s)', async (top) => {
    const input = await makePdf([{ size: A4, text: 'x' }]);
    await expect(applyMargins(input, { top })).rejects.toThrow(/Margin "top"/);
  });
});
