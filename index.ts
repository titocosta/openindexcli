#!/usr/bin/env node
import { ethers } from "ethers";
import { createHash } from 'crypto';
import EthCrypto from 'eth-crypto';
import { Command } from "commander";
import * as dotenv from "dotenv";
import tokenRegistryData from './tokens.json' with { type: 'json' };

dotenv.config();

// Chain configurations
const CHAIN_CONFIGS = {
  eth: {
    name: "Ethereum",
    rpcUrl: process.env.ETH_RPC_URL || "https://cloudflare-eth.com",
    chainId: 1,
  },
  base: {
    name: "Base",
    rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
    chainId: 8453,
  },
  bsc: {
    name: "BSC",
    rpcUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org",
    chainId: 56,
  },
};

type ChainKey = keyof typeof CHAIN_CONFIGS;

// Token registry - imported from tokens.json
const TOKEN_REGISTRY: Record<ChainKey, Record<string, string>> = tokenRegistryData as Record<ChainKey, Record<string, string>>;

// Function to resolve token symbol to address
function resolveTokenAddress(tokenInput: string, chain: ChainKey): string {
  // If it's already an address (starts with 0x), return it
  if (tokenInput.startsWith("0x")) {
    return tokenInput;
  }

  // Try to resolve as a symbol
  const upperSymbol = tokenInput.toUpperCase();
  const address = TOKEN_REGISTRY[chain]?.[upperSymbol];
  
  if (!address) {
    throw new Error(
      `Token "${tokenInput}" not found in ${chain.toUpperCase()} registry. ` +
      `Use full contract address or one of: ${Object.keys(TOKEN_REGISTRY[chain] || {}).join(", ")}`
    );
  }

  return address;
}

// Function to normalize username (remove leading @)
function normalizeUsername(username: string): string {
  return username.startsWith('@') ? username.slice(1) : username;
}

// Function to resolve username to Ethereum address
async function resolveUsernameToAddress(recipient: string): Promise<string> {
  // If it's already an address (starts with 0x), return it
  if (recipient.startsWith("0x")) {
    return recipient;
  }

  // Normalize username (remove @ if present)
  const username = normalizeUsername(recipient);

  try {
    console.log(`🔍 Looking up username: ${username}`);
    const response = await fetch(`${API_BASE_URL}/cli/user/${username}`);
    
    if (!response.ok) {
      throw new Error(`Username "${username}" not found. Register first with: register ${username} -k YOUR_KEY`);
    }

    const data = await response.json();
    
    if (!data.address) {
      throw new Error(`Username "${username}" exists but has no address registered`);
    }

    console.log(`✅ Resolved @${username} → ${data.address}`);
    return data.address;
  } catch (error: any) {
    throw new Error(`Failed to resolve username "${username}": ${error.message}`);
  }
}

// Function to get provider for a specific chain
function getProvider(chain: ChainKey = "eth"): ethers.JsonRpcProvider {
  const config = CHAIN_CONFIGS[chain];
  if (!config) {
    throw new Error(`Unsupported chain: ${chain}. Use: eth, base, or bsc`);
  }
  return new ethers.JsonRpcProvider(config.rpcUrl);
}

// Legacy single provider (for backwards compatibility)
const RPC_URL = process.env.RPC_URL || CHAIN_CONFIGS.eth.rpcUrl;
const provider = new ethers.JsonRpcProvider(RPC_URL);

const API_BASE_URL = "https://chat.openindex.ai/api";

const program = new Command();

program
  .name("eth-tool")
  .description("Multi-chain CLI for wallet management (ETH, Base, BSC)")
  .version("1.0.0")
  .option("--chain <chain>", "Blockchain to use (eth, base, bsc)", "eth");

// --- COMMAND: List Chains ---
program
  .command("chains")
  .description("List supported blockchain networks")
  .action(() => {
    console.log("🔗 Supported Blockchains:\n");
    Object.entries(CHAIN_CONFIGS).forEach(([key, config]) => {
      console.log(`  ${key.toUpperCase().padEnd(6)} - ${config.name}`);
      console.log(`         RPC: ${config.rpcUrl}`);
      console.log(`         Chain ID: ${config.chainId}\n`);
    });
    console.log("💡 Use --chain <key> to specify which blockchain to use");
    console.log("   Example: npx ts-node index.ts --chain base balance 0x...");
  });

