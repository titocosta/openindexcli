# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenIndexCLI is a multi-chain CLI tool with username-based crypto transfers. Users register usernames (like @alice) and can send ETH/tokens to usernames instead of 0x addresses. Supports encrypted messaging, wallet management across Ethereum, Base, and BSC. Built with TypeScript using Commander.js for the CLI framework and ethers.js/eth-crypto for blockchain operations.

## Commands

### Run the CLI
```bash
# Default (Ethereum)
npx ts-node index.ts <command> [options]

# Specify blockchain
npx ts-node index.ts --chain <eth|base|bsc> <command> [options]
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

**Key files:**
- `index.ts` - Main CLI application with all commands
- `tokens.json` - Token registry mapping symbols to contract addresses

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
- `ETH_RPC_URL` - Ethereum JSON-RPC endpoint (defaults to Cloudflare)
- `BASE_RPC_URL` - Base JSON-RPC endpoint (defaults to Base mainnet)
- `BSC_RPC_URL` - BSC JSON-RPC endpoint (defaults to Binance dataseed)
- `RPC_URL` - Legacy RPC URL (backwards compatibility)

**Supported Chains:**
- `eth` - Ethereum Mainnet (Chain ID: 1)
- `base` - Base Mainnet (Chain ID: 8453)
- `bsc` - Binance Smart Chain (Chain ID: 56)

## CLI Commands

| Command | Description |
|---------|-------------|
| `chains` | List supported blockchain networks |
| `tokens` | List supported token symbols for each chain |
| `create [mnemonic...]` | Generate new wallet or restore from 12-word mnemonic |
| `register <username> -k <key>` | Register username for crypto transfers & messaging |
| `balance <address>` | Check native token balance |
| `token-balance <token> <address>` | Check ERC-20 token balance (use symbol or address) |
| `send <to\|@username> <amount> -k <key>` | Send native token to address or username |
| `send-token <token> <to\|@username> <amount> -k <key>` | Send ERC-20 token to address or username |
| `sign <message> -k <key>` | Sign message with private key |
| `verify <message> <signature>` | Verify message signature |
| `get-address -k <key>` | Derive wallet address from private key |
| `get-pubkey -k <key>` | Derive public key from private key |
| `encrypt <pubKey> <message>` | Encrypt message for recipient |
| `decrypt <encrypted> -k <key>` | Decrypt message with private key |
| `register <username> -k <key>` | Register with OpenIndex server |
| `send <toUser> <fromUser> <msg> -k <key>` | Send encrypted message |
| `get-messages <username> -k <key>` | Retrieve and decrypt inbox messages |

## Human-Friendly Features

### Username-Based Transfers
Register a username and send crypto using @username instead of 0x addresses:
```bash
# Register
npx ts-node index.ts register alice -k YOUR_KEY

# Send to username (@ is optional)
npx ts-node index.ts send @bob 0.1 -k YOUR_KEY
npx ts-node index.ts send-token USDC @alice 100 -k YOUR_KEY
```

### Token Symbol Support
Use short symbols instead of full contract addresses:

**Ethereum**: USDC, USDT, DAI, WETH, WBTC, UNI, LINK, AAVE
**Base**: USDC, DAI, WETH, cbETH
**BSC**: USDC, USDT, BUSD, DAI, WBNB, CAKE, ETH

Examples:
```bash
# Send USDC to username using symbol
npx ts-node index.ts --chain base send-token USDC @alice 100 -k YOUR_KEY

# Combine both: username + token symbol
npx ts-node index.ts send-token USDT @bob 50 -k YOUR_KEY
```

## Messaging Protocol

Messages use a double-envelope pattern:
1. Inner envelope contains plaintext message, sender ID, and timestamp
2. Encrypted with recipient's public key (asymmetric encryption)
3. Signed by sender for integrity verification
4. Recipient identified by SHA-256 hash of username (blinded inbox)
