# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenIndexCLI is a multi-chain CLI tool for end-to-end encrypted messaging and username-based crypto transfers. Users register usernames (like @alice) and can send encrypted messages or ETH/tokens to usernames instead of 0x addresses. Supports Ethereum, Base, and BSC. Built with TypeScript using Commander.js, ethers.js v6, and eth-crypto.

## Commands

### Run the CLI (development)
```bash
npx tsx index.ts <command> [options]
npx tsx index.ts --chain <eth|base|bsc> <command> [options]
```

### Build
```bash
npx tsc
```

### Run built version
```bash
node dist/index.js <command> [options]
```

### Install dependencies
```bash
npm install
```

**Note:** There are no tests or linting configured. The project uses `"type": "module"` (ES modules).

## Architecture

### File Structure

- `index.ts` — Main CLI application (~970 lines). All Commander.js commands are registered on a single `program` instance. Contains wallet operations, transaction sending, message encryption/decryption, user registration, and group management.
- `lib/constants.ts` — Chain configs (RPC URLs, chain IDs) and `API_BASE_URL`
- `lib/helpers.ts` — `hashUsername()` and `hashGroupId()` (SHA-256 hashing for blinded inboxes)
- `lib/group.ts` — Group messaging: `nextKey()` (HMAC-SHA256 ratchet) and `redistributeKeys()` (key rotation via E2EE)
- `lib/local.ts` — Local group data persistence in `~/.openindex/groups.json` (chmod 600). Functions: `saveGroup()`, `loadGroup()`, `deleteGroup()`
- `tokens.json` — Token registry mapping symbols (USDC, USDT, etc.) to contract addresses per chain

### Key Patterns

**Private key handling:** Commands that need a private key accept `-k, --key <key>` or fall back to `OPENINDEX_PRIVATE_KEY` env var via `getPrivateKey(options)`.

**Username resolution:** `resolveUsernameToAddress(recipient)` checks if input starts with `@` (or is a non-hex string), fetches the address from the API, and returns it. Used by `send-eth` and `send-token` commands.

**Token resolution:** `resolveTokenAddress(tokenInput, chain)` looks up `tokens.json` by symbol name for the current chain. Falls back to treating input as a raw contract address.

### External API

Base URL: `https://chat.openindex.ai/api` (defined in `lib/constants.ts`)

All API routes use the `/api/` prefix after the base:
- `GET /api/user/{username}` — Fetch user's address, public key, description
- `POST /api/user/{username}` — Update user description (signed)
- `POST /api/register` — Register username with address & public key
- `GET /api/search?q={query}&limit={n}` — Search users (BM25 + semantic)
- `GET /api/roulette` — Random active username
- `POST /api/send` — Send blinded message to inbox
- `GET /api/messages/{inboxId}` — Fetch messages from blinded inbox

### Messaging Protocol

**1-on-1 messages (asymmetric E2EE):**
1. Inner envelope: JSON with plaintext, senderId, timestamp
2. Encrypted with recipient's public key via `EthCrypto.encryptWithPublicKey`
3. Signed by sender with `ethers.Wallet.signMessage`
4. Recipient identified by `SHA-256(username)` (blinded inbox)

**Group messages (symmetric, Sender Keys protocol):**
1. Creator generates a `chainKey` and distributes it to members via E2EE (each member gets it encrypted with their public key)
2. Messages encrypted with AES-256-GCM using keys derived from HMAC-SHA256 ratchet (`lib/group.ts:nextKey`)
3. When a member leaves, remaining members rotate to a fresh `chainKey` (`lib/group.ts:redistributeKeys`)
4. Group state stored locally in `~/.openindex/groups.json`

### Environment Variables

- `OPENINDEX_PRIVATE_KEY` — Pre-set private key (avoids `-k` flag on every command)
- `ETH_RPC_URL` — Ethereum RPC (default: Cloudflare)
- `BASE_RPC_URL` — Base RPC (default: mainnet.base.org)
- `BSC_RPC_URL` — BSC RPC (default: bsc-dataseed.binance.org)

### Supported Chains

- `eth` — Ethereum Mainnet (Chain ID: 1)
- `base` — Base Mainnet (Chain ID: 8453)
- `bsc` — Binance Smart Chain (Chain ID: 56)
