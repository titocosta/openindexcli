---
name: openindex-cli
description: OpenIndex CLI reference - end-to-end encrypted messaging tool using Ethereum identities. Users register unique usernames and send cryptographically private messages with blinded inboxes. Also supports multi-chain crypto transfers (ETH, Base, BSC) to @username. Use when helping with encrypted messaging, username registration, privacy protocols, or blockchain operations.
---

# OpenIndex CLI Reference

A TypeScript-based CLI tool for **end-to-end encrypted messaging** using Ethereum identities, with optional multi-chain crypto capabilities.

## Installation

```bash
# Install globally
npm install -g @openindex/openindexcli

# Or run directly with npx
npx @openindex/openindexcli <command>
```

## Key Innovation: Cryptographically Private Messaging

**Register a unique username** linked to your Ethereum identity, then send messages with cryptographic privacy guarantees:

### End-to-End Encrypted Communication
- **Username-based messaging** - Send to @alice instead of 0x addresses
- **Encrypted with recipient's public key** - Only they can decrypt (not even the server)
- **Blinded inbox** - Server stores messages by SHA-256 hash, doesn't know who they're for
- **Cryptographically signed** - Recipient verifies message is from you
- **Zero metadata leakage** - No readable identifiers stored on server
- **Optional @ prefix** - use @alice or alice (both work)

**Messaging workflow:**
1. Register: `npx @openindex/openindexcli register alice -k YOUR_KEY`
2. Send encrypted message: `npx @openindex/openindexcli send bob alice "Private message" -k YOUR_KEY`
3. Retrieve messages: `npx @openindex/openindexcli get-messages bob -k BOB_KEY`

### Optional: Username-Based Crypto Transfers
The same usernames also work for sending crypto:
- Send ETH: `npx @openindex/openindexcli send @bob 0.1 -k YOUR_KEY`
- Send tokens: `npx @openindex/openindexcli send-token USDC @bob 100 -k YOUR_KEY`

**Privacy-first design:** Messages are the primary use case, crypto transfers are a bonus.

## Supported Blockchains

| Chain | Key    | Chain ID | Native Token | Default RPC                      |
|-------|--------|----------|--------------|----------------------------------|
| Ethereum | `eth`  | 1        | ETH          | https://cloudflare-eth.com       |
| Base     | `base` | 8453     | ETH          | https://mainnet.base.org         |
| BSC      | `bsc`  | 56       | BNB          | https://bsc-dataseed.binance.org |

## Key Features

### 1. Multi-Chain Support
All commands support the `--chain` flag to specify which blockchain to use:
```bash
npx @openindex/openindexcli --chain <eth|base|bsc> <command>
```

### 2. Token Symbol Support
Users can use short symbols instead of contract addresses:
- Type `USDC` instead of `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- Token registry located in `tokens.json`
- Chain-aware: same symbol resolves to different addresses per chain

**Supported tokens:**
- **Ethereum**: USDC, USDT, DAI, WETH, WBTC, UNI, LINK, AAVE
- **Base**: USDC, DAI, WETH, cbETH
- **BSC**: USDC, USDT, BUSD, DAI, WBNB, CAKE, ETH

## Command Reference

### End-to-End Encrypted Messaging (Primary Use Case)
```bash
register <username|@username> -k <key>          # Register username with public key
get-user <username>                             # Retrieve public info for a username
roulette                                        # Get a random username to chat with
send <toUser> <fromUser> <message> -k <key>     # Send encrypted message
get-messages <username> -k <key>                # Retrieve and decrypt your messages

# Example: Alice sends Bob a private message
openindexcli register alice -k ALICE_KEY
openindexcli register bob -k BOB_KEY
openindexcli get-user bob                       # Get Bob's public profile
openindexcli send bob alice "Meet at the rendezvous point" -k ALICE_KEY
openindexcli get-messages bob -k BOB_KEY  # Only Bob can decrypt this

