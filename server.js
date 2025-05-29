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
  WAIT_TIME: 20,
  START_TIME: 10,
}
const server = http.createServer(handleRequest);

const wss = new WebSocketServer({ server });


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
  if (req.url === "/waiting" || req.url === "/game" || req.url === "/starting") {
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
  // waitingTimer: 20,
  // startingTimer: 10,
  // usersConnection: ,
  // },
};

wss.on("connection", (ws) => {
  let nickname = null;
  let roomID = null;

  // Handle nickname input (sent by the client)
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      const WsHandelType = {

        "set_nickname": function () {
          nickname = data.nickname;
          ws.nickname = nickname;

          // Check for available room or create a new room
          roomID = findAvailableRoom(nickname);
          if (!roomID) {
            roomID = `room-${Date.now()}`;
            rooms[roomID] = {
              players: [nickname],
              state: "waiting",
              waitingTimer: CONFIG.WAIT_TIME,
              startingTimer: 0,
              usersConnection: new Map(),
            };
          } else {
            rooms[roomID].players.push(nickname);
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
          if (rooms[roomID].players.length === 4) {
            clearInterval(rooms[roomID].waitingInterval);
            rooms[roomID].state = "starting";
            rooms[roomID].startingTimer = CONFIG.START_TIME;

            broadcastToRoom(roomID, {
              type: "room_locked",
              players: rooms[roomID].players
            });

            startStartingCountdown(roomID);
          } else if (rooms[roomID].players.length >= 2) {
            startRoomCountdown(roomID);
          }
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
          if (rooms[roomID].map) {
            return
          }

          let rows = 11;
          let columns = 15;
          let por = [10, 10, 10, 10, 10, 10, 11, 11, 11, 11]

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
          rooms[roomID].map = map

          function mpbuild() {
            for (let row = 0; row < map.length; row++) {
              for (let col = 0; col < map[row].length; col++) {
                const positionPlayrs = [
                  [1, 1],  //p1
                  [1, 2],
                  [2, 1],
                  [1, 13], //p2
                  [1, 12],
                  [2, 13],
                  [9, 1],  //p3
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
        },
        "generet_item": function () {
          let por = [0, 0, 0, 0, 0, 0, 0, 1, 1, 1]
          let random = Math.round(Math.random() * 9);
          let item = 11
          if (por[random] === 1) {
            item = Math.round(Math.random() * 2) + 13
          }

          broadcastToRoom(roomID, {
            type: "set_item",
            item,
            row: data.row,
            col: data.col,
          })
        },
        "get_item": function () {
          broadcastToRoom(roomID, data)
        },
        "explo_effect": function () {
          broadcastToRoom(roomID, data)
        },
        "players_life": function () {
          broadcastToRoom(roomID, data)
        }

      }
      WsHandelType[data.type]?.()

    } catch (error) {
      // not valid data
    }
  });

  // Handle WebSocket close event
  ws.on("close", () => {
    console.log("Player disconnected");
    if (nickname && roomID) {
      const room = rooms[roomID];

      if (room) {
        room.usersConnection.delete(ws);
        room.players = room.players.filter((player) => player !== nickname);
        broadcastToRoom(roomID, {
          type: "player_left",
          nickname: nickname,
          players: room.players,
          state: room.state
        });

        if (room.players.length < 2 && room.state === "waiting") {
          room.waitingTimer = CONFIG.WAIT_TIME;
          broadcastToRoom(roomID, {
            type: "waiting_countdown",
            timeLeft: room.waitingTimer
          });
        }

        if (room.players.length === 0) {
          clearInterval(room.waitingInterval);
          clearInterval(room.startingInterval);
          delete rooms[roomID];
          return;
        }
      }
    }
  });
});

function findAvailableRoom(nickname) {
  for (let id in rooms) {
    if (rooms[id].state === "waiting" && rooms[id].players.length < 4 && !([...rooms[id].usersConnection.values()].includes(nickname))) {
      return id;
    }
  }
  return null;
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

function startRoomCountdown(roomID) {
  const room = rooms[roomID];
  if (!room || room.state !== "waiting") return;

  if (room.waitingInterval) clearInterval(room.waitingInterval);

  room.waitingInterval = setInterval(() => {
    if (room.waitingTimer <= 0) {
      clearInterval(room.waitingInterval);
      return;
    }

    room.waitingTimer--;

    broadcastToRoom(roomID, {
      type: "waiting_countdown",
      timeLeft: room.waitingTimer
    });

    if (room.waitingTimer <= 0) {
      clearInterval(room.waitingInterval);
      room.state = "starting";
      room.startingTimer = CONFIG.START_TIME;
      broadcastToRoom(roomID, {
        type: "room_locked",
        timeLeft: 10
      });
      startStartingCountdown(roomID);
    }
  }, 1000);
}

function startStartingCountdown(roomID) {
  const room = rooms[roomID];
  if (!room || room.state !== "starting") return;

  if (room.startingInterval) clearInterval(room.startingInterval);

  room.startingInterval = setInterval(() => {
    if (room.startingTimer <= 0) {
      clearInterval(room.startingInterval);
      return;
    }

    room.startingTimer--;

    broadcastToRoom(roomID, {
      type: "starting_countdown",
      timeLeft: room.startingTimer
    });

    if (room.startingTimer <= 0) {
      clearInterval(room.startingInterval);
      room.state = "locked";
      broadcastToRoom(roomID, {
        type: "game_start",
        roomID: roomID
      });
    }
  }, 1000);
}

server.listen(8080, () => {
  console.log("Server is running on http://localhost:8080");
});