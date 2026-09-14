/**
 * printFIRDocument
 *
 * Opens a clean, isolated print window containing ONLY the FIR document.
 * This avoids any interference from the React app shell, modals,
 * sidebar, fixed headers, backdrop layers, or portal containers.
 *
 * The printed document:
 * - Is rendered on A4 portrait with compact but readable typography
 * - Flows naturally across pages without blank-page artifacts
 * - Keeps the professional KSP header, all FIR fields, and signature block
 */
export function printFIRDocument(firDocumentSelector: string = '.printable-fir-document'): void {
  const firEl = document.querySelector(firDocumentSelector);
  if (!firEl) {
    console.warn('[printFIRDocument] No element found with selector:', firDocumentSelector);
    return;
  }

  const firHTML = firEl.innerHTML;

  const printWindow = window.open('', '_blank', 'width=900,height=650');
  if (!printWindow) {
    // Popup blocked — fall back to in-page print
    console.warn('[printFIRDocument] Popup blocked, falling back to window.print()');
    window.print();
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>First Information Report — Karnataka State Police</title>
  <style>
    /* ── Page geometry ─────────────────────────────────────────── */
    @page {
      size: A4 portrait;
      margin: 14mm 16mm 16mm 16mm;
    }

    /* ── Document reset ─────────────────────────────────────────── */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      width: 100%;
      height: auto;
      background: white;
      color: #000;
      font-family: 'Times New Roman', Times, Georgia, serif;
      font-size: 9.5pt;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── FIR document wrapper ───────────────────────────────────── */
    .fir-doc {
      width: 100%;
      padding: 0;
      background: white;
      color: #000;
    }

    /* ── Header ─────────────────────────────────────────────────── */
    .fir-header {
      text-align: center;
      border-bottom: 2px solid #1a2e4a;
      padding-bottom: 5mm;
      margin-bottom: 5mm;
      position: relative;
      page-break-after: avoid;
      break-after: avoid;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .fir-header img {
      width: 26pt;
      height: 26pt;
      object-fit: contain;
      display: block;
      margin: 0 auto 2pt;
    }

    .fir-header h1 {
      font-size: 14pt;
      font-weight: 900;
      color: #1a2e4a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1pt;
    }

    .fir-header h2 {
      font-size: 8pt;
      font-weight: 700;
      color: #b8860b;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 2pt;
    }

    .fir-header p {
      font-size: 7.5pt;
      color: #555;
      font-weight: 700;
      text-transform: uppercase;
    }

    /* ── FIR field rows ─────────────────────────────────────────── */
    .fir-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-bottom: 1px solid #bbb;
      padding: 2.5pt 0;
      gap: 4pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .fir-row-full {
      border-bottom: 1px solid #bbb;
      padding: 2.5pt 0;
      page-break-inside: auto;
      break-inside: auto;
    }

    /* Avoid widow headings */
    .fir-row-full strong,
    .fir-row strong {
      font-size: 9.5pt;
      page-break-after: avoid;
      break-after: avoid;
      display: block;
      margin-bottom: 1pt;
    }

    .fir-row .right {
      text-align: right;
    }

    /* ── List items (acts, accused, victims) ────────────────────── */
    .fir-indent {
      padding-left: 8pt;
      margin-top: 1pt;
    }

    .fir-indent p {
      margin: 0;
      padding: 0;
    }

    .fir-sub-item {
      border-left: 2pt solid #ccc;
      padding-left: 5pt;
      margin-bottom: 3pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .fir-sub-item p {
      margin: 0;
      padding: 0;
    }

    /* ── Brief facts — allow page break if needed ───────────────── */
    .fir-facts {
      border-bottom: 1px solid #bbb;
      padding: 2.5pt 0;
      page-break-inside: auto;
      break-inside: auto;
    }

    /* ── Signature block ────────────────────────────────────────── */
    .fir-signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      text-align: center;
      padding-top: 10pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .fir-sig-line {
      width: 120pt;
      margin: 16pt auto 0;
      border-top: 1px solid #555;
      padding-top: 2pt;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .fir-sig-rank {
      font-size: 7pt;
      color: #666;
      margin-top: 1pt;
    }

    .fir-sig-placeholder {
      height: 16pt;
      font-style: italic;
      color: #666;
      font-size: 8pt;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    /* ── Misc ───────────────────────────────────────────────────── */
    p { margin: 0; }
    .italic { font-style: italic; }
    .muted { color: #666; }
    .mono { font-family: 'Courier New', monospace; font-size: 8.5pt; }
  </style>
</head>
<body>
  <div class="fir-doc">
    ${firHTML}
  </div>
  <script>
    // Auto-trigger print after images and styles load
    window.addEventListener('load', function () {
      setTimeout(function () {
        window.print();
        // Close the print window after printing is done or cancelled
        window.addEventListener('afterprint', function () {
          window.close();
        });
      }, 400);
    });
  </script>
</body>
</html>`);

  printWindow.document.close();
}
