// M7: bildkoden som låg i api/src/routes/photos.js – flyttad hit, inte omskriven. Ren JS, inga
// native-beroenden (inget sharp), så att samma kod kör i API:et, i func start och i Azure Functions.
// Den här filen vet ingenting om Azure – det är den portabla delen (se docs/decisions/serverless.md).
//
// Skalar om en bild till fyra storlekar och räknar ut en enkel bildsignatur per variant
// så att vi kan hitta dubbletter.
export const SIZES = [1600, 800, 400, 160];

export const resize = (pixels, width, height, targetWidth) => {
  const scale = width / targetWidth;
  const targetHeight = Math.round(height / scale);
  const out = new Uint8Array(targetWidth * targetHeight * 4);
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const sx = Math.floor(x * scale);
      const sy = Math.floor(y * scale);
      const src = (sy * width + sx) * 4;
      const dst = (y * targetWidth + x) * 4;
      out[dst] = pixels[src];
      out[dst + 1] = pixels[src + 1];
      out[dst + 2] = pixels[src + 2];
      out[dst + 3] = pixels[src + 3];
    }
  }
  return { pixels: out, width: targetWidth, height: targetHeight };
};

export const signature = (pixels) => {
  let hash = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = (pixels[i] * 299 + pixels[i + 1] * 587 + pixels[i + 2] * 114) / 1000;
    hash = (hash * 31 + Math.round(gray)) % 2147483647;
  }
  return hash.toString(16);
};

// Hela jobbet för en bild. Klienten skickar inte pixeldata än, så vi genererar en platshållare
// med samma dimensioner. Samma arbete, samma tid – som i API:et före M7.
export const processImage = (width, height) => {
  const pixels = new Uint8Array(width * height * 4).fill(128);

  const started = Date.now();
  const variants = SIZES.map((size) => {
    const scaled = resize(pixels, width, height, size);
    return { size, signature: signature(scaled.pixels) };
  });
  return { variants, processingMs: Date.now() - started };
};