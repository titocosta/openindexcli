import fs from 'fs';
import path from 'path';
import os from 'os';
const CONFIG_DIR = path.join(os.homedir(), '.openindex');
const GROUPS_PATH = path.join(CONFIG_DIR, 'groups.json');
/**
 * Saves or updates group metadata and keys in the local filesystem.
 */
export function saveGroup(groupName, groupData) {
    try {
        // 1. Ensure the config directory exists
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        // 2. Load existing groups or initialize an empty object
        let allGroups = {};
        if (fs.existsSync(GROUPS_PATH)) {
            const fileContent = fs.readFileSync(GROUPS_PATH, 'utf8');
            allGroups = JSON.parse(fileContent);
        }
        // 3. Update the specific group (Keyed by name or a unique ID)
        allGroups[groupName] = {
            ...allGroups[groupName], // Keep existing data if merging
            ...groupData,
            updatedAt: Date.now()
        };
        // 4. Write back to disk with restricted permissions (chmod 600)
        // Only the current user can read/write this file.
        fs.writeFileSync(GROUPS_PATH, JSON.stringify(allGroups, null, 2), {
            mode: 0o600
        });
        return true;
    }
    catch (error) {
        console.error(`❌ Failed to save group locally: ${error.message}`);
        return false;
    }
}
/**
 * Retrieves group data from the local filesystem.
 */
export function loadGroup(groupName) {
    if (!fs.existsSync(GROUPS_PATH))
        return null;
    const allGroups = JSON.parse(fs.readFileSync(GROUPS_PATH, 'utf8'));
    return allGroups[groupName] || null;
}
export function deleteGroup(groupName) {
    const allGroups = JSON.parse(fs.readFileSync(GROUPS_PATH, 'utf8'));
    delete allGroups[groupName];
    fs.writeFileSync(GROUPS_PATH, JSON.stringify(allGroups, null, 2));
}
//# sourceMappingURL=local.js.map