import { describe, it, expect } from "vitest";
import { similarityScore, type ImageSignature } from "../src/lib/image-similarity";

function sig(dHash: string, avgColor: [number, number, number]): ImageSignature {
  return { dHash, avgColor };
}

describe("similarityScore", () => {
  it("scores an identical signature as a perfect match (0 distance)", () => {
    const a = sig("1010101010101010101010101010101010101010101010101010101010101010101010", [120, 80, 40]);
    const score = similarityScore(a, a);
    expect(score).toBe(0);
  });

  it("scores a completely different hash and color higher than a near-identical one", () => {
    const base = sig("1".repeat(72), [200, 200, 200]);
    const nearIdentical = sig("1".repeat(70) + "00", [205, 205, 205]);
    const opposite = sig("0".repeat(72), [0, 0, 0]);

    const nearScore = similarityScore(base, nearIdentical);
    const farScore = similarityScore(base, opposite);

    expect(nearScore).toBeLessThan(farScore);
  });

  it("weights structural (hash) difference more than color difference", () => {
    const base = sig("1".repeat(72), [128, 128, 128]);
    const sameHashDiffColor = sig("1".repeat(72), [0, 0, 0]);
    const diffHashSameColor = sig("0".repeat(72), [128, 128, 128]);

    const colorOnlyDistance = similarityScore(base, sameHashDiffColor);
    const hashOnlyDistance = similarityScore(base, diffHashSameColor);

    expect(hashOnlyDistance).toBeGreaterThan(colorOnlyDistance);
  });
});
