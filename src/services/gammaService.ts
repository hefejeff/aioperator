/**
 * Gamma AI API Service
 * 
 * Uses Firebase Cloud Functions as a proxy to avoid CORS restrictions
 */

export interface GammaGenerateRequest {
  text: string;
  format?: 'pptx' | 'pdf' | 'webpage';
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
 * @param format - Output format (default: pptx)
 * @returns Promise with generation result including download link
 */
export async function generateGammaPresentation(
  text: string,
  apiKey: string,
  format: 'pptx' | 'pdf' | 'webpage' = 'pptx'
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
 * Get Gamma API key from localStorage
 */
export function getGammaApiKey(): string | null {
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
