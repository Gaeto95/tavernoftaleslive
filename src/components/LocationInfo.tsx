import React from 'react';
import { MapPin, Compass, ArrowRight, Sword, Trash as Treasure } from 'lucide-react';
import { MapRoom } from '../types/game';

interface LocationInfoProps {
  currentRoom: MapRoom | undefined;
  connectedRooms: MapRoom[];
  unexploredConnections: number;
  onMoveToRoom?: (roomId: string) => void;
}

export function LocationInfo({ 
  currentRoom, 
  connectedRooms, 
  unexploredConnections,
  onMoveToRoom
}: LocationInfoProps) {
  if (!currentRoom) return null;

  const getDirectionText = (fromRoom: MapRoom, toRoom: MapRoom): string => {
    if (toRoom.x > fromRoom.x) return 'east';
    if (toRoom.x < fromRoom.x) return 'west';
    if (toRoom.y > fromRoom.y) return 'south';
    if (toRoom.y < fromRoom.y) return 'north';
    return 'unknown';
  };

  const getRoomTypeIcon = (room: MapRoom) => {
    switch (room.type) {
      case 'entrance': return <Compass className="w-3 h-3 text-green-400" />;
      case 'treasure': return <Treasure className="w-3 h-3 text-yellow-400" />;
      case 'boss': return <Sword className="w-3 h-3 text-red-400" />;
      default: return <MapPin className="w-3 h-3 text-amber-400" />;
    }
  };

  return (
    <div className="parchment-panel p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {getRoomTypeIcon(currentRoom)}
          <h3 className="fantasy-title text-base text-amber-300">{currentRoom.name}</h3>
        </div>
        {currentRoom.isCompleted && (
          <div className="px-2 py-0.5 bg-green-600/20 border border-green-500 rounded-full text-green-400 text-xs">
            Cleared
          </div>
        )}
      </div>
      
      <p className="text-amber-200 text-xs mb-3">{currentRoom.description}</p>
      
      {/* Visible Exits */}
      {(connectedRooms.length > 0 || unexploredConnections > 0) && (
        <div className="mt-2">
          <div className="text-xs text-amber-300 mb-1 font-medium">Visible Exits:</div>
          <div className="space-y-1">
            {connectedRooms.map(room => (
              <div 
                key={room.id} 
                className="flex items-center justify-between p-1.5 bg-amber-900/20 border border-amber-600/30 rounded-lg hover:bg-amber-900/30 transition-colors"
                onClick={() => onMoveToRoom && onMoveToRoom(room.id)}
              >
                <div className="flex items-center space-x-1">
                  {getRoomTypeIcon(room)}
                  <span className="text-amber-200 text-xs">{room.name}</span>
                </div>
                <div className="flex items-center text-amber-400 text-xs">
                  <span className="capitalize">{getDirectionText(currentRoom, room)}</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </div>
            ))}
            
            {unexploredConnections > 0 && (
              <div className="p-1.5 bg-gray-800/50 border border-gray-600/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-300 text-xs">Unexplored Passages</span>
                  </div>
                  <span className="text-gray-400 text-xs">{unexploredConnections} {unexploredConnections === 1 ? 'path' : 'paths'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Room Status */}
      <div className="mt-3 pt-2 border-t border-amber-600/30 flex justify-between text-xs text-amber-400">
        <div>
          {currentRoom.hasEnemies && !currentRoom.isCompleted && (
            <div className="flex items-center text-red-400">
              <Sword className="w-3 h-3 mr-1" />
              <span className="text-xs">Enemies present</span>
            </div>
          )}
          {currentRoom.hasTreasure && !currentRoom.isCompleted && (
            <div className="flex items-center text-yellow-400">
              <Treasure className="w-3 h-3 mr-1" />
              <span className="text-xs">Treasure awaits</span>
            </div>
          )}
        </div>
        <div className="text-xs">
          Explored {connectedRooms.length} of {currentRoom.connections.length} exits
        </div>
      </div>
    </div>
  );
}