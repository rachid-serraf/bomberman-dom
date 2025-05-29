import { chatting, waitingChattingPage, waiting, endGame, EmotesCat } from "./htmls.js";
import { EventSystem, Router, setRoot, StateManagement } from "./miniframework.js";
import { renderComponent } from "./miniframework.js";
import { vdm } from "./miniframework.js";
import { CurrPlayer, SetOtherPlayerAndMove } from "./players.js";
import { Status } from "./status.js";
import { updatePositons } from "./players.js";
import { vdmBombs, vdmExplosion } from "./bombEffect.js";

setRoot("app")
const router = new Router(renderComponent)
export { room, left_time, nickname, sendMessage, messages, ws, Game, router }


let lastState = {}
let first = true
function Game() {

  let MapState = StateManagement.get().MapState

  // newEdit
  if (!MapState || !MapState.map || MapState.map.length === 0) {
    return vdm("div", {}, "Loading map...")
  }

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
          12: "box",
          13: "apple",
          14: "corn",
          15: "sombola"
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

    const containerWidth = window.innerWidth - window.innerWidth * 0.30;
    const containerHeight = window.innerHeight - window.innerHeight * 0.30;

    const newTileSize = Math.min(
      Math.floor(containerWidth / MapState.columns),
      Math.floor(containerHeight / MapState.rows)
    );

    Status.tileSize = Math.floor(newTileSize / 5) * 5;

    Status.tileSize = Math.max(Status.tileSize, 25);

    container.style.gridTemplateRows = `repeat(${MapState.rows}, ${Status.tileSize}px)`;
    container.style.gridTemplateColumns = `repeat(${MapState.columns}, ${Status.tileSize}px)`;
  }

  let players = [];

  for (let [nam, position] of Object.entries(MapState.players)) {
    if (first) {
      Status.life[nam] = 3
    }
    if (nam === nickname) {
      const playerElCurr = CurrPlayer(position);
      if (Status.playersDead[nam]) {
        playerElCurr.attrs.class += " dead-player"
      }

      players.push(playerElCurr);
    } else {
      const playerElement = SetOtherPlayerAndMove(false, null, nam, position);

      if (Status.playersDead[nam]) {
        playerElement.attrs.class += " dead-player"
      }

      players.push(playerElement);
    }
  }
  let bombs = []
  for (const bmb of StateManagement.get()?.bombs || []) {
    bombs.push(vdmBombs(bmb.xgrid, bmb.ygrid))
  }
  let explo = []
  for (const exp of StateManagement.get()?.explosions || []) {
    explo.push(vdmExplosion(exp))
  }
  first = false
  return (
    vdm("div", {},
      vdm("div", { id: "counterSide" },
        vdm("div", { class: "counter-container" },
          vdm("div", { class: "lives-section" },
            ...Array.from({ length: Status.life[nickname] }, (_, i) =>
              vdm("div", { class: "lives-hearts", id: "lives-hearts" }))
          ),
          vdm("div", { class: "timer-section" },
            vdm("div", { class: "timer-icon" }),
            vdm("div", { class: "timer-display", id: "timer-display" }, "00:00:00")
          )
        )
      ),
      vdm("div", { id: "game-container", ref: contanerRef },
        ...draw()),
      ...players,
      ...bombs,
      ...explo,
    ))
}

function gameLayout() {
  return vdm("div", { class: "waiting-chatting-container" }, [
    vdm("div", { id: "leftSide" }, Game()),
    vdm("div", { id: "rightSide" }, chatting()),
  ]);
}

// -------------------------- yassine -----------------------------------------
let ws
let room = {}
let left_time = 20
let nickname
let messages = []
function sendMessage(message) {
  if (message.trim().length === 0) return

  document.getElementById("message").value = "";
  ws.send(JSON.stringify({ type: "chat", message: message, nickname: nickname }));
}

const starting = () => {
  const { startingTimer } = StateManagement.get();

  return vdm("div", { class: "count10_holder" }, [
    vdm("h1", {}, "Starting Game"),
    vdm("div", {
      id: "count10_timer"
    }, `${startingTimer}`),
    vdm("div", {
      class: "count10_message",
      id: "message"
    })
  ]);
};