# Privacy guarantees:
# Encrypted with Bob's public key (server can't read)
# Stored by SHA-256 hash (server doesn't know it's for Bob)
# Signed by Alice (Bob verifies sender authenticity)
```

### Cryptographic Operations
```bash
get-address -k <key>                 # Derive wallet address from private key
get-pubkey -k <key>                  # Derive public key from private key
encrypt <pubKey> <message>           # Encrypt message for recipient
decrypt <encrypted> -k <key>         # Decrypt message with private key
sign <message> -k <key>              # Sign message with private key
verify <message> <signature>         # Verify message signature
```

### Wallet Operations (Optional Features)
```bash
create                                          # Generate new random wallet
create word1 word2 ... word12                   # Restore from 12-word mnemonic
balance <address>                               # Check native token balance
balance <address> --chain base                  # Check balance on Base
send <address|@username> <amount> -k <key>      # Send to address or @username
send @bob 0.1 -k <key> --chain bsc              # Send BNB to @bob on BSC
```

### Chain & Token Information
```bash
chains                    # List supported blockchains
tokens                    # List supported token symbols
tokens --chain base       # List tokens for specific chain
```


## Architecture Details

### File Structure
- `index.ts` - Main CLI application with all commands
- `tokens.json` - Token registry mapping symbols to addresses
- `package.json` - Dependencies and module configuration
- `.env` - Optional custom RPC endpoints

### Key Functions
- `getProvider(chain)` - Returns provider for specified chain
- `resolveTokenAddress(token, chain)` - Resolves symbol to address (case-insensitive)
- `normalizeUsername(username)` - Removes leading @ from usernames
- `resolveUsernameToAddress(recipient)` - Resolves @username to 0x address via API
- Username resolution: checks if input is address (0x), else fetches from API
- @ prefix is optional and automatically stripped

### Environment Variables
Configure custom RPC endpoints in `.env`:
```env
ETH_RPC_URL=https://eth.llamarpc.com
BASE_RPC_URL=https://base.llamarpc.com
BSC_RPC_URL=https://bsc.llamarpc.com
```

## Common Patterns

### Private messaging workflow (Primary Use Case)
```bash
# Alice and Bob register their usernames
npx @openindex/openindexcli register alice -k ALICE_KEY
npx @openindex/openindexcli register @bob -k BOB_KEY  # @ is optional

# Alice sends Bob encrypted messages
npx @openindex/openindexcli send-message bob alice "Meeting at 3pm tomorrow" -k ALICE_KEY
npx @openindex/openindexcli send-message bob alice "Bringing the documents" -k ALICE_KEY

# Bob retrieves and decrypts his messages
npx @openindex/openindexcli get-messages bob -k BOB_KEY
# Only Bob can read these - server can't, and doesn't know they're for Bob

# Bob replies to Alice
npx @openindex/openindexcli send-message alice bob "Confirmed, see you then" -k BOB_KEY

# Alice checks her inbox
npx @openindex/openindexcli get-messages alice -k ALICE_KEY
```

### Username-based crypto transfers (Optional)
```bash
# Send ETH to username
npx @openindex/openindexcli send-eth @bob 0.1 -k ALICE_KEY

