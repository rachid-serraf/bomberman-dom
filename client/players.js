import { nickname, ws } from "./app.js";
import { handleExplosions, handleExplosionsEffect, placeAbomb } from "./bombEffect.js";
import { StateManagement, vdm, getId, EventSystem } from "./miniframework.js";
import { Status } from "./status.js";

export { CurrPlayer, SetOtherPlayerAndMove, getPlayerTiles }
let xPos = null;
let yPos = null;
let lastBombTime = 0;
let playerWidth = 0;
let playerHeight = 0;
let currPlayer;
let keysPressed = {};
let animationFrameId;
let speedX;
let speedY;
let currentDirection = "idle";
let isMoving = false;
let lastDirection = "down";
let skipCorner = { x: 0, y: 0 };
let lastClass = ""
let startTime = 0

function getPlayerTiles(playerX, playerY) {
    const corners = [
        { x: playerX, y: playerY },
        { x: playerX + playerWidth, y: playerY },
        { x: playerX, y: playerY + playerHeight },
        { x: playerX + playerWidth, y: playerY + playerHeight }
    ];
    const gridPositions = corners.map(corner => ({
        gridX: Math.floor(corner.x / Status.tileSize),
        gridY: Math.floor(corner.y / Status.tileSize)
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
    return {
        corners,
        uniqueTiles
    };
}

const playerRegistry = {
    currentPlayer: null,
    otherPlayers: {},
    oldTileSize: null
};

// ------------------------------------ ayoub update players in resize
export function updatePositons() {
    const ratio = playerRegistry.oldTileSize ? Status.tileSize / playerRegistry.oldTileSize : 1;

    // Update global dimensions
    let diff = (Status.tileSize / 100) * 10;
    playerWidth = Status.tileSize - diff;
    playerHeight = Status.tileSize - diff;
    speedX = (Status.tileSize / 20) + Status.Speed;
    speedY = (Status.tileSize / 20) + Status.Speed;

    if (playerRegistry.currentPlayer) {
        const currPlayer = getId("current-player");
        if (currPlayer) {
            currPlayer.style.width = `${playerWidth}px`;
            currPlayer.style.height = `${playerHeight}px`;

            const spriteScaleFactor = playerHeight / 32;
            currPlayer.style.setProperty('--sprite-width', `${32 * spriteScaleFactor}px`);
            currPlayer.style.setProperty('--sprite-height', `${32 * spriteScaleFactor}px`);
            currPlayer.style.setProperty('--sprite-sheet-width', `${128 * spriteScaleFactor}px`);

            const tileElementInit = document.querySelector(`[data-row="1"][data-col="1"]`);
            if (tileElementInit) {
                const tileRectInit = tileElementInit.getBoundingClientRect();
                currPlayer.style.top = `${tileRectInit.top + (diff / 2)}px`;
                currPlayer.style.left = `${tileRectInit.left + (diff / 2)}px`;

                if (ratio !== 1 && xPos !== null && yPos !== null) {
                    // Scale the position values by the tile size ratio
                    xPos = Math.max(xPos * ratio, 0);
                    yPos = Math.max(yPos * ratio, 0);
                    currPlayer.style.transform = `translate(${xPos}px, ${yPos}px)`;
                }
            }
        }
    }

    for (const [nickname, data] of Object.entries(playerRegistry.otherPlayers)) {
        const playerEl = getId(`other-player-${nickname}`);
        if (playerEl && data) {
            playerEl.style.width = `${playerWidth}px`;
            playerEl.style.height = `${playerHeight}px`;

            const spriteScaleFactor = playerHeight / 32;
            playerEl.style.setProperty('--sprite-width', `${32 * spriteScaleFactor}px`);
            playerEl.style.setProperty('--sprite-height', `${32 * spriteScaleFactor}px`);
            playerEl.style.setProperty('--sprite-sheet-width', `${128 * spriteScaleFactor}px`);

            const tileElementInit = document.querySelector(`[data-row="1"][data-col="1"]`);
            if (tileElementInit) {
                const tileRectInit = tileElementInit.getBoundingClientRect();
                playerEl.style.top = `${tileRectInit.top + (diff / 2)}px`;
                playerEl.style.left = `${tileRectInit.left + (diff / 2)}px`;

                if (data.xPos !== undefined && data.yPos !== undefined) {
                    playerEl.style.transform = `translate(${(data.xPos * Status.tileSize)}px, ${(data.yPos * Status.tileSize)}px)`;
                }
            }
        }
    }

    playerRegistry.oldTileSize = Status.tileSize;
}
//---------------------------------- end ayoub

function CurrPlayer(pos = [1, 1]) {

    function initGame(ele) {
        if (xPos !== null || yPos !== null) return;
        playerRegistry.currentPlayer = { position: pos };

        currPlayer = ele
        const tileElementInit = document.querySelector(`[data-row="1"][data-col="1"]`);
        // new edit
        if (!tileElementInit) {
            setTimeout(() => initGame(ele), 100);
            return;
        }
        const tileRectInit = tileElementInit.getBoundingClientRect();

        let diff = (Status.tileSize / 100) * 10;

        playerWidth = Status.tileSize - diff;
        playerHeight = Status.tileSize - diff;
        speedX = (Status.tileSize / 20) + Status.Speed;
        speedY = (Status.tileSize / 20) + Status.Speed;

        if (currPlayer) {
            currPlayer.style.width = `${playerWidth}px`;
            currPlayer.style.height = `${playerHeight}px`;
            currPlayer.style.top = `${tileRectInit.top + (diff / 2)}px`;
            currPlayer.style.left = `${tileRectInit.left + (diff / 2)}px`;

            // Calculate initial position
            xPos = Math.round((pos[1] - 1) * Status.tileSize);
            yPos = Math.round((pos[0] - 1) * Status.tileSize);

            const spriteScaleFactor = playerHeight / 32;

            currPlayer.style.setProperty('--sprite-width', `${32 * spriteScaleFactor}px`);
            currPlayer.style.setProperty('--sprite-height', `${32 * spriteScaleFactor}px`);
            currPlayer.style.setProperty('--sprite-sheet-width', `${128 * spriteScaleFactor}px`);

            currPlayer.style.transform = `translate(${xPos}px, ${yPos}px)`;
            updatePlayerState("idle");
            Status.players[nickname] = { xPos, yPos }
        }
        EventSystem.add(document, "keydown", (e) => { keysPressed[e.key] = true; });
        EventSystem.add(document, "keyup", (e) => { keysPressed[e.key] = false; });

        startTime = Date.now();
        startGameLoop();
        playerRegistry.oldTileSize = Status.tileSize;
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
    }

    function getTileInfo(gridX, gridY) {
        const tileElement = document.querySelector(
            `[data-row="${gridY + 1}"][data-col="${gridX + 1}"]`
        );

        if (!tileElement) {
            return {
                id: "unknown",
                walkable: false
            };
        }

        return {
            id: tileElement.id,
            walkable: tileElement ? (Status.allowd[tileElement.id] === true) : false
        };
    }
    function checkCorners(corners) {
        let cornerTiles = getPlayerTiles(corners[0].x, corners[0].y);
        let cornerTilesBool = cornerTiles.uniqueTiles.map(
            tile => getTileInfo(tile.gridX, tile.gridY)
        );
        let index = 0;
        let cal = 0;
        if (cornerTilesBool.length < 4) {
            return {
                index: -1,
            };
        }

        else {
            for (let idx = 0; idx < cornerTilesBool.length; idx++) {
                if (!cornerTilesBool[idx].walkable) {
                    cal++;
                    if (cal > 1) {
                        return {
                            index: -1,
                        }
                    }
                    index = idx;
                }
            }
        }
        return {
            skipCorner,
            index,
        }
    }

    function canMove(newX, newY) {
        let turnToDirection = {
            canMove: false,
            index: -1,
        };
        const tiles = getPlayerTiles(newX, newY);
        const canMove = tiles.uniqueTiles.every(tile => {
            const tileInfo = getTileInfo(tile.gridX, tile.gridY);
            if (tileInfo.walkable === false) {
                turnToDirection = checkCorners(tiles.corners);
            }
            return tileInfo.walkable;
        });
        turnToDirection.canMove = canMove;
        return turnToDirection;
    }

    function updateCornering(result) {
        const { index } = result;
        if (index === 0) {
            if (lastDirection === "left") {
                yPos += speedY
            } else if (lastDirection === "top") {
                xPos += speedX
            }
        }
        else if (index === 1) {
            if (lastDirection === "right") {
                yPos += speedY
            } else if (lastDirection === "top") {
                xPos -= speedX
            }
        }
        else if (index === 2) {
            if (lastDirection === "left") {
                yPos -= speedY
            } else if (lastDirection === "down") {
                xPos += speedX
            }
        }
        else if (index === 3) {
            if (lastDirection === "right") {
                yPos -= speedY
            } else if (lastDirection === "down") {
                xPos -= speedX
            }
        }
    }

    //timer
    function formatNumberTimer(num) {
        return (num < 10 ? '0' : '') + num;
    }

    function startGameLoop() {
        function gameLoop(timetamp) {
            if (Status.life[nickname] === 0) {
                StateManagement.set({ endGame: { type: "loss" } })
                ws.close()
                return
            }

            if (Object.keys(StateManagement.get().MapState.players).length === Object.keys(Status.playersDead).length + 1) {
                StateManagement.set({ endGame: { type: "win" } })
                ws.close()
                return
            }

            // Update speed dynamically based on current tile size
            speedX = (Status.tileSize / 20 + Status.Speed);
            speedY = (Status.tileSize / 20 + Status.Speed);

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
            if (keysPressed[" "]) {
                if (timetamp - lastBombTime > 300 && Status.numberCanSetBomb !== 0) {
                    const tiles = getPlayerTiles(xPos + (Status.tileSize / 2), yPos + (Status.tileSize / 2));
                    let xgrid = tiles.uniqueTiles[0].gridY + 1;
                    let ygrid = tiles.uniqueTiles[0].gridX + 1;
                    placeAbomb(xgrid, ygrid);
                    lastBombTime = timetamp
                }
            }
            if (moved) {
                if (currentDirection !== direction) {
                    updatePlayerState("moving", direction);
                }
                sendPosition();
            } else if (isMoving) {
                updatePlayerState("idle", lastDirection);
                sendPosition();
            }
            function sendPosition() {

                playerRegistry.currentPlayer = { position: [xPos, yPos] };

                Status.players[nickname] = { xPos, yPos }
                ws.send(JSON.stringify({
                    type: "player_moveng",
                    xPos: xPos / Status.tileSize,
                    yPos: yPos / Status.tileSize,
                    direction: lastClass,
                }));
                const tiles = getPlayerTiles(xPos, yPos);
                if (tiles.uniqueTiles.length !== 1) return

                let xgrid = tiles.uniqueTiles[0].gridY + 1;
                let ygrid = tiles.uniqueTiles[0].gridX + 1;
                const tile = document.querySelector(`[data-row="${xgrid}"][data-col="${ygrid}"]`);
                if (!tile) return;
                switch (tile.id) {
                    case "apple":
                        Status.numberCanSetBomb++
                        sendGetItem(tile.id)
                        break;
                    case "corn":
                        Status.bombPower++
                        sendGetItem(tile.id)
                        break;
                    case "sombola":
                        if (Status.Speed < 2) {
                            Status.Speed += 0.5
                        }
                        sendGetItem(tile.id)
                        break;
                }
                function sendGetItem(nameItem) {
                    ws.send(JSON.stringify({
                        type: "get_item",
                        nameItem,
                        xgrid,
                        ygrid
                    }))
                }

            }

            isMoving = moved;

            isMoving = moved;
            if (newYPos !== yPos && canMove(xPos, newYPos).canMove) yPos = newYPos
            else if ((canMove(xPos, newYPos).canMove === false)) {
                updateCornering(canMove(xPos, newYPos));
            } else if (newXPos !== xPos && canMove(newXPos, yPos).canMove) xPos = newXPos;
            else if (canMove(newXPos, yPos).canMove === false) {
                updateCornering(canMove(newXPos, yPos));
            }

            currPlayer.style.transform = `translate(${xPos}px, ${yPos}px)`;

            let { ischange, bombsfiler } = handleExplosions(StateManagement.get()?.bombs || [])
            if (ischange) {
                StateManagement.set({ bombs: bombsfiler })
            }

            let { ischangeExp, exploFilter } = handleExplosionsEffect(StateManagement.get()?.explosions || [])
            if (ischangeExp) StateManagement.set({ explosions: exploFilter })


            //timer --------------------------------------------

            const cTime = Date.now();
            const eTime = cTime - startTime;

            const minutes = Math.floor(eTime / 60000);
            const seconds = Math.floor((eTime % 60000) / 1000);
            const milliseconds = Math.floor((eTime % 1000) / 10);

            const timeDisplay =
                formatNumberTimer(minutes) + ':' +
                formatNumberTimer(seconds) + ':' +
                formatNumberTimer(milliseconds);

            getId('timer-display', timeDisplay, true, false);

            // end timer ----------------------------------------------


            animationFrameId = requestAnimationFrame(gameLoop);
        }

        animationFrameId = requestAnimationFrame(gameLoop);
    }

    return vdm("div", {
        id: "current-player",
        class: "current-player idle-left", // default state
        ref: initGame
    });
}

function SetOtherPlayerAndMove(isMove, data, nam, initialPos = [1, 1]) {
    let playerEl;
    if (!playerRegistry.otherPlayers[nam]) {
        playerRegistry.otherPlayers[nam] = {
            initialPos: initialPos,
            xPos: initialPos[1] - 1,
            yPos: initialPos[0] - 1
        };
    }

    if (isMove) {
        if (!playerRegistry.otherPlayers[data.nickname]) {
            playerRegistry.otherPlayers[data.nickname] = {};
        }
        playerRegistry.otherPlayers[data.nickname] = {
            xPos: data.xPos,
            yPos: data.yPos,
            direction: data.direction
        };
        move();
        return;
    }


    function move() {
        const playerEl = getId(`other-player-${data.nickname}`);
        if (!playerEl) return;
        playerEl.style.transform = `translate(${(data.xPos * Status.tileSize)}px, ${(data.yPos * Status.tileSize)}px)`;
        playerEl.classList.remove("right", "left", "top", "down", "idle", "idle-right", "idle-left", "idle-top", "idle-down");
        playerEl.classList.add(data.direction);
        Status.players[nam] = { xPos: data.xPos * Status.tileSize, yPos: data.yPos * Status.tileSize }
    }

    function initPlayer(ele) {
        playerEl = ele;

        let diff = (Status.tileSize / 100) * 10;
        const playerWidth = Status.tileSize - diff;
        const playerHeight = Status.tileSize - diff;

        const tileElementInit = document.querySelector(`[data-row="1"][data-col="1"]`);
        if (tileElementInit) {
            const tileRectInit = tileElementInit.getBoundingClientRect();

            if (playerEl) {
                playerEl.style.width = `${playerWidth}px`;
                playerEl.style.height = `${playerHeight}px`;

                playerEl.style.top = `${tileRectInit.top + (diff / 2)}px`;
                playerEl.style.left = `${tileRectInit.left + (diff / 2)}px`;

                let xPos = (initialPos[1] - 1) * Status.tileSize
                let yPos = (initialPos[0] - 1) * Status.tileSize

                if (playerRegistry.otherPlayers[nam]) {
                    xPos = playerRegistry.otherPlayers[nam].xPos * Status.tileSize
                    yPos = playerRegistry.otherPlayers[nam].yPos * Status.tileSize
                }

                playerEl.style.transform = `translate(${xPos}px, ${yPos}px)`;

                const spriteScaleFactor = playerHeight / 32;
                playerEl.style.setProperty('--sprite-width', `${32 * spriteScaleFactor}px`);
                playerEl.style.setProperty('--sprite-height', `${32 * spriteScaleFactor}px`);
                playerEl.style.setProperty('--sprite-sheet-width', `${128 * spriteScaleFactor}px`);

                Status.players[nam] = { xPos, yPos };
            }
        }
    }

    return (
        vdm("div", {
            id: `other-player-${nam}`,
            class: "current-player idle-down",
            ref: initPlayer,
        },
            vdm("div", { class: "name_up_player" }, (nam.length > 5) ? nam.slice(0, 5) + ".." : nam)
        ));
}
