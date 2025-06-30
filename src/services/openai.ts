import { StoryPreset, QuestProgress, QuestMilestone, NPCReaction, PuzzleSolvedStatus, CombatSummary, SkillCheckOutcome } from '../types/game';
import { supabase } from '../lib/supabase';

export interface AIGameResponse {
  story: string;
  damage_taken?: number;
  damage_dealt?: number;
  healing_received?: number;
  xp_gained?: number;
  item_found?: {
    name: string;
    description: string;
    type: 'weapon' | 'armor' | 'potion' | 'tool' | 'treasure' | 'spell_component';
    rarity?: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact';
    value?: number;
    properties?: string[];
  };
  quest_update?: {
    id: string;
    progress: number;
    milestone_completed?: string; // ID of the completed milestone
  };
  conditions_added?: Array<{
    name: string;
    description: string;
    duration: number;
    source: string;
  }>;
  conditions_removed?: string[];
  inspiration_granted?: boolean;
  dice_rolls?: Array<{
    type: string;
    result: number;
    modifier: number;
    total: number;
    purpose: string;
    isCritical?: boolean;
  }>;
  // New map-related fields
  location_update?: {
    current_location: string;
    discovered_locations?: string[];
    room_completed?: string;
  };
  // Story progression tracking
  story_progress?: {
    current_act: number;
    total_acts: number;
    is_climax: boolean;
    is_ending: boolean;
  };
  // New enhanced response fields
  npc_reaction?: NPCReaction;
  puzzle_solved?: PuzzleSolvedStatus;
  combat_summary?: CombatSummary;
  skill_check?: SkillCheckOutcome;
  // Side quest generation
  side_quest_suggestion?: {
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    reward: string;
    related_to?: string;
    milestones: Array<{
      description: string;
      location?: string;
    }>;
  };
}

export class OpenAIService {
  private supabaseUrl: string;
  private storyPreset: StoryPreset | null = null;
  private characterName: string = '';
  private characterBackground: string = '';

  constructor(apiKey: string) {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  }

  setStoryPreset(preset: StoryPreset) {
    this.storyPreset = preset;
  }

  setCharacterContext(name: string, background: string) {
    this.characterName = name;
    this.characterBackground = background;
  }

  async generateStory(
    playerInput: string, 
    storyHistory: Array<{type: string, content: string}>, 
    inventory: string[],
    level: number,
    xp: number
  ): Promise<string> {
    // Check if Supabase URL is available
    if (!this.supabaseUrl) {
      return 'The ancient tome remains sealed... Please configure your Supabase connection to begin your adventure.';
    }

    // Get last 2 story entries for context (reduced from 4)
    const recentStory = storyHistory.slice(-2).map((entry, index) => 
      `${index + 1}. ${entry.type === 'player' ? 'You' : 'Storyteller'}: ${entry.content}`
    ).join('\n');

    // Character-centric system prompt
    const characterContext = this.characterName ? 
      `The world must feel shaped by ${this.characterName}'s bloodline, past choices, or fate. Important characters will recognize ${this.characterName}. Events will reference ${this.characterName}'s legend, even if they don't understand it yet.` : '';

    // Get universe-specific terminology and themes from story preset
    const universeContext = this.storyPreset ? 
      `This adventure takes place in the ${this.storyPreset.name} universe. Use appropriate terminology, locations, and themes from this setting.` : '';

    const systemPrompt = `You are a master storyteller at the Tavern of Tales. Keep responses SHORT and engaging.

RULES:
- Maximum 1-2 sentences (30-50 words)
- Always end with a choice or question
- Award XP: "gain 25 XP" (minor), "gain 50 XP" (combat), "gain 100 XP" (major)
- Use vivid, medieval fantasy language
- Create immediate consequences
- Focus on story, not mechanics
${characterContext ? `\nCHARACTER-CENTRIC WORLD:\n${characterContext}\n- Seed locations, items, and NPCs with references to ${this.characterName}\n- Make enemies refer to ${this.characterName} by name\n- Create artifacts that seem tied to ${this.characterName}'s destiny` : ''}
${universeContext ? `\nUNIVERSE CONTEXT:\n${universeContext}` : ''}

Player: Level ${level}, Items: ${(inventory || []).slice(0, 3).join(', ') || 'none'}

Recent: ${recentStory || 'Tale begins.'}

Action: ${playerInput}

Tell the story briefly:`;

    try {
      // Use Supabase Edge Function to call OpenAI
      const response = await fetch(`${this.supabaseUrl}/functions/v1/ai-services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          service: 'openai',
          endpoint: 'chat/completions',
          data: {
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: playerInput }
            ],
            max_tokens: 80,
            temperature: 0.9,
            presence_penalty: 0.3,
            frequency_penalty: 0.3,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI API Error:', errorData);
        
