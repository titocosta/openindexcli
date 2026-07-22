---
description: Create an encrypted OpenIndex group chat
argument-hint: <groupName> <member1> <member2> ...
allowed-tools: Bash(npx @openindex/openindexcli:*)
---
Create an encrypted OpenIndex group (Sender Keys protocol).

Arguments: `$ARGUMENTS`
- **First token** = group name.
- The rest = member usernames.

I am the creator, so the creator must come first in the member list. Pass my
username as the literal `"$OPENINDEX_USERNAME"` ahead of the others. Run:

```bash
npx @openindex/openindexcli create-group <groupName> "$OPENINDEX_USERNAME" <otherMembers...>
```

All members must already be registered. Confirm creation and list the members.
