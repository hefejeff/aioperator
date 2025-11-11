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
  format?: 'pptx' | 'pdf' | 'webpage';
  apiKey: string;
  gammaId?: string;
  themeId?: string;
}

export const generateGammaPresentation = onRequest({cors: true}, async (req, res) => {

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { text, apiKey, format = 'pptx' } = req.body as GammaGenerateRequest;

  if (!text || !apiKey) {
    res.status(400).json({ error: 'Missing required fields: text and apiKey' });
    return;
  }

  try {
    // Gamma API uses /generations/from-template endpoint
    // Authentication uses x-api-key header
    const requestBody = {
      prompt: text,
      exportAs: format,
      gammaId: 'g_0f53ajq4rdf4b8m', // Template ID
      themeId: '9c419c9zpcetcnq', // Theme ID
    };

    console.log('Calling Gamma API:', {
      url: `${GAMMA_API_URL}/generations/from-template`,
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey.substring(0, 15) + '...',
      promptLength: text.length,
      exportAs: format,
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
    
    // If processing, poll for completion
    if (data.status === 'processing' && data.id) {
      const result = await pollGammaStatus(data.id, apiKey);
      res.json(result);
    } else {
      res.json(data);
    }
  } catch (error: any) {
    console.error('Gamma API proxy error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
});

async function pollGammaStatus(
  id: string,
  apiKey: string,
  maxAttempts: number = 30,
  interval: number = 2000
): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, interval));

    const response = await fetch(`${GAMMA_API_URL}/generations/${id}`, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check status: ${response.status}`);
    }

    const data = await response.json() as any;

    if (data.status === 'completed' || data.status === 'failed') {
      return data;
    }
  }

  throw new Error('Presentation generation timed out');
}
