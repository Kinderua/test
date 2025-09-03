const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Store connected players
const players = {};

// Handle socket connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // When a new player joins
    socket.on('new-player', (data) => {
        // Add new player to the players object
        players[socket.id] = {
            x: data.x,
            y: data.y,
            nickname: data.nickname,
            playerId: socket.id
        };
        
        // Send existing players to the new player
        socket.emit('current-players', players);
        
        // Tell all other players about the new player
        socket.broadcast.emit('new-player-connected', players[socket.id]);
    });

    // When a player moves
    socket.on('player-movement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            
            // Tell all other players about the movement
            socket.broadcast.emit('player-moved', players[socket.id]);
        }
    });

    // When a player disconnects
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Remove player from the players object
        delete players[socket.id];
        
        // Tell all other players about the disconnection
        io.emit('player-disconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

        // Server-side simulation (client-side mock)
        // In a real application, this would run on a Node.js server
        document.addEventListener('DOMContentLoaded', function() {
            console.log("Server simulation started");
            
            // Mock socket.io server behavior
            const mockServer = {
                players: {},
                emit: function(event, data) {
                    console.log("Server emitting:", event, data);
                },
                on: function(event, callback) {
                    console.log("Server listening for:", event);
                }
            };
            
            // Simulate server connection
            setTimeout(() => {
                console.log("Simulating server connection...");
                
                // Simulate receiving player count
                if (typeof socket !== 'undefined' && socket) {
                    socket.emit('player-count', Math.floor(Math.random() * 5) + 1);
                }
            }, 2000);
        });