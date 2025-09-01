// server.js
const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*" // Allow connections from any origin (for testing)
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

const players = {};
const rooms = {};
const roomCodes = {}; // For easy lookup by code

// Generate a random room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

io.on('connection', (socket) => {
  console.log('A player connected:', socket.id);
  
  // Handle room creation
  socket.on('createRoom', (data) => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      id: roomCode,
      host: socket.id,
      players: [socket.id],
      gameState: 'waiting', // waiting, playing, finished
      maxPlayers: data.maxPlayers || 4,
      settings: data.settings || {}
    };
    
    roomCodes[roomCode] = roomCode;
    
    // Add player to the room
    players[socket.id] = {
      id: socket.id,
      x: Math.floor(Math.random() * 400),
      y: Math.floor(Math.random() * 400),
      color: getRandomColor(),
      room: roomCode,
      name: data.playerName || `Player${Object.keys(players).length + 1}`
    };
    
    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode, room: rooms[roomCode] });
    
    console.log(`Room created: ${roomCode} by ${socket.id}`);
  });
  
  // Handle joining a room
  socket.on('joinRoom', (data) => {
    const roomCode = data.roomCode.toUpperCase();
    const room = rooms[roomCode];
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (room.players.length >= room.maxPlayers) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }
    
    if (room.gameState !== 'waiting') {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }
    
    // Add player to the room
    room.players.push(socket.id);
    players[socket.id] = {
      id: socket.id,
      x: Math.floor(Math.random() * 400),
      y: Math.floor(Math.random() * 400),
      color: getRandomColor(),
      room: roomCode,
      name: data.playerName || `Player${Object.keys(players).length + 1}`
    };
    
    socket.join(roomCode);
    
    // Notify room host and other players
    io.to(roomCode).emit('playerJoined', {
      player: players[socket.id],
      room: room
    });
    
    // Send current players to the new player
    const roomPlayers = {};
    room.players.forEach(playerId => {
      if (players[playerId]) {
        roomPlayers[playerId] = players[playerId];
      }
    });
    
    socket.emit('currentPlayers', roomPlayers);
    
    console.log(`Player ${socket.id} joined room ${roomCode}`);
  });
  
  // Handle starting the game
  socket.on('startGame', () => {
    const player = players[socket.id];
    if (!player) return;
    
    const room = rooms[player.room];
    if (!room || room.host !== socket.id) return;
    
    room.gameState = 'playing';
    io.to(room.id).emit('gameStarted', room);
  });
  
  // Handle player movement
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      
      // Only broadcast to players in the same room
      const playerRoom = players[socket.id].room;
      if (playerRoom) {
        socket.to(playerRoom).emit('playerMoved', { 
          id: socket.id, 
          x: movementData.x, 
          y: movementData.y 
        });
      }
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    const player = players[socket.id];
    if (player && player.room) {
      const room = rooms[player.room];
      if (room) {
        // Remove player from room
        room.players = room.players.filter(id => id !== socket.id);
        
        // If room is empty, delete it
        if (room.players.length === 0) {
          delete rooms[room.id];
          delete roomCodes[room.id];
          console.log(`Room ${room.id} deleted (empty)`);
        } 
        // If host left, assign new host
        else if (room.host === socket.id) {
          room.host = room.players[0];
          io.to(room.id).emit('newHost', { hostId: room.host });
        }
        
        // Notify other players
        io.to(room.id).emit('playerDisconnected', socket.id);
      }
    }
    
    delete players[socket.id];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
