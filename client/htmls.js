import { EventSystem, vdm } from "./miniframework.js";
import { room, left_time, sendMessage, messages } from "./app.js";
import { Status } from "./status.js";

export { waitingChattingPage, chatting, waiting, EmotesCat };

function chatting() {
  // new edit
  function handleSubmit(e) {
    e.preventDefault();

    const message = e.target.message.value.trim();
    if (!message) return;

    sendMessage(message);
    Status.onInputMsg = "";
    e.target.reset();
  }

  function scrollRef(e) {
    setTimeout(() => {
      e.scrollTop = e.scrollHeight - e.clientHeight;
    });
  }

  return vdm("div", { class: "chat-container" }, [
    vdm("div", { class: "chat-header" }, [
      vdm("h2", {}, "Game Chat"),
    ]),
    vdm("div", { class: "chat-messages", ref: scrollRef },
      messages.map(msg => (
        vdm("div", { class: `message ${msg.is_mine ? "user-message" : "other-message"}` }, [
          vdm("div", { class: "message-sender" }, msg.is_mine ? "You" : msg.nickname),
          msg.message,
        ])
      ))
    ),
    vdm("form", {
      class: "chat-input-container",
      onsubmit: handleSubmit,
      method: "POST"
    }, [
      vdm("input", {
        type: "text",
        id: "message",
        name: "message",
        placeholder: "Type your message...",
        class: `chat-input`,
        oninput: (e) => {
          Status.onInputMsg = e.target.value;
        },
        value: Status.onInputMsg,
      }),
    ]),
  ]);
}

function waiting() {
  let players = room.players || []
  const maxPlayers = 4;
  const connectedPlayers = players.map((name) =>
    vdm("div", { class: "player-card" }, [
      vdm("div", { class: "player-avatar" }, []),
      vdm("div", { class: "player-info" }, [
        vdm("div", { class: "player-name" }, [name]),
        vdm("div", { class: "player-status online" }, ["Connected"]),
      ]),
    ])
  );

  const skeletonCount = maxPlayers - players.length;
  const skeletonPlayers = Array.from({ length: skeletonCount }).map(() =>
    vdm("div", { class: "player-card" }, [
      vdm("div", { class: "skeleton skeleton-avatar" }, []),
      vdm("div", { class: "player-info" }, [
        vdm("div", { class: "skeleton skeleton-text skeleton-text-short" }, []),
      ]),
    ])
  );

  return vdm("div", { class: "players-container" }, [
    vdm("h1", { class: "waiting-title" }, [`left Time ${left_time} Seconds`]),
    vdm("h1", { class: "waiting-title" }, [`Players (${players.length}/4)`]),
    vdm("div", { class: "players-list" }, [
      ...connectedPlayers,
      ...skeletonPlayers,
    ]),
  ]);
}


let testStyle = {
  cursor: "pointer",
  fontSize: "30px"
}

const waitingChattingPage = () => {
  return vdm("div", { class: "waiting-chatting-container" }, [
    vdm("div", { id: "leftSide" }, waiting()),
    vdm("div", { id: "rightSide", style: testStyle }, chatting()),
  ]);
}


export function endGame(type = "win") {
  let msgTitle = "You Win!"
  let idTitle = "winMsg"
  let msgCon = "congrate 🎉🥳🎊🎁"
  let nbr = 6
  if (type == "loss") {
    msgTitle = "You Loss!"
    idTitle = "lossMsg"
    msgCon = "good luck next time"
    nbr = 10
  }

  return vdm(
    "div",
    {},
    vdm(
      "div",
      { id: "popup", class: "pixel2" },
      vdm("div", { id: `${idTitle}` }, `${msgTitle}`),
      vdm("button", { class: "btn_add_name", onClick: () => location.reload() }, "replay"),
      EmotesCat(nbr, msgCon, false)
    )
  )
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

