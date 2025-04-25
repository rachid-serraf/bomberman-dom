export { waitingChattingPage, chatting , waiting };
import { EventSystem, vdm } from "./miniframework.js";
import { room, left_time, sendMessage, messages } from "./app.js";

function chatting() {
  console.log("chatting render");
  console.log(EventSystem.events);

  return vdm("div", { class: "chat-container" }, [
    vdm("div", { class: "chat-header" }, [
      vdm("h2", {}, ["Game Chat"]),
    ]),
    vdm("div", { class: "chat-messages" },
      messages.map(msg => {

        const messageClass = msg.is_mine ? "user-message" : "other-message";
        const senderName = msg.is_mine ? "You" : msg.nickname;

        return vdm("div", { class: `message ${messageClass}` }, [
          vdm("div", { class: "message-sender" }, [senderName]),
          msg.message,
        ]);
      })
    ),
    vdm("form", { class: "chat-input-container" }, [
      vdm("input", {
        type: "text",
        class: "chat-input",
        id: "message",
        placeholder: "Type your message...",
      }),
      vdm("button", { class: "send-button", onClick: (e) => sendMessage(e) }, ["Send"]),
    ]),
  ]);
}


function waiting() {
  console.log("waiting render");
  console.log(EventSystem.events);

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

  return vdm("div", {class: "players-container" }, [
    vdm("h1", { class: "waiting-title" }, [`left Time ${left_time} Seconds`]),
    vdm("h1", { class: "waiting-title" }, [`Players (${players.length}/4)`]),
    vdm("div", { class: "players-list" }, [
      ...connectedPlayers,
      ...skeletonPlayers,
    ]),
  ]);
}

const waitingChattingPage = () => {
  return vdm("div", { class: "waiting-chatting-container" }, [
    vdm("div", { id: "leftSide" }, waiting()),
    vdm("div", { id: "rightSide" }, chatting()),
  ]);
}