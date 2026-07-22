---
description: Send an end-to-end encrypted OpenIndex message to a username
argument-hint: <toUser> <message>
allowed-tools: Bash(npx @openindex/openindexcli:*)
---
Send an encrypted OpenIndex direct message.

Arguments: `$ARGUMENTS`
- **First token** = recipient username (leading `@` optional).
- **Remaining text** = the message body.

The sender is me: my private key is in `$OPENINDEX_PRIVATE_KEY` and my registered
username is in `$OPENINDEX_USERNAME`. Pass the sender to the CLI as the literal
string `"$OPENINDEX_USERNAME"` so the shell expands it at runtime — do not try to
resolve its value yourself.

Run exactly (substituting the parsed recipient and message):

```bash
npx @openindex/openindexcli send-message "$OPENINDEX_USERNAME" <toUser> "<message>"
```

If `$OPENINDEX_USERNAME` is empty or the CLI reports the sender is unknown, stop
and ask me for my username. After sending, confirm success in one line.
