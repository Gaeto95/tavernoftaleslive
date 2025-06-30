import React from 'react';
import { Eye, EyeOff, Crown, Trash as Treasure, Sword, Shield, MapPin } from 'lucide-react';
import { MapRoom } from '../types/game';

interface MinimapProps {
  mapData: MapRoom[];
  exploredAreas: string[];
  currentLocation: string;
  className?: string;
}

export function Minimap({ mapData, exploredAreas, currentLocation, className = '' }: MinimapProps) {
  // Calculate map bounds for proper scaling
  const bounds = mapData.reduce(
    (acc, room) => ({
      minX: Math.min(acc.minX, room.x),
      maxX: Math.max(acc.maxX, room.x),
      minY: Math.min(acc.minY, room.y),
      maxY: Math.max(acc.maxY, room.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );

  const mapWidth = bounds.maxX - bounds.minX + 1;
  const mapHeight = bounds.maxY - bounds.minY + 1;
  const cellSize = 40; // Size of each room cell in pixels

  const getRoomIcon = (room: MapRoom) => {
    switch (room.type) {
      case 'entrance':
        return <Shield className="w-4 h-4" />;
      case 'boss':
        return <Crown className="w-4 h-4" />;
      case 'treasure':
        return <Treasure className="w-4 h-4" />;
      case 'secret':
        return <Eye className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getRoomColor = (room: MapRoom, isExplored: boolean, isCurrent: boolean) => {
    if (isCurrent) {
      return 'bg-amber-400 border-amber-300 text-black shadow-lg shadow-amber-400/50';
    }
    
    if (!isExplored) {
      return 'bg-gray-800 border-gray-700 text-gray-600';
    }

    switch (room.type) {
      case 'entrance':
        return 'bg-green-600 border-green-500 text-green-100';
      case 'boss':
        return 'bg-red-600 border-red-500 text-red-100';
      case 'treasure':
        return 'bg-yellow-600 border-yellow-500 text-yellow-100';
      case 'secret':
        return 'bg-purple-600 border-purple-500 text-purple-100';
      case 'chamber':
        return 'bg-blue-600 border-blue-500 text-blue-100';
      case 'corridor':
        return 'bg-gray-600 border-gray-500 text-gray-100';
      default:
        return 'bg-amber-600 border-amber-500 text-amber-100';
    }
  };

  const renderConnection = (from: MapRoom, to: MapRoom, isVisible: boolean) => {
    if (!isVisible) return null;

    const fromX = (from.x - bounds.minX) * cellSize + cellSize / 2;
    const fromY = (from.y - bounds.minY) * cellSize + cellSize / 2;
    const toX = (to.x - bounds.minX) * cellSize + cellSize / 2;
    const toY = (to.y - bounds.minY) * cellSize + cellSize / 2;

    return (
      <line
        key={`${from.id}-${to.id}`}
        x1={fromX}
        y1={fromY}
        x2={toX}
        y2={toY}
        stroke="rgba(251, 191, 36, 0.4)"
        strokeWidth="2"
        strokeDasharray={isVisible ? "none" : "4,4"}
      />
    );
  };

  const exploredSet = new Set(exploredAreas);

  return (
    <div className={`minimap-container ${className}`}>
      <div className="parchment-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="fantasy-title text-lg text-amber-300 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Adventure Map
          </h3>
          <div className="text-xs text-amber-400">
            {exploredAreas.length} / {mapData.length} explored
          </div>
        </div>

        <div className="relative bg-gray-900 border border-amber-600/30 rounded-lg p-4 overflow-hidden">
          {/* Fog of War Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-gray-800/60 to-gray-900/80 pointer-events-none" />
          
          {/* Map SVG */}
          <svg
            width={mapWidth * cellSize}
            height={mapHeight * cellSize}
            className="relative z-10"
            style={{ maxWidth: '100%', height: 'auto' }}
          >
            {/* Render connections first (behind rooms) */}
            {mapData.map(room => {
              const isRoomExplored = exploredSet.has(room.id);
              return room.connections.map(connectionId => {
                const connectedRoom = mapData.find(r => r.id === connectionId);
                if (!connectedRoom) return null;
                
                const isConnectionVisible = isRoomExplored && exploredSet.has(connectionId);
                return renderConnection(room, connectedRoom, isConnectionVisible);
              });
            })}
          </svg>

          {/* Render rooms */}
          <div className="absolute inset-4 z-20">
            {mapData.map(room => {
              const isExplored = exploredSet.has(room.id);
              const isCurrent = room.id === currentLocation;
              const x = (room.x - bounds.minX) * cellSize;
              const y = (room.y - bounds.minY) * cellSize;

              return (
                <div
                  key={room.id}
                  className={`absolute border-2 rounded-lg transition-all duration-300 ${getRoomColor(room, isExplored, isCurrent)}`}
                  style={{
                    left: x,
                    top: y,
                    width: cellSize - 4,
                    height: cellSize - 4,
                  }}
                  title={isExplored ? `${room.name}: ${room.description}` : 'Unexplored'}
                >
                  <div className="w-full h-full flex items-center justify-center relative">
                    {/* Fog overlay for unexplored rooms */}
                    {!isExplored && (
                      <div className="absolute inset-0 bg-black/70 rounded flex items-center justify-center">
                        <EyeOff className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                    
                    {/* Current location indicator */}
                    {isCurrent && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-300 border border-amber-200 rounded-full animate-pulse" />
                    )}
                    
                    {/* Room icon */}
                    {isExplored && getRoomIcon(room)}
                    
                    {/* Room completion indicator */}
                    {isExplored && room.isCompleted && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full" />
                    )}
                    
                    {/* Enemy indicator */}
                    {isExplored && room.hasEnemies && !room.isCompleted && (
                      <div className="absolute bottom-0 left-0">
                        <Sword className="w-3 h-3 text-red-400" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="absolute bottom-2 right-2 bg-gray-900/80 border border-amber-600/30 rounded p-2 text-xs text-amber-300 z-30">
            <div className="flex items-center space-x-1 mb-1">
              <div className="w-3 h-3 bg-amber-400 rounded-full" />
              <span>Current</span>
            </div>
            <div className="flex items-center space-x-1">
              <EyeOff className="w-3 h-3 text-gray-500" />
              <span>Unexplored</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}