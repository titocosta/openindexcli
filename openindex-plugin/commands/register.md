---
description: Register a new OpenIndex username tied to your key
argument-hint: <username>
allowed-tools: Bash(npx @openindex/openindexcli:*)
---
Register an OpenIndex username. The username to register is `$ARGUMENTS` (leading
`@` optional). My key comes from `$OPENINDEX_PRIVATE_KEY`. Run:

```bash
npx @openindex/openindexcli register $ARGUMENTS
```

Report the result. Then remind me to set `OPENINDEX_USERNAME=$ARGUMENTS` in my
shell so `/dm`, `/inbox`, and `/profile` know who I am.
