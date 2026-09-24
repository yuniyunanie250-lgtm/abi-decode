#!/usr/bin/env node
import { decode, format, TYPES } from "./abi.mjs";

const HELP = `abi-decode -- decode static ABI arguments

usage:
  abi-decode <data> <type> [type ...]
  abi-decode --hex 0xa9059cbb... address uint256

options:
  --hex       treat the first argument as the full payload including the
              4-byte selector, which is skipped
  -h, --help  this message

supported types:
  ${TYPES.join(", ")}

dynamic types (string, bytes, arrays) are not supported: they need the full
parameter list to resolve offsets.

example:
  abi-decode --hex 0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa960450000000000000000000000000000000000000000000000000de0b6b3a7640000 address uint256
`;

function main(argv) {
  const args = [...argv];
  let payload = null;
  if (args[0] === "-h" || args[0] === "--help") return void process.stdout.write(HELP);
  if (args[0] === "--hex") {
    args.shift();
    const full = args.shift();
    if (!full) throw new Error("--hex needs a payload");
    payload = "0x" + full.replace(/^0x/i, "").slice(8);
  } else {
    payload = args.shift();
  }
  const types = args;
  if (!payload || types.length === 0) throw new Error("need a payload and at least one type");
  const values = decode(payload, types);
  types.forEach((t, i) => console.log(`${t.padEnd(10)} ${format(values[i])}`));
}

try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(`abi-decode: ${err.message}`);
  process.exit(1);
}
