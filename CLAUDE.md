# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenIndexCLI is an Ethereum-based CLI tool for wallet management, encrypted messaging, and user registration with the OpenIndex.ai service. Built with TypeScript using Commander.js for the CLI framework and ethers.js/eth-crypto for blockchain operations.

## Commands

### Run the CLI
```bash
npx ts-node index.ts <command> [options]
```

### Build (TypeScript compilation)
```bash
npx tsc
```

### Install dependencies
```bash
npm install
```

## Architecture

Single-file CLI application (`index.ts`) using Commander.js command pattern. All commands are registered on a single `program` instance.

**Key dependencies:**
- `ethers` - Ethereum wallet operations, transaction signing, message verification
- `eth-crypto` - Public key derivation, asymmetric encryption/decryption
- `commander` - CLI argument parsing and command structure

**External API:** Communicates with `https://www.openindex.ai` for:
- User registration (`/api/register`)
- Public key discovery (`/api/user/{username}`)
- Blinded message delivery (`/api/send`)
- Message retrieval (`/api/messages/{inboxId}`)

**Environment:**
- `RPC_URL` - Ethereum JSON-RPC endpoint (defaults to Cloudflare)

## CLI Commands

| Command | Description |
|---------|-------------|
| `create` | Generate new Ethereum wallet |
| `balance <address>` | Check ETH balance |
| `send <to> <amount> -k <key>` | Send ETH transaction |
| `sign <message> -k <key>` | Sign message with private key |
| `verify <message> <signature>` | Verify message signature |
| `get-pubkey -k <key>` | Derive public key from private key |
| `encrypt <pubKey> <message>` | Encrypt message for recipient |
| `decrypt <encrypted> -k <key>` | Decrypt message with private key |
| `register <username> -k <key>` | Register with OpenIndex server |
| `send <toUser> <fromUser> <msg> -k <key>` | Send encrypted message |
| `get-messages <username> -k <key>` | Retrieve and decrypt inbox messages |

## Messaging Protocol

Messages use a double-envelope pattern:
1. Inner envelope contains plaintext message, sender ID, and timestamp
2. Encrypted with recipient's public key (asymmetric encryption)
3. Signed by sender for integrity verification
4. Recipient identified by SHA-256 hash of username (blinded inbox)
