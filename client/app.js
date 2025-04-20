import { waitingChattingPage } from "./htmls.js";
import { EventSystem, Router, setRoot } from "./miniframework.js";
import { renderComponent } from "./miniframework.js";
import { vdm } from "./miniframework.js";

setRoot("app")
const router = new Router(renderComponent)
export { room, left_time, sendMessage, messages }
let MapState = null;
function createDebugPanel() {
  const debugPanel = document.createElement('div');
  debugPanel.id = 'debug-panel';
  debugPanel.style.position = 'absolute';
  debugPanel.style.bottom = '10px';
  debugPanel.style.left = '10px';
  debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  debugPanel.style.color = 'white';
  debugPanel.style.padding = '10px';
  debugPanel.style.borderRadius = '5px';
  debugPanel.style.fontFamily = 'monospace';
  debugPanel.style.fontSize = '12px';
  debugPanel.style.maxWidth = '300px';
  debugPanel.style.maxHeight = '150px';
  debugPanel.style.overflow = 'auto';
  debugPanel.style.zIndex = '1000';
  // document.body.appendChild(debugPanel);
  return debugPanel;
}

function updateDebugInfo(info) {
  const debugPanel = document.getElementById('debug-panel') || createDebugPanel();
  debugPanel.innerHTML = Object.entries(info)
    .map(([key, value]) => `<div><strong>${key}:</strong> ${value}</div>`)
    .join('');
}

function Game() {
  if (!MapState) return vdm("div", {}, "loding map...")

  function draw() {
    let tiles = []
    for (let row = 0; row < MapState.map.length; row++) {
      for (let col = 0; col < MapState.map[row].length; col++) {
        const tileValue = MapState.map[row][col];
        const tileClasses = {
          1: "toba",
          2: "topLeft",
          3: "top",
          4: "topRight",
          5: "left",
          6: "right",
          7: "downLeft",
          8: "down",
          9: "downRight",
          10: "tree",
          11: "grass",
          12: "box"
        };
        const className = tileClasses[tileValue];

        tiles.push(vdm("div", {
          class: `tile ${className ?? ""}`,
          "data-row": `${row}`,
          "data-col": `${col}`,
          id: className ?? "",
        }))
      }
    }
    return tiles
  }

  const contanerRef = (container) => {
    const containerWidth = window.innerWidth
    const containerHeight = window.innerHeight;

    const tileSize = Math.min(
      containerWidth / MapState.columns,
      containerHeight / MapState.rows
    );

    container.style.gridTemplateRows = `repeat(${MapState.rows}, ${tileSize}px)`;
    container.style.gridTemplateColumns = `repeat(${MapState.columns}, ${tileSize}px)`;
  }
  let players = [];
  console.log(MapState);

  for (let [nam, position] of Object.entries(MapState.players)) {
    if (nam === "undefined") continue;
    if (nam === nickname) {
      players.push(() => CurrPlayer(position));
    } else {
      players.push(() => OtherPlayer(nam, position));
    }
  }


  return vdm(
    "div",
    {},
    vdm("div", { id: "game-container", ref: contanerRef }, ...draw()),
    ...players.map(fn => fn())
  );
}

// -------------------------- yassine -----------------------------------------
let ws
let room = {}
let left_time = 20
let nickname
let messages = []
function sendMessage(e) {
  e.preventDefault();
  let message = document.getElementById("message").value;
  document.getElementById("message").value = "";
  console.log("send message", message);
  ws.send(JSON.stringify({ type: "chat", message: message, nickname: nickname }));
}

