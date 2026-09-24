import { test } from "node:test";
import assert from "node:assert/strict";
import { decode, decodeWord, format, hexToBytes, toWords } from "../src/abi.mjs";

const word = (hex) => hex.padStart(64, "0");

test("hexToBytes rejects malformed input", () => {
  assert.equal(hexToBytes("0xff").length, 1);
  assert.throws(() => hexToBytes("0xf"), /odd number/);
  assert.throws(() => hexToBytes("0xzz"), /non-hex/);
  assert.throws(() => hexToBytes("0x"), /empty/);
});

test("toWords rejects a non-aligned payload", () => {
  assert.throws(() => toWords("0x" + "00".repeat(33)), /not a multiple of 32/);
  assert.equal(toWords("0x" + "00".repeat(64)).length, 2);
});

test("decodes an ERC-20 transfer call", () => {
  const calldata =
    "0xa9059cbb" +
    word("d8da6bf26964af9d7eed9e03e53415d37aa96045") +
    word("0de0b6b3a7640000");
  const [to, amount] = decode(calldata.slice(10), ["address", "uint256"]);
  assert.equal(to, "0xd8da6bf26964af9d7eed9e03e53415d37aa96045");
  assert.equal(amount, 1000000000000000000n);
});

test("uint widths do not change the decoded value", () => {
  const w = hexToBytes("0x" + word("ff"));
  assert.equal(decodeWord(w, "uint8"), 255n);
  assert.equal(decodeWord(w, "uint256"), 255n);
});

test("negative ints use two's complement", () => {
  const minusOne = hexToBytes("0x" + "ff".repeat(32));
  assert.equal(decodeWord(minusOne, "int256"), -1n);
  // -2 is all ff with a trailing fe, NOT "fe" repeated
  const minusTwo = hexToBytes("0x" + "ff".repeat(31) + "fe");
  assert.equal(decodeWord(minusTwo, "int256"), -2n);
  // a value below 2^255 stays positive
  assert.equal(decodeWord(hexToBytes("0x" + word("7f")), "int256"), 127n);
});

test("bools are strictly 0 or 1", () => {
  assert.equal(decodeWord(hexToBytes("0x" + word("1")), "bool"), true);
  assert.equal(decodeWord(hexToBytes("0x" + word("0")), "bool"), false);
  assert.throws(() => decodeWord(hexToBytes("0x" + word("2")), "bool"), /canonical bool/);
});

test("bytesN rejects dirty padding", () => {
  const clean = hexToBytes("0x" + "ab".repeat(4) + "00".repeat(28));
  assert.equal(decodeWord(clean, "bytes4"), "0xabababab");
  const dirty = hexToBytes("0x" + "ab".repeat(4) + "00".repeat(27) + "01");
  assert.throws(() => decodeWord(dirty, "bytes4"), /non-zero padding/);
});

test("too few words for the requested types is an error", () => {
  assert.throws(() => decode("0x" + word("1"), ["uint256", "uint256"]), /only 1 words/);
});

test("unsupported type is named in the error", () => {
  assert.throws(() => decodeWord(hexToBytes("0x" + word("1")), "string"), /unsupported type/);
});

test("format renders bigints and bools readably", () => {
  assert.equal(format(123n), "123");
  assert.equal(format(true), "true");
  assert.equal(format("0xabc"), "0xabc");
});
