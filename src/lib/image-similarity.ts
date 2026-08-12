import sharp from "sharp";

export type ImageSignature = { dHash: string; avgColor: [number, number, number] };

const HASH_WIDTH = 9;
const HASH_HEIGHT = 8;

export async function computeImageSignature(buffer: Buffer): Promise<ImageSignature> {
  const grayscale = await sharp(buffer)
    .resize(HASH_WIDTH, HASH_HEIGHT, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer();

  let dHash = "";
  for (let row = 0; row < HASH_HEIGHT; row++) {
    for (let col = 0; col < HASH_WIDTH - 1; col++) {
      const left = grayscale[row * HASH_WIDTH + col];
      const right = grayscale[row * HASH_WIDTH + col + 1];
      dHash += left < right ? "1" : "0";
    }
  }

  const { data } = await sharp(buffer)
    .resize(1, 1, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const avgColor: [number, number, number] = [data[0], data[1], data[2]];

  return { dHash, avgColor };
}

function hammingDistance(a: string, b: string): number {
  let distance = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) distance++;
  }
  return distance + Math.abs(a.length - b.length);
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

/** Lower score = more visually similar. Combines structural (dHash) and color similarity. */
export function similarityScore(a: ImageSignature, b: ImageSignature): number {
  const maxHashBits = HASH_HEIGHT * (HASH_WIDTH - 1);
  const hashDistanceNormalized = hammingDistance(a.dHash, b.dHash) / maxHashBits;
  const colorDistanceNormalized = colorDistance(a.avgColor, b.avgColor) / (Math.sqrt(3) * 255);
  return hashDistanceNormalized * 0.7 + colorDistanceNormalized * 0.3;
}
