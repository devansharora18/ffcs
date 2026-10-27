/**
 * Downscales a pasted or attached screenshot before it leaves the browser.
 * A full-res phone screenshot is ~2 MB; 1200px at JPEG 0.8 is ~150 KB and still
 * legible for course codes.
 */
export async function fileToDataUrl(file: File, maxEdge = 1200, quality = 0.8): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas unavailable');

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return canvas.toDataURL('image/jpeg', quality);
}