function enter(nickname1) {
  messages = []
  nickname = nickname1.trim()

  if (!nickname) {
    alert("Please enter a nickname.");
    return;
  }
  if (nickname.length < 1) {
    alert("Nickname must be 2 characters or more.");
    return;
  }
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const hostname = window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : "";
  ws = new WebSocket(`${protocol}://${hostname}${port}`);

  ws.onopen = function () {
    ws.send(JSON.stringify({ type: "set_nickname", nickname: nickname }));
  };

  ws.onmessage = function (event) {

    const data = JSON.parse(event.data);
    const state = StateManagement.get();

    if (data.type === "room_info") {
      room = data;
    }

    else if (data.state === "waiting" && (data.type === "new_player" || data.type === "player_left")) {
      room.players = data.players;
      StateManagement.set({ waiting: data });
    }

    else if (data.type === "waiting_countdown") {
      left_time = data.timeLeft;
      StateManagement.set({
        waitingTimer: data.timeLeft,
        gameState: "waiting"
      });
    }
    else if (data.type === "starting_countdown") {
      StateManagement.set({
        startingTimer: data.timeLeft,
        gameState: "starting"
      });

      if (data.timeLeft <= 0) {
        router.link("/game");
        ws.send(JSON.stringify({ type: "creat_map", nickname: nickname }));
      }
    }
    else if (data.type === "room_locked") {
      StateManagement.set({
        startingTimer: data.timeLeft || 10,
        gameState: "starting"
      });
      router.link("/starting");
    }
    else if (data.type === "chat") {
      const is_mine = data.nickname === nickname;
      messages.push({
        nickname: data.nickname,
        message: data.message,
        is_mine: is_mine
      });
      StateManagement.set({ chat: data });
    }
    else if (data.type === "player_left" && data.state != "starting") {
      Status.playersDead[data.nickname] = true
      setRoot('app');
      renderComponent(gameLayout);
    }

    else if (data.type === "map_Generet") {
      StateManagement.set({ MapState: data });
      setTimeout(() => {
        EventSystem.add(window, 'resize', () => {
          if (window.isResizing || StateManagement.get().endGame) return;
          window.isResizing = true;
          setRoot("app");
          renderComponent(gameLayout);
          updatePositons();
          window.isResizing = false;
        }, true);
      }, 10);
    }
    else if (data.type === "player_moveng") {
      SetOtherPlayerAndMove(true, data, data.nickname);
    }
    else if (data.type === "set_bomb") {
      StateManagement.set({
        bombs: [...(state?.bombs || []), data]
      });
    }
    else if (data.type === "set_item") {
      const mp = [...state.MapState.map];
      mp[data.row][data.col] = data.item;
      StateManagement.set({
        MapState: { ...state.MapState, map: mp }
      });
    }
    else if (data.type === "get_item") {
      const mp = [...state.MapState.map];
      mp[data.xgrid][data.ygrid] = 11;
      StateManagement.set({
        MapState: { ...state.MapState, map: mp }
      });
    }
    else if (data.type === "explo_effect") {
      StateManagement.set({
        explosions: [...(state?.explosions || []), ...data.exploAdd]
      });
    }
    else if (data.type === "players_life") {
      Status.life = data.life;
    }
  };

  ws.onclose = function () {
    console.log("Disconnected from server");
  };

  ws.onerror = function (error) {
    console.error("WebSocket error:", error);
  };
  router.link("/waiting");
}

function NewUserPage() {
  let myRef = null
  function handleClick(e) {
    e.preventDefault()
    enter(myRef.value)
  }
  return (
    vdm("div", { class: "contener_auth" },
      vdm("div", { class: "pixel2" },
        vdm("input", { type: "text", class: "input_name", id: "nickname", placeholder: "your name", maxlength: "20", ref: (el) => { myRef = el } }),
        vdm("button", { class: "btn_add_name", onClick: (e) => handleClick(e) }, "play"),
        EmotesCat(2, "insert your name", false)
      )
    ))
}


router
  .add("/", NewUserPage)
  .add("/waiting", waitingChattingPage)
  .add("/game", gameLayout)
  .add("/starting", starting)

router.setNotFound(() =>
  vdm("div", {},
    vdm("h1", {}, "custum page not fund"),
    vdm("button", { onClick: () => router.link("/") }, `go to home`)
  )
)

StateManagement.subscribe((state) => {
  const path = window.location.pathname;

  if (state.chat !== lastState.chat) {
    if (path === "/waiting" || path === "/starting") {
      setRoot('rightSide');
      renderComponent(chatting);
    } else {
      setRoot('app');
      renderComponent(gameLayout);
    }
  }

  if ((state.waiting !== lastState.waiting || state.waitingTimer !== lastState.waitingTimer) && path === "/waiting") {
    setRoot('leftSide');
    renderComponent(waiting);
  }

  if (state.MapState !== lastState.MapState ||
    state.bombs !== lastState.bombs ||
    state.explosions !== lastState.explosions) {
    setRoot('app');
    renderComponent(gameLayout);
  }

  if (state.endGame !== lastState.endGame) {
    setRoot('app');
    if (state.endGame.type === "loss") {
      renderComponent(() => endGame("loss"));
    } else {
      renderComponent(() => endGame("win"));
    }
  }

  if (state.startingTimer !== lastState.startingTimer && path === "/starting") {
    setRoot("leftSide");
    renderComponent(starting);
  }

  lastState = { ...state };
});