// --- COMMAND: List Tokens ---
program
  .command("tokens")
  .description("List supported token symbols for each chain")
  .action(() => {
    const opts = program.opts();
    const selectedChain = opts.chain as ChainKey;
    
    if (selectedChain && selectedChain !== "eth") {
      // Show tokens for specific chain
      const tokens = TOKEN_REGISTRY[selectedChain];
      console.log(`\n🪙 Supported Tokens on ${CHAIN_CONFIGS[selectedChain].name}:\n`);
      Object.entries(tokens).forEach(([symbol, address]) => {
        console.log(`  ${symbol.padEnd(6)} - ${address}`);
      });
      console.log(`\n💡 Use token symbols instead of addresses:`);
      console.log(`   npx ts-node index.ts --chain ${selectedChain} token-balance ${Object.keys(tokens)[0]} 0x...`);
    } else {
      // Show all chains
      console.log("🪙 Supported Token Symbols by Chain:\n");
      Object.entries(TOKEN_REGISTRY).forEach(([chain, tokens]) => {
        console.log(`${CHAIN_CONFIGS[chain as ChainKey].name} (${chain.toUpperCase()}):`);
        console.log(`  ${Object.keys(tokens).join(", ")}\n`);
      });
      console.log("💡 Use token symbols instead of addresses:");
      console.log("   npx ts-node index.ts --chain base token-balance USDC 0x...");
      console.log("   npx ts-node index.ts --chain eth send-token USDT 0xRecipient 100 -k KEY");
    }
  });

// --- COMMAND: Create Wallet ---
program
  .command("create [mnemonic...]")
  .description("Generate a new random Ethereum wallet or restore from mnemonic")
  .action((mnemonicWords) => {
    try {
      let wallet: ethers.HDNodeWallet;
      
      if (mnemonicWords && mnemonicWords.length > 0) {
        // Restore wallet from provided mnemonic
        const mnemonicPhrase = mnemonicWords.join(" ");
        
        // Validate mnemonic (should be 12, 15, 18, 21, or 24 words)
        const wordCount = mnemonicWords.length;
        if (![12, 15, 18, 21, 24].includes(wordCount)) {
          console.error(`❌ Invalid mnemonic: Expected 12, 15, 18, 21, or 24 words, got ${wordCount}`);
          return;
        }
        
        wallet = ethers.Wallet.fromPhrase(mnemonicPhrase);
        console.log("✅ Wallet Restored from Mnemonic:");
      } else {
        // Generate new random wallet
        wallet = ethers.Wallet.createRandom();
        console.log("✅ New Wallet Generated:");
      }
      
      console.log(`Address:     ${wallet.address}`);
      console.log(`Mnemonic:    ${wallet.mnemonic?.phrase}`);
      console.log(`Private Key: ${wallet.privateKey}`);
      console.log("\n⚠️  SAVE YOUR MNEMONIC AND PRIVATE KEY! If you lose them, you lose your funds.");
    } catch (error: any) {
      console.error("❌ Error creating wallet:", error.message);
      console.log("\n💡 Usage:");
      console.log("  Create new wallet:    npx ts-node index.ts create");
      console.log("  Restore from mnemonic: npx ts-node index.ts create word1 word2 word3 ...");
    }
  });

// --- COMMAND: Check Balance ---
program
  .command("balance <address>")
  .description("Check the native token balance of an address")
  .action(async (address) => {
    try {
      const opts = program.opts();
      const chain = opts.chain as ChainKey;
      const chainProvider = getProvider(chain);
      
      const balance = await chainProvider.getBalance(address);
      const chainName = CHAIN_CONFIGS[chain].name;
      console.log(`[${chainName}] Balance: ${ethers.formatEther(balance)} ${chain.toUpperCase()}`);
    } catch (error: any) {
      console.error("❌ Error:", error.message);
    }
  });