function enter(event) {
  messages = []
  event.preventDefault();
  nickname = document.getElementById("nickname").value;

  if (!nickname) {
    alert("Please enter a nickname.");
    return;
  }
  if (nickname.length < 1) {
    alert("Nickname must be 2 characters or more.");
    return;
  }
  ws = new WebSocket("ws://localhost:8080");

  // onopen event is triggered when the connection is established
  ws.onopen = function () {
    ws.send(JSON.stringify({ type: "set_nickname", nickname: nickname }));
  };

  ws.onmessage = function (event) {
    const data = JSON.parse(event.data);

    if (data.type === "room_info") {
      room = data;

    } else if (data.state === "waiting" && (data.type === "new_player" || data.type === "player_left")) {
      room.players = data.players
      if (data.type === "player_left" && room.players.length === 1) {
        left_time = 20
      }
      renderComponent(waitingChattingPage, false);
    } else if (data.type === "countdown") {
      left_time = data.timeLeft
      renderComponent(waitingChattingPage, false)
      if (left_time === 0) {
        ws.send(JSON.stringify({ type: "creat_map", nickname: nickname }))

        router.link("/game")
      }

    } else if (data.type === "player_left") {
      // Handle player leaving in the game

    } else if (data.type === "chat") {
      let is_mine = data.nickname === nickname
      messages.push({ nickname: data.nickname, message: data.message, is_mine: is_mine });
      renderComponent(waitingChattingPage, false);
    }
    if (data.type === "map_Generet") {
      MapState = data
      renderComponent(Game)
    }
    if (data.type === "player_moveng") {
      moveOtherPlayer(data);
    }
  };

  ws.onclose = function () {
    console.log("Disconnected from server");
    router.link("/");
  };

  ws.onerror = function (error) {
    console.error("WebSocket error:", error);
  };
  router.link("/waiting");
}

function NewUserPage() {
  return (
    vdm("div", { class: "contener_auth" },
      vdm("div", { class: "pixel2" },
        vdm("input", { type: "text", class: "input_name", id: "nickname", placeholder: "your name", maxlength: "20" }),
        vdm("button", { class: "btn_add_name", onClick: (e) => enter(e) }, "play"),
        EmotesCat(2, "insert your name")
      )
    ))
}

// defferent emotes cat 0 -> 14
function EmotesCat(emoteNumber, message, random = true) {
  const root = document.documentElement
  const steps = {
    0: 1,
    1: 2,
    2: 5,
    3: 4,
    4: 2,
    5: 2,
    6: 2,
    7: 2,
    8: 2,
    9: 2,
    10: 2,
    11: 2,
    12: 1,
    13: 2,
    14: 1
  }
  function setanime() {
    if (steps[emoteNumber]) {
      root.style.setProperty('--EmotesNumber', emoteNumber)
      root.style.setProperty('--EmotesSteps', steps[emoteNumber])
    }
    emoteNumber = Math.round(Math.random() * (13 - 1) + 1);
  }
  setanime()
  if (random) setInterval(() => setanime(), 5000);

  return (
    vdm("div", { class: "contaner_emotes" },
      vdm("div", { class: "emotes_cat" }),
      vdm("div", { class: "message_emotes" },
        vdm("p", {}, message)
      )
    )
  )
}


function backToHome(path) {
  return vdm("button", { onClick: () => router.link(path) }, `go to ${path}`)
}

