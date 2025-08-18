const express = require('express');
const socketio = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*" // Allow connections from any origin (for testing)
  }
});

const players = {};

io.on('connection', (socket) => {
  console.log('A player connected:', socket.id);
  
  // Add new player to the game
  players[socket.id] = {
    x: 0,
    y: 0,
    color: getRandomColor()
  };
  
  // Send current players to the new player
  socket.emit('currentPlayers', players);
  
  // Tell other players about the new player
  socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });
  
  // Handle player movement
  socket.on('playerMovement', (movementData) => {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    // Tell all players about the moved player
    socket.broadcast.emit('playerMoved', { id: socket.id, x: movementData.x, y: movementData.y });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

});