// Minimal ERC-20 ABI for token operations
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

// --- COMMAND: Check Token Balance ---
program
  .command("token-balance <token> <address>")
  .description("Check the ERC-20 token balance of an address (use symbol or address)")
  .action(async (token, address) => {
    try {
      const opts = program.opts();
      const chain = opts.chain as ChainKey;
      const chainProvider = getProvider(chain);
      const chainName = CHAIN_CONFIGS[chain].name;
      
      // Resolve token symbol to address if needed
      const tokenAddress = resolveTokenAddress(token, chain);
      console.log(`🔍 Token: ${tokenAddress}`);
      
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, chainProvider) as any;
      
      // Get token info and balance
      const [balance, symbol, decimals, name] = await Promise.all([
        tokenContract.balanceOf(address),
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.name(),
      ]);

      const formattedBalance = ethers.formatUnits(balance, decimals);
      console.log(`[${chainName}] Token: ${name} (${symbol})`);
      console.log(`Balance: ${formattedBalance} ${symbol}`);
    } catch (error: any) {
      console.error("❌ Error:", error.message);
    }
  });

// --- COMMAND: Send Native Token ---
program
  .command("send-eth <to> <amount>")
  .description("Send native token (ETH/BNB/etc.) to address or @username")
  .requiredOption("-k, --key <privateKey>", "Your private key to sign the transaction")
  .action(async (to, amount, options) => {
    try {
      const opts = program.opts();
      const chain = opts.chain as ChainKey;
      const chainProvider = getProvider(chain);
      const chainName = CHAIN_CONFIGS[chain].name;
      
      // Resolve username to address if needed
      const recipientAddress = await resolveUsernameToAddress(to);
      
      const wallet = new ethers.Wallet(options.key, chainProvider);
      console.log(`🚀 [${chainName}] Sending ${amount} to ${recipientAddress}...`);
      
      const tx = await wallet.sendTransaction({
        to: recipientAddress,
        value: ethers.parseEther(amount),
      });

      console.log(`🔗 Transaction Sent! Hash: ${tx.hash}`);
      await tx.wait();
      console.log("✅ Transaction Confirmed!");
    } catch (error: any) {
      console.error("❌ Transfer Failed:", error.message);
    }
  });

// --- COMMAND: Send ERC-20 Token ---
program
  .command("send-token <token> <to> <amount>")
  .description("Send ERC-20 tokens to address or @username (use token symbol or address)")
  .requiredOption("-k, --key <privateKey>", "Your private key to sign the transaction")
  .action(async (token, to, amount, options) => {
    try {
      const opts = program.opts();
      const chain = opts.chain as ChainKey;
      const chainProvider = getProvider(chain);
      const chainName = CHAIN_CONFIGS[chain].name;
      
      // Resolve token symbol to address if needed
      const tokenAddress = resolveTokenAddress(token, chain);
      console.log(`🔍 Token: ${tokenAddress}`);
      
      // Resolve username to address if needed
      const recipientAddress = await resolveUsernameToAddress(to);
      
      const wallet = new ethers.Wallet(options.key, chainProvider);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet) as any;

      // Get token info for display
      const [symbol, decimals] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.decimals(),
      ]);

      console.log(`🪙 [${chainName}] Sending ${amount} ${symbol} to ${recipientAddress}...`);

      // Parse amount according to token decimals
      const amountInWei = ethers.parseUnits(amount, decimals);

      // Send the transaction
      const tx = await tokenContract.transfer(recipientAddress, amountInWei);

      console.log(`🔗 Transaction Sent! Hash: ${tx.hash}`);
      await tx.wait();
      console.log("✅ Token Transfer Confirmed!");
    } catch (error: any) {
      console.error("❌ Token Transfer Failed:", error.message);
    }
  });

// --- COMMAND: Sign a Message ---
program
  .command("sign <message>")
  .description("Sign a text message using your private key")
  .requiredOption("-k, --key <privateKey>", "Your private key")
  .action(async (message, options) => {
    try {
      const wallet = new ethers.Wallet(options.key);
      const signature = await wallet.signMessage(message);
      
      console.log("📝 Message:", message);
      console.log("✍️ Signature:", signature);
      console.log(`👤 Signed by: ${wallet.address}`);
    } catch (error: any) {
      console.error("❌ Error signing:", error.message);
    }
  });

