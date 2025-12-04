import { Router, Request, Response } from 'express';
import { generatePKCEChallenge } from '../utils/pkce';

const router = Router();

// Test route to verify /api/onedrive mount is working
router.get('/test', async (req: Request, res: Response) => {
  
  res.json({ 
    message: 'OneDrive mount test successful', 
    timestamp: new Date().toISOString(),
    route: '/api/onedrive/test',
    method: 'GET'
  });
});

// Generate PKCE challenge for OneDrive OAuth (public endpoint)
router.post('/pkce', async (req: Request, res: Response) => {
  try {
    
    const pkceChallenge = generatePKCEChallenge();
    
    
    const response = {
      codeChallenge: pkceChallenge.codeChallenge,
      codeVerifier: pkceChallenge.codeVerifier,
      codeChallengeMethod: pkceChallenge.codeChallengeMethod
    };
    
                res.json(response);
  } catch (error) {
                            res.status(500).json({ 
      error: 'Failed to generate PKCE challenge',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Catch-all route to debug any unmatched requests
router.all('*', async (req: Request, res: Response) => {
                res.status(404).json({ 
    error: 'Route not found in OneDrive router',
    method: req.method,
    path: req.path,
    availableRoutes: ['GET /test', 'POST /pkce']
  });
});

export default router;
