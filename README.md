# browser-pdf-layout

Useful Zero-backend utility to resize and add print margins to PDFs in the browser.

## Installation

```bash
npm install browser-pdf-layout
```

## Usage

```javascript
import { applyMargins } from 'browser-pdf-layout';

const newPdfBytes = await applyMargins(originalPdfBuffer, {
  top: 20,
  bottom: 20,
  left: 20,
  right: 20
});
```
