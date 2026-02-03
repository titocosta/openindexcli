import { createHash } from 'crypto';

// Helper to hash the username for the server to use as an "Inbox ID"
export const hashUsername = (name: string) =>
  createHash('sha256').update(name.toLowerCase()).digest('hex');

// Helper to hash group ID using group name + creator's public key
// This ensures uniqueness per creator while remaining deterministic
export const hashGroupId = (groupName: string, creatorPubKey: string) =>
  createHash('sha256').update(`${groupName.toLowerCase()}:${creatorPubKey}`).digest('hex');