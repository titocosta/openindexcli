#!/usr/bin/env ts-node
import { ethers } from "ethers";
import { createHash } from 'crypto';
import EthCrypto from 'eth-crypto';
import { Command } from "commander";
import * as dotenv from "dotenv";

dotenv.config();

const program = new Command();
const RPC_URL = process.env.RPC_URL || "https://cloudflare-eth.com"; // Default to Mainnet
const provider = new ethers.JsonRpcProvider(RPC_URL);

const API_BASE_URL = "https://www.openindex.ai";

program
  .name("eth-tool")
  .description("Simple Ethereum CLI for wallet management")
  .version("1.0.0");

// --- COMMAND: Create Wallet ---
program
  .command("create")
  .description("Generate a new random Ethereum wallet")
  .action(() => {
    const wallet = ethers.Wallet.createRandom();
    console.log("✅ New Wallet Generated:");
    console.log(`Address:   ${wallet.address}`);
    console.log(`Mnemonic:  ${wallet.mnemonic?.phrase}`);
    console.log(`Private Key: ${wallet.privateKey}`);
    console.log("\n⚠️  SAVE YOUR PRIVATE KEY! If you lose it, you lose your funds.");
  });

// --- COMMAND: Check Balance ---
program
  .command("balance <address>")
  .description("Check the ETH balance of an address")
  .action(async (address) => {
    try {
      const balance = await provider.getBalance(address);
      console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
    } catch (error: any) {
      console.error("❌ Error:", error.message);
    }
  });

// --- COMMAND: Send ETH ---
program
  .command("send <to> <amount>")
  .description("Send ETH to another address")
  .requiredOption("-k, --key <privateKey>", "Your private key to sign the transaction")
  .action(async (to, amount, options) => {
    try {
      const wallet = new ethers.Wallet(options.key, provider);
      console.log(`🚀 Sending ${amount} ETH to ${to}...`);
      
      const tx = await wallet.sendTransaction({
        to: to,
        value: ethers.parseEther(amount),
      });

      console.log(`🔗 Transaction Sent! Hash: ${tx.hash}`);
      await tx.wait();
      console.log("✅ Transaction Confirmed!");
    } catch (error: any) {
      console.error("❌ Transfer Failed:", error.message);
    }
  });

program.parse(process.argv);

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

// --- COMMAND: Register User ---
program
  .command("register <username>")
  .description("Register your username and public key with the server")
  .requiredOption("-k, --key <privateKey>", "Your private key to derive the public key")
  .action(async (username, options) => {
    try {
      // Derive the public key from the private key
      const publicKey = EthCrypto.publicKeyByPrivateKey(options.key);

      console.log(`📡 Registering ${username} at ${API_BASE_URL}...`);

      // 2. POST to /api/register
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          publicKey: publicKey,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log("✅ Registration Successful!");
        console.log("Server Response:", JSON.stringify(result, null, 2));
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
  .command("send <toUsername> <senderUsername> <message>")
  .description("Send a double-enveloped, blinded message")
  .requiredOption("-k, --key <privateKey>", "Your private key to sign the message")
  .action(async (toUsername, senderUsername, message, options) => {
    try {
      // 1. Discovery: Get recipient's public key
      const keyResp = await fetch(`${API_BASE_URL}/api/user/${toUsername}`);
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
      await fetch(`${API_BASE_URL}/api/send`, {
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
      const response = await fetch(`${API_BASE_URL}/api/messages/${inboxId}`);
      const messages = await response.json();

      for (const msg of messages) {
        // 1. Decrypt the Envelope
        const payload = EthCrypto.cipher.parse(msg.message);
        const decryptedJson = await EthCrypto.decryptWithPrivateKey(options.key, payload);
        const { text, senderId, createdAt } = JSON.parse(decryptedJson);

        // 2. Verify Signature (Authencity check)
        const recoveredAddress = ethers.verifyMessage(msg.message, msg.signature);
        
        // Fetch sender's key to confirm address
        const sKeyResp = await fetch(`${API_BASE_URL}/api/user/${senderId}`);
        const { publicKey: sPubKey } = await sKeyResp.json();
        const expectedAddress = EthCrypto.publicKey.toAddress(sPubKey);

        if (recoveredAddress.toLowerCase() === expectedAddress.toLowerCase()) {
          const date = new Date(createdAt).toLocaleString();
          console.log(`\n[${date}] From ${senderId}:`);
          console.log(`> ${text}`);
        } else {
          console.log("⚠️ Received a message with a forged signature!");
        }
      }
    } catch (error: any) {
      console.error("❌ Error:", error.message);
    }
  });
