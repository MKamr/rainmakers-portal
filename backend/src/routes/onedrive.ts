import { Router, Request, Response } from 'express';
import { generatePKCEChallenge } from '../utils/pkce';

const router = Router();

// Test route to verify /api/onedrive mount is working
router.get('/test', async (req: Request, res: Response) => {
  res.json({ message: 'OneDrive mount test successful', timestamp: new Date().toISOString() });
});

// Generate PKCE challenge for OneDrive OAuth (public endpoint)
router.post('/pkce', async (req: Request, res: Response) => {
  try {
    console.log('🔑 [PKCE] POST /pkce endpoint hit!');
    console.log('🔑 [PKCE] Request method:', req.method);
    console.log('🔑 [PKCE] Request path:', req.path);
    console.log('🔑 [PKCE] Request url:', req.url);
    console.log('🔑 [PKCE] Generating PKCE challenge...');
    const pkceChallenge = generatePKCEChallenge();
    console.log('✅ [PKCE] Generated challenge:', {
      codeChallenge: pkceChallenge.codeChallenge.substring(0, 20) + '...',
      codeVerifier: pkceChallenge.codeVerifier.substring(0, 20) + '...',
      method: pkceChallenge.codeChallengeMethod
    });
    
    res.json({
      codeChallenge: pkceChallenge.codeChallenge,
      codeVerifier: pkceChallenge.codeVerifier,
      codeChallengeMethod: pkceChallenge.codeChallengeMethod
    });
  } catch (error) {
    console.error('❌ [PKCE] Generation error:', error);
    res.status(500).json({ error: 'Failed to generate PKCE challenge' });
  }
});

export default router;
