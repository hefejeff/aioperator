/**
 * Gamma AI API Service
 * 
 * Uses Firebase Cloud Functions as a proxy to avoid CORS restrictions
 */

export interface GammaGenerateRequest {
  text: string;
  format?: 'pptx' | 'pdf' | 'webpage';
  themeId?: string;
  apiKey: string;
}

export interface GammaGenerateResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  webUrl?: string;
  error?: string;
}

/**
 * Generate a presentation using Gamma AI via Firebase Cloud Function
 * @param text - The slide presentation text/outline to generate from
 * @param apiKey - Gamma AI API key
 * @param themeId - Optional Gamma theme ID (default: g_kwtkpaa9032ruke)
 * @returns Promise with generation result including download link
 */
export async function generateGammaPresentation(
  text: string,
  apiKey: string,
  format: 'pptx' | 'pdf' | 'webpage' = 'pptx',
  themeId: string = 'lbwzv30urvx3eqk'
): Promise<GammaGenerateResponse> {
  try {
    // Get Firebase Cloud Function URL
    const functionUrl = getFunctionUrl();
    
    // Call Firebase Cloud Function proxy
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        format,
        themeId,
        apiKey,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Function error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Gamma presentation generation failed:', error);
    throw error;
  }
}

/**
 * Check the status of a Gamma presentation generation
 * @param generationId - The generation ID returned by generateGammaPresentation
 * @param apiKey - Gamma AI API key
 * @returns Promise with generation status and download link if completed
 */
export async function checkGammaStatus(
  generationId: string,
  apiKey: string
): Promise<GammaGenerateResponse> {
  try {
    const functionUrl = getFunctionUrl().replace('generateGammaPresentation', 'checkGammaStatus');
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        generationId,
        apiKey,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Function error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to check Gamma status:', error);
    throw error;
  }
}

/**
 * Poll for Gamma presentation completion
 * @param generationId - The generation ID to poll
 * @param apiKey - Gamma AI API key
 * @param maxAttempts - Maximum number of polling attempts (default: 30)
 * @param interval - Polling interval in milliseconds (default: 3000)
 * @returns Promise with completed generation data
 */
export async function pollGammaCompletion(
  generationId: string,
  apiKey: string,
  maxAttempts: number = 30,
  interval: number = 3000
): Promise<GammaGenerateResponse> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(`Polling attempt ${attempt + 1}/${maxAttempts} for generation ${generationId}`);
    
    const status = await checkGammaStatus(generationId, apiKey);
    
    if (status.status === 'completed') {
      console.log('Generation completed!', status);
      return status;
    }
    
    if (status.status === 'failed') {
      throw new Error('Generation failed');
    }
    
    // Wait before next attempt
    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  throw new Error('Generation timed out after ' + (maxAttempts * interval / 1000) + ' seconds');
}

/**
 * Get Firebase Cloud Function URL based on environment
 */
function getFunctionUrl(): string {
  // Always use production Cloud Function (deployed)
  // To use local emulator, set VITE_USE_EMULATOR=true in .env
  const useEmulator = import.meta.env.VITE_USE_EMULATOR === 'true';
  
  if (useEmulator && window.location.hostname === 'localhost') {
    return 'http://localhost:5001/ai-operator-pro/us-central1/generateGammaPresentation';
  }
  
  // Production Cloud Function URL
  return 'https://us-central1-ai-operator-pro.cloudfunctions.net/generateGammaPresentation';
}

/**
 * Open Gamma in a new tab (fallback method)
 */
export function openGammaWithText(text: string): void {
  const GAMMA_WEB_URL = 'https://gamma.app/create';
  
  // Copy text to clipboard
  navigator.clipboard.writeText(text).then(() => {
    console.log('Slide text copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy to clipboard:', err);
  });
  
  // Open Gamma in new tab
  window.open(GAMMA_WEB_URL, '_blank');
}

/**
 * Copy slide presentation text to clipboard
 */
export async function copySlideTextToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    throw new Error('Failed to copy to clipboard');
  }
}

/**
 * Get Gamma API key from localStorage or environment variable
 */
export function getGammaApiKey(): string | null {
  // First check environment variable
  const envKey = import.meta.env.VITE_GAMMA_API_KEY;
  if (envKey) {
    return envKey;
  }
  
  // Fall back to user's stored key in localStorage
  const userKey = localStorage.getItem('gamma_api_key');
  return userKey;
}

/**
 * Save Gamma API key to localStorage
 */
export function setGammaApiKey(apiKey: string): void {
  localStorage.setItem('gamma_api_key', apiKey);
}

/**
 * Clear stored Gamma API key
 */
export function clearGammaApiKey(): void {
  localStorage.removeItem('gamma_api_key');
}
