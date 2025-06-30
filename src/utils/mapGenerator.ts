// Simple dungeon map generator utility
import { MapRoom } from '../types/game';

/**
 * Generates a procedural dungeon map with the specified number of rooms
 * @param roomCount Number of rooms to generate (default: 10)
 * @param mapWidth Width of the map grid (default: 5)
 * @param mapHeight Height of the map grid (default: 5)
 * @returns Array of MapRoom objects representing the dungeon
 */
export function generateDungeonMap(
  roomCount: number = 10,
  mapWidth: number = 5,
  mapHeight: number = 5
): MapRoom[] {
  // Initialize map grid
  const grid: (MapRoom | null)[][] = Array(mapHeight)
    .fill(null)
    .map(() => Array(mapWidth).fill(null));
  
  // Room types for variety
  const roomTypes: Array<'entrance' | 'chamber' | 'corridor' | 'treasure' | 'boss' | 'exit' | 'secret'> = [
    'entrance', 'chamber', 'chamber', 'chamber', 'corridor', 'corridor', 
    'treasure', 'treasure', 'boss', 'exit', 'secret'
  ];
  
  // Room name prefixes and suffixes for variety
  const roomPrefixes = [
    'Ancient', 'Dark', 'Forgotten', 'Haunted', 'Mysterious', 'Ruined', 
    'Shadowy', 'Crumbling', 'Echoing', 'Glowing', 'Damp', 'Mossy'
  ];
  
  const roomSuffixes = {
    entrance: ['Gateway', 'Entrance', 'Doorway', 'Portal', 'Threshold'],
    chamber: ['Chamber', 'Hall', 'Room', 'Cavern', 'Vault', 'Sanctum'],
    corridor: ['Corridor', 'Passage', 'Hallway', 'Tunnel', 'Path'],
    treasure: ['Treasury', 'Vault', 'Hoard', 'Cache', 'Storeroom'],
    boss: ['Throne Room', 'Lair', 'Den', 'Sanctum', 'Arena'],
    exit: ['Exit', 'Escape', 'Passage', 'Gateway', 'Door'],
    secret: ['Hideaway', 'Alcove', 'Nook', 'Recess', 'Chamber']
  };
  
  // Room descriptions for flavor
  const roomDescriptions = {
    entrance: [
      'A grand archway marks the entrance to this ancient place.',
      'Cool air flows from this opening, carrying the scent of dust and time.',
      'Faded runes surround this weathered entrance.',
      'The entrance is partially collapsed, but passable.'
    ],
    chamber: [
      'A spacious room with high ceilings and echoing walls.',
      'This chamber bears signs of past habitation.',
      'Dust motes dance in beams of light filtering from above.',
      'The walls are covered in strange, faded murals.'
    ],
    corridor: [
      'A narrow passage connecting larger chambers.',
      'This winding corridor is lined with alcoves.',
      'The low ceiling makes this passage feel claustrophobic.',
      'Sconces line the walls of this straight corridor.'
    ],
    treasure: [
      'Glints of metal catch your eye in this room.',
      'This chamber seems designed to house valuables.',
      'Ancient chests and containers line the walls.',
      'The air here smells of metal and magic.'
    ],
    boss: [
      'This imposing chamber radiates an aura of danger.',
      'A massive throne dominates this grand hall.',
      'Strange symbols are carved into every surface of this room.',
      'The floor is stained with what might be old blood.'
    ],
    exit: [
      'Fresher air flows through this passage, suggesting an exit nearby.',
      'Light from the outside world filters through cracks here.',
      'This area seems to lead toward freedom.',
      'The path slopes upward toward daylight.'
    ],
    secret: [
      'This hidden chamber seems undisturbed for centuries.',
      'The air is still and heavy with secrets in this concealed room.',
      'Few have ever set eyes on this hidden place.',
      'This secret area contains unusual features.'
    ]
  };
  
  // Place entrance at a random edge
  const entranceSide = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
  let entranceX, entranceY;
  
  switch (entranceSide) {
    case 0: // top
      entranceX = Math.floor(Math.random() * mapWidth);
      entranceY = 0;
      break;
    case 1: // right
      entranceX = mapWidth - 1;
      entranceY = Math.floor(Math.random() * mapHeight);
      break;
    case 2: // bottom
      entranceX = Math.floor(Math.random() * mapWidth);
      entranceY = mapHeight - 1;
      break;
    case 3: // left
      entranceX = 0;
      entranceY = Math.floor(Math.random() * mapHeight);
      break;
    default:
      entranceX = 0;
      entranceY = 0;
  }
  
  // Create entrance room
  const entranceRoom: MapRoom = {
    id: 'entrance',
    name: `${getRandomItem(roomPrefixes)} ${getRandomItem(roomSuffixes.entrance)}`,
    description: getRandomItem(roomDescriptions.entrance),
    x: entranceX,
    y: entranceY,
    type: 'entrance',
    connections: [],
    hasEnemies: Math.random() < 0.2, // 20% chance of enemies at entrance
    hasTreasure: Math.random() < 0.1, // 10% chance of treasure at entrance
  };
  
  grid[entranceY][entranceX] = entranceRoom;
  
  // Generate remaining rooms
  const rooms: MapRoom[] = [entranceRoom];
  let currentRoomCount = 1;
  
  // Keep track of available positions adjacent to existing rooms
  let availablePositions: Array<{x: number, y: number, parentId: string}> = getAdjacentEmptyPositions(grid, entranceX, entranceY, entranceRoom.id);
  
  // Place remaining rooms
  while (currentRoomCount < roomCount && availablePositions.length > 0) {
    // Select a random available position
    const posIndex = Math.floor(Math.random() * availablePositions.length);
    const position = availablePositions[posIndex];
    
    // Determine room type
    let roomType: 'entrance' | 'chamber' | 'corridor' | 'treasure' | 'boss' | 'exit' | 'secret';
    
    if (currentRoomCount === roomCount - 1) {
      // Last room is always boss or exit
      roomType = Math.random() < 0.7 ? 'boss' : 'exit';
    } else if (currentRoomCount === roomCount - 2) {
      // Second-to-last room has high chance of treasure
      roomType = Math.random() < 0.6 ? 'treasure' : getRandomItem(roomTypes);
    } else {
      // Random room type for others
      roomType = getRandomItem(roomTypes.filter(t => t !== 'entrance' && t !== 'exit'));
      
      // Ensure we don't have too many special rooms
      const specialRooms = rooms.filter(r => r.type === 'boss' || r.type === 'treasure' || r.type === 'secret').length;
      if ((specialRooms / currentRoomCount) > 0.3 && (roomType === 'boss' || roomType === 'treasure' || roomType === 'secret')) {
        roomType = Math.random() < 0.7 ? 'chamber' : 'corridor';
      }
    }
    
    // Create the room
    const roomId = `room-${currentRoomCount}`;
    const newRoom: MapRoom = {
      id: roomId,
      name: `${getRandomItem(roomPrefixes)} ${getRandomItem(roomSuffixes[roomType])}`,
      description: getRandomItem(roomDescriptions[roomType]),
      x: position.x,
      y: position.y,
      type: roomType,
      connections: [position.parentId], // Connect to parent room
      hasEnemies: roomType === 'boss' ? true : Math.random() < 0.4, // 40% chance of enemies, always in boss rooms
      hasTreasure: roomType === 'treasure' ? true : Math.random() < 0.3, // 30% chance of treasure, always in treasure rooms
    };
    
    // Add room to grid and list
    grid[position.y][position.x] = newRoom;
    rooms.push(newRoom);
    
    // Connect parent room to this room
    const parentRoom = rooms.find(r => r.id === position.parentId);
    if (parentRoom) {
      parentRoom.connections.push(roomId);
    }
    
    // Update available positions
    availablePositions.splice(posIndex, 1);
    const newPositions = getAdjacentEmptyPositions(grid, position.x, position.y, roomId);
    availablePositions = [...availablePositions, ...newPositions];
    
    currentRoomCount++;
  }
  
  // Add some additional connections for more interesting paths (loops)
  addAdditionalConnections(rooms, grid);
  
  return rooms;
}

