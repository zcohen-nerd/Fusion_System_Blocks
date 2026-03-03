/**
 * CLIENT-SIDE PDF EXPORT
 *
 * Exports the SVG diagram canvas to PDF entirely in the browser.
 * Uses canvas rasterization of the SVG and embeds the image in a
 * minimal PDF 1.4 document.  No external libraries required.
 *
 * Supports page sizes: A4, Letter, A3.
 * Includes diagram title and timestamp as PDF metadata.
 *
 * Author: GitHub Copilot
 * Module: PDF Export Utility
 */

/* global DiagramEditorCore */

// eslint-disable-next-line no-unused-vars
class PdfExporter {
  /**
   * Page size definitions in PDF points (1pt = 1/72 inch).
   */
  static PAGE_SIZES = {
    'A4':     { width: 595.28, height: 841.89, label: 'A4 (210 × 297 mm)' },
    'Letter': { width: 612,    height: 792,     label: 'Letter (8.5 × 11 in)' },
    'A3':     { width: 841.89, height: 1190.55, label: 'A3 (297 × 420 mm)' }
  };

  /**
   * Export the SVG canvas to a PDF file download.
   *
   * @param {object} options
   * @param {string} [options.pageSize='A4']  Page size key.
   * @param {boolean} [options.landscape=true] Landscape orientation.
   * @param {string} [options.title]  Diagram title for PDF metadata.
   * @param {number} [options.margin=36]  Page margin in points (default 0.5 in).
   * @param {number} [options.scale=2]  Rasterization scale factor for quality.
   * @returns {Promise<void>}
   */
  static async exportToPdf(options = {}) {
    const {
      pageSize = 'A4',
      landscape = true,
      title = 'System Block Diagram',
      margin = 36,
      scale = 2
    } = options;

    const size = PdfExporter.PAGE_SIZES[pageSize] || PdfExporter.PAGE_SIZES['A4'];
    const pw = landscape ? size.height : size.width;
    const ph = landscape ? size.width : size.height;

    // 1. Clone and prepare the SVG
    const svgEl = document.getElementById('svg-canvas');
    if (!svgEl) throw new Error('SVG canvas not found');

    const clone = svgEl.cloneNode(true);

    // Remove selection UI artifacts
    clone.querySelectorAll('.selection-highlight, .drag-handle, .alignment-guide, .hover-indicator').forEach(el => el.remove());

    // Compute tight bounding box from content
    const core = window.diagramEditor;
    let vb;
    if (core && core.diagram && core.diagram.blocks.length > 0) {
      const blocks = core.diagram.blocks;
      const minX = Math.min(...blocks.map(b => b.x)) - 20;
      const minY = Math.min(...blocks.map(b => b.y)) - 20;
      const maxX = Math.max(...blocks.map(b => b.x + (b.width || 120))) + 20;
      const maxY = Math.max(...blocks.map(b => b.y + (b.height || 80))) + 20;
      vb = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    } else {
      const vbAttr = svgEl.getAttribute('viewBox');
      if (vbAttr) {
        const [vx, vy, vw, vh] = vbAttr.split(/\s+/).map(Number);
        vb = { x: vx, y: vy, width: vw, height: vh };
      } else {
        vb = { x: 0, y: 0, width: 1000, height: 1000 };
      }
    }

    clone.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
    clone.removeAttribute('style');
    clone.style.background = 'white';

    // Set explicit width/height for canvas rendering
    const drawW = pw - 2 * margin;
    const drawH = ph - 2 * margin;
    const aspect = vb.width / vb.height;
    let imgW, imgH;
    if (aspect > drawW / drawH) {
      imgW = drawW;
      imgH = drawW / aspect;
    } else {
      imgH = drawH;
      imgW = drawH * aspect;
    }

    const canvasW = Math.ceil(imgW * scale);
    const canvasH = Math.ceil(imgH * scale);
    clone.setAttribute('width', canvasW);
    clone.setAttribute('height', canvasH);

    // 2. Rasterize SVG to canvas via Blob URL
    const svgString = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.width = canvasW;
    img.height = canvasH;

    const imageData = await new Promise((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.drawImage(img, 0, 0, canvasW, canvasH);
        URL.revokeObjectURL(url);

        // Get JPEG data (much smaller than PNG for embedded images)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const base64 = dataUrl.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        resolve(bytes);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to rasterize SVG'));
      };
      img.src = url;
    });

    // 3. Build PDF
    const pdf = PdfExporter._buildPdf(imageData, pw, ph, imgW, imgH, margin, title);