// --- COMMAND: Verify a Signature ---
program
  .command("verify <message> <signature>")
  .description("Verify that a message was signed by a specific address")
  .action((message, signature) => {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      console.log("✅ Verification Successful!");
      console.log(`🔍 Recovered Address: ${recoveredAddress}`);
    } catch (error: any) {
      console.error("❌ Invalid Signature or Message.");
    }
  });


// --- COMMAND: Get Address ---
program
  .command("get-address")
  .description("Derive the Ethereum address from your Private Key")
  .requiredOption("-k, --key <privateKey>", "Your private key")
  .action((options) => {
    try {
      const wallet = new ethers.Wallet(options.key);
      console.log("📍 Your Wallet Address:");
      console.log(wallet.address);
    } catch (error: any) {
      console.error("❌ Error deriving address:", error.message);
    }
  });

// --- COMMAND: Get Public Key ---
// Encryption requires a Public Key, which is different from an Address.
program
  .command("get-pubkey")
  .description("Derive the uncompressed Public Key from your Private Key")
  .requiredOption("-k, --key <privateKey>", "Your private key")
  .action((options) => {
    const publicKey = EthCrypto.publicKeyByPrivateKey(options.key);
    console.log("🔑 Your Public Key (Share this to receive secrets):");
    console.log(publicKey);
  });

// --- COMMAND: Encrypt for a Recipient ---
program
  .command("encrypt <recipientPubKey> <message>")
  .description("Encrypt a message so only the owner of the recipientPubKey can read it")
  .action(async (recipientPubKey, message) => {
    try {
      // Encrypting the message
      const encrypted = await EthCrypto.encryptWithPublicKey(
        recipientPubKey,
        message
      );
      
      // Convert to a string for easy transport over HTTP
      const encryptedString = EthCrypto.cipher.stringify(encrypted);
      console.log("🔒 Encrypted Message (Send this to the server):");
      console.log(encryptedString);
    } catch (error: any) {
      console.error("❌ Encryption failed:", error.message);
    }
  });

// --- COMMAND: Decrypt a Message ---
program
  .command("decrypt <encryptedString>")
  .description("Decrypt a message using your private key")
  .requiredOption("-k, --key <privateKey>", "Your private key")
  .action(async (encryptedString, options) => {
    try {
      const payload = EthCrypto.cipher.parse(encryptedString);
      const message = await EthCrypto.decryptWithPrivateKey(
        options.key,
        payload
      );
      console.log("🔓 Decrypted Message:");
      console.log(message);
    } catch (error: any) {
      console.error("❌ Decryption failed. Did you use the wrong key?");
    }
  });

// --- COMMAND: Get User Information ---
program
  .command("get-user <username>")
  .description("Retrieve public profile (address and public key) for a username")
  .action(async (username) => {
    try {
      const normalizedUsername = normalizeUsername(username);
      console.log(`🔍 Looking up user: @${normalizedUsername}...`);
      
      const response = await fetch(`${API_BASE_URL}/cli/user/${normalizedUsername}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`User "@${normalizedUsername}" not found.`);
        }
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log(`👤 User Profile: @${normalizedUsername}`);
      console.log(`📍 Address:    ${data.address || 'N/A'}`);
      console.log(`🔑 Public Key: ${data.publicKey || 'N/A'}`);
    } catch (error: any) {
      console.error("❌ Error fetching user:", error.message);
    }
  });

// --- COMMAND: Register User ---
program
  .command("register <username>")
  .description("Register your username, public key, and address with the server")
  .requiredOption("-k, --key <privateKey>", "Your private key to derive the public key and address")
  .action(async (username, options) => {
    try {
      // Normalize username (remove @ if present)
      const normalizedUsername = normalizeUsername(username);
      
      // Derive the public key and address from the private key
      const wallet = new ethers.Wallet(options.key);
      const publicKey = EthCrypto.publicKeyByPrivateKey(options.key);
      const address = wallet.address;

      console.log(`📡 Registering @${normalizedUsername} at ${API_BASE_URL}...`);
      console.log(`   Address: ${address}`);

      // POST to /cli/register
      const response = await fetch(`${API_BASE_URL}/cli/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: normalizedUsername,
          publicKey: publicKey,
          address: address,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log("✅ Registration Successful!");
        console.log(`   Username: @${normalizedUsername}`);
        console.log(`   Address: ${address}`);
        console.log("\n💡 Now you can receive crypto and messages using @" + normalizedUsername);
      } else {
        console.error(`❌ Registration Failed (${response.status}):`, result);
      }
    } catch (error: any) {
      console.error("❌ Network Error:", error.message);
    }
  });

