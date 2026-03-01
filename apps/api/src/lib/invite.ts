import crypto from "node:crypto";

const INVITE_CODE_LENGTH = 6;
const INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No 0/O/1/I to avoid confusion
const INVITE_EXPIRY_HOURS = 48;

/**
 * Generate a random 6-character invite code.
 */
export function generateInviteCode(): string {
    let code = "";
    const bytes = crypto.randomBytes(INVITE_CODE_LENGTH);
    for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
        code += INVITE_CODE_CHARS[bytes[i] % INVITE_CODE_CHARS.length];
    }
    return code;
}

/**
 * Get the expiry date for an invite code (48 hours from now).
 */
export function getInviteExpiry(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + INVITE_EXPIRY_HOURS);
    return expiry;
}

/**
 * Check if an invite code has expired.
 */
export function isInviteExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
}
