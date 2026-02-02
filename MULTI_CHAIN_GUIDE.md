# Multi-Chain Support Guide

OpenIndexCLI now supports multiple blockchain networks: Ethereum, Base, and Binance Smart Chain (BSC).

## Supported Chains

| Chain Key | Network | Chain ID | Default RPC |
|-----------|---------|----------|-------------|
| `eth` | Ethereum Mainnet | 1 | https://cloudflare-eth.com |
| `base` | Base Mainnet | 8453 | https://mainnet.base.org |
| `bsc` | BSC Mainnet | 56 | https://bsc-dataseed.binance.org |

## Token Symbol Support

You can use short token symbols instead of full contract addresses for common tokens!

## Username-Based Transfers

Send crypto to @username instead of 0x addresses!

### Register Your Username

```bash
# Register a username
npx ts-node index.ts register alice -k YOUR_PRIVATE_KEY

# @ prefix is optional and automatically removed
npx ts-node index.ts register @bob -k BOB_PRIVATE_KEY
```

Your username is now linked to your Ethereum address. Others can send you crypto and messages using your username.

### Send to Usernames

```bash
# Send ETH to username
npx ts-node index.ts send @bob 0.1 -k ALICE_KEY

# Send USDC on Base to username
npx ts-node index.ts --chain base send-token USDC @alice 100 -k BOB_KEY

# Send USDT on BSC to username
npx ts-node index.ts --chain bsc send-token USDT @bob 50 -k ALICE_KEY

# Mix usernames and symbols - no addresses needed!
npx ts-node index.ts send-token DAI @charlie 1000 -k YOUR_KEY
```

### List Available Tokens

```bash
# List all supported tokens across all chains
npx ts-node index.ts tokens

# List tokens for a specific chain
npx ts-node index.ts --chain base tokens
```

### Supported Tokens

**Ethereum (eth):**
- USDC, USDT, DAI, WETH, WBTC, UNI, LINK, AAVE

**Base (base):**
- USDC, DAI, WETH, cbETH

**BSC (bsc):**
- USDC, USDT, BUSD, DAI, WBNB, CAKE, ETH

### Customizing Token Registry

You can add your own tokens by editing the `tokens.json` file:

```json
{
  "eth": {
    "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "CUSTOM": "0xYourCustomTokenAddress"
  },
  "base": {
    "CUSTOM": "0xYourCustomTokenOnBase"
  },
  "bsc": {
    "CUSTOM": "0xYourCustomTokenOnBSC"
  }
}
```

After editing, your custom token symbols will be immediately available for use.

## Usage

### List Available Chains

```bash
npx ts-node index.ts chains
```

### Using the Default Chain (Ethereum)

```bash
# Check ETH balance
npx ts-node index.ts balance 0xYourAddress

# Send ETH
npx ts-node index.ts send 0xRecipient 0.1 -k YOUR_PRIVATE_KEY
```

### Specifying a Chain

Use the `--chain` flag before the command:

```bash
# Check BNB balance on BSC
npx ts-node index.ts --chain bsc balance 0xYourAddress

# Send on Base
npx ts-node index.ts --chain base send 0xRecipient 0.1 -k YOUR_PRIVATE_KEY

# Check token balance on Ethereum
npx ts-node index.ts --chain eth token-balance 0xTokenAddress 0xYourAddress
```

## ERC-20 Token Operations

### Check Token Balance

```bash
# Using token symbols (recommended!)
npx ts-node index.ts --chain eth token-balance USDC 0xYourAddress
npx ts-node index.ts --chain base token-balance USDC 0xYourAddress
npx ts-node index.ts --chain bsc token-balance USDT 0xYourAddress

# Using full addresses (still supported)
npx ts-node index.ts --chain eth token-balance 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 0xYourAddress
```

### Send Tokens

```bash
# To usernames with token symbols (recommended!)
npx ts-node index.ts --chain eth send-token USDC @alice 10 -k YOUR_PRIVATE_KEY
npx ts-node index.ts --chain base send-token USDC @bob 100 -k YOUR_PRIVATE_KEY
npx ts-node index.ts --chain bsc send-token USDT @charlie 50 -k YOUR_PRIVATE_KEY

# To addresses with token symbols (still supported)
npx ts-node index.ts --chain eth send-token USDC 0xRecipient 10 -k YOUR_PRIVATE_KEY

# To addresses with full token addresses (also supported)
npx ts-node index.ts --chain eth send-token 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 0xRecipient 10 -k YOUR_PRIVATE_KEY
```

