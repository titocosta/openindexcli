# OpenIndex CLI

A powerful CLI tool for **end-to-end encrypted messaging** using Ethereum identities, with multi-chain crypto capabilities. Send private messages to @username with cryptographic guarantees - no one but the recipient can read them.

## Features

### **End-to-End Encrypted Messaging**
- **Username-based messaging** - Send encrypted messages to @username
- **Cryptographic privacy** - Messages encrypted with recipient's public key (only they can decrypt)
- **Blinded inbox** - Server can't see who messages are for (uses hashed usernames)
- **Authenticity verified** - Messages signed by sender, verified by recipient
- **No metadata leakage** - Server stores messages by SHA-256 hash, not readable identifiers

### **Multi-Chain Crypto Operations**
- **Username-based transfers** - Send ETH and tokens to @username instead of 0x addresses
- **Multi-chain support** - Ethereum, Base, and BSC
- **Token symbols** - Use "USDC" instead of long contract addresses
- **Wallet management** - Create wallets, check balances, send transactions
- **ERC-20 operations** - Send and check balances for any ERC-20 token
- **Message signing** - Sign and verify messages

## Quick Start

### Installation

```bash
# Install globally
npm install -g @openindex/openindexcli

# Or run directly with npx (no install needed)
npx @openindex/openindexcli <command>
```

### Basic Usage

```bash
# Create or restore wallet
npx @openindex/openindexcli create  # Generate new random wallet
npx @openindex/openindexcli create word1 word2 word3 ... word12  # Restore from mnemonic

# Register a username
npx @openindex/openindexcli register alice -k YOUR_PRIVATE_KEY
npx @openindex/openindexcli register @bob -k BOB_PRIVATE_KEY  # @ is optional

# Send end-to-end encrypted messages
npx @openindex/openindexcli send-message bob alice "Hello Bob! Only you can read this." -k ALICE_KEY
npx @openindex/openindexcli get-messages bob -k BOB_KEY  # Bob retrieves and decrypts

# Send crypto to username (optional - CLI is primarily for messaging)
npx @openindex/openindexcli send-eth @bob 0.1 -k ALICE_KEY
npx @openindex/openindexcli --chain base send-token USDC @alice 100 -k BOB_KEY
```

## Supported Chains

| Chain | Key | Chain ID | Tokens |
|-------|-----|----------|--------|
| Ethereum | `eth` | 1 | USDC, USDT, DAI, WETH, WBTC, UNI, LINK, AAVE |
| Base | `base` | 8453 | USDC, DAI, WETH, cbETH |
| BSC | `bsc` | 56 | USDC, USDT, BUSD, DAI, WBNB, CAKE, ETH |

## Commands

### End-to-End Encrypted Messaging

```bash
npx @openindex/openindexcli register <username> -k <key>                      # Register username with public key
npx @openindex/openindexcli send-message <toUser> <fromUser> <message> -k <key>       # Send encrypted message
npx @openindex/openindexcli get-messages <username> -k <key>                  # Retrieve and decrypt your messages

# Example: Alice sends Bob a private message
npx @openindex/openindexcli register alice -k ALICE_KEY
npx @openindex/openindexcli register bob -k BOB_KEY
npx @openindex/openindexcli send-message bob alice "Secret message" -k ALICE_KEY
npx @openindex/openindexcli get-messages bob -k BOB_KEY  # Only Bob can decrypt this
```