        if (response.status === 401) {
          return 'The mystical energies reject your incantation... Your API key appears to be invalid.';
        } else if (response.status === 429) {
          return 'The arcane forces are overwhelmed... Rate limit exceeded. Wait a moment.';
        } else if (response.status === 400) {
          return 'The spell components seem misaligned... Try a different action.';
        } else {
          throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'The storyteller ponders in silence...';
    } catch (error) {
      console.error('OpenAI API Error:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return 'Network interference disrupts the magic... Check your connection.';
      } else {
        return 'The magical energies waver... Try again.';
      }
    }
  }

  // New method for streaming AI responses
  async generateStreamingStory(
    playerInput: string,
    storyHistory: Array<{type: string, content: string}>,
    inventory: string[],
    level: number,
    xp: number,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string) => void
  ): Promise<void> {
    // Check if Supabase URL is available
    if (!this.supabaseUrl) {
      onChunk('The ancient tome remains sealed... Please configure your Supabase connection to begin your adventure.');
      onComplete('The ancient tome remains sealed... Please configure your Supabase connection to begin your adventure.');
      return;
    }

    // Get last 2 story entries for context
    const recentStory = storyHistory.slice(-2).map((entry, index) => 
      `${index + 1}. ${entry.type === 'player' ? 'You' : 'Storyteller'}: ${entry.content}`
    ).join('\n');

    // Character-centric system prompt
    const characterContext = this.characterName ? 
      `The world must feel shaped by ${this.characterName}'s bloodline, past choices, or fate. Important characters will recognize ${this.characterName}. Events will reference ${this.characterName}'s legend, even if they don't understand it yet.` : '';

    // Get universe-specific terminology and themes from story preset
    const universeContext = this.storyPreset ? 
      `This adventure takes place in the ${this.storyPreset.name} universe. Use appropriate terminology, locations, and themes from this setting.` : '';

    const systemPrompt = `You are a master storyteller at the Tavern of Tales. Keep responses SHORT and engaging.

RULES:
- Maximum 1-2 sentences (30-50 words)
- Always end with a choice or question
- Award XP: "gain 25 XP" (minor), "gain 50 XP" (combat), "gain 100 XP" (major)
- Use vivid, medieval fantasy language
- Create immediate consequences
- Focus on story, not mechanics
${characterContext ? `\nCHARACTER-CENTRIC WORLD:\n${characterContext}\n- Seed locations, items, and NPCs with references to ${this.characterName}\n- Make enemies refer to ${this.characterName} by name\n- Create artifacts that seem tied to ${this.characterName}'s destiny` : ''}
${universeContext ? `\nUNIVERSE CONTEXT:\n${universeContext}` : ''}

Player: Level ${level}, Items: ${(inventory || []).slice(0, 3).join(', ') || 'none'}

Recent: ${recentStory || 'Tale begins.'}

Action: ${playerInput}

Tell the story briefly:`;

    try {
      // Use Supabase Edge Function to call OpenAI with streaming
      const response = await fetch(`${this.supabaseUrl}/functions/v1/ai-services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          service: 'openai',
          endpoint: 'chat/completions',
          data: {
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: playerInput }
            ],
            max_tokens: 80,
            temperature: 0.9,
            presence_penalty: 0.3,
            frequency_penalty: 0.3,
            stream: true // Enable streaming
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI API Error:', errorData);
        
        let errorMessage = 'The magical energies waver... Try again.';
        if (response.status === 401) {
          errorMessage = 'The mystical energies reject your incantation... Your API key appears to be invalid.';
        } else if (response.status === 429) {
          errorMessage = 'The arcane forces are overwhelmed... Rate limit exceeded. Wait a moment.';
        } else if (response.status === 400) {
          errorMessage = 'The spell components seem misaligned... Try a different action.';
        }
        
        onChunk(errorMessage);
        onComplete(errorMessage);
        return;
      }

      // Process the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines from the buffer
        let lineEnd;
        while ((lineEnd = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, lineEnd).trim();
          buffer = buffer.slice(lineEnd + 1);
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                fullResponse += content;
                onChunk(content);
              }
            } catch (e) {
              console.error('Error parsing streaming response:', e);
            }
          }
        }
      }
      
      // Process any remaining content in the buffer
      if (buffer.trim() && buffer.startsWith('data: ')) {
        const data = buffer.slice(6).trim();
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              onChunk(content);
            }
          } catch (e) {
            console.error('Error parsing final streaming chunk:', e);
          }
        }
      }
      
      onComplete(fullResponse);
    } catch (error) {
      console.error('OpenAI Streaming API Error:', error);
      
      let errorMessage = 'The magical energies waver... Try again.';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network interference disrupts the magic... Check your connection.';
      }
      
      onChunk(errorMessage);
      onComplete(errorMessage);
    }
  }

  async generateStructuredStory(
    playerInput: string, 
    storyHistory: Array<{type: string, content: string}>, 
    inventory: string[],
    level: number,
    xp: number,
    currentLocation?: string,
    exploredAreas?: string[],
    activeQuests?: QuestProgress[]
  ): Promise<AIGameResponse> {
    // Check if Supabase URL is available
    if (!this.supabaseUrl) {
      return {
        story: 'The ancient tome remains sealed... Please configure your Supabase connection to begin your adventure.'
      };
    }

    // Get last 3 story entries for context
    const recentStory = storyHistory.slice(-3).map((entry, index) => 
      `${index + 1}. ${entry.type === 'player' ? 'Player' : 'Storyteller'}: ${entry.content}`
    ).join('\n');

    // Calculate story progress
    const storyLength = storyHistory.length;
    const totalStoryLength = 30; // Increased from 20 to prevent premature endings
    const currentAct = storyLength <= 8 ? 1 : storyLength <= 20 ? 2 : 3;
    const isClimaxNear = storyLength >= 22 && storyLength < 26;
    const isEndingNear = storyLength >= 26;

    // Character-centric world building instructions
    const characterContext = this.characterName ? 
      `The world must feel shaped by ${this.characterName}'s bloodline, past choices, or fate. Important characters will recognize ${this.characterName}. Events will reference ${this.characterName}'s legend, even if they don't understand it yet.` : '';

    // Get universe-specific terminology and themes from story preset
    const universeContext = this.storyPreset ? 
      `This adventure takes place in the ${this.storyPreset.name} universe. Use appropriate terminology, locations, and themes from this setting. All names, places, and items should match the style and lore of this universe.` : '';

    // Use story preset if available
    const presetPrompt = this.storyPreset ? this.storyPreset.systemPrompt : '';

    // Get active quest and current milestone information
    let activeQuestContext = '';
    if (activeQuests && activeQuests.length > 0) {
      const mainQuest = activeQuests.find(q => q.isMainQuest && !q.isCompleted);
      const sideQuests = activeQuests.filter(q => !q.isMainQuest && !q.isCompleted);
      
      if (mainQuest) {
        const currentMilestone = mainQuest.milestones[mainQuest.currentMilestoneIndex];
        activeQuestContext = `
ACTIVE MAIN QUEST: "${mainQuest.name}"
Description: ${mainQuest.description}
Current Milestone: ${currentMilestone ? currentMilestone.description : 'None'}
${currentMilestone && currentMilestone.completionHint ? `Hint: ${currentMilestone.completionHint}` : ''}
Progress: ${mainQuest.progress}/${mainQuest.maxProgress}
`;
      }
      
      if (sideQuests.length > 0) {
        const activeSideQuest = sideQuests[0]; // Focus on first active side quest
        const currentSideMilestone = activeSideQuest.milestones && activeSideQuest.currentMilestoneIndex !== undefined ? 
          activeSideQuest.milestones[activeSideQuest.currentMilestoneIndex] : null;
          
        activeQuestContext += `
ACTIVE SIDE QUEST: "${activeSideQuest.title}"
Description: ${activeSideQuest.description}
${currentSideMilestone ? `Current Milestone: ${currentSideMilestone.description}` : ''}
Progress: ${activeSideQuest.progress}/${activeSideQuest.maxProgress}
`;
      }
    }

    // ENHANCED: Structured prompt for better story progression
    const systemPrompt = `${presetPrompt || 'You are a master storyteller at the Tavern of Tales. Create a dynamic, engaging fantasy adventure with clear progression.'}

STORY STRUCTURE (${storyLength}/${totalStoryLength} actions):
- Current Act: ${currentAct}/3
- ${isClimaxNear ? '⚠️ APPROACHING CLIMAX - Build tension!' : ''}
- ${isEndingNear ? '⚠️ APPROACHING ENDING - Work toward resolution!' : ''}

${activeQuestContext}

${characterContext ? `CHARACTER-CENTRIC WORLD BUILDING:
${characterContext}
- Seed locations with names like "The ${this.characterName}'s Ruins" or "The Crown of ${this.characterName}'s Kin"
- Create prophecies that reference ${this.characterName} (e.g., "The Prophecy of the Flame-Eyed One born under ${this.characterName}'s star")
- Name artifacts after ${this.characterName} (e.g., "The Thorn of ${this.characterName}")
- Make enemies obsessed with ${this.characterName} ("So you are ${this.characterName}... at last")
- Treat ${this.characterName} as a destined figure or cursed inheritor
- End significant story beats with titles for ${this.characterName} (e.g., "${this.characterName}, the Flame-Walker of Bonekeep")` : ''}

${universeContext ? `UNIVERSE-SPECIFIC CONTEXT:
${universeContext}
- All names, places, items, and terminology should match the ${this.storyPreset?.name} universe
- NPCs should behave according to the cultural norms of this setting
- Threats and challenges should be appropriate to this universe` : ''}

I need you to respond with a JSON object. The word "json" is mentioned here to enable JSON response format.

Your response must be a valid JSON object with this structure:
{
  "story": "Your vivid, engaging response to the player (30-50 words)",
  "damage_taken": 0, 
  "healing_received": 0, 
  "xp_gained": 50, 
  "dice_rolls": [{ 
    "type": "attack",
    "result": 15,
    "modifier": 3,
    "total": 18,
    "purpose": "Attack roll against goblin"
  }],
  "location_update": { 
    "current_location": "${currentLocation || 'entrance'}",
    "discovered_locations": ["chamber1"], 
    "room_completed": "entrance" 
  },
  "story_progress": { 
    "current_act": ${currentAct},
    "total_acts": 3,
    "is_climax": ${isClimaxNear},
    "is_ending": ${isEndingNear}
  },
  "quest_update": {
    "id": "main-quest-1",
    "progress": 3,
    "milestone_completed": "milestone-1"
  },
  "npc_reaction": {
    "name": "Elder Arvin",
    "attitude_change": "friendly",
    "information_gained": "location of the ancient ruins"
  },
  "puzzle_solved": {
    "is_solved": true,
    "solution_details": "The player arranged the stones in the correct order"
  },
  "combat_summary": {
    "enemies_defeated": ["goblin scout", "orc warrior"],
    "player_status": "victorious",
    "damage_dealt": 15,
    "damage_taken": 5
  },
  "skill_check": {
    "skill": "perception",
    "success": true,
    "difficulty": 15,
    "narrative_effect": "You notice a hidden door behind the bookshelf"
  },
  "side_quest_suggestion": {
    "title": "The Lost Heirloom",
    "description": "An elderly villager has lost a family heirloom in the nearby woods",
    "difficulty": "easy",
    "reward": "A healing potion and the villager's gratitude",
    "milestones": [
      {"description": "Find clues about the heirloom's location"},
      {"description": "Discover the heirloom in an abandoned cabin"}
    ]
  }
}

CRITICAL RULES:
- Keep story responses SHORT (30-50 words)
- Always end with a choice or question
- Use vivid language appropriate to the selected universe
- Create immediate consequences
- Focus on story, not mechanics
- CRITICAL: DO NOT end the story prematurely! Story should only end when ALL of these conditions are met:
  1. Main quest is fully completed (all milestones)
  2. Player has reached at least level 5
  3. Story has progressed through at least 25 turns
  4. Player has explicitly indicated they want to conclude their adventure
- If story_progress.is_ending is true, work toward a satisfying conclusion but DO NOT end the story unless the above conditions are met
- IMPORTANT: If the player's action directly relates to the current quest milestone, include quest_update with milestone_completed
- Include at least one of: npc_reaction, puzzle_solved, combat_summary, or skill_check when appropriate
- Occasionally suggest side quests (10% chance) when the player is exploring new areas
${this.characterName ? `- End significant moments with a title for ${this.characterName} in the format "[Name], the [Trait] of [Place]"` : ''}

Player Context:
- Level: ${level}
- Items: ${(inventory || []).slice(0, 3).join(', ') || 'none'}
- Current Location: ${currentLocation || 'unknown'}
- Recent Events: ${recentStory || 'Tale begins'}
- Story Length: ${storyLength}/${totalStoryLength} actions
- Universe: ${this.storyPreset?.name || 'Fantasy Adventure'}

Player Action: ${playerInput}`;

    try {
      // Use Supabase Edge Function to call OpenAI
      const response = await fetch(`${this.supabaseUrl}/functions/v1/ai-services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          service: 'openai',
          endpoint: 'chat/completions',
          data: {
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: playerInput }
            ],
            max_tokens: 500,
            temperature: 0.9,
            response_format: { type: "json_object" }
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI API Error:', errorData);
        
        return {
          story: response.status === 401 
            ? 'The mystical energies reject your incantation... Your API key appears to be invalid.'
            : response.status === 429
            ? 'The arcane forces are overwhelmed... Rate limit exceeded. Wait a moment.'
            : 'The spell components seem misaligned... Try a different action.'
        };
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        return { story: 'The storyteller ponders in silence...' };
      }

      try {
        // Parse the JSON response
        const parsedResponse = JSON.parse(content);
        
        // Ensure story field exists
        if (!parsedResponse.story) {
          parsedResponse.story = 'The storyteller gestures, but no words come forth...';
        }
        
        // Add default story progress if missing
        if (!parsedResponse.story_progress) {
          parsedResponse.story_progress = {
            current_act: currentAct,
            total_acts: 3,
            is_climax: isClimaxNear,
            is_ending: isEndingNear
          };
        }
        
        // Check if we should end the story - ENHANCED LOGIC
        const shouldEndStory = 
          // Main quest completion check
          activeQuests?.find(q => q.isMainQuest)?.isCompleted === true &&
          // Level threshold check
          level >= 5 &&
          // Story length check
          storyLength >= 25 &&
          // Story is in ending phase
          parsedResponse.story_progress.is_ending === true &&
          // Story contains ending language
          (parsedResponse.story.includes('conclusion') || 
           parsedResponse.story.includes('the end') || 
           parsedResponse.story.includes('adventure reaches its end'));
        
        if (shouldEndStory) {
          // Add ending indicator to the story
          parsedResponse.story += " [Your adventure reaches its conclusion...]";
          
          // Set story as complete
          parsedResponse.story_complete = true;
        }
        
        return parsedResponse;
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        return { 
          story: content && typeof content === 'string' ? content.substring(0, 200) + '...' : 'The storyteller gestures mysteriously...',
          story_progress: {
            current_act: currentAct,
            total_acts: 3,
            is_climax: isClimaxNear,
            is_ending: isEndingNear
          }
        };
      }
    } catch (error) {
      console.error('OpenAI API Error:', error);
      
      return {
        story: error instanceof TypeError && error.message.includes('fetch')
          ? 'Network interference disrupts the magic... Check your connection.'
          : 'The magical energies waver... Try again.'
      };
    }
  }

  // New method for streaming structured story
  async generateStreamingStructuredStory(
    playerInput: string,
    storyHistory: Array<{type: string, content: string}>,
    inventory: string[],
    level: number,
    xp: number,
    currentLocation?: string,
    exploredAreas?: string[],
    activeQuests?: QuestProgress[],
    onTextChunk: (chunk: string) => void,
    onComplete: (fullResponse: AIGameResponse) => void
  ): Promise<void> {
    // Check if Supabase URL is available
    if (!this.supabaseUrl) {
      const response = {
        story: 'The ancient tome remains sealed... Please configure your Supabase connection to begin your adventure.'
      };
      onTextChunk(response.story);
      onComplete(response);
      return;
    }

    // Get last 3 story entries for context
    const recentStory = storyHistory.slice(-3).map((entry, index) => 
      `${index + 1}. ${entry.type === 'player' ? 'Player' : 'Storyteller'}: ${entry.content}`
    ).join('\n');

    // Calculate story progress
    const storyLength = storyHistory.length;
    const totalStoryLength = 30; // Increased from 20 to prevent premature endings
    const currentAct = storyLength <= 8 ? 1 : storyLength <= 20 ? 2 : 3;
    const isClimaxNear = storyLength >= 22 && storyLength < 26;
    const isEndingNear = storyLength >= 26;

    // Character-centric world building instructions
    const characterContext = this.characterName ? 
      `The world must feel shaped by ${this.characterName}'s bloodline, past choices, or fate. Important characters will recognize ${this.characterName}. Events will reference ${this.characterName}'s legend, even if they don't understand it yet.` : '';

    // Get universe-specific terminology and themes from story preset
    const universeContext = this.storyPreset ? 
      `This adventure takes place in the ${this.storyPreset.name} universe. Use appropriate terminology, locations, and themes from this setting. All names, places, and items should match the style and lore of this universe.` : '';

    // Use story preset if available
    const presetPrompt = this.storyPreset ? this.storyPreset.systemPrompt : '';

    // Get active quest and current milestone information
    let activeQuestContext = '';
    if (activeQuests && activeQuests.length > 0) {
      const mainQuest = activeQuests.find(q => q.isMainQuest && !q.isCompleted);
      const sideQuests = activeQuests.filter(q => !q.isMainQuest && !q.isCompleted);
      
      if (mainQuest) {
        const currentMilestone = mainQuest.milestones[mainQuest.currentMilestoneIndex];
        activeQuestContext = `
ACTIVE MAIN QUEST: "${mainQuest.name}"
Description: ${mainQuest.description}
Current Milestone: ${currentMilestone ? currentMilestone.description : 'None'}
${currentMilestone && currentMilestone.completionHint ? `Hint: ${currentMilestone.completionHint}` : ''}
Progress: ${mainQuest.progress}/${mainQuest.maxProgress}
`;
      }
      
      if (sideQuests.length > 0) {
        const activeSideQuest = sideQuests[0]; // Focus on first active side quest
        const currentSideMilestone = activeSideQuest.milestones && activeSideQuest.currentMilestoneIndex !== undefined ? 
          activeSideQuest.milestones[activeSideQuest.currentMilestoneIndex] : null;
          
        activeQuestContext += `
ACTIVE SIDE QUEST: "${activeSideQuest.title}"
Description: ${activeSideQuest.description}
${currentSideMilestone ? `Current Milestone: ${currentSideMilestone.description}` : ''}
Progress: ${activeSideQuest.progress}/${activeSideQuest.maxProgress}
`;
      }
    }

    // ENHANCED: Structured prompt for better story progression
    const systemPrompt = `${presetPrompt || 'You are a master storyteller at the Tavern of Tales. Create a dynamic, engaging fantasy adventure with clear progression.'}

STORY STRUCTURE (${storyLength}/${totalStoryLength} actions):
- Current Act: ${currentAct}/3
- ${isClimaxNear ? '⚠️ APPROACHING CLIMAX - Build tension!' : ''}
- ${isEndingNear ? '⚠️ APPROACHING ENDING - Work toward resolution!' : ''}

${activeQuestContext}

${characterContext ? `CHARACTER-CENTRIC WORLD BUILDING:
${characterContext}
- Seed locations with names like "The ${this.characterName}'s Ruins" or "The Crown of ${this.characterName}'s Kin"
- Create prophecies that reference ${this.characterName} (e.g., "The Prophecy of the Flame-Eyed One born under ${this.characterName}'s star")
- Name artifacts after ${this.characterName} (e.g., "The Thorn of ${this.characterName}")
- Make enemies obsessed with ${this.characterName} ("So you are ${this.characterName}... at last")
- Treat ${this.characterName} as a destined figure or cursed inheritor
- End significant story beats with titles for ${this.characterName} (e.g., "${this.characterName}, the Flame-Walker of Bonekeep")` : ''}

${universeContext ? `UNIVERSE-SPECIFIC CONTEXT:
${universeContext}
- All names, places, items, and terminology should match the ${this.storyPreset?.name} universe
- NPCs should behave according to the cultural norms of this setting
- Threats and challenges should be appropriate to this universe` : ''}

I need you to respond with a JSON object. The word "json" is mentioned here to enable JSON response format.

Your response must be a valid JSON object with this structure:
{
  "story": "Your vivid, engaging response to the player (30-50 words)",
  "damage_taken": 0, 
  "healing_received": 0, 
  "xp_gained": 50, 
  "dice_rolls": [{ 
    "type": "attack",
    "result": 15,
    "modifier": 3,
    "total": 18,
    "purpose": "Attack roll against goblin"
  }],
  "location_update": { 
    "current_location": "${currentLocation || 'entrance'}",
    "discovered_locations": ["chamber1"], 
    "room_completed": "entrance" 
  },
  "story_progress": { 
    "current_act": ${currentAct},
    "total_acts": 3,
    "is_climax": ${isClimaxNear},
    "is_ending": ${isEndingNear}
  },
  "quest_update": {
    "id": "main-quest-1",
    "progress": 3,
    "milestone_completed": "milestone-1"
  },
  "npc_reaction": {
    "name": "Elder Arvin",
    "attitude_change": "friendly",
    "information_gained": "location of the ancient ruins"
  },
  "puzzle_solved": {
    "is_solved": true,
    "solution_details": "The player arranged the stones in the correct order"
  },
  "combat_summary": {
    "enemies_defeated": ["goblin scout", "orc warrior"],
    "player_status": "victorious",
    "damage_dealt": 15,
    "damage_taken": 5
  },
  "skill_check": {
    "skill": "perception",
    "success": true,
    "difficulty": 15,
    "narrative_effect": "You notice a hidden door behind the bookshelf"
  },
  "side_quest_suggestion": {
    "title": "The Lost Heirloom",
    "description": "An elderly villager has lost a family heirloom in the nearby woods",
    "difficulty": "easy",
    "reward": "A healing potion and the villager's gratitude",
    "milestones": [
      {"description": "Find clues about the heirloom's location"},
      {"description": "Discover the heirloom in an abandoned cabin"}
    ]
  }
}

CRITICAL RULES:
- Keep story responses SHORT (30-50 words)
- Always end with a choice or question
- Use vivid language appropriate to the selected universe
- Create immediate consequences
- Focus on story, not mechanics
- CRITICAL: DO NOT end the story prematurely! Story should only end when ALL of these conditions are met:
  1. Main quest is fully completed (all milestones)
  2. Player has reached at least level 5
  3. Story has progressed through at least 25 turns
  4. Player has explicitly indicated they want to conclude their adventure
- If story_progress.is_ending is true, work toward a satisfying conclusion but DO NOT end the story unless the above conditions are met
- IMPORTANT: If the player's action directly relates to the current quest milestone, include quest_update with milestone_completed
- Include at least one of: npc_reaction, puzzle_solved, combat_summary, or skill_check when appropriate
- Occasionally suggest side quests (10% chance) when the player is exploring new areas
${this.characterName ? `- End significant moments with a title for ${this.characterName} in the format "[Name], the [Trait] of [Place]"` : ''}

Player Context:
- Level: ${level}
- Items: ${(inventory || []).slice(0, 3).join(', ') || 'none'}
- Current Location: ${currentLocation || 'unknown'}
- Recent Events: ${recentStory || 'Tale begins'}
- Story Length: ${storyLength}/${totalStoryLength} actions
- Universe: ${this.storyPreset?.name || 'Fantasy Adventure'}

Player Action: ${playerInput}`;

    try {
      // Use Supabase Edge Function to call OpenAI
      const response = await fetch(`${this.supabaseUrl}/functions/v1/ai-services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          service: 'openai',
          endpoint: 'chat/completions',
          data: {
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: playerInput }
            ],
            max_tokens: 500,
            temperature: 0.9,
            response_format: { type: "json_object" }
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI API Error:', errorData);
        
        const errorResponse = {
          story: response.status === 401 
            ? 'The mystical energies reject your incantation... Your API key appears to be invalid.'
            : response.status === 429
            ? 'The arcane forces are overwhelmed... Rate limit exceeded. Wait a moment.'
            : 'The spell components seem misaligned... Try a different action.'
        };
        
        onTextChunk(errorResponse.story);
        onComplete(errorResponse);
        return;
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        const emptyResponse = { story: 'The storyteller ponders in silence...' };
        onTextChunk(emptyResponse.story);
        onComplete(emptyResponse);
        return;
      }

      try {
        // Parse the JSON response
        const parsedResponse = JSON.parse(content);
        
        // Ensure story field exists
        if (!parsedResponse.story) {
          parsedResponse.story = 'The storyteller gestures, but no words come forth...';
        }
        
        // Add default story progress if missing
        if (!parsedResponse.story_progress) {
          parsedResponse.story_progress = {
            current_act: currentAct,
            total_acts: 3,
            is_climax: isClimaxNear,
            is_ending: isEndingNear
          };
        }
        
        // Check if we should end the story - ENHANCED LOGIC
        const shouldEndStory = 
          // Main quest completion check
          activeQuests?.find(q => q.isMainQuest)?.isCompleted === true &&
          // Level threshold check
          level >= 5 &&
          // Story length check
          storyLength >= 25 &&
          // Story is in ending phase
          parsedResponse.story_progress.is_ending === true &&
          // Story contains ending language
          (parsedResponse.story.includes('conclusion') || 
           parsedResponse.story.includes('the end') || 
           parsedResponse.story.includes('adventure reaches its end'));
        
        if (shouldEndStory) {
          // Add ending indicator to the story
          parsedResponse.story += " [Your adventure reaches its conclusion...]";
          
          // Set story as complete
          parsedResponse.story_complete = true;
        }
        
        // Send the story text to the streaming handler
        onTextChunk(parsedResponse.story);
        
        // Send the complete structured response
        onComplete(parsedResponse);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        const fallbackResponse = { 
          story: content && typeof content === 'string' ? content.substring(0, 200) + '...' : 'The storyteller gestures mysteriously...',
          story_progress: {
            current_act: currentAct,
            total_acts: 3,
            is_climax: isClimaxNear,
            is_ending: isEndingNear
          }
        };
        
        onTextChunk(fallbackResponse.story);
        onComplete(fallbackResponse);
      }
    } catch (error) {
      console.error('OpenAI API Error:', error);
      
      const errorResponse = {
        story: error instanceof TypeError && error.message.includes('fetch')
          ? 'Network interference disrupts the magic... Check your connection.'
          : 'The magical energies waver... Try again.'
      };
      
      onTextChunk(errorResponse.story);
      onComplete(errorResponse);
    }
  }

  async generateScenePrompt(storyText: string): Promise<string> {
    if (!this.supabaseUrl) {
      return 'Medieval fantasy tavern, warm lighting';
    }

    // Include universe context in the prompt
    const universeContext = this.storyPreset 
      ? `This scene is from the ${this.storyPreset.name} universe.` 
      : '';

    const prompt = `Create a safe, visually descriptive, concise, and policy-compliant DALL-E prompt from this fantasy story. Focus on environment, lighting, and atmosphere. Avoid violence, weapons, or controversial content.

Story: ${storyText.slice(0, 200)}

${universeContext}

Safe visual prompt (under 60 characters):`;

    try {
      // Use Supabase Edge Function to call OpenAI
      const response = await fetch(`${this.supabaseUrl}/functions/v1/ai-services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          service: 'openai',
          endpoint: 'chat/completions',
          data: {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 30,
            temperature: 0.5
          }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const scenePrompt = data.choices[0]?.message?.content || 'Medieval fantasy tavern, warm lighting';
      
      // Clean up the prompt and ensure it's concise and safe
      const cleanPrompt = scenePrompt
        .replace(/['"]/g, '')
        .replace(/\b(weapon|sword|blood|violence|death|kill|attack|fight|battle|war)\b/gi, '')
        .trim()
        .slice(0, 60);
      
      return cleanPrompt || 'Medieval fantasy tavern, warm lighting';
    } catch (error) {
      console.error('Scene prompt generation error:', error);
      return 'Medieval fantasy tavern, warm lighting';
    }
  }

  // Generate a legacy title for the character at the end of a session
  async generateLegacyTitle(characterName: string, characterClass: string, storyHistory: Array<{type: string, content: string}>): Promise<string> {
    if (!this.supabaseUrl) {
      return `${characterName}, the Adventurer`;
    }

    // Get the last few story entries for context
    const recentStory = storyHistory.slice(-5).map(entry => entry.content).join("\n");

    // Include universe-specific terminology and themes from story preset
    const universeContext = this.storyPreset ? 
      `This title should match the style and terminology of the ${this.storyPreset.name} universe.` : '';

    const prompt = `Create an epic, memorable title for a fantasy hero who has completed an adventure. The title should follow one of these formats:
1. "[Name], the [Trait] of [Symbolic Place]" (e.g., "Gaeto, the Flame-Walker of Bonekeep")
2. "The [Adjective] [Class] Who [Action]" (e.g., "The Unforgiven Blade Who Burned the Oracle")
3. A legendary quote about the hero (e.g., "They called him a myth. Until the day the forest screamed his name.")

Character: ${characterName}, a level ${characterClass}
Recent adventure: ${recentStory}
${universeContext}

Create a single, epic title or quote (max 10 words):`;

    try {
      // Use Supabase Edge Function to call OpenAI
      const response = await fetch(`${this.supabaseUrl}/functions/v1/ai-services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          service: 'openai',
          endpoint: 'chat/completions',
          data: {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 30,
            temperature: 0.8
          }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const title = data.choices[0]?.message?.content || `${characterName}, the Adventurer`;
      
      return title.replace(/['"]/g, '').trim();
    } catch (error) {
      console.error('Legacy title generation error:', error);
      return `${characterName}, the Adventurer`;
    }
  }

  // Generate Gaeto's random appearance and role
  async generateGaetoOmen(characterName: string): Promise<{
    role: string;
    backstory: string;
    appearance: string;
    relationship: string;
  }> {
    if (!this.supabaseUrl) {
      return {
        role: "Mysterious Wizard",
        backstory: "A powerful mage with unknown intentions who has been watching your progress.",
        appearance: "A tall figure in ornate robes with piercing eyes that seem to look through you.",
        relationship: "He seems to know more about your destiny than you do yourself."
      };
    }

    const prompt = `Create a random appearance and role for a character named Gaeto who will appear in a fantasy adventure. 
Gaeto should be mysterious and powerful, but his exact role should be randomly determined.

Generate a JSON object with these fields:
1. role: Choose ONE random role from ["Ancient Nemesis", "Reluctant Mentor", "Mysterious Observer", "Forgotten Relative", "Rival Spellcaster", "Prophesied Adversary", "Potential Ally", "Collector of Artifacts", "Dimensional Traveler", "Cursed Immortal"]
2. backstory: A brief paragraph explaining Gaeto's history and motivations
3. appearance: A vivid description of how Gaeto looks when first encountered
4. relationship: How Gaeto is connected to the player character ${characterName}

Make the role and relationship UNPREDICTABLE - Gaeto should NOT always be a villain. Sometimes he could be helpful, sometimes neutral, sometimes antagonistic.

Return ONLY the JSON object with these four fields.`;

    try {
      // Use Supabase Edge Function to call OpenAI
      const response = await fetch(`${this.supabaseUrl}/functions/v1/ai-services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          service: 'openai',
          endpoint: 'chat/completions',
          data: {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0.9,
            response_format: { type: "json_object" }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse the JSON response
      const parsedResponse = JSON.parse(content);
      
      return {
        role: parsedResponse.role || "Mysterious Wizard",
        backstory: parsedResponse.backstory || "A powerful mage with unknown intentions who has been watching your progress.",
        appearance: parsedResponse.appearance || "A tall figure in ornate robes with piercing eyes that seem to look through you.",
        relationship: parsedResponse.relationship || "He seems to know more about your destiny than you do yourself."
      };
    } catch (error) {
      console.error('Gaeto omen generation error:', error);
      
      // Return default values if there's an error
      return {
        role: "Mysterious Wizard",
        backstory: "A powerful mage with unknown intentions who has been watching your progress.",
        appearance: "A tall figure in ornate robes with piercing eyes that seem to look through you.",
        relationship: "He seems to know more about your destiny than you do yourself."
      };
    }
  }
}