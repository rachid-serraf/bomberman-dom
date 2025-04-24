import { chatting, waitingChattingPage } from "./htmls.js";
import { EventSystem, Router, setRoot, StateManagement } from "./miniframework.js";
import { renderComponent } from "./miniframework.js";
import { vdm } from "./miniframework.js";
import { bombsArray, CurrPlayer, explosionsArray, placeAbomb, SetOtherPlayerAndMove } from "./players.js";
import { Status } from "./status.js";
import { updatePositons } from "./players.js";

setRoot("app")
const router = new Router(renderComponent)
export { room, left_time, sendMessage, messages, updateDebugInfo, ws, Game }
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
  return debugPanel;
}

function updateDebugInfo(info) {
  const debugPanel = document.getElementById('debug-panel') || createDebugPanel();
  debugPanel.innerHTML = Object.entries(info)
    .map(([key, value]) => `<div><strong>${key}:</strong> ${value}</div>`)
    .join('');
}

let resize = false

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

    Status.tileSize = Math.min(
      containerWidth / MapState.columns,
      containerHeight / MapState.rows
    );

    container.style.gridTemplateRows = `repeat(${MapState.rows}, ${Status.tileSize}px)`;
    container.style.gridTemplateColumns = `repeat(${MapState.columns}, ${Status.tileSize}px)`;
  }

  let players = [];

  for (let [nam, position] of Object.entries(MapState.players)) {
    if (nam === nickname) {
      players.push(CurrPlayer(position));
    } else {
      players.push(SetOtherPlayerAndMove(false, null, nam, position));
    }
  }

  return (
    vdm("div", {},
      vdm("div", { id: "game-container", ref: contanerRef },
        ...draw()),
      ...players,
      ...bombsArray,
      ...explosionsArray
    ))
}

// In your main.js file
EventSystem.add(window, 'resize', () => { 
  renderComponent(Game); 
  resize = true;
  setTimeout(() => {
    updatePositons();
  }, 50);
}, true);

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
  ws.send(JSON.stringify({ type: "chat", message: message, nickname: nickname }));
}

function enter(event) {
  // [MapState, setMapState] = useState(null, Game)
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
  //"ws://10.1.13.5:8080"
  ws = new WebSocket("/ws");

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
      SetOtherPlayerAndMove(true, data);
    }
    if (data.type === "set_bomb") {
      placeAbomb(data.xGrid, data.yGrid, false)
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
        EmotesCat(2, "insert your name", false)
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
  if (random) setInterval(() => setanime(), 5000);
  else setanime()

  return (
    vdm("div", { class: "contaner_emotes" },
      vdm("div", { class: "emotes_cat" }),
      vdm("div", { class: "message_emotes" },
        vdm("p", {}, message)
      )
    )
  )
}

router
  .add("/", NewUserPage)
  .add("/waiting", waitingChattingPage)
  .add("/game", Game)

router.setNotFound(() =>
  vdm("div", {},
    vdm("h1", {}, "custum page not fund"),
    vdm("button", { onClick: () => router.link("/") }, `go to ${path}`)
  )
)