# browser-pdf-layout

Useful Zero-backend utility to resize and add print margins to PDFs in the browser.

## Installation

```bash
npm install @daniel63194/browser-pdf-layout
```

## Usage

Margins are in PDF points (72 points = 1 inch, about 2.83 points = 1 mm). Each page keeps its size; its content is scaled down and centred inside the margins. Blank pages are kept as they are.

```javascript
import { applyMargins } from '@daniel63194/browser-pdf-layout';

const newPdfBytes = await applyMargins(originalPdfBuffer, {
  top: 20,
  bottom: 20,
  left: 20,
  right: 20
});
```
