/**
 * Firebase Cloud Function to proxy Gamma AI API requests
 * This avoids CORS issues by making the API call server-side
 */

import {onRequest} from 'firebase-functions/v2/https';
import fetch from 'node-fetch';

// Gamma API base URL - https://developers.gamma.app/reference/generate-a-gamma
const GAMMA_API_URL = 'https://public-api.gamma.app/v1.0';

interface GammaGenerateRequest {
  text: string;
  format?: 'pptx' | 'pdf' | 'web' | 'webpage';
  apiKey: string;
  gammaId?: string;
  themeId?: string;
}

export const generateGammaPresentation = onRequest({
  cors: true,
  timeoutSeconds: 300,
  maxInstances: 10,
}, async (req, res) => {

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { text, apiKey, format = 'pptx', themeId = 'lbwzv30urvx3eqk', gammaId = 'g_kwtkpaa9032ruke' } = req.body as GammaGenerateRequest;

  if (!text || !apiKey) {
    res.status(400).json({ error: 'Missing required fields: text and apiKey' });
    return;
  }

  try {
    // Gamma API uses /generations/from-template endpoint
    // Authentication uses x-api-key header
    const exportAs = format === 'pptx' || format === 'pdf' ? format : undefined;
    const requestBody: Record<string, unknown> = {
      prompt: text,
      gammaId: gammaId,
      themeId: themeId,
    };

    if (exportAs) {
      requestBody.exportAs = exportAs;
    }

    console.log('Calling Gamma API:', {
      url: `${GAMMA_API_URL}/generations/from-template`,
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey.substring(0, 15) + '...',
      promptLength: text.length,
      exportAs: exportAs || 'none',
      gammaId: gammaId,
      themeId: themeId,
    });

    const response = await fetch(`${GAMMA_API_URL}/generations/from-template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Gamma API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gamma API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        headers: Object.fromEntries(response.headers.entries()),
      });
      
      let errorData: any;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      res.status(response.status).json({
        error: errorData.message || errorData.error || `Gamma API error: ${response.status}`,
        details: errorText,
        statusCode: response.status,
      });
      return;
    }

    const data = await response.json() as any;
    
    console.log('Gamma API success response:', JSON.stringify(data, null, 2));
    
    // Return generationId immediately - let client poll for completion
    // This avoids Cloud Function timeout issues
    if (data.generationId) {
      console.log('Returning generationId immediately:', data.generationId);
      res.json({
        generationId: data.generationId,
        status: 'processing',
      });
    } else {
      console.log('No generationId in response, returning as-is');
      res.json(data);
    }
  } catch (error: any) {
    console.error('Gamma API proxy error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
});

// Cloud Function to check generation status
export const checkGammaStatus = onRequest({
  cors: true,
  timeoutSeconds: 60,
}, async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const generationId = req.method === 'GET' ? req.query.generationId as string : req.body.generationId;
  const apiKey = req.method === 'GET' ? req.query.apiKey as string : req.body.apiKey;

  if (!generationId || !apiKey) {
    res.status(400).json({ error: 'Missing required fields: generationId and apiKey' });
    return;
  }

  try {
    console.log('Checking status for generation:', generationId);

    const response = await fetch(`${GAMMA_API_URL}/generations/${generationId}`, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to check status: ${response.status}`, errorText);
      res.status(response.status).json({
        error: `Failed to check status: ${response.status}`,
        details: errorText,
      });
      return;
    }

    const data = await response.json() as any;
    console.log(`Generation ${generationId} status:`, JSON.stringify(data, null, 2));
    
    res.json(data);
  } catch (error: any) {
    console.error('Check status error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
});
