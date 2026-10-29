const MAX_BYTES = 200_000;

/** Downscale an image file to a JPEG data URL of at most ~200 KB, for localStorage. */
export async function downscaleImage(file: File, maxDim = 1600): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image`);
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));

  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');
    ctx.fillStyle = '#fff'; // JPEG has no alpha; avoid black backgrounds on transparent PNGs
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.55]) {
      const url = canvas.toDataURL('image/jpeg', quality);
      if (url.length * 0.75 <= MAX_BYTES) return url; // base64 is ~4/3 of the bytes
    }
    scale *= 0.7;
  }
  throw new Error(`${file.name} could not be shrunk below 200 KB`);
}

/** Characters a value takes in localStorage. Browsers cap an origin at roughly 5 million. */
export const storageChars = (value: unknown) => JSON.stringify(value).length;
export const STORAGE_LIMIT_CHARS = 5_000_000;
