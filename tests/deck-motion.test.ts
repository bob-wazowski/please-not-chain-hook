import { test } from "node:test";
import assert from "node:assert/strict";
import { deckMotion } from "../src/ui/deckMotion.ts";
const card = { left: 30, top: 50, width: 110, height: 122 } as DOMRect;
const table = { left: 20, top: 20, width: 360, height: 500 } as DOMRect;
test("Deal duration stays short and independent of shuffle settings and deck size", () => {
  for (const count of [1, 3, 12, 24, 48])
    for (const seconds of [0.2, 1.8, 6])
      for (let i = 0; i < count; i++) {
        const motion = deckMotion(card, table, i, count, seconds);
        assert.ok(motion.duration - seconds * 1000 <= 530.001);
        assert.equal(motion.shuffleDuration, seconds * 1000);
        assert.equal(motion.frames.at(-1)?.offset, 1);
        const offsets = motion.frames.map((f) => Number(f.offset));
        assert.ok(
          offsets.every(
            (x, j) => x >= 0 && x <= 1 && (j === 0 || x >= offsets[j - 1]),
          ),
        );
        assert.ok(
          motion.frames.every((f) => !String(f.transform).includes("NaN")),
        );
      }
});
test("Both packets rejoin before dealing and every card lands at its own grid position", () => {
  const a = deckMotion(card, table, 0, 12, 1.8),
    b = deckMotion(card, table, 6, 12, 1.8);
  assert.notEqual(a.frames[2].transform, b.frames[2].transform);
  assert.equal(
    a.frames.at(-1)?.transform,
    "translate3d(0,0,0) rotateZ(0deg) scale(1,1)",
  );
  assert.equal(b.frames.at(-1)?.transform, a.frames.at(-1)?.transform);
  assert.ok(Number(a.frames[8].offset) < Number(b.frames[8].offset));
});
