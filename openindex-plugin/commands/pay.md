---
description: Send crypto to an OpenIndex @username or 0x address
argument-hint: <@user|0x> <amount> [TOKEN] [--chain eth|base|bsc]
allowed-tools: Bash(npx @openindex/openindexcli:*)
---
Send crypto via OpenIndex. Arguments: `$ARGUMENTS`
- `<recipient>` = a `@username` or `0x…` address (first token).
- `<amount>` = numeric amount (second token).
- optional `<TOKEN>` symbol (e.g. `USDC`). If omitted, send the chain's native
  coin (ETH / ETH / BNB).
- optional `--chain eth|base|bsc` (defaults to `eth`).

Choose the CLI command by whether a token symbol was given:

```bash
# native coin
npx @openindex/openindexcli [--chain <chain>] send-eth <recipient> <amount>

# ERC-20 by symbol
npx @openindex/openindexcli [--chain <chain>] send-token <TOKEN> <recipient> <amount>
```

IMPORTANT: this spends real funds and is irreversible. Before broadcasting, show
me the parsed recipient, amount, token, and chain, and wait for my explicit
confirmation. Do not run the send command until I confirm.