// Helper to hash the username for the server to use as an "Inbox ID"
const hashUsername = (name: string) => 
  createHash('sha256').update(name.toLowerCase()).digest('hex');

// --- COMMAND: Send Signed & Encrypted Message ---
program
  .command("send-message <toUsername> <senderUsername> <message>")
  .description("Send a double-enveloped, blinded message")
  .requiredOption("-k, --key <privateKey>", "Your private key to sign the message")
  .action(async (toUsername, senderUsername, message, options) => {
    try {
      // 1. Discovery: Get recipient's public key
      const keyResp = await fetch(`${API_BASE_URL}/cli/user/${toUsername}`);
      const { publicKey: recipientPubKey } = await keyResp.json();

      // 2. Double Envelope: Wrap the message and sender metadata in JSON
      const innerPayload = JSON.stringify({
        text: message,
        senderId: senderUsername,
        createdAt: Date.now()
      });

      // 3. Encrypt the entire JSON object
      const encrypted = await EthCrypto.encryptWithPublicKey(recipientPubKey, innerPayload);
      const encryptedString = EthCrypto.cipher.stringify(encrypted);

      // 4. Sign the ciphertext for integrity
      const wallet = new ethers.Wallet(options.key);
      const signature = await wallet.signMessage(encryptedString);

      // 5. Blind the Recipient for the server
      const blindedRecipient = hashUsername(toUsername);

      // 6. POST to server
      await fetch(`${API_BASE_URL}/cli/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientHash: blindedRecipient, // Server doesn't know who this is
          message: encryptedString,
          signature: signature
        }),
      });

      console.log(`✅ Message sent to inbox ${blindedRecipient.slice(0, 8)}...`);
    } catch (error: any) {
      console.error("❌ Error:", error.message);
    }
  });

program
  .command("get-messages <username>")
  .description("Fetch and unwrap messages from your blinded inbox")
  .requiredOption("-k, --key <privateKey>", "Your private key to decrypt")
  .action(async (username, options) => {
    try {
      const inboxId = hashUsername(username);
      const response = await fetch(`${API_BASE_URL}/cli/messages/${inboxId}`);
      const messages = await response.json();

      for (const msg of messages) {
        // 1. Decrypt the Envelope
        const payload = EthCrypto.cipher.parse(msg.message);
        const decryptedJson = await EthCrypto.decryptWithPrivateKey(options.key, payload);
        const { text, senderId, createdAt } = JSON.parse(decryptedJson);

        // 2. Verify Signature (Authencity check)
        const recoveredAddress = ethers.verifyMessage(msg.message, msg.signature);
        
        // Fetch sender's key to confirm address
        const sKeyResp = await fetch(`${API_BASE_URL}/cli/user/${senderId}`);
        const { publicKey: sPubKey } = await sKeyResp.json();
        const expectedAddress = EthCrypto.publicKey.toAddress(sPubKey);

        if (recoveredAddress.toLowerCase() === expectedAddress.toLowerCase()) {
          const date = new Date(createdAt).toLocaleString();
          console.log(`\n${msg.id} [${date}] From ${senderId}:`);
          console.log(`> ${text}`);
        } else {
          console.debug("⚠️ Received a message with a forged signature!");
        }
      }
    } catch (error: any) {
      console.error("❌ Error:", error.message);
    }
  });

program.parse(process.argv);
