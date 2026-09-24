/**
 * Decode static ABI-encoded arguments.
 *
 * ABI encoding puts every static argument on a 32-byte boundary:
 *   uint<M>     right-aligned big-endian
 *   address     right-aligned, low 20 bytes
 *   bool        0 or 1, right-aligned
 *   bytes<M>    left-aligned, right-padded with zeros
 *
 * Dynamic types (string, bytes, T[]) are offset-based and are deliberately out
 * of scope: decoding them correctly requires the whole parameter list, which is
 * a different tool.
 */

export const TYPES = /** @type {const} */ ([
  "uint256", "uint160", "uint128", "uint64", "uint32", "uint16", "uint8",
  "int256", "int128", "int64", "address", "bool",
  "bytes32", "bytes16", "bytes8", "bytes4", "bytes1",
]);

export function strip0x(s) {
  return s.startsWith("0x") || s.startsWith("0X") ? s.slice(2) : s;
}

/** Hex string (with or without 0x) to Uint8Array. Throws on odd length or non-hex. */
export function hexToBytes(input) {
  const s = strip0x(String(input)).trim();
  if (s.length === 0) throw new Error("empty input");
  if (s.length % 2 !== 0) throw new Error(`odd number of hex digits: ${s.length}`);
  if (!/^[0-9a-fA-F]*$/.test(s)) throw new Error(`non-hex character in "${input}"`);
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes) {
  return "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Split into 32-byte words. Throws if the payload is not word-aligned. */
export function toWords(input) {
  const bytes = input instanceof Uint8Array ? input : hexToBytes(input);
  if (bytes.length % 32 !== 0) {
    throw new Error(`payload is ${bytes.length} bytes, not a multiple of 32`);
  }
  const words = [];
  for (let i = 0; i < bytes.length; i += 32) words.push(bytes.slice(i, i + 32));
  return words;
}

function isZero(bytes) {
  for (const b of bytes) if (b !== 0) return false;
  return true;
}

/** Decode one 32-byte word as `type`. Returns bigint, string, or boolean. */
export function decodeWord(word, type) {
  if (word.length !== 32) throw new Error("a word must be exactly 32 bytes");
  if (type === "address") return "0x" + Buffer.from(word.slice(12)).toString("hex");
  if (type === "bool") {
    if (word[31] > 1 || !isZero(word.slice(0, 31))) throw new Error("not a canonical bool");
    return word[31] === 1;
  }
  const m = /^(u?int)(\d+)$/.exec(type);
  if (m) {
    const bits = Number(m[2]);
    if (bits % 8 !== 0 || bits < 8 || bits > 256) throw new Error(`bad width in ${type}`);
    const n = BigInt(bytesToHex(word));
    if (m[1] === "uint") return n;
    // int<M> is two's complement; M is a multiple of 8 so 2^256 - n
    const max = 1n << 256n;
    const half = 1n << 255n;
    return n >= half ? n - max : n;
  }
  const b = /^bytes(\d+)$/.exec(type);
  if (b) {
    const size = Number(b[1]);
    if (size < 1 || size > 32) throw new Error(`bad width in ${type}`);
    if (!isZero(word.slice(size))) throw new Error(`${type} has non-zero padding`);
    return bytesToHex(word.slice(0, size));
  }
  throw new Error(`unsupported type: ${type}`);
}

/**
 * Decode `types` from a payload.
 * @param {string|Uint8Array} input hex or bytes, word-aligned
 * @param {string[]} types
 */
export function decode(input, types) {
  const words = toWords(input);
  if (types.length > words.length) {
    throw new Error(`asked for ${types.length} values but only ${words.length} words present`);
  }
  return types.map((t, i) => decodeWord(words[i], t));
}

/** Render a decoded value the way a block explorer would. */
export function format(value) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "bigint") return value.toString();
  return value;
}
