import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CharacterAppearance } from '../types/character3d';
import { supabase } from '../lib/supabase';

interface CharacterState {
  appearance: CharacterAppearance;
  updateAppearance: (updates: Partial<CharacterAppearance>) => void;
  saveAppearance: () => Promise<void>;
  loadAppearance: () => Promise<void>;
}

// Default appearance
const defaultAppearance: CharacterAppearance = {
  id: '',
  name: 'Adventurer',
  background: 'Acolyte',
  class: 'Fighter',
  characterModel: 'a', // Default to first character model
};

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set, get) => ({
      appearance: { ...defaultAppearance },
      
      updateAppearance: (updates) => {
        set((state) => ({
          appearance: { ...state.appearance, ...updates }
        }));
      },
      
      saveAppearance: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            console.warn('Cannot save appearance: User not authenticated');
            return;
          }
          
          const { appearance } = get();
          
          // Save to Supabase
          const { data, error } = await supabase
            .from('character_appearances')
            .upsert({
              id: appearance.id || undefined,
              user_id: user.id,
              name: appearance.name,
              appearance_data: appearance
            }, {
              onConflict: 'id'
            })
            .select('id')
            .single();
            
          if (error) {
            console.error('Error saving character appearance:', error);
            throw error;
          }
          
          // Update the ID if this was a new character
          if (data && !appearance.id) {
            set((state) => ({
              appearance: { ...state.appearance, id: data.id }
            }));
          }
          
          console.log('Character appearance saved successfully');
        } catch (error) {
          console.error('Failed to save character appearance:', error);
        }
      },
      
      loadAppearance: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            console.warn('Cannot load appearance: User not authenticated');
            return;
          }
          
          // Get the most recent appearance for this user
          const { data, error } = await supabase
            .from('character_appearances')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (error && error.code !== 'PGRST116') {
            console.error('Error loading character appearance:', error);
            return;
          }
          
          if (data && data.appearance_data) {
            set({ appearance: data.appearance_data });
            console.log('Character appearance loaded successfully');
          }
        } catch (error) {
          console.error('Failed to load character appearance:', error);
        }
      }
    }),
    {
      name: 'character-appearance-storage',
      partialize: (state) => ({ appearance: state.appearance }),
    }
  )
);