    // 4. Trigger download
    const pdfBlob = new Blob([pdf], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = (title.replace(/[^a-zA-Z0-9_\- ]/g, '') || 'diagram') + '.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Allow sufficient time for the download to start before revoking
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000);
  }

  /**
   * Build a minimal PDF 1.4 binary containing a single JPEG image.
   *
   * @param {Uint8Array} jpegBytes  JPEG image data.
   * @param {number} pageW  Page width in points.
   * @param {number} pageH  Page height in points.
   * @param {number} imgW  Image display width in points.
   * @param {number} imgH  Image display height in points.
   * @param {number} margin  Page margin in points.
   * @param {string} title  PDF title metadata.
   * @returns {Uint8Array}  PDF file bytes.
   */
  static _buildPdf(jpegBytes, pageW, pageH, imgW, imgH, margin, title) {
    const encoder = new TextEncoder();
    let out = '';
    let byteLen = 0;
    const offsets = [];

    const addObj = (content) => {
      offsets.push(byteLen);
      out += content;
      byteLen += encoder.encode(content).byteLength;
    };

    // Header
    const header = '%PDF-1.4\n% FSB-binary\n';
    out += header;
    byteLen += encoder.encode(header).byteLength;

    // Obj 1: Catalog
    addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // Obj 2: Pages
    addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

    // Obj 3: Page
    addObj(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] /Contents 5 0 R /Resources << /XObject << /Im0 4 0 R >> >> >>\nendobj\n`);

    // Obj 4: Image XObject (JPEG)
    // Decode JPEG header to get dimensions
    const jpegDims = PdfExporter._getJpegDimensions(jpegBytes);
    const imgPixW = jpegDims.width;
    const imgPixH = jpegDims.height;
    const imgLength = jpegBytes.length;

    addObj(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgPixW} /Height ${imgPixH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgLength} >>\nstream\n`);
    // We'll insert the binary stream separately
    const streamStart = out.length;

    // Obj 5: Page content stream — draw image centered on page
    const imgX = margin + (((pageW - 2 * margin) - imgW) / 2);
    const imgY = margin + (((pageH - 2 * margin) - imgH) / 2);
    const contentStream = `q\n${imgW.toFixed(2)} 0 0 ${imgH.toFixed(2)} ${imgX.toFixed(2)} ${imgY.toFixed(2)} cm\n/Im0 Do\nQ\n`;

    // Obj 6: Info dictionary
    const now = new Date();
    const dateStr = `D:${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

    // Build full output with binary stream
    const part1 = encoder.encode(out);
    const afterStream = `\nendstream\nendobj\n`;
    const contentStreamByteLen = encoder.encode(contentStream).byteLength;
    const obj5 = `5 0 obj\n<< /Length ${contentStreamByteLen} >>\nstream\n${contentStream}endstream\nendobj\n`;
    const obj6 = `6 0 obj\n<< /Title (${PdfExporter._escapePdfString(title)}) /Creator (Fusion System Blocks) /Producer (FSB PDF Export) /CreationDate (${dateStr}) >>\nendobj\n`;

    const afterStreamBytes = encoder.encode(afterStream);
    const obj5Bytes = encoder.encode(obj5);
    const obj6Bytes = encoder.encode(obj6);

    // Calculate total size
    const totalSize = part1.length + jpegBytes.length + afterStreamBytes.length + obj5Bytes.length + obj6Bytes.length + 500; // +500 for xref/trailer
    const result = new Uint8Array(totalSize);
    let pos = 0;

    // Copy part1 (header + objects 1-4 stream header)
    result.set(part1, pos);
    pos += part1.length;

    // Fix offset for obj 4 — the stream start marker was tracked
    // Record actual binary positions for xref
    const objPositions = [...offsets];

    // Copy JPEG stream data
    result.set(jpegBytes, pos);
    pos += jpegBytes.length;

    // End stream for obj 4
    result.set(afterStreamBytes, pos);
    pos += afterStreamBytes.length;

    // Obj 5 position
    objPositions.push(pos);
    result.set(obj5Bytes, pos);
    pos += obj5Bytes.length;

    // Obj 6 position
    objPositions.push(pos);
    result.set(obj6Bytes, pos);
    pos += obj6Bytes.length;

    // Cross-reference table
    const xrefPos = pos;
    let xref = `xref\n0 ${objPositions.length + 1}\n`;
    xref += '0000000000 65535 f \n';
    for (const offset of objPositions) {
      xref += String(offset).padStart(10, '0') + ' 00000 n \n';
    }
    xref += `trailer\n<< /Size ${objPositions.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;

    const xrefBytes = encoder.encode(xref);
    result.set(xrefBytes, pos);
    pos += xrefBytes.length;

    return result.slice(0, pos);
  }

  /**
   * Get JPEG image dimensions from the binary header.
   */
  static _getJpegDimensions(data) {
    let i = 2; // Skip SOI marker
    while (i < data.length) {
      if (data[i] !== 0xFF) break;
      const marker = data[i + 1];
      if (marker === 0xC0 || marker === 0xC2 ||
          (marker >= 0xC1 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8)) {
        // SOF marker — contains dimensions (skip DHT 0xC4 and reserved 0xC8)
        return {
          height: (data[i + 5] << 8) | data[i + 6],
          width: (data[i + 7] << 8) | data[i + 8]
        };
      }
      const segLen = (data[i + 2] << 8) | data[i + 3];
      i += 2 + segLen;
    }
    return { width: 800, height: 600 }; // fallback
  }

  /**
   * Escape a string for PDF string literal.
   */
  static _escapePdfString(str) {
    return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}
