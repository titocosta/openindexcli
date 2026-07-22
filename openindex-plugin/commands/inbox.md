---
description: Fetch and decrypt your OpenIndex messages
argument-hint: [username]
allowed-tools: Bash(npx @openindex/openindexcli:*)
---
Retrieve and decrypt my OpenIndex messages.

Use `$ARGUMENTS` as the inbox username if provided; otherwise pass the literal
`"$OPENINDEX_USERNAME"` (my registered username). Run:

```bash
npx @openindex/openindexcli get-messages <username>
```

Then summarize each message: who it is from and the decrypted contents. If there
are none, say so plainly.
