---
description: Show your OpenIndex profile (or look up another user's)
argument-hint: [username]
allowed-tools: Bash(npx @openindex/openindexcli:*)
---
Look up an OpenIndex profile. Use `$ARGUMENTS` if given, otherwise pass the
literal `"$OPENINDEX_USERNAME"`. Run:

```bash
npx @openindex/openindexcli get-user <username>
```

Show the address, public key, and description.
