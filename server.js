import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from 'path';

const CONFIG = {
  DEF_POS: {
    0: [1, 1],
    1: [1, 13],
    2: [9, 1],
    3: [9, 13],
  },
  WITE_TIME: 200
}
const server = http.createServer(handleRequest);

const wss = new WebSocketServer({ server });


const routes = {
  GET: {},
  POST: {},
  PUT: {},
  DELETE: {},
};


const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const baseDir = path.join(__dirname, 'client');
const indexPath = path.join(baseDir, 'index.html');
function handleRequest(req, res) {
  if (req.url === "/waiting" || req.url === "/game") {
    console.log("redirecting")
    res.writeHead(302, { Location: '/' });
    res.end();
    return;
  }

  const decodedUrl = decodeURIComponent(req.url);
  let requestedPath = path.join(baseDir, decodedUrl);

  fs.stat(requestedPath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(requestedPath).toLowerCase();

      const mimeType = mimeTypes[ext] || 'application/octet-stream';

      fs.readFile(requestedPath, (err, content) => {
        if (err) {
          res.writeHead(500);
          return res.end('Server error');
        }
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(content);
      });
    } else {
      fs.readFile(indexPath, (err, content) => {
        if (err) {
          res.writeHead(500);
          return res.end('Server error');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      });
    }
  });
}

let rooms = {
  // "room-18657645": {
  // players: ["Alice", "Bob"],
  // state: "waiting",
  // timer: 20,
  // usersConnection: ,
  // },
};

wss.on("connection", (ws) => {
  let nickname = null;
  let roomID = null;

  // Handle nickname input (sent by the client)
  ws.on("message", (message) => {
    const data = JSON.parse(message);

    const WsHandelType = {

      "set_nickname": function () {
        nickname = data.nickname;
        ws.nickname = nickname;

        // Check for available room or create a new room
        roomID = findAvailableRoom(nickname);
        if (!roomID) {
          console.log("create room")
          roomID = `room-${Date.now()}`;
          rooms[roomID] = {
            players: [nickname],
            state: "waiting",
            timer: CONFIG.WITE_TIME,
            usersConnection: new Map(),
          };
        } else {
          rooms[roomID].players.push(nickname);
          if (rooms[roomID].players.length === 4) {
            rooms[roomID].state = "locked"; // Room is locked when full
          }
        }
        ws.roomID = roomID;
        rooms[roomID].usersConnection.set(ws, nickname);

        // need more logic
        // for player if he exit
        if (rooms[roomID].players.length === 2) {
          startRoomCountdown(roomID);
        }

        // Notify the player about the room
        ws.send(
          JSON.stringify({
            type: "room_info",
            roomID: roomID,
            players: rooms[roomID].players,
          })
        );

        // Broadcast new player join to the room
        broadcastToRoom(roomID, {
          type: "new_player",
          nickname: nickname,
          players: rooms[roomID].players,
          state: rooms[roomID].state,
        });

      },
      //--------------------------------------------------------------------------
      "chat": function () {
        broadcastToRoom(roomID, {
          type: "chat",
          message: data.message,
          nickname: nickname,
        });
      },
      //--------------------------------------------------------------------------
      "creat_map": function () {
        let rows = 11;
        let columns = 15;
        let por = [10, 11, 11, 11, 11, 11, 11, 11, 11, 11]

        let map = [
          [2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4],
          [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
          [5, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 6],
          [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
          [5, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 6],
          [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
          [5, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 6],
          [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
          [5, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 6],
          [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
          [7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9],
        ];

        function mpbuild() {
          for (let row = 0; row < map.length; row++) {
            for (let col = 0; col < map[row].length; col++) {
              const positionPlayrs = [
                [1, 1], //p1
                [1, 2],
                [2, 1],
                [1, 13],// p2
                [1, 12],
                [2, 13],
                [9, 1], // p3
                [8, 1],
                [9, 2],
                [9, 13], //p4
                [8, 13],
                [9, 12]
              ];

              if (positionPlayrs.some(([r, c]) => r === row && c === col)) {
                map[row][col] = 11

              } else if (map[row][col] === 0) {
                let random = Math.round(Math.random() * 9);
                map[row][col] = por[random]
              }
            }
          }

          let a = map.flat().filter(v => v === 10).length;

          console.log(a); // 4 time
        }
        mpbuild()
        let playersPos = {}
        let pl = rooms[roomID].players
        for (let i = 0; i < pl.length; i++) {
          playersPos[pl[i]] = CONFIG.DEF_POS[i]
        }

        broadcastToRoom(roomID, {
          type: "map_Generet",
          players: playersPos,
          map: map,
          rows: rows,
          columns: columns,
          por: por,
        })
      },
      //--------------------------------------------------------------------------
      "player_moveng": function () {
        data.nickname = nickname
        broadcastToRoom(roomID, data, nickname)
      },
      //--------------------------------------------------------------------------
      "set_bomb": function () {
        data.nickname = nickname
        broadcastToRoom(roomID, data, nickname)
      }
    }
    WsHandelType[data.type]?.()
  });

  // Handle WebSocket close event
  ws.on("close", () => {
    console.log("Player disconnected");
    // Remove the player from the room
    if (nickname && roomID) {
      const room = rooms[roomID];
      if (room) {
        room.players = room.players.filter((player) => player !== nickname);
        if (room.players.length === 0) {
          delete rooms[roomID]; // Remove room if no players left
        } else {
          broadcastToRoom(roomID, {
            type: "player_left",
            nickname: nickname,
            players: room.players,
            state: room.state,
          });
        }
        if (room.players.length === 1) {
          clearInterval(room.countdownInterval);
          room.timer = 20; // Reset the timer
        }
      }
    }
    // Clear the countdown interval if it exists
  });
});

// Helper function to find an available room
function findAvailableRoom(nickname) {
  for (let id in rooms) {
    if (rooms[id].state === "waiting" && rooms[id].players.length < 4 && !([...rooms[id].usersConnection.values()].includes(nickname))) {
      return id; // Return room ID if there is space
    }
  }
  return null; // Return null if no available room
}

function broadcastToRoom(roomID, message, nickname) {
  const room = rooms[roomID];
  if (!room) return;

  for (let [ws, username] of room.usersConnection.entries()) {
    if (!nickname || nickname !== username) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }
}


// Function to start the countdown for a room
function startRoomCountdown(roomID) {
  const room = rooms[roomID];
  if (!room || room.state === "locked") return;

  const countdownInterval = setInterval(() => {
    if (room.timer > 0) {
      room.timer--;
      broadcastToRoom(roomID, {
        type: "countdown",
        timeLeft: room.timer,
      });
    } else {
      room.state = "locked"; // Lock the room when countdown ends
      clearInterval(countdownInterval);
      broadcastToRoom(roomID, {
        type: "room_locked",
        roomID: roomID,
      });
    }
  }, 1000);
  rooms[roomID].countdownInterval = countdownInterval;
}

// Make the server listen on port 5000
server.listen(8080, () => {
  console.log("Server is running on http://localhost:8080");
});