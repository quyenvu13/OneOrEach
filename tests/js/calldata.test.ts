// Calldata size of every write method, encoded exactly as genlayer-js 1.1.8 does.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calldataBytes, CALLDATA_LIMIT } from "../../src/lib/calldata.ts";
import { CASES, hardBlockRows } from "../../tools/calldata-rows.mjs";

test("ten cases + id/index/note methods at max note stay under 255 bytes", () => {
  assert.equal(Object.keys(CASES).length, 10);
  for (const row of hardBlockRows()) {
    const n = calldataBytes(row.method, row.args);
    assert.ok(n <= CALLDATA_LIMIT, `${row.name}: ${n} bytes`);
  }
});

test("140 emoji text is over the safety cap (UI meter must catch it)", () => {
  const n = calldataBytes("open_contract", ["0x" + "1".repeat(40), 3n, 100n, "📦".repeat(140)]);
  assert.ok(n > CALLDATA_LIMIT);
});
