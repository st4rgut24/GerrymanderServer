const crypto = require('crypto');
const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');

const app = express();
const port = 3000;

const server = createServer(app);
const wss = new WebSocket.Server({ server });

// Queue to manage clients waiting for a match
let queue = [];
const MATCH_SIZE = 2; // Number of clients needed to start a match

// Function to start a match
function startMatch(players) {
  console.log("Starting match with players:", players);

  // Notify each player that a match has been found
  players.forEach(player => {
    player.send(JSON.stringify({
      type: 'match',
      message: 'You have been matched with another player!'
    }));
  });
}

// Handle new connections
wss.on('connection', function(ws) {
  console.log("Client joined.");

  // Initially, add client to the queue
  queue.push({ ws, ready: false });
  console.log("Queue length: " + queue.length);

  // Send "hello world" interval
  const textInterval = setInterval(() => ws.send("hello world!"), 100);

  // Send random bytes interval
  const binaryInterval = setInterval(() => ws.send(crypto.randomBytes(8).buffer), 110);

  ws.on('message', function(data) {
    console.log(data);

    if (typeof(data) === "string") {
      const message = JSON.parse(data);
    
      if (message.type === 'ready') {
        // Mark client as ready
        const client = queue.find(q => q.ws === ws);
        if (client) {
          client.ready = true;
          console.log("Client marked as ready.");
  
          // Check if we have enough ready clients to start a match
          const readyClients = queue.filter(q => q.ready);
          if (readyClients.length >= MATCH_SIZE) {
            // Extract the number of clients needed for a match
            const players = readyClients.splice(0, MATCH_SIZE).map(q => q.ws);
            startMatch(players);
  
            // Update the queue
            queue = queue.filter(q => !players.includes(q.ws));
          }
        }
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
    clearInterval(textInterval);
    clearInterval(binaryInterval);

    // Remove client from queue if they are still in it
    queue = queue.filter(q => q.ws !== ws);
  });
});

server.listen(port, function() {
  console.log(`Listening on http://localhost:${port}`);
});
