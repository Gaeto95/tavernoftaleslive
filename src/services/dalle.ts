import { supabase } from '../lib/supabase';

export class DalleService {
  private supabaseUrl: string;

  constructor(apiKey: string) {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  }

  async generateImage(prompt: string): Promise<string | null> {
    if (!this.supabaseUrl) {
      console.warn('Supabase URL not configured');
      return null;
    }

    // Create a safer, more policy-compliant enhanced prompt
    const enhancedPrompt = `${prompt}, fantasy digital art, atmospheric lighting, medieval style, peaceful scene, high quality, artistic illustration, fantasy environment`;

    // Truncate prompt if it's too long to prevent generation errors
    const finalPrompt = enhancedPrompt.length > 1000 
      ? enhancedPrompt.substring(0, 1000) + '...'
      : enhancedPrompt;

    try {
      console.log('Generating DALL-E image with prompt:', finalPrompt.substring(0, 100) + '...');
      console.log('Using Supabase URL:', this.supabaseUrl);
      
      // Use Supabase Edge Function to call DALL-E
      const response = await fetch(`${this.supabaseUrl}/functions/v1/ai-services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          service: 'dalle',
          prompt: finalPrompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('DALL-E API Error:', errorData);
        
        if (response.status === 401) {
          console.warn('DALL-E API key invalid');
        } else if (response.status === 429) {
          console.warn('DALL-E API rate limit exceeded');
        } else if (response.status === 400) {
          console.warn('DALL-E API request invalid:', errorData.error?.message);
          // If it's a content policy violation, try with a safer fallback prompt
          if (errorData.error?.type === 'image_generation_user_error') {
            console.log('Retrying with safer prompt...');
            return this.generateSafeImage();
          }
        }
        
        return null;
      }

      const data = await response.json();
      console.log('DALL-E response:', data);
      
      if (data.data && data.data[0] && data.data[0].url) {
        console.log('Generated image URL:', data.data[0].url);
        return data.data[0].url;
      } else {
        console.error('Unexpected DALL-E response format:', data);
        return null;
      }
    } catch (error) {
      console.error('DALL-E API Error:', error);
      return null;
    }
  }

  private async generateSafeImage(): Promise<string | null> {
    const safePrompt = 'Medieval fantasy tavern interior, warm candlelight, wooden furniture, peaceful atmosphere, digital art';
    
    try {
      console.log('Generating safe fallback image with prompt:', safePrompt);
      
      // Use Supabase Edge Function to call DALL-E with safe prompt
      const response = await fetch(`${this.supabaseUrl}/functions/v1/ai-services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          service: 'dalle',
          prompt: safePrompt
        })
      });

      if (!response.ok) {
        console.error('Safe DALL-E fallback error:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      console.log('Safe DALL-E response:', data);
      
      if (data.data && data.data[0] && data.data[0].url) {
        console.log('Generated safe image URL:', data.data[0].url);
        return data.data[0].url;
      } else {
        console.error('Unexpected safe DALL-E response format:', data);
        return null;
      }
    } catch (error) {
      console.error('Safe DALL-E fallback error:', error);
      return null;
    }
  }
}