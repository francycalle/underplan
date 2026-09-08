/**
 * Layout Map Export Utility for Underplan.
 * Exports the top-down SVG layout as high-resolution PNG (Retina 2x) or standalone SVG.
 */

export async function exportSvgAsPng(
  svgElement: SVGSVGElement,
  fileName: string = `Underplan-Channel-Map-${new Date().toISOString().slice(0, 10)}.png`,
  scale: number = 2
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Clone SVG so we don't modify the live DOM
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      
      // Determine export bounds: use viewBox if available, otherwise client dimensions
      const viewBox = svgElement.viewBox?.baseVal;
      const width = viewBox && viewBox.width > 0 ? viewBox.width : (svgElement.clientWidth || 1200);
      const height = viewBox && viewBox.height > 0 ? viewBox.height : (svgElement.clientHeight || 800);

      clonedSvg.setAttribute('width', `${width}`);
      clonedSvg.setAttribute('height', `${height}`);
      clonedSvg.setAttribute('style', 'background-color: #0E0F12;');

      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(clonedSvg);

      // Ensure xmlns is present
      if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width * scale;
          canvas.height = height * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to create canvas 2D context'));
            return;
          }

          // Dark blueprint background
          ctx.fillStyle = '#0E0F12';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw image scaled
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0, width, height);

          URL.revokeObjectURL(url);

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to generate PNG blob'));
              return;
            }
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
            resolve();
          }, 'image/png');
        } catch (canvasErr) {
          URL.revokeObjectURL(url);
          reject(canvasErr);
        }
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };

      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}

export function exportSvgDirect(
  svgElement: SVGSVGElement,
  fileName: string = `Underplan-Channel-Map-${new Date().toISOString().slice(0, 10)}.svg`
): void {
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  const viewBox = svgElement.viewBox?.baseVal;
  const width = viewBox && viewBox.width > 0 ? viewBox.width : (svgElement.clientWidth || 1200);
  const height = viewBox && viewBox.height > 0 ? viewBox.height : (svgElement.clientHeight || 800);

  clonedSvg.setAttribute('width', `${width}`);
  clonedSvg.setAttribute('height', `${height}`);
  clonedSvg.setAttribute('style', 'background-color: #0E0F12;');

  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clonedSvg);

  if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