## Environment Variables

You can customize RPC endpoints by creating a `.env` file:

```env
# Ethereum
ETH_RPC_URL=https://eth.llamarpc.com

# Base
BASE_RPC_URL=https://base.llamarpc.com

# BSC
BSC_RPC_URL=https://bsc.llamarpc.com
```

### Using Infura/Alchemy

```env
ETH_RPC_URL=https://mainnet.infura.io/v3/YOUR_API_KEY
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
BSC_RPC_URL=https://bsc-dataseed.binance.org
```

## Command Reference

### Chain & Token Information

```bash
# List supported chains
npx ts-node index.ts chains

# List supported token symbols
npx ts-node index.ts tokens
npx ts-node index.ts --chain base tokens
```

### Username Registration

```bash
# Register username for crypto transfers & messaging
npx ts-node index.ts register <username|@username> -k <privateKey>
```

### Native Token Operations

```bash
# Check balance (ETH/BNB/etc.)
npx ts-node index.ts --chain <eth|base|bsc> balance <address>

# Send native tokens (to address or @username)
npx ts-node index.ts --chain <eth|base|bsc> send <address|@username> <amount> -k <privateKey>
```

### ERC-20 Token Operations

```bash
# Check token balance (use symbol or address)
npx ts-node index.ts --chain <eth|base|bsc> token-balance <SYMBOL|address> <address>

# Send tokens (to address or @username, use token symbol or address)
npx ts-node index.ts --chain <eth|base|bsc> send-token <SYMBOL|address> <address|@username> <amount> -k <privateKey>
```

## Notes

- All commands default to Ethereum if `--chain` is not specified
- The same wallet address works across all EVM-compatible chains
- Token amounts are automatically converted to the correct decimal format
- Transaction confirmation is required before the command completes

## Common Token Addresses

### Ethereum Mainnet

- **USDC**: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- **USDT**: `0xdAC17F958D2ee523a2206206994597C13D831ec7`
- **DAI**: `0x6B175474E89094C44Da98b954EedeAC495271d0F`

### Base Mainnet

- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **DAI**: `0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb`

### BSC Mainnet

- **USDC**: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`
- **USDT**: `0x55d398326f99059fF775485246999027B3197955`
- **BUSD**: `0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56`

## Examples

### Complete Workflow

```bash
# 1. Create or restore wallet
npx ts-node index.ts create  # Generate new
# OR restore from mnemonic:
npx ts-node index.ts create abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about

# 2. List available chains
npx ts-node index.ts chains

# 3. List available token symbols
npx ts-node index.ts tokens

# 4. Register your username
npx ts-node index.ts register alice -k YOUR_PRIVATE_KEY

# 4. Register a friend's username
npx ts-node index.ts register @bob -k BOB_PRIVATE_KEY

# 5. Check your ETH balance
npx ts-node index.ts --chain eth balance 0xYourAddress

# 6. Send ETH to username (no address needed!)
npx ts-node index.ts --chain eth send @bob 0.1 -k YOUR_PRIVATE_KEY

# 7. Send USDC on Base to username using symbol
npx ts-node index.ts --chain base send-token USDC @bob 100 -k YOUR_PRIVATE_KEY

# 8. Send USDT on BSC to username using symbol
npx ts-node index.ts --chain bsc send-token USDT @alice 50 -k BOB_PRIVATE_KEY

# 9. Traditional address-based transfers still work
npx ts-node index.ts --chain eth send 0xRecipient 0.1 -k YOUR_PRIVATE_KEY
```

### Quick Token Operations

```bash
# Check multiple token balances across chains
npx ts-node index.ts --chain eth token-balance USDC 0xYourAddress
npx ts-node index.ts --chain eth token-balance USDT 0xYourAddress
npx ts-node index.ts --chain base token-balance USDC 0xYourAddress
npx ts-node index.ts --chain bsc token-balance BUSD 0xYourAddress

# Send different tokens to usernames (no addresses!)
npx ts-node index.ts --chain eth send-token DAI @alice 1000 -k YOUR_KEY
npx ts-node index.ts --chain base send-token cbETH @bob 0.5 -k YOUR_KEY
npx ts-node index.ts --chain bsc send-token CAKE @charlie 25 -k YOUR_KEY

# Mix of usernames and symbols - ultimate convenience!
npx ts-node index.ts send-token USDC @friend 100 -k YOUR_KEY
```
