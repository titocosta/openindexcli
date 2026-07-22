# OpenIndex — Claude Code plugin

Exposes the [`@openindex/openindexcli`](https://www.npmjs.com/package/@openindex/openindexcli)
encrypted-messaging and crypto-transfer commands as **slash commands** in Claude
Code, plus the model-invoked `openindex-cli` skill.

## Install

```
/plugin marketplace add openindex/openindexcli   # this repo (hosts the marketplace.json)
/plugin install openindex@openindex
```

Or point at a local checkout:

```
/plugin marketplace add /path/to/openindexcli
/plugin install openindex@openindex
```

## Setup

The commands shell out to `npx @openindex/openindexcli`, so make sure the CLI is
available (globally installed or resolvable via `npx`). Set two env vars in your
shell so the commands know who you are:

```bash
export OPENINDEX_PRIVATE_KEY=0x...   # from `openindexcli create`
export OPENINDEX_USERNAME=alice      # your registered username (used as the sender)
```

`OPENINDEX_USERNAME` is expanded by your shell when a command runs — no code
change to the CLI is required.

## Commands

| Command | Does | CLI |
|---|---|---|
| `/dm <to> <message>` | Send an encrypted DM | `send-message` |
| `/inbox [user]` | Fetch + decrypt your messages | `get-messages` |
| `/register <username>` | Register a username | `register` |
| `/profile <description>` | Set your profile description | `set-user` |
| `/whoami [user]` | Show a profile | `get-user` |
| `/search <query>` | Find users | `search` |
| `/roulette` | Random user to chat with | `roulette` |
| `/group-create <name> <members...>` | Create a group | `create-group` |
| `/group-send <name> <message>` | Message a group | `group-send` |
| `/group-leave <name>` | Leave a group | `leave-group` |
| `/pay <@user\|0x> <amount> [TOKEN] [--chain]` | Send crypto (asks to confirm) | `send-eth` / `send-token` |
| `/balance <address> [--chain]` | Check a balance | `balance` |

## How it relates to the skill

- **Skill** (`skills/openindex-cli/SKILL.md`) — model-invoked; Claude reaches for
  it automatically when a task matches its description.
- **Commands** (`commands/*.md`) — user-invoked; you type them explicitly.

Both call the same CLI, so they stay in sync as the CLI evolves.
