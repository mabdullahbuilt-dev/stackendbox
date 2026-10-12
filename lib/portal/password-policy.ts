export function validatePassword(password: string) {
  if (password.length < 8 || password.length > 128 || /[\x00-\x1f\x7f]/.test(password) || new Set(password).size < 4)
    throw new Error("Use 8-128 characters and avoid repetitive passwords. Letters, numbers, spaces and symbols are accepted.");
}

/** Rejection sampling avoids modulo bias. No credentials are persisted. */
export function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_";
  for (;;) {
    let password = "";
    while (password.length < 24) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      for (const byte of bytes) {
        if (byte < Math.floor(256 / alphabet.length) * alphabet.length && password.length < 24)
          password += alphabet[byte % alphabet.length];
      }
    }
    try { validatePassword(password); return password; } catch { /* Generate a new value. */ }
  }
}
