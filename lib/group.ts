import { createHmac } from 'crypto';
import { loadGroup } from './local.js';
import { API_BASE_URL } from './constants.js';
import EthCrypto from 'eth-crypto';
import { ethers } from 'ethers';
import { hashUsername } from './helpers.js';

export function nextKey(currentChainKey: Buffer) {
  const messageKey = createHmac('sha256', currentChainKey).update('msg_key').digest();
  const nextChainKey = createHmac('sha256', currentChainKey).update('next_chain').digest();
  return { messageKey, nextChainKey };
}

export async function redistributeKeys(privateKey: string, groupId: string, members: string[]) {
  const group = loadGroup(groupId);

  for (const member of members) {
    if (member === group.creator) continue; // Don't send to self

    const keyResp = await fetch(`${API_BASE_URL}/api/user/${member}`);
    const { publicKey } = await keyResp.json();

    const rotationNotice = JSON.stringify({
      type: "GROUP_KEY_UPDATE",
      groupId: groupId,
      chainKey: group.myChainKey,
      signingPubKey: group.mySigningPubKey
    });

    const encrypted = await EthCrypto.encryptWithPublicKey(publicKey, rotationNotice);
    const signature = await new ethers.Wallet(privateKey).signMessage(EthCrypto.cipher.stringify(encrypted));

    await fetch(`${API_BASE_URL}/api/send`, {
      method: "POST",
      body: JSON.stringify({
        recipientHash: hashUsername(member),
        message: EthCrypto.cipher.stringify(encrypted),
        signature: signature
      })
    });
  }
}