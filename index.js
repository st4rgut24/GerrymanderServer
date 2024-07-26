const crypto = require('crypto');
const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 5000;

const server = createServer(app);
const wss = new WebSocket.Server({ server });

// Queue to manage clients waiting for a match
let queue = [];
const MATCH_SIZE = 2; // Number of clients needed to start a match

// Function to start a match
function startMatch(players) {
  console.log("Starting match with players:", players);

  // Notify each player that a match has been found
  players.forEach((player, index) => {
    const otherPlayerIdx = index === 0 ? 1 : 0;
    const otherPlayer = players[otherPlayerIdx];

    console.log('other id', otherPlayer.playerId);
    player.ws.send(JSON.stringify({
      type: 'match',
      message: otherPlayer.playerId
    }));
  });
}

function findPlayer(searchId) {
  return players.find(player => player.playerId === searchId);
}

// Handle new connections
wss.on('connection', function(ws) {
  console.log("Client joined.");
  const playerId = uuidv4();
  console.log('player id joined', playerId);
  // Initially, add client to the queue
  queue.push({ ws, ready: false, playerId });
  console.log("Queue length: " + queue.length);

  function forwardPlayToOpponent(message) {
    const {type, otherPlayerId, roomId} = message;
    const opponent = findPlayer(otherPlayerId);

    opponent.send(JSON.stringify({
      type,
      roomId
    }));
  }

  // const textInterval = setInterval(() => ws.send(JSON.stringify({
  //   type: 'test',
  //   message: 'test json message'
  // })), 100);

  // Send random bytes interval
  // const binaryInterval = setInterval(() => ws.send(crypto.randomBytes(8).buffer), 110);

  ws.on('message', function(data) {
    console.log(data);

    if (typeof(data) === "string") {
      const message = JSON.parse(data);
    
      if (message.type === 'ready') {
        // Mark client as ready
        const client = queue.find(q => q.ws === ws);
        if (client) {
          client.ready = true;
          console.log("Client marked as steeady.");
  
          // Check if we have enough ready clients to start a match
          const readyClients = queue.filter(q => q.ready);
          if (readyClients.length >= MATCH_SIZE) {
            // Extract the number of clients needed for a match
            const players = readyClients.splice(0, MATCH_SIZE);
            startMatch(players);
  
            // Update the queue
            queue = queue.filter(q => !players.includes(q.ws));
          }
        }
      }
      else if (message.type === 'divide') {

        forwardPlayToOpponent(message)
      }
      else if (message.type === 'leave') {
        queue = queue.filter(q => q.ws !== ws);
      }      
    } else {
      console.log("Binary received from client -> " + Array.from(data).join(", ") + "");
    }
  });

  ws.on('close', function() {
    console.log("Client left.");
    // clearInterval(textInterval);
    // clearInterval(binaryInterval);

    // Remove client from queue if they are still in it
    queue = queue.filter(q => q.ws !== ws);
  });
});

server.listen(port, '0.0.0.0', function() {
  console.log(`Listening on http://localhost:${port}`);
});
