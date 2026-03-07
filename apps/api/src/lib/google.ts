import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface GoogleUserInfo {
    googleId: string;
    email: string;
    name: string;
    avatarUrl: string | null;
}

/**
 * Verify a Google ID token and extract user info.
 */
export async function verifyGoogleToken(
    idToken: string
): Promise<GoogleUserInfo> {
    if (idToken === "dev-mock-token" && process.env.NODE_ENV !== "production") {
        return {
            googleId: "dev-user-123",
            email: "dev@couple-os.test",
            name: "Developer Tester",
            avatarUrl: null,
        };
    }

    const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
        throw new Error("Invalid Google token: no payload");
    }

    return {
        googleId: payload.sub,
        email: payload.email!,
        name: payload.name || payload.email!,
        avatarUrl: payload.picture || null,
    };
}
