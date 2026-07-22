---
description: Send a message to an OpenIndex group
argument-hint: <groupName> <message>
allowed-tools: Bash(npx @openindex/openindexcli:*)
---
Send a message to an OpenIndex group.

Arguments: `$ARGUMENTS`
- **First token** = group name.
- **Remaining text** = the message body.

Run:

```bash
npx @openindex/openindexcli group-send <groupName> "<message>"
```

Confirm it was sent.
