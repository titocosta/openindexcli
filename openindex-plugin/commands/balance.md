---
description: Check a wallet's native balance on a chain
argument-hint: <address> [--chain eth|base|bsc]
allowed-tools: Bash(npx @openindex/openindexcli:*)
---
Check an EVM balance via OpenIndex. Arguments: `$ARGUMENTS` (an address, plus an
optional `--chain eth|base|bsc`, default `eth`). Run:

```bash
npx @openindex/openindexcli balance $ARGUMENTS
```

Report the native balance and which chain was used.