**Privacy Guarantees:**
- End-to-end encrypted (server can't read messages)
- Blinded inbox (server doesn't know who messages are for)
- Cryptographically signed (verify sender authenticity)
- No metadata leakage (usernames are hashed)

### Cryptographic Operations

```bash
npx @openindex/openindexcli get-pubkey -k <key>                  # Get public key from private key
npx @openindex/openindexcli encrypt <pubKey> <message>           # Encrypt message for recipient
npx @openindex/openindexcli decrypt <encrypted> -k <key>         # Decrypt message
npx @openindex/openindexcli sign <message> -k <key>              # Sign a message
npx @openindex/openindexcli verify <message> <signature>         # Verify signature
```

### Wallet & Crypto Operations

```bash
npx @openindex/openindexcli create                                  # Generate new random wallet
npx @openindex/openindexcli create word1 word2 ... word12           # Restore wallet from 12-word mnemonic
npx @openindex/openindexcli balance <address>                       # Check native token balance
npx @openindex/openindexcli send-eth <to|@username> <amount> -k <key>   # Send native tokens to address or @username
```

### Token Operations

```bash
npx @openindex/openindexcli chains                                       # List supported blockchains
npx @openindex/openindexcli tokens                                       # List supported token symbols
npx @openindex/openindexcli token-balance <token> <address>              # Check token balance
npx @openindex/openindexcli send-token <token> <to|@username> <amount> -k <key>  # Send tokens
```

Use token symbols (USDC, USDT, DAI) or full contract addresses!
Send to @username or 0x address!

## Examples

### Private Messaging Workflow

```bash
# Alice and Bob register their usernames
npx @openindex/openindexcli register alice -k ALICE_KEY
npx @openindex/openindexcli register bob -k BOB_KEY

# Alice sends Bob an encrypted message
npx @openindex/openindexcli send-message bob alice "Meet me at the specified location at 3pm" -k ALICE_KEY
# Message encrypted with Bob's public key
# Server stores by hash - doesn't know it's for Bob
# Only Bob's private key can decrypt it

# Bob retrieves and decrypts his messages
npx @openindex/openindexcli get-messages bob -k BOB_KEY
# Output shows:
# [timestamp] From alice:
# > Meet me at the specified location at 3pm

# Alice can also receive replies
npx @openindex/openindexcli send-message alice bob "Confirmed. See you then." -k BOB_KEY
npx @openindex/openindexcli get-messages alice -k ALICE_KEY
```

### Username-Based Crypto Transfers (Optional)

```bash
# Register usernames (if not already registered)
npx @openindex/openindexcli register alice -k ALICE_KEY
npx @openindex/openindexcli register @bob -k BOB_KEY  # @ is optional

# Send ETH to username (no 0x address needed!)
npx @openindex/openindexcli send-eth @bob 0.1 -k ALICE_KEY

# Send USDC on Base to username
npx @openindex/openindexcli --chain base send-token USDC @alice 100 -k BOB_KEY

# Send USDT on BSC to username
npx @openindex/openindexcli --chain bsc send-token USDT @bob 50 -k ALICE_KEY
```

### Check Balances Across Chains

```bash
# Native tokens
npx @openindex/openindexcli --chain eth balance 0xYourAddress
npx @openindex/openindexcli --chain base balance 0xYourAddress
npx @openindex/openindexcli --chain bsc balance 0xYourAddress

# USDC on different chains (same symbol, different addresses!)
npx @openindex/openindexcli --chain eth token-balance USDC 0xYourAddress
npx @openindex/openindexcli --chain base token-balance USDC 0xYourAddress
npx @openindex/openindexcli --chain bsc token-balance USDC 0xYourAddress
```

## Configuration

### Custom RPC URLs

Create a `.env` file (see `.env.example`):

```env
ETH_RPC_URL=https://eth.llamarpc.com
BASE_RPC_URL=https://base.llamarpc.com
BSC_RPC_URL=https://bsc.llamarpc.com
```

## Documentation

- **[MULTI_CHAIN_GUIDE.md](./MULTI_CHAIN_GUIDE.md)** - Comprehensive multi-chain usage guide
- **[CLAUDE.md](./CLAUDE.md)** - Technical architecture and protocol details

## Token Symbols

You can use short token symbols instead of long contract addresses!

**How it works:**
- Type `USDC` instead of `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- Automatically resolves to the correct address for each chain
- Full addresses still supported for any token

**View all supported tokens:**
```bash
npx @openindex/openindexcli tokens
```

### Adding Custom Tokens

Edit the `tokens.json` file to add your own tokens:

```json
{
  "eth": {
    "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "YOUR_TOKEN": "0xYourTokenAddress"
  },
  "base": {
    "YOUR_TOKEN": "0xYourTokenAddressOnBase"
  }
}
```

## Requirements

- Node.js 18+
- Private key for signing transactions

## Security

**Never share your private key!** Store it securely and never commit it to version control.

## License

ISC
