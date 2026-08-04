// Minimal, non-verifying JWT payload decoder.
//
// This does NOT verify the token's signature — it only reads the claims for
// client-side display purposes (e.g. showing the logged-in user's name).
// The backend independently verifies the signature on every real API call,
// so this is the same trust boundary the app already relies on elsewhere:
// the token is opaque to the client for authorization purposes, it's just
// used here to render "who am I" without an extra round trip.
export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  sector?: { id: string; name: string; code: string };
  [key: string]: unknown;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}