// Helper function to get a random item from an array
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to get adjacent empty positions
function getAdjacentEmptyPositions(
  grid: (MapRoom | null)[][],
  x: number,
  y: number,
  parentId: string
): Array<{x: number, y: number, parentId: string}> {
  const positions: Array<{x: number, y: number, parentId: string}> = [];
  const directions = [
    {dx: 0, dy: -1}, // up
    {dx: 1, dy: 0},  // right
    {dx: 0, dy: 1},  // down
    {dx: -1, dy: 0}  // left
  ];
  
  for (const dir of directions) {
    const newX = x + dir.dx;
    const newY = y + dir.dy;
    
    // Check if position is within grid bounds
    if (newX >= 0 && newX < grid[0].length && newY >= 0 && newY < grid.length) {
      // Check if position is empty
      if (grid[newY][newX] === null) {
        positions.push({x: newX, y: newY, parentId});
      }
    }
  }
  
  return positions;
}

// Helper function to add additional connections between rooms
function addAdditionalConnections(rooms: MapRoom[], grid: (MapRoom | null)[][]) {
  // Add a few extra connections to create loops
  const extraConnectionCount = Math.floor(rooms.length * 0.2); // About 20% extra connections
  
  for (let i = 0; i < extraConnectionCount; i++) {
    // Pick a random room
    const roomA = getRandomItem(rooms);
    
    // Find adjacent rooms that aren't already connected
    const adjacentRooms = getAdjacentRooms(roomA, grid);
    const unconnectedAdjacent = adjacentRooms.filter(roomB => 
      !roomA.connections.includes(roomB.id) && !roomB.connections.includes(roomA.id)
    );
    
    if (unconnectedAdjacent.length > 0) {
      // Connect to a random adjacent room
      const roomB = getRandomItem(unconnectedAdjacent);
      roomA.connections.push(roomB.id);
      roomB.connections.push(roomA.id);
    }
  }
}

// Helper function to get adjacent rooms
function getAdjacentRooms(room: MapRoom, grid: (MapRoom | null)[][]): MapRoom[] {
  const adjacentRooms: MapRoom[] = [];
  const directions = [
    {dx: 0, dy: -1}, // up
    {dx: 1, dy: 0},  // right
    {dx: 0, dy: 1},  // down
    {dx: -1, dy: 0}  // left
  ];
  
  for (const dir of directions) {
    const newX = room.x + dir.dx;
    const newY = room.y + dir.dy;
    
    // Check if position is within grid bounds
    if (newX >= 0 && newX < grid[0].length && newY >= 0 && newY < grid.length) {
      const adjacentRoom = grid[newY][newX];
      if (adjacentRoom !== null && adjacentRoom.id !== room.id) {
        adjacentRooms.push(adjacentRoom);
      }
    }
  }
  
  return adjacentRooms;
}