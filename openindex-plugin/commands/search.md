---
description: Search OpenIndex users by username or description
argument-hint: <query> [-l <limit>]
allowed-tools: Bash(npx @openindex/openindexcli:*)
---
Search OpenIndex for users matching: `$ARGUMENTS`

Run (hybrid BM25 + semantic search):

```bash
npx @openindex/openindexcli search $ARGUMENTS
```

Present the matches as a short list (`username` — description). Offer to `/dm`
any of them.
