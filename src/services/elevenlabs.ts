import { supabase } from '../lib/supabase';

export class ElevenLabsService {
  private supabaseUrl: string;
  private voiceId = 'uju3wxzG5OhpWcoi3SMy'; // Updated to your requested voice ID

  constructor(apiKey: string) {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  }

  async generateSpeech(text: string): Promise<string | null> {
    if (!this.supabaseUrl) {
      console.warn('Supabase URL not configured');
      return null;
    }

    // Clean text for better speech synthesis
    const cleanText = text
      .replace(/\*[^*]*\*/g, '') // Remove *actions*
      .replace(/\([^)]*\)/g, '') // Remove (parentheses)
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    if (!cleanText || cleanText.length < 10) {
      console.warn('Text too short for speech synthesis:', cleanText);
      return null;
    }

    try {
      console.log('Generating speech with voice ID:', this.voiceId);
      console.log('Using Supabase URL:', this.supabaseUrl);
      console.log('Text length:', cleanText.length, 'characters');
      
      // Use Supabase Edge Function to call ElevenLabs
      const response = await fetch(`${this.supabaseUrl}/functions/v1/ai-services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          service: 'elevenlabs',
          endpoint: `text-to-speech/${this.voiceId}`,
          data: {
            text: cleanText,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.8,
              similarity_boost: 0.9,
              style: 0.2,
              use_speaker_boost: true
            },
            output_format: 'mp3_44100_128'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('ElevenLabs API Error:', response.status, errorText);
        
        if (response.status === 401) {
          console.warn('ElevenLabs API key invalid');
        } else if (response.status === 429) {
          console.warn('ElevenLabs API rate limit exceeded');
        } else if (response.status === 422) {
          console.warn('ElevenLabs API validation error - text might be too long or contain invalid characters');
        }
        
        return null;
      }

      const audioBlob = await response.blob();
      
      // Log blob details for debugging
      console.log('Received audio blob:', {
        size: audioBlob.size,
        type: audioBlob.type || 'no content type',
        isValid: audioBlob.size > 0
      });

      // Enhanced blob validation
      if (!audioBlob || audioBlob.size === 0) {
        console.error('Received empty or invalid audio blob from ElevenLabs');
        return null;
      }

      // Create blob with explicit MIME type for better browser compatibility
      const mp3Blob = new Blob([audioBlob], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(mp3Blob);
      console.log('Generated audio URL:', audioUrl, 'Size:', mp3Blob.size, 'Type:', mp3Blob.type);
      
      return audioUrl;
    } catch (error) {
      console.error('ElevenLabs API Error:', error);
      return null;
    }
  }

  async getVoices(): Promise<any[]> {
    if (!this.supabaseUrl) {
      return [];
    }

    try {
      // Use Supabase Edge Function to call ElevenLabs
      const response = await fetch(`${this.supabaseUrl}/functions/v1/ai-services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          service: 'elevenlabs',
          endpoint: 'voices',
          method: 'GET'
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      return [];
    }
  }

  // Method to get available voice options for DM narration
  getRecommendedVoices() {
    return [
      {
        id: 'jbEI5QkrMSKWeDlP27MV', // Your requested voice - now the default
        name: 'Your Requested Voice',
        description: 'The voice ID you specifically requested for DM narration'
      },
      {
        id: 'pNInz6obpgDQGcFmaJgB', // Adam - backup option
        name: 'Adam',
        description: 'Deep, authoritative male voice - Perfect for dramatic DM narration'
      },
      {
        id: '21m00Tcm4TlvDq8ikWAM', // Rachel
        name: 'Rachel',
        description: 'Clear, expressive female voice - Great for storytelling'
      },
      {
        id: 'AZnzlk1XvdvUeBnXmlld', // Domi
        name: 'Domi',
        description: 'Strong, confident voice - Excellent for epic adventures'
      },
      {
        id: 'EXAVITQu4vr4xnSDxMaL', // Bella
        name: 'Bella',
        description: 'Warm, engaging voice - Perfect for immersive storytelling'
      }
    ];
  }
}