let xPos = 0;
let yPos = 0;
function CurrPlayer(defPos) {
  let currPlayer;
  let keysPressed = {};
  let animationFrameId;
  let speedX = 0.5;
  let speedY = 0.5;
  let tileWidth = 0;
  let tileHeight = 0;
  let playerWidth = 0;
  let playerHeight = 0;
  let debugInfo = {};
  let currentDirection = "idle";
  let isMoving = false;
  let lastDirection = "down";
  let lastClass = ""

  function initGame() {
    currPlayer = document.getElementById("current-player");
    const tileElement = document.querySelector(`[data-row="${defPos[0]}"][data-col="${defPos[1]}"]`);
    if (!tileElement) {
      updateDebugInfo({ "Error": "Could not find initial tile for positioning" });
      return;
    }
    const tileRect = tileElement.getBoundingClientRect();
    tileWidth = Math.round(tileRect.width);
    tileHeight = Math.round(tileRect.height);
    playerWidth = tileWidth - 5;
    playerHeight = tileHeight - 5;
    speedX = Math.max(1, Math.floor(tileWidth / 20));
    speedY = Math.max(1, Math.floor(tileHeight / 20));

    if (currPlayer) {
      currPlayer.style.width = `${playerWidth}px`;
      currPlayer.style.height = `${playerHeight}px`;
      currPlayer.style.top = `${tileRect.top + 2.5}px`;
      currPlayer.style.left = `${tileRect.left + 2.5}px`;


      const spriteScaleFactor = playerHeight / 32;

      currPlayer.style.setProperty('--sprite-width', `${32 * spriteScaleFactor}px`);
      currPlayer.style.setProperty('--sprite-height', `${32 * spriteScaleFactor}px`);
      currPlayer.style.setProperty('--sprite-sheet-width', `${128 * spriteScaleFactor}px`);

      updatePlayerState("idle");
    }

    debugInfo["Player Size"] = `Width: ${playerWidth}, Height: ${playerHeight}`;
    EventSystem.add(document, "keydown", (e) => { keysPressed[e.key] = true; });
    EventSystem.add(document, "keyup", (e) => { keysPressed[e.key] = false; });

    startGameLoop();
  }

  function updatePlayerState(state, direction) {
    currPlayer.classList.remove("right", "left", "top", "down", "idle", "idle-right", "idle-left", "idle-top", "idle-down");

    if (state === "idle") {
      if (direction) {
        currPlayer.classList.add(`idle-${direction}`);
        lastClass = `idle-${direction}`
        lastDirection = direction;
      } else {
        currPlayer.classList.add(`idle-${lastDirection}`);
        lastClass = `idle-${lastDirection}`
      }

      currentDirection = "idle";

    } else {
      currPlayer.classList.add(direction);
      lastClass = direction
      lastDirection = direction;
      currentDirection = direction;
    }

    debugInfo["Current State"] = state;
    debugInfo["Current Direction"] = direction || lastDirection;
  }

  function getPlayerTiles(playerX, playerY) {
    const corners = [
      { x: playerX, y: playerY },
      { x: playerX + playerWidth, y: playerY },
      { x: playerX, y: playerY + playerHeight },
      { x: playerX + playerWidth, y: playerY + playerHeight }
    ];
    debugInfo["corners"] = corners.map(corner => `(${corner.x}, ${corner.y})`).join(", ");
    const gridPositions = corners.map(corner => ({
      gridX: Math.floor(corner.x / tileWidth),
      gridY: Math.floor(corner.y / tileHeight)
    }));
    const uniqueTiles = [];
    gridPositions.forEach(pos => {
      const exists = uniqueTiles.some(tile =>
        tile.gridX === pos.gridX && tile.gridY === pos.gridY
      );

      if (!exists) {
        uniqueTiles.push(pos);
      }
    });
    debugInfo["uniqueTiles"] = uniqueTiles.map(tile => `(${tile.gridX + 1}, ${tile.gridY + 1})`).join(", ");
    return {
      corners,
      uniqueTiles
    };
  }

  function getTileInfo(gridX, gridY) {
    const tileElement = document.querySelector(
      `[data-row="${gridY + 1}"][data-col="${gridX + 1}"]`
    );
    return {
      id: tileElement.id,
      walkable: tileElement ? (tileElement.id === "grass") : false
    };
  }

  function getPlayerGrid() {
    return {
      x: Math.round(xPos / tileWidth) + 1,
      y: Math.round(yPos / tileHeight) + 1,
    }
  }

  function checkCorners(corners) {
    // const tileInfo = getTileInfo(y, x)
    // console.log(y, x, corners[0]);
    let cornerTiles = getPlayerTiles(corners[0].x, corners[0].y);
    // console.log(cornerTiles);
    for (let index = 0; index < cornerTiles.corners.length; index++) {
      // console.log(cornerTiles.corners[index]);
    }
    debugInfo["corners--"] = cornerTiles.corners.map(corner => `(${corner.x}, ${corner.y})`).join(", ");
    let playerGrid = getPlayerGrid();
    // debugInfo["currentTiles"] = cornerTiles.uniqueTiles.map(tile => `(${tile.gridX + 1}, ${tile.gridY + 1})`).join(", ");
    debugInfo["Player Cordination"] = `X: ${playerGrid.x}, Y: ${playerGrid.y}`;
    // console.log(cornerTiles.uniqueTiles);
    for (let index = 0; index < cornerTiles.uniqueTiles.length; index++) {
      // console.log(cornerTiles.uniqueTiles[index]);
    }
    let cornerTilesBool = cornerTiles.uniqueTiles.map(
      tile => getTileInfo(tile.gridX, tile.gridY)
    );

    debugInfo["cornerTilesBool"] = cornerTilesBool.map(info => info.walkable).join(", ");
    // debugInfo["cornerTilesBool"] = cornerTiles.uniqueTiles.map(tile => `(${tile.gridY + 1}, ${tile.gridX + 1})`).join(", ");
    // debugInfo["cornerTilesBool"] = tileInfo.map(info => info.walkable).join(", ");
    // const tileValue = getPlayerTiles(y, x)
    // debugInfo["cornerTilesValues"] = tileValue.map(info => info.uniqueTiles.map(tile => `(${tile.gridY + 1}, ${tile.gridX + 1})`).join(", ")).join(", ");
  }

  function canMove(newX, newY) {
    const tiles = getPlayerTiles(newX, newY);
    debugInfo["tiles"] = tiles.uniqueTiles.map(tile => `(${tile.gridX + 1}, ${tile.gridY + 1})`).join(", ");
    tiles.uniqueTiles.forEach((tile, index) => {
      const tileInfo = getTileInfo(tile.gridX, tile.gridY);
      // console.log(tile.gridX, tile.gridY);

      debugInfo[`Tile ${index + 1}`] =
        `(${tile.gridX + 1}, ${tile.gridY + 1}) - Type: ${tileInfo.id || 'unknown'} - ${tileInfo.walkable ? 'walkable' : 'blocked'}`;
    });
    const canMove = tiles.uniqueTiles.every(tile => {
      const tileInfo = getTileInfo(tile.gridX, tile.gridY);
      if (tileInfo.walkable === false) {
        // console.log(tiles.corners);
        checkCorners(tiles.corners);
      }
      return tileInfo.walkable;
    });
    debugInfo["Can Move"] = canMove ? "Yes" : "No";

    return canMove;
  }

  function updateDebugWithTiles() {
    const tiles = getPlayerTiles(xPos, yPos);

    debugInfo["Player Position"] = `X: ${xPos}, Y: ${yPos}`;
    debugInfo["Player Grid"] = `X: ${Math.round(xPos / tileWidth) + 1}, Y: ${Math.round(yPos / tileHeight) + 1}`;
    debugInfo["Player Corner Grid"] = `X: ${Math.floor((xPos + playerWidth - 1) / tileWidth)}, Y: ${Math.floor((yPos + playerHeight - 1) / tileHeight)}`;
    debugInfo["Current Direction"] = currentDirection;
    debugInfo["Last Direction"] = lastDirection;
    debugInfo["Is Moving"] = isMoving ? "Yes" : "No";

    debugInfo["Current Tiles"] = tiles.uniqueTiles.map(tile =>
      `(${tile.gridX + 1}, ${tile.gridY + 1})`
    ).join(", ");

    updateDebugInfo(debugInfo);
  }

  function startGameLoop() {
    function gameLoop() {
      let newXPos = xPos;
      let newYPos = yPos;
      let moved = false;
      let direction = lastDirection;

      if (keysPressed["ArrowUp"]) {
        newYPos -= speedY;
        direction = "top";
        moved = true;
      } else if (keysPressed["ArrowDown"]) {
        newYPos += speedY;
        direction = "down";
        moved = true;
      }

      if (keysPressed["ArrowLeft"]) {
        newXPos -= speedX;
        direction = "left";
        moved = true;
      } else if (keysPressed["ArrowRight"]) {
        newXPos += speedX;
        direction = "right";
        moved = true;
      }
      if (moved) {
        if (currentDirection !== direction) {
          updatePlayerState("moving", direction);
        }

        ws.send(JSON.stringify({
          type: "player_moveng",
          xPos: xPos,
          yPos: yPos,
          direction: lastClass,
        }));
      } else if (isMoving) {
        updatePlayerState("idle", lastDirection);
        ws.send(JSON.stringify({
          type: "player_moveng",
          xPos: xPos,
          yPos: yPos,
          direction: lastClass,
        }));
      }

      isMoving = moved;

      if (newXPos !== xPos && canMove(newXPos, yPos)) xPos = newXPos;
      if (newYPos !== yPos && canMove(xPos, newYPos)) yPos = newYPos;

      currPlayer.style.transform = `translate(${xPos}px, ${yPos}px)`;

      updateDebugWithTiles();
      animationFrameId = requestAnimationFrame(gameLoop);
    }
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  setTimeout(initGame, 10);
  return vdm("div", {
    id: "current-player",
    class: "current-player idle-down" // default state
  });
}


function OtherPlayer(nam, initialPos = [0, 0]) {
  let playerEl;
  let xPos = 0;
  let yPos = 0;
  let tileWidth = 32;
  let tileHeight = 32;
  let playerWidth = 32;
  let playerHeight = 32;
  let currentDirection = "down";
  let animationFrameId;
  let speedX
  let speedY

  function initPlayer() {
    playerEl = document.getElementById(`other-player-${nam}`)
    const tileElement = document.querySelector(`[data-row="${initialPos[0]}"][data-col="${initialPos[1]}"]`);
    if (!tileElement) {
      updateDebugInfo({ "Error": "Could not find initial tile for positioning" });
      return;
    }
    // console.log(tileElement);
    // console.log(playerEl);

    const tileRect = tileElement.getBoundingClientRect();
    tileWidth = Math.round(tileRect.width);
    tileHeight = Math.round(tileRect.height);
    playerWidth = tileWidth - 5;
    playerHeight = tileHeight - 5;
    // speedX = Math.max(1, Math.floor(tileWidth / 20));
    // speedY = Math.max(1, Math.floor(tileHeight / 20));

    if (playerEl) {
      playerEl.style.width = `${playerWidth}px`;
      playerEl.style.height = `${playerHeight}px`;
      playerEl.style.top = `${tileRect.top + 2.5}px`;
      playerEl.style.left = `${tileRect.left + 2.5}px`;


      const spriteScaleFactor = playerHeight / 32;

      playerEl.style.setProperty('--sprite-width', `${32 * spriteScaleFactor}px`);
      playerEl.style.setProperty('--sprite-height', `${32 * spriteScaleFactor}px`);
      playerEl.style.setProperty('--sprite-sheet-width', `${128 * spriteScaleFactor}px`);

    }
  }

  setTimeout(initPlayer, 10);

  return vdm("div", {
    id: `other-player-${nam}`,
    class: "other-player idle-down",
    style: "position: absolute;"
  }, vdm("div", { class: "name_up_player" }, nam));
}

function moveOtherPlayer(data) {
  const playerEl = document.getElementById(`other-player-${data.nickname}`);
  if (!playerEl) return;

  console.log(data);
  playerEl.style.transform = `translate(${data.xPos}px, ${data.yPos}px)`;
  playerEl.classList.remove("right", "left", "top", "down", "idle", "idle-right", "idle-left", "idle-top", "idle-down");
  playerEl.classList.add(data.direction)
}

router
  .add("/", NewUserPage)
  .add("/waiting", waitingChattingPage)
  .add("/game", Game)

router.setNotFound(() =>
  vdm("div", {},
    vdm("h1", {}, "custum page not fund"),
    backToHome("/")
  )
)