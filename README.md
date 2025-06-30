# Tavern of Tales

![Tavern of Tales](https://images.pexels.com/photos/6507483/pexels-photo-6507483.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1)

An immersive fantasy adventure game powered by AI, where players can embark on solo quests or join multiplayer sessions for collaborative storytelling.

## 📖 Project Overview

Tavern of Tales is an interactive storytelling platform that combines the creativity of tabletop role-playing games with the power of AI. Players can create unique characters, embark on adventures, and make choices that shape their narrative journey. The game features both solo play with an AI Dungeon Master and multiplayer sessions where friends can collaborate on shared stories.

### Key Features

- **Solo Adventure Mode**: Embark on a personalized adventure with an AI Dungeon Master
- **Multiplayer Sessions**: Join or host shared storytelling experiences with friends
- **Character Creation**: Build unique characters with different classes, backgrounds, and abilities
- **Dynamic Storytelling**: AI-generated narratives that adapt to player choices
- **Voice Narration**: Immersive audio narration of the story
- **Scene Visualization**: AI-generated imagery to bring your adventure to life
- **Quest System**: Main quests and side quests with milestones and rewards
- **Inventory Management**: Collect and use items throughout your journey
- **Combat System**: Turn-based combat with dice rolls and character abilities
- **World Memory**: The game remembers your choices and their consequences

### Technology Stack

- **Frontend**: React 18.3 with TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI Services**: OpenAI (GPT and DALL-E) via Supabase Edge Functions
- **Voice Synthesis**: ElevenLabs via Supabase Edge Functions
- **Real-time Features**: Supabase Realtime for multiplayer

### System Requirements

- Node.js 18.x or higher
- npm 9.x or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Supabase account
- OpenAI API key (stored in Supabase)
- ElevenLabs API key (stored in Supabase)

## 🚀 Installation & Setup

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/tavern-of-tales.git
   cd tavern-of-tales
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Connect to Supabase:
   - Click the "Connect to Supabase" button in your development environment
   - Or manually set up your Supabase connection by creating a `.env` file with:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Supabase Configuration

1. Set up the following environment variables in your Supabase project:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `ELEVENLABS_API_KEY`: Your ElevenLabs API key

2. Deploy the Edge Functions to your Supabase project:
   - The `ai-services` function handles secure communication with OpenAI and ElevenLabs

3. Run the database migrations to set up the required tables and functions:
   - All migrations are located in the `supabase/migrations` directory

## 🎮 Core Functionality

### Character System

The character system allows players to create and manage their in-game avatars:

```typescript
// Character creation example
const character = {
  id: crypto.randomUUID(),
  name: "Elyndra",
  class: {
    id: "wizard",
    name: "Wizard",
    // ... other class properties
  },
  level: 1,
  stats: {
    strength: 8,
    dexterity: 14,
    constitution: 12,
    intelligence: 16,
    wisdom: 13,
    charisma: 10
  },
  // ... other character properties
};
```

Characters have:
- Basic attributes (name, class, level)
- Ability scores (strength, dexterity, etc.)
- Inventory items and equipment
- Spells and abilities
- Experience points and progression

### Story Generation

The AI storytelling system uses OpenAI's GPT models to generate dynamic narratives:

```typescript
// Example story generation request
const aiResponse = await openaiService.generateStructuredStory(
  playerInput,
  storyContext,
  inventory,
  character.level,
  character.experience,
  currentLocation,
  exploredAreas,
  activeQuests
);
```

The story generation includes:
- Context-aware responses based on player actions
- Structured data for game mechanics (damage, healing, items, etc.)
- Quest updates and progression
- NPC interactions and world building

### Multiplayer System

The multiplayer system uses Supabase Realtime for synchronous gameplay:

```typescript
// Example session creation
const sessionId = await createSession({
  name: "The Forgotten Ruins",
  description: "An adventure into ancient ruins filled with treasure and danger",
  maxPlayers: 4,
  isPublic: true,
  sessionSettings: {
    turn_time_limit: 5,
    auto_advance_turns: false,
    voice_enabled: true
  }
});
```

Key multiplayer features:
- Session creation and management
- Player joining and character selection
- Turn-based gameplay with action submission
- Real-time chat between players
- Host controls for game progression

## 🔄 Session Management Improvements

### Robust Connection Handling

We've implemented a comprehensive connection management system to ensure multiplayer sessions remain stable:

- **Automatic Reconnection**: The system now automatically attempts to reconnect when a connection is lost, with exponential backoff for retry attempts.
- **Connection Status Indicators**: Visual indicators show players when they're disconnected and when the connection is restored.
- **Manual Reconnection**: Players can manually trigger reconnection attempts if automatic reconnection fails.
- **Graceful Disconnection**: When players leave a session, proper cleanup is performed to avoid orphaned sessions.

### Session Cleanup System

A multi-layered session cleanup system prevents "ghost" sessions and ensures database health:

- **Automatic Session Timeout**: Sessions with no activity for 24 hours are automatically marked as inactive.
- **Orphaned Session Cleanup**: Sessions with no players are automatically cleaned up.
- **User Session Cleanup**: When a user logs out, all their active sessions are properly cleaned up.
- **Cleanup Queue**: A dedicated cleanup queue manages session cleanup with appropriate timing.

### Database Optimizations

Several database optimizations have been implemented to improve performance:

- **Indexed Queries**: Critical fields used in session filtering and lookup are now properly indexed.
- **Efficient JSON Storage**: Character data is stored efficiently using PostgreSQL's JSONB type with GIN indexes.
- **Cascade Deletions**: Foreign key relationships ensure proper cleanup of related data.
- **Connection Pooling**: Database connections are properly managed to prevent connection leaks.

### Real-time Synchronization

The real-time synchronization system has been enhanced:

- **Subscription Management**: Better management of Supabase Realtime subscriptions to prevent memory leaks.
- **Optimistic Updates**: UI updates optimistically while waiting for server confirmation.
- **Conflict Resolution**: Proper handling of conflicts when multiple users update the same data.
- **Throttled Updates**: Frequent updates are throttled to prevent overwhelming the database.

### Chat System Improvements

The multiplayer chat system has been enhanced:

- **Character-based Chat**: Players can now chat as their characters, with character names displayed.
- **Robust Error Handling**: Better error handling for chat message loading and sending.
- **Message Validation**: Improved validation of chat messages to prevent UI errors.
- **Timestamp Formatting**: Better handling of message timestamps with fallbacks for invalid dates.

### Session Lifecycle Management

The session lifecycle is now properly managed:

- **Session Creation**: Improved session creation with proper error handling.
- **Session Joining**: Enhanced session joining process with character selection.
- **Session Leaving**: Proper cleanup when leaving a session.
- **Session Termination**: Automatic termination of sessions when conditions are met.

### Database Functions and Triggers

Several database functions and triggers have been implemented:

- **cleanup_old_chat_messages**: Removes chat messages older than a specified threshold.
- **cleanup_orphaned_sessions**: Identifies and cleans up sessions with no players.
- **cleanup_user_sessions**: Removes a user from all their active sessions.
- **has_active_players**: Checks if a session has any active players.
- **run_session_cleanup**: Runs all cleanup operations in sequence.
- **update_session_last_activity**: Updates the last activity timestamp for a session.
- **auto_cleanup_trigger**: Automatically runs cleanup operations on certain database events.

### Admin Dashboard

A comprehensive admin dashboard has been added for system management:

- **User Management**: View, edit, and manage user accounts.
- **Session Management**: Monitor and control game sessions.
- **Character Management**: View and edit character data.
- **System Maintenance**: Run cleanup operations and monitor system health.
- **Role-based Access**: Admin privileges are managed through a dedicated admin_users table.

### Voice and Image Generation

The voice and image generation systems have been improved:

- **Voice Narration**: Uses ElevenLabs to convert story text to speech.
- **Scene Visualization**: Uses DALL-E to generate images based on the story.
- **Fallback Mechanisms**: Proper fallbacks when API calls fail.
- **Caching**: Efficient caching of generated content to reduce API calls.

## 🧪 Testing

### Manual Testing

1. **Character Creation**: Test creating characters with different classes and attributes
2. **Solo Adventure**: Test the solo adventure mode with various player actions
3. **Multiplayer**: Test session creation, joining, and turn-based gameplay
4. **Voice and Images**: Test the generation and playback of voice and images

### Automated Testing

Future implementation will include:
- Unit tests for utility functions and services
- Component tests for UI elements
- Integration tests for key user flows

## 📊 Project Status

### Completed Features

- ✅ Character creation and management
- ✅ Solo adventure mode with AI storytelling
- ✅ Multiplayer session creation and joining
- ✅ Turn-based gameplay in multiplayer
- ✅ Voice narration of story content
- ✅ Scene visualization with AI-generated images
- ✅ Quest system with main and side quests
- ✅ Inventory and item management
- ✅ Supabase Edge Functions for API services
- ✅ Robust session management and cleanup
- ✅ Connection handling with automatic reconnection
- ✅ Character-based chat in multiplayer
- ✅ Admin dashboard for system management

### In Progress

- 🔄 Improved error handling for API failures
- 🔄 Enhanced multiplayer loading experience
- 🔄 Mobile-responsive design improvements
- 🔄 Character progression in multiplayer

### Planned Features

- 📝 Session password protection
- 📝 Voice chat for multiplayer
- 📝 Custom adventure templates
- 📝 Combat initiative system
- 📝 Spell management interface
- 📝 Character marketplace
- 📝 Adventure sharing and rating

### Known Issues

- ⚠️ Character models appear in T-pose during character creation and in the 3D lobby (partially fixed but still needs work)
- ⚠️ First-person movement and controls not fully optimized yet
- ⚠️ Single player game progression sometimes doesn't track quest milestones correctly
- ⚠️ Issues with random story cards and dice roll mechanics
- ⚠️ Players sometimes get kicked out of multiplayer sessions after each turn
- ⚠️ Occasional timeout errors with OpenAI API
- ⚠️ Voice playback issues on some devices
- ⚠️ Session synchronization delays in multiplayer
- ⚠️ Character data not always properly saved to Supabase
- ✅ Multiplayer chat component error in the lobby interface - FIXED by improving error handling and data validation
- ✅ Duplicate character creation interfaces - FIXED by consolidating to just the 3D version
- ✅ Character creation flow showing multiple buttons - FIXED by implementing a proper multi-step flow
- ✅ Multiplayer session joining occasionally fails - FIXED with improved error handling and reconnection logic
- ✅ RLS policy issues causing infinite recursion - FIXED by optimizing database queries
- ✅ Session player visibility problems - FIXED with better real-time synchronization
- ✅ "Ghost" sessions remaining active - FIXED with comprehensive session cleanup system

## 🔧 Maintenance & Troubleshooting

### Common Issues

#### API Key Issues

**Problem**: "The ancient tome remains sealed..." message appears.

**Solution**: 
1. Verify that your Supabase project has the correct environment variables set:
   - `OPENAI_API_KEY`
   - `ELEVENLABS_API_KEY`
2. Ensure the Edge Function is properly deployed
3. Check that your Supabase URL and anon key are correctly configured

#### Voice Playback Issues

**Problem**: Voice narration doesn't play automatically.

**Solution**:
1. Ensure the user has interacted with the page (browser requirement)
2. Check browser console for autoplay policy errors
3. Use the manual play button as a fallback

#### Multiplayer Synchronization

**Problem**: Players don't see updates in real-time.

**Solution**:
1. Check connection status indicator for network issues
2. Use the manual reconnect button if available
3. Refresh the page as a last resort

#### Connection Lost

**Problem**: "Connection lost" message appears during gameplay.

**Solution**:
1. Check your internet connection
2. Wait for automatic reconnection (5 attempts will be made)
3. Use the manual reconnect button
4. If all else fails, refresh the page

#### Session Cleanup

**Problem**: Sessions remain active after players leave.

**Solution**:
1. The system now automatically cleans up orphaned sessions
2. Sessions with no activity for 24 hours are marked as inactive
3. When users log out, all their sessions are properly cleaned up

### Performance Optimization

- Use pagination for large data sets (story history, inventory)
- Implement memoization for expensive computations
- Optimize image loading with proper sizing and lazy loading
- Use debouncing for user input to reduce API calls

### Debugging Tips

1. Enable verbose logging in development:
   ```typescript
   const logger = {
     debug: (message, data) => {
       if (process.env.NODE_ENV === 'development') {
         console.log(`[DEBUG] ${message}`, data);
       }
     }
   };
   ```

2. Use browser developer tools to:
   - Monitor network requests to Supabase
   - Check for errors in the console
   - Inspect React component state with React DevTools

3. Test Edge Functions locally using the Supabase CLI:
   ```bash
   supabase functions serve ai-services --env-file .env.local
   ```

## 🤝 Contributing

Contributions to Tavern of Tales are welcome! Here's how you can contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Contribution Guidelines

- Follow the existing code style and conventions
- Write clear commit messages
- Update documentation for any new features
- Add comments for complex logic
- Test your changes thoroughly

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Contact

For questions or support, please open an issue on the GitHub repository or contact the project maintainers.

---

## To-Do List

- [x] Implement Supabase Edge Functions for API services
  - [x] Create ai-services edge function
  - [x] Update service classes to use edge functions
  - [x] Add error handling and retries

- [x] Fix multiplayer experience
  - [x] Improve loading overlay with progress indicators
  - [x] Ensure consistent loading UI between host and players
  - [x] Add session reconnection logic
  - [x] Implement turn timeout handling
  - [x] Fix MultiplayerChat component error in lobby interface

- [ ] Enhance security
  - [ ] Add session password protection
  - [ ] Implement rate limiting for API calls
  - [ ] Add input validation and sanitization

- [ ] Improve user experience
  - [ ] Create mobile-responsive design
  - [ ] Add tutorial for new players
  - [ ] Implement accessibility features
  - [ ] Add sound effects for actions

- [ ] Expand game features
  - [ ] Add character leveling in multiplayer
  - [ ] Implement spell management interface
  - [ ] Create combat initiative system
  - [ ] Add custom adventure templates

- [ ] Technical improvements
  - [ ] Set up automated testing
  - [ ] Implement CI/CD pipeline
  - [x] Optimize database queries
  - [x] Add performance monitoring

## Recent Development Updates

### Enhanced Storytelling and Character Progression

We've recently implemented several major improvements to the game:

1. **Gaeto Random Introduction System**
   - Added a 10% chance for Gaeto to appear after player actions
   - Gaeto can take various roles: villain, mentor, rival, or ally
   - Each appearance has randomly generated backstory, appearance, and relationship to the player
   - Adds unpredictability and recurring character to the narrative

2. **Improved Story Pacing**
   - Extended story arc from 20 to 30 steps for more satisfying adventures
   - Better act structure with clearer progression through beginning, middle, and end
   - Enhanced ending conditions requiring level 5+, 25+ turns, AND main quest completion
   - Prevents premature story conclusions

3. **Level Up Experience**
   - Added beautiful level up modal showing stat increases and new abilities
   - Visual celebration of character progression
   - Clear explanation of new powers and abilities

4. **Story Rerolling**
   - Players can now reroll AI responses they don't like
   - Gives players more control over narrative direction
   - Helps avoid nonsensical or repetitive responses

5. **Notification System**
   - Visual feedback for important events like XP gain, item discovery, and quest updates
   - Enhances player awareness of game state changes
   - Improves overall user experience

6. **Streaming Text Responses**
   - Text now appears gradually for more engaging storytelling
   - Creates anticipation and improves immersion
   - Reduces perceived waiting time

### Multiplayer Session Management Improvements

We've made significant improvements to the multiplayer session management system:

1. **Robust Connection Handling**
   - Automatic reconnection with exponential backoff
   - Visual connection status indicators
   - Manual reconnection option
   - Graceful handling of network interruptions

2. **Session Cleanup System**
   - Automatic cleanup of inactive sessions
   - Removal of orphaned sessions with no players
   - Proper user session management on logout
   - Database triggers for efficient cleanup

3. **Real-time Synchronization**
   - Improved subscription management
   - Better handling of real-time updates
   - Optimistic UI updates
   - Conflict resolution for concurrent changes

4. **Chat System Enhancements**
   - Character-based chat with character names
   - Better error handling and validation
   - Improved message formatting
   - Proper timestamp handling

5. **Database Optimizations**
   - Indexed queries for better performance
   - Efficient JSON storage with GIN indexes
   - Proper cascade deletions
   - Connection pooling

6. **Admin Dashboard**
   - Comprehensive admin interface for system management
   - User management with admin role assignment
   - Session monitoring and control
   - Character management and editing
   - System maintenance tools and cleanup operations

These improvements create a more stable, responsive, and user-friendly multiplayer experience while reducing server load and preventing data inconsistencies.

<div style="position: fixed; bottom: 4px; right: 4px; z-index: 100;">
  <a href="https://bolt.new" target="_blank" rel="noopener noreferrer">
    <img src="/bolt-badge.png" alt="Built with Bolt" width="72" height="72" />
  </a>
</div>