# Send tokens to username using symbols
npx @openindex/openindexcli send-token USDC @bob 100 -k ALICE_KEY
npx @openindex/openindexcli --chain base send-token USDC @alice 50 -k BOB_KEY
```

### Check balances across chains
```bash
npx @openindex/openindexcli --chain eth balance 0xAddress
npx @openindex/openindexcli --chain base balance 0xAddress
npx @openindex/openindexcli --chain bsc balance 0xAddress
```

### Check same token across chains
```bash
# USDC has different addresses on each chain, but same symbol
npx @openindex/openindexcli --chain eth token-balance USDC 0xAddress
npx @openindex/openindexcli --chain base token-balance USDC 0xAddress
npx @openindex/openindexcli --chain bsc token-balance USDC 0xAddress
```

### Send tokens using symbols + usernames
```bash
# Best of both worlds: no addresses, no token addresses!
npx @openindex/openindexcli --chain eth send-token USDT @alice 100 -k KEY
npx @openindex/openindexcli --chain base send-token USDC @bob 50 -k KEY
npx @openindex/openindexcli --chain bsc send-token BUSD @charlie 25 -k KEY
```

## Adding Custom Tokens

Users can add custom tokens by editing `tokens.json`:
```json
{
  "eth": {
    "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "MYTOKEN": "0xYourTokenAddress"
  },
  "base": {
    "MYTOKEN": "0xYourTokenAddressOnBase"
  }
}
```

## Messaging Protocol

The OpenIndex messaging system enables **username-based encrypted communication**:

### Username Registration
- Users register a unique username linked to their Ethereum address
- Server stores `username → {publicKey, address}` mapping
- Public keys derived from private keys enable encryption
- Address enables username-based crypto transfers
- @ prefix is optional and automatically removed

### Sending Messages (Username-to-Username)
1. **Discovery**: Look up recipient's public key by username
2. **Inner envelope**: Wrap message + sender username + timestamp in JSON
3. **Encryption**: Encrypt entire payload with recipient's public key (eth-crypto)
4. **Signing**: Sign ciphertext with sender's private key for integrity
5. **Blinding**: Hash recipient username (SHA-256) to create blinded inbox ID
6. **Delivery**: POST to server at `https://www.openindex.ai/api/send`

### Privacy Features
- Server cannot read message contents (encrypted with recipient's key)
- Server doesn't know who messages are for (uses hashed usernames)
- Sender authenticity verified via signature
- No long addresses needed - just memorable usernames

## Dependencies

- **ethers** (v6.16.0) - Ethereum wallet operations, signing, transactions
- **eth-crypto** (v3.1.0) - Public key derivation, encryption/decryption
- **commander** (v14.0.3) - CLI framework and argument parsing
- **dotenv** (v17.2.3) - Environment variable loading

## TypeScript Configuration

- Module system: `"type": "module"` in package.json
- TypeScript module: `"nodenext"` with `resolveJsonModule: true`
- JSON imports use: `import x from './file.json' with { type: 'json' }`

## Security Notes

- Private keys are never logged or stored
- Users responsible for key management
- Environment variables used for RPC endpoints only
- Message content encrypted end-to-end
- Server cannot read message contents (encrypted with recipient's public key)

## Common Issues

### Token not found error
If "Token X not found in Y registry":
1. Check spelling (case-insensitive but must match)
2. Run `npx @openindex/openindexcli tokens` to see available symbols
3. Use full contract address instead
4. Add custom token to `tokens.json`

### Wrong chain
If balance shows 0 but you have tokens:
1. Verify you're using correct chain with `--chain` flag
2. Remember: USDC on Ethereum ≠ USDC on Base (different addresses)
3. Check token exists on that chain with `tokens --chain <name>`

### RPC connection issues
1. Check `.env` file has correct RPC URLs
2. Try default RPCs by removing custom URLs
3. Verify network connectivity
4. Some RPCs have rate limits

## When to Use This Tool

Use OpenIndex CLI when:
- **Need end-to-end encrypted messaging** with cryptographic privacy
- **Want private communication** using Ethereum identities
- **Sending confidential messages** that must be cryptographically secure
- **Building privacy-focused communication** systems
- **Testing encrypted messaging protocols** with blinded inboxes
- Want username-based crypto (secondary feature) instead of long addresses
- Managing Ethereum wallets across multiple chains (ETH, Base, BSC)
- Need to send tokens using simple symbols (USDC, USDT)

Primary use case: **Cryptographically private messaging**
Secondary use case: Username-based crypto transfers

Don't use when:
- Need real-time chat (this is asynchronous messaging)
- Need group messaging (this is 1-to-1 only)
- Building production applications (this is a CLI tool/reference implementation)
- Need high-volume messaging (server may have rate limits)
- Require complex smart contract interactions (use ethers.js directly)
