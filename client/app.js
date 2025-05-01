import { chatting, waitingChattingPage, waiting, endGame, EmotesCat } from "./htmls.js";
import { EventSystem, Router, setRoot, StateManagement } from "./miniframework.js";
import { renderComponent } from "./miniframework.js";
import { vdm } from "./miniframework.js";
import { CurrPlayer, SetOtherPlayerAndMove, vdmBombs, vdmExplosion } from "./players.js";
import { Status } from "./status.js";
import { updatePositons } from "./players.js";

setRoot("app")
const router = new Router(renderComponent)
export { room, left_time, nickname, sendMessage, messages, ws, Game, router }


let lastState = {}
let first = true
function Game() {

  let MapState = StateManagement.get().MapState

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

let timer = 3;
const starting = () => {
  let timerNode = null;
  let messageNode = null;
  if (timer == 0) {
    timer = 10;
    router.link("/game")
    ws.send(JSON.stringify({ type: "creat_map", nickname: nickname }))
    return
  }
  setTimeout(() => {
    timer--;
    StateManagement.set({
      countdown: timer
    })
  }, 1000);

  return vdm("div", { class: "count10_holder" }, [
    vdm("h1", {}, "Countdown Timer"),
    vdm("div", { id: "count10_timer", ref: (el) => { timerNode = el; } }, `${timer}`),
    vdm("div", { class: "count10_message", id: "message", ref: (el) => { messageNode = el; } })
  ]);
};


function enter(nickname1) {
  messages = []
  nickname = nickname1

  if (!nickname) {
    alert("Please enter a nickname.");
    return;
  }
  if (nickname.length < 1) {
    alert("Nickname must be 2 characters or more.");
    return;
  }
  //"ws://10.1.8.2 :8080"

  ws = new WebSocket(`ws://${window.location.hostname}:8080`);

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
      StateManagement.set({
        waiting: data
      })

    } else if (data.type === "countdown") {
      left_time = data.timeLeft
      StateManagement.set({
        waiting: data
      })

      if (left_time === 0) {
        router.link("/starting")
      }

    } else if (data.type === "room_locked") {
      router.link("/starting")

    } else if (data.type === "chat") {
      let is_mine = data.nickname === nickname
      messages.push({ nickname: data.nickname, message: data.message, is_mine: is_mine });

      StateManagement.set({
        chat: data,
      })
    } else if (data.type === "player_left") {
      Status.life[data.nickname] = 0
      Status.playersDead[data.nickname] = true
    }
    if (data.type === "map_Generet") {
      StateManagement.set({ MapState: data })
      EventSystem.add(window, 'resize', () => {
        if (window.isResizing || StateManagement.get().endGame) return;
        window.isResizing = true;

        setRoot("app")
        renderComponent(gameLayout);

        setTimeout(() => {
          updatePositons();
          window.isResizing = false;
        }, 100);

      }, true);
    }
    if (data.type === "player_moveng") {
      // Status.players[data.nickname] = { xPos: data.xPos, yPos: data.yPos }
      SetOtherPlayerAndMove(true, data, data.nickname);
    }
    if (data.type === "set_bomb") {
      StateManagement.set({
        bombs: [...(StateManagement.get()?.bombs || []), data]
      });
    }
    if (data.type === "set_item") {
      let mp = StateManagement.get().MapState.map
      mp[data.row][data.col] = data.item
      StateManagement.set({ MapState: { ...StateManagement.get().MapState, map: mp } })
    }
    if (data.type === "get_item") {
      let mp = StateManagement.get().MapState.map

      mp[data.xgrid][data.ygrid] = 11
      StateManagement.set({ MapState: { ...StateManagement.get().MapState, map: mp } })
    }
    if (data.type === "explo_effect") {
      StateManagement.set({ explosions: [...(StateManagement.get()?.explosions || []), ...data.exploAdd] })
    }
    if (data.type === "players_life") {
      Status.life = data.life
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
    vdm("button", { onClick: () => router.link("/") }, `go to ${path}`)
  )
)

StateManagement.subscribe((state) => {
  const path = window.location.pathname
  if (state.chat !== lastState.chat) {
    if (path === "/waiting" || path === "/starting") {
      setRoot('rightSide')
      renderComponent(chatting);
    } else {
      setRoot('app')
      renderComponent(gameLayout);
    }
  }

  if (state.waiting !== lastState.waiting) {
    setRoot('leftSide')
    renderComponent(waiting);
  }

  if (state.MapState !== lastState.MapState ||
    state.bombs !== lastState.bombs ||
    state.explosions !== lastState.explosions) {

    setRoot('app')
    renderComponent(gameLayout)

  }

  // StateManagement.set({endGame : {type:"win"}})
  if (state.endGame !== lastState.endGame) {
    setRoot('app')
    if (state.endGame.type === "loss") {
      renderComponent(() => endGame("loss"))
    } else {
      renderComponent(() => endGame("win"))
    }
  }

  if (state.countdown !== lastState.countdown) {
    setRoot("leftSide")
    renderComponent(starting)
  }

  lastState = StateManagement.get()
})


// state managment to work darori
// khas ay event jdid tzidlo we7da b7al hadi
// EventSystem.add(document.body, "click", () => { }, true)