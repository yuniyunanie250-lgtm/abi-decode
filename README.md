# abi-decode

Decode static ABI-encoded arguments from calldata or return data, with no
dependencies.

Paste a transaction input from an explorer and you get the arguments back as
typed values. This covers the static types — the ones that sit on a 32-byte
boundary — which is the majority of real calldata.

## Usage

```bash
npx github:yuniyunanie250-lgtm/abi-decode --hex 0xa9059cbb<...> address uint256
```

```
address    0xd8da6bf26964af9d7eed9e03e53415d37aa96045
uint256    1000000000000000000
```

As a library:

```js
import { decode } from "abi-decode";
decode("0x" + "00".repeat(31) + "01", ["uint256"]); // [1n]
```

## Rules it enforces

- **Word alignment.** A payload that is not a multiple of 32 bytes is rejected
  rather than silently truncated.
- **Canonical `bool`.** Only 0 and 1 decode; 2 is an error, because a
  non-canonical bool is a real source of divergent behaviour between clients.
- **Clean `bytesN` padding.** The bytes after N must be zero.
- **Two's complement for `int<M>`**. `int256(-1)` decodes to `-1n`, not a huge
  positive number.

## What it does not do

- **Dynamic types.** `string`, `bytes` and arrays are offset-based, and resolving
  them needs the entire parameter list. Use a full ABI decoder for those.
- **Signature lookup.** It decodes arguments; it does not tell you which function
  was called. `evm-calldata` does that.
- **No type inference.** You state the types. Guessing from the bytes is how you
  get plausible-but-wrong output.

## Development

```bash
npm test
```

## License

MIT
