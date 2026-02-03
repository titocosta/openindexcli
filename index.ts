#!/usr/bin/env node
import { ethers } from "ethers";
import { randomBytes, createCipheriv } from 'crypto';
import EthCrypto from 'eth-crypto';
import { Command } from "commander";
import * as dotenv from "dotenv";
import tokenRegistryData from './tokens.json' with { type: 'json' };
import { nextKey, redistributeKeys } from './lib/group.js';
import { saveGroup, loadGroup, deleteGroup } from './lib/local.js';
import { CHAIN_CONFIGS, API_BASE_URL } from './lib/constants.js';
import { hashUsername, hashGroupId } from './lib/helpers.js';

dotenv.config();

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


const program = new Command();

program
  .name("openindexcli")
  .description("OpenIndex CLI for end-to-end encrypted messaging and crypto transfers")
  .version("1.0.9")
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
      if(data.description) {
        console.log(`💬 Description: ${data.description}`);
      }
      console.log(`📍 Address:    ${data.address || 'N/A'}`);
      console.log(`🔑 Public Key: ${data.publicKey || 'N/A'}`);
    } catch (error: any) {
      console.error("❌ Error fetching user:", error.message);
    }
  });

// --- COMMAND: Set User Profile ---
program
  .command("set-user <username> <description>")
  .description("Update your profile description (requires signature for authorization)")
  .requiredOption("-k, --key <privateKey>", "Your private key to sign the update")
  .action(async (username, description, options) => {
    try {
      const normalizedUsername = normalizeUsername(username);
      const wallet = new ethers.Wallet(options.key);

      // Create a message to sign for authorization
      const timestamp = Date.now();
      const message = `set-user:${normalizedUsername}:${description}:${timestamp}`;
      const signature = await wallet.signMessage(message);

      console.log(`📝 Updating profile for @${normalizedUsername}...`);

      const response = await fetch(`${API_BASE_URL}/cli/user/${normalizedUsername}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: description,
          timestamp: timestamp,
          signature: signature,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log("✅ Profile Updated!");
        console.log(`   Username:    @${normalizedUsername}`);
        console.log(`   Description: ${description}`);
      } else {
        console.error(`❌ Update Failed (${response.status}):`, result.error || result);
      }
    } catch (error: any) {
      console.error("❌ Error:", error.message);
    }
  });

// --- COMMAND: Search Users ---
program
  .command("search <query>")
  .description("Search for users by username or description (hybrid BM25 + semantic search)")
  .option("-l, --limit <number>", "Maximum number of results", "10")
  .action(async (query, options) => {
    try {
      const limit = parseInt(options.limit, 10);
      console.log(`🔍 Searching for "${query}"...`);

      const response = await fetch(`${API_BASE_URL}/cli/search?q=${encodeURIComponent(query)}&limit=${limit}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Server returned ${response.status}`);
      }

      const results = await response.json();

      if (results.length === 0) {
        console.log("😕 No users found matching your query.");
        return;
      }

      console.log(`\n✨ Found ${results.length} user(s):\n`);

      for (const user of results) {
        console.log(`👤 @${user.username}`);
        if (user.description) {
          console.log(`   ${user.description}`);
        }
        console.log(`   📍 Address: ${user.address}`);
        console.log(`   🔑 Public Key: ${user.publicKey}`);
        console.log(`   📊 Score: ${(user.score * 100).toFixed(1)}%`);
        console.log();
      }

      console.log(`💬 Start a chat: npx @openindex/openindexcli send-message <your_username> <username> "Hello!" -k <key>`);
    } catch (error: any) {
      console.error("❌ Error:", error.message);
    }
  });

// --- COMMAND: Chat Roulette ---
program
  .command("roulette")
  .description("Get a random username to chat with")
  .action(async () => {
    try {
      console.log("🎲 Spinning the wheel...");
      const response = await fetch(`${API_BASE_URL}/cli/roulette`);

      if (!response.ok) {
         throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.username) {
        console.log(`✨ You matched with: @${data.username}`);
        console.log(`💬 Say hello: npx @openindex/openindexcli send-message <your_username> ${data.username} "Hello!" -k <key>`);
      } else {
        console.log("😕 No active users found to chat with right now.");
      }
    } catch (error: any) {
      console.error("❌ Error playing roulette:", error.message);
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


// --- COMMAND: Send Signed & Encrypted Message ---
program
  .command("send-message <senderUsername> <toUsername> <message>")
  .description("Send a double-enveloped, blinded message")
  .requiredOption("-k, --key <privateKey>", "Your private key to sign the message")
  .action(async (senderUsername, toUsername, message, options) => {
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
  .command("get-messages <name>")
  .description("Fetch and unwrap messages from your inbox or a group inbox")
  .requiredOption("-k, --key <privateKey>", "Your private key to decrypt")
  .action(async (name, options) => {
    try {
      if (!options.key) {
        throw new Error("Private key is required");
      }

      // Check if this is a group or a username
      const group = loadGroup(name);
      const inboxId = group ? group.groupInboxId : hashUsername(name);
      const isGroup = !!group;

      const response = await fetch(`${API_BASE_URL}/cli/messages/${inboxId}`);
      const messages = await response.json();

      for (const msg of messages) {
        if (!msg.message) {
          continue;
        }

        // Group messages use symmetric encryption (AES-256-GCM)
        if (isGroup) {
          try {
            // Group message format: iv:authTag:ciphertext
            const [ivHex, authTagHex, ciphertext] = msg.message.split(':');
            if (!ivHex || !authTagHex || !ciphertext) {
              continue; // Not a valid group message format
            }

            // Get the sender's chain key from the group
            const senderKey = group.memberKeys?.[msg.senderId];
            if (!senderKey) {
              continue; // Unknown sender
            }

            // Derive the message key using the same ratchet logic
            const chainKeyBuf = Buffer.from(senderKey, 'hex');
            const { messageKey } = nextKey(chainKeyBuf);

            // Decrypt with AES-256-GCM
            const { createDecipheriv } = await import('crypto');
            const decipher = createDecipheriv('aes-256-gcm', messageKey, Buffer.from(ivHex, 'hex'));
            decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

            let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            const { text, senderId, createdAt } = JSON.parse(decrypted);
            const date = new Date(createdAt).toLocaleString();
            console.log(`\n${msg.id} [${date}] From ${senderId}:`);
            console.log(`> ${text}`);
          } catch {
            // Skip messages we can't decrypt
            continue;
          }
          continue;
        }

        // Regular messages use asymmetric encryption (E2EE)
        // 1. Decrypt the Envelope
        const payload = EthCrypto.cipher.parse(msg.message);
        const decryptedJson = await EthCrypto.decryptWithPrivateKey(options.key, payload);
        const { text, senderId, createdAt, ...data } = JSON.parse(decryptedJson);

        // 2. Verify Signature (Authencity check)
        if (!msg.signature) {
          continue;
        }
        const recoveredAddress = ethers.verifyMessage(msg.message, msg.signature);

        // For GROUP_SETUP messages, senderId is not in the payload - handle silently
        if (!senderId) {
          if (data.type === "GROUP_SETUP") {
            saveGroup(data.groupId, {
              name: data.groupId,
              groupInboxId: data.groupInboxId,
              creator: data.creator,
              memberKeys: {
                [data.creator]: data.chainKey
              },
              signingKeys: {
                [data.creator]: data.signingPubKey
              }
            });
          }
          continue;
        }

        // Fetch sender's key to confirm address
        const sKeyResp = await fetch(`${API_BASE_URL}/cli/user/${senderId}`);
        const { publicKey: sPubKey } = await sKeyResp.json();
        const expectedAddress = EthCrypto.publicKey.toAddress(sPubKey);

        if (recoveredAddress.toLowerCase() === expectedAddress.toLowerCase()) {
          // Only display regular text messages (skip admin messages)
          if (!data.type) {
            const date = new Date(createdAt).toLocaleString();
            console.log(`\n${msg.id} [${date}] From ${senderId}:`);
            console.log(`> ${text}`);
          }
        } else if (data.type === "GROUP_LEAVE") {
          console.log(`\n🚫 ${data.senderId} has left the group "${data.groupId}"`);

          // 1. Load the group data
          const group = loadGroup(data.groupId);
          if (!group) return;

          // 2. Remove the member from the local tracking
          if (group.members) {
            group.members = group.members.filter((m: string) => m !== data.senderId);
          }
          
          // Remove their specific ratchet keys so we don't try to use them
          delete group.memberKeys[data.senderId];
          delete group.signingKeys[data.senderId];

          // 3. KEY ROTATION: Generate a brand new Chain Key
          // This ensures the person who left cannot decrypt our future messages
          const newChainKey = randomBytes(32).toString('hex');
          group.myChainKey = newChainKey;

          // 4. Save the updated group state
          saveGroup(data.groupId, group);

          // 5. Redistribute the NEW key to the remaining members
          // We reuse the distribution logic from 'create-group'
          console.log("🔄 Rotating keys for remaining members...");
          await redistributeKeys(options.key, data.groupId, group.members);
          
          console.log(`✅ Group "${data.groupId}" is now secure.`);
        } else {
          // console.debug("⚠️ Received a message with a forged signature!");
        }
      }
    } catch (error: any) {
      console.error("❌ Error:", error.message);
    }
  });

  program
    .command("create-group <groupName> <members...>")
    .description("Create a group and distribute your Sender Key to members")
    .requiredOption("-k, --key <privateKey>", "Your private key for authentication")
    .action(async (groupName, members, options) => {
      try {
        console.log(`Creating group "${groupName}" with ${members.length} members...`);

        // 1. Generate your unique Sender Key for this group
        const myChainKey = randomBytes(32).toString('hex');
        const mySigningKey = EthCrypto.createIdentity(); // New ephemeral signing key

        // Derive creator's public key for unique group inbox ID
        const creatorPubKey = EthCrypto.publicKeyByPrivateKey(options.key);
        const groupInboxId = hashGroupId(groupName, creatorPubKey);

        // 2. Distribute to each member via their 1-on-1 "Envelope"
        for (const member of members) {
          console.log(`Distributing key to ${member}...`);

          // Fetch member's public key
          const keyResp = await fetch(`${API_BASE_URL}/cli/user/${member}`);
          const { publicKey: recipientPubKey } = await keyResp.json();

          // Wrap the group setup info in an E2EE envelope
          const setupInfo = JSON.stringify({
            type: "GROUP_SETUP",
            groupId: groupName,
            groupInboxId: groupInboxId,
            creator: members[0],
            chainKey: myChainKey,
            signingPubKey: mySigningKey.publicKey
          });

          const encrypted = await EthCrypto.encryptWithPublicKey(recipientPubKey, setupInfo);

          // Send this to the member's private hashed inbox
          await fetch(`${API_BASE_URL}/cli/send`, {
            method: "POST",
            body: JSON.stringify({
              recipientHash: hashUsername(member),
              message: EthCrypto.cipher.stringify(encrypted),
              signature: await new ethers.Wallet(options.key).signMessage(EthCrypto.cipher.stringify(encrypted))
            })
          });
        }

        // 3. Save group state locally (first member is the creator)
        const groupData = {
          name: groupName,
          groupInboxId: groupInboxId,
          creator: members[0],
          myChainKey: myChainKey,
          mySigningKey: mySigningKey.privateKey,
          members: members
        };
        saveGroup(groupName, groupData);

        console.log(`✅ Group "${groupName}" created and keys distributed!`);
      } catch (error: any) {
        console.error("❌ Failed to create group:", error.message);
      }
    });

  program
    .command("group-send <groupName> <message>")
    .description("Send an E2EE message to a group using your Sender Key")
    .action(async (groupName, message) => {
      try {
        // 1. Load the group state
        const group = loadGroup(groupName);
        if (!group) throw new Error("Group not found locally.");

        // 2. Derive the current MessageKey and the NextChainKey (The Ratchet)
        // We use the current chainKey as the entropy source
        const currentChainKey = Buffer.from(group.myChainKey, 'hex');
        
        const { messageKey, nextChainKey } = nextKey(currentChainKey);

        // 3. Encrypt the message SYMMETRICALLY (AES-256-GCM)
        const iv = randomBytes(16);
        const cipher = createCipheriv('aes-256-gcm', messageKey, iv);
        
        // We encrypt the "Double Envelope" (text + senderId)
        const payload = JSON.stringify({
          text: message,
          senderId: group.creator,
          createdAt: Date.now()
        });

        let ciphertext = cipher.update(payload, 'utf8', 'hex');
        ciphertext += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        // Combine IV, ciphertext, and tag into a single string
        const encryptedBlob = `${iv.toString('hex')}:${authTag}:${ciphertext}`;

        // 4. Sign the blob with your Group Signing Key
        // This proves YOU sent it to the group
        const signature = EthCrypto.sign(group.mySigningKey, EthCrypto.hash.keccak256(encryptedBlob));

        // 5. Update local group state (Save the ratchet)
        group.myChainKey = nextChainKey.toString('hex');
        saveGroup(groupName, group);

        // 6. POST to the group's blinded inbox
        await fetch(`${API_BASE_URL}/cli/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientHash: group.groupInboxId,
            message: encryptedBlob,
            signature: signature,
            senderId: group.creator // So members know which chain to use to decrypt
          }),
        });

        console.log(`✅ Group message sent to "${groupName}"`);
      } catch (error: any) {
        console.error("❌ Group send failed:", error.message);
      }
    });

  program
    .command("leave-group <groupName>")
    .description("Leave a group and notify members to rotate keys")
    .action(async (groupName) => {
      try {
        const group = loadGroup(groupName);
        if (!group) throw new Error("You are not in this group.");

        // 1. Notify the group (Blinded inbox)
        const leaveNotice = JSON.stringify({
          type: "GROUP_LEAVE",
          groupId: groupName,
          senderId: group.creator
        });

        // We sign the notice so members know it's a real request
        const signature = EthCrypto.sign(group.mySigningKey, EthCrypto.hash.keccak256(leaveNotice));

        await fetch(`${API_BASE_URL}/cli/send`, {
          method: "POST",
          body: JSON.stringify({
            recipientHash: group.groupInboxId,
            message: leaveNotice, // Some implementations encrypt this, some keep it as metadata
            signature: signature
          })
        });

        deleteGroup(groupName);

        console.log(`👋 You have left "${groupName}".`);
      } catch (error: any) {
        console.error("❌ Leave failed:", error.message);
      }
    });

program.parse(process.argv);
