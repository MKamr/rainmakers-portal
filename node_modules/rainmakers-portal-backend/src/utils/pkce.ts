import crypto from 'crypto';

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}

/**
 * Generate PKCE code verifier and challenge
 * @param length Length of the code verifier (43-128 characters)
 * @returns PKCE challenge object
 */
export function generatePKCEChallenge(length: number = 128): PKCEChallenge {
  // Generate random code verifier
  const codeVerifier = crypto.randomBytes(length).toString('base64url');
  
  // Generate code challenge using SHA256
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256'
  };
}

/**
 * Verify PKCE code verifier against challenge
 * @param codeVerifier The code verifier
 * @param codeChallenge The code challenge
 * @returns True if verification passes
 */
export function verifyPKCEChallenge(codeVerifier: string, codeChallenge: string): boolean {
  const expectedChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return expectedChallenge === codeChallenge;
}
