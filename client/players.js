import { Game, nickname, updateDebugInfo, ws } from "./app.js";
import { EventSystem, renderComponent, StateManagement, vdm } from "./miniframework.js";
import { Status } from "./status.js";

export { CurrPlayer, SetOtherPlayerAndMove, vdmBombs, vdmExplosion }
let xPos = null;
let yPos = null;
let lastBombTime = 0;
let playerWidth = 0;
let playerHeight = 0;
let debugInfo = {};
let currPlayer;
let keysPressed = {};
let animationFrameId;
let speedX;
let speedY;
let currentDirection = "idle";
let isMoving = false;
let lastDirection = "down";
let skipCorner = { x: 0, y: 0 };
let bombPower = 2;
let lastClass = ""

function vdmExplosion(explo) {
    let top
    let left
    if (explo.xgrid && explo.ygrid) {
        const tileElement = document.querySelector(
            `[data-row="${explo.xgrid}"][data-col="${explo.ygrid}"]`
        );
        const rect = tileElement?.getBoundingClientRect();
        top = rect.top
        left = rect.left
    } else {
        top = explo.top
        left = explo.left
    }
    const spriteScaleFactor = Status.tileSize / 32;

    return vdm("div", {
        id: "fire",
        class: "explosion",
        style: `
            width: ${Status.tileSize}px;
            height: ${Status.tileSize}px;
            transform: translate(${left}px, ${top}px);
            --bomb-width: ${32 * spriteScaleFactor}px;
            --bomb-height: ${32 * spriteScaleFactor}px;
            --bomb-sheet-width: ${192 * spriteScaleFactor}px;`
    });
}

function explosionEffect(top, left) {
    let tileElementPositiveVx, tileElementNegativeVx, tileElementPositiveVy, tileElementNegativeVy;
    let [fpvx, fnvx, fpvy, fnvy] = [false, false, false, false];

    const time = Date.now();
    let exploAdd = [{ nickname, xgrid: top, ygrid: left, time }]

    for (let index = 1; index < bombPower; index++) {
        if (fpvx === false) {
            tileElementPositiveVx = document.querySelector(
                `[data-row="${top}"][data-col="${left + index}"]`
            );
            if (tileElementPositiveVx.id === 'toba' || tileElementPositiveVx.id === 'right' || tileElementPositiveVx.id === 'top' || tileElementPositiveVx.id === 'left' || tileElementPositiveVx.id === 'tree' || tileElementPositiveVx.id === 'down') fpvx = true;
        }
        if (fnvx === false) {
            tileElementNegativeVx = document.querySelector(
                `[data-row="${top}"][data-col="${left + (-index)}"]`
            );
            if (tileElementNegativeVx.id === 'toba' || tileElementNegativeVx.id === 'right' || tileElementNegativeVx.id === 'top' || tileElementNegativeVx.id === 'left' || tileElementNegativeVx.id === 'tree' || tileElementNegativeVx.id === 'down') fnvx = true;
        }
        if (fpvy === false) {
            tileElementPositiveVy = document.querySelector(
                `[data-row="${top + index}"][data-col="${left}"]`
            );
            if (tileElementPositiveVy.id === 'toba' || tileElementPositiveVy.id === 'right' || tileElementPositiveVy.id === 'top' || tileElementPositiveVy.id === 'left' || tileElementPositiveVy.id === 'tree' || tileElementPositiveVy.id === 'down') fpvy = true;
        }
        if (fnvy === false) {
            tileElementNegativeVy = document.querySelector(
                `[data-row="${top + (-index)}"][data-col="${left}"]`
            );
            if (tileElementNegativeVy.id === 'toba' || tileElementNegativeVy.id === 'right' || tileElementNegativeVy.id === 'top' || tileElementNegativeVy.id === 'left' || tileElementNegativeVy.id === 'tree' || tileElementNegativeVy.id === 'down') fnvy = true;
        }

        debugInfo["tileElementPositiveVx"] = tileElementPositiveVx.id;
        debugInfo["tileElementNegativeVx"] = tileElementNegativeVx.id;
        debugInfo["tileElementPositiveVy"] = tileElementPositiveVy.id;
        debugInfo["tileElementNegativeVy"] = tileElementNegativeVy.id;

        const tileElements = [
            tileElementPositiveVx,
            tileElementNegativeVx,
            tileElementPositiveVy,
            tileElementNegativeVy
        ];

        tileElements.forEach(tileElement => {
            if (tileElement && (tileElement.id === 'grass' || tileElement.id === 'tree')) {
                const rect = tileElement.getBoundingClientRect();
                exploAdd.push({ nickname, top: rect.top, left: rect.left, time })

                if (tileElement.id === 'tree') {
                    let row = tileElement.getAttribute('data-row')
                    let col = tileElement.getAttribute('data-col')

                    ws.send(JSON.stringify({
                        type: "generet_item",
                        row,
                        col,
                    }))
                }
            }
        });
        console.log(Status.players);

        StateManagement.set({ explosions: [...(StateManagement.get()?.explosions || []), ...exploAdd] })
    }
}

function handleExplosions(bombsfiler) {
    let ischange = false
    bombsfiler = bombsfiler.filter(bomb => {
        if (Date.now() - bomb.time > Status.TIME_EXPLOSION_BOMB) {
            explosionEffect(bomb.xgrid, bomb.ygrid)
            if (bomb.nickname === nickname) {
                Status.numberCanSetBomb += 1
            }
            ischange = true
            return false
        }
        return true
    })
    return { ischange, bombsfiler }
}
function handleExplosionsEffect(exploFilter) {
    let ischangeExp = false
    exploFilter = exploFilter.filter(explo => {
        if (Date.now() - explo.time > 1000) {
            ischangeExp = true
            return false
        }
        return true
    })
    return { ischangeExp, exploFilter }
}
function vdmBombs(xgrid, ygrid) {
    const tileElement = document.querySelector(
        `[data-row="${xgrid}"][data-col="${ygrid}"]`
    );
    const rect = tileElement.getBoundingClientRect();
    const spriteScaleFactor = Status.tileSize / 32;

    return (
        vdm("div", {
            class: "bomb",
            style: `
                width: ${Status.tileSize}px;
                height: ${Status.tileSize}px;
                transform: translate(${rect.left}px, ${rect.top}px);
                 --bomb-width: ${32 * spriteScaleFactor}px;
                --bomb-height: ${32 * spriteScaleFactor}px;
                --bomb-sheet-width: ${96 * spriteScaleFactor}px;`
        }));
}

function placeAbomb(xgrid, ygrid) {
    const now = Date.now()
    StateManagement.set({
        bombs: [...(StateManagement.get()?.bombs || []), { nickname, xgrid, ygrid, time: now }]
    });
    Status.numberCanSetBomb -= 1
    ws.send(JSON.stringify({
        type: "set_bomb",
        xgrid,
        ygrid,
        time: now
    }));
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
    debugInfo["uniqueTiles"] = uniqueTiles.map(tile => `(${tile.gridX + 1}, ${tile.gridY + 1})`).join(", ");
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
    speedX = Status.tileSize / 20;
    speedY = Status.tileSize / 20;

    if (playerRegistry.currentPlayer) {
        const currPlayer = document.getElementById("current-player");
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
                    xPos = xPos * ratio;
                    yPos = yPos * ratio;
                    currPlayer.style.transform = `translate(${xPos}px, ${yPos}px)`;
                }
            }
        }
    }

    for (const [nickname, data] of Object.entries(playerRegistry.otherPlayers)) {
        const playerEl = document.getElementById(`other-player-${nickname}`);
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
    playerRegistry.currentPlayer = { position: pos };

    function initGame(ele) {
        if (xPos !== null || yPos !== null) return;
        currPlayer = ele
        const tileElementInit = document.querySelector(`[data-row="1"][data-col="1"]`);
        const tileRectInit = tileElementInit.getBoundingClientRect();

        let diff = (Status.tileSize / 100) * 10;

        playerWidth = Status.tileSize - diff;
        playerHeight = Status.tileSize - diff;
        speedX = Status.tileSize / 20;
        speedY = Status.tileSize / 20;

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
            Status.players[nickname] = { xPos, yPos }
            updatePlayerState("idle");
        }

        debugInfo["Player Size"] = `Width: ${playerWidth}, Height: ${playerHeight}`;
        EventSystem.add(document, "keydown", (e) => { keysPressed[e.key] = true; });
        EventSystem.add(document, "keyup", (e) => { keysPressed[e.key] = false; });

        startGameLoop();
        playerRegistry.oldTileSize = Status.tileSize;

        // console.log(EventSystem.events); 
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
        let allowd = {
            "grass": true,
            "apple": true,
            "corn": true,
            "sombola": true
        }
        return {
            id: tileElement.id,
            walkable: tileElement ? (allowd[tileElement.id] === true) : false
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
            debugInfo["cornerTilesBool"] = ''
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
        debugInfo["cornerTilesBool"] = cornerTilesBool.map(info => info.walkable).join(", ");
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
        debugInfo["tiles"] = tiles.uniqueTiles.map(tile => `(${tile.gridX + 1}, ${tile.gridY + 1})`).join(", ");
        tiles.uniqueTiles.forEach((tile, index) => {
            const tileInfo = getTileInfo(tile.gridX, tile.gridY);
            debugInfo[`Tile ${index + 1}`] =
                `(${tile.gridX + 1}, ${tile.gridY + 1}) - Type: ${tileInfo.id || 'unknown'} - ${tileInfo.walkable ? 'walkable' : 'blocked'}`;
        });
        const canMove = tiles.uniqueTiles.every(tile => {
            const tileInfo = getTileInfo(tile.gridX, tile.gridY);
            if (tileInfo.walkable === false) {
                turnToDirection = checkCorners(tiles.corners);
            }
            return tileInfo.walkable;
        });
        turnToDirection.canMove = canMove;
        debugInfo["Can Move"] = canMove ? "Yes" : "No";
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

    function startGameLoop() {
        function gameLoop(timetamp) {
            // Update speed dynamically based on current tile size
            speedX = Status.tileSize / 20;
            speedY = Status.tileSize / 20;

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
                    Status.players[nickname] = { xPos, yPos }

                }
                sendPosition();
            } else if (isMoving) {
                updatePlayerState("idle", lastDirection);
                sendPosition();
            }
            function sendPosition() {
                const tiles = getPlayerTiles(xPos, yPos);
                let xgrid = tiles.uniqueTiles[0].gridY + 1;
                let ygrid = tiles.uniqueTiles[0].gridX + 1;
                let tile = getTileInfo(xgrid, ygrid)
                console.log(tile.id);
                switch (tile.id) {
                    case "apple":
                        console.log(tile.id, "--------------------------------");
                        break;
                    case "corn":
                        console.log(tile.id, "--------------------------------");
                        break;
                    case "sombola":
                        console.log(tile.id, "--------------------------------");
                        break;
                }
                ws.send(JSON.stringify({
                    type: "player_moveng",
                    xPos: xPos / Status.tileSize,
                    yPos: yPos / Status.tileSize,
                    direction: lastClass,
                }));
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
            if (ischange) StateManagement.set({ bombs: bombsfiler })

            let { ischangeExp, exploFilter } = handleExplosionsEffect(StateManagement.get()?.explosions || [])
            if (ischangeExp) StateManagement.set({ explosions: exploFilter })


            animationFrameId = requestAnimationFrame(gameLoop);
        }

        animationFrameId = requestAnimationFrame(gameLoop);
    }

    return vdm("div", {
        id: "current-player",
        class: "current-player idle-down", // default state
        ref: initGame
    });
}

let isfirst = false

function SetOtherPlayerAndMove(isMove, data, nam, initialPos = [1, 1]) {
    let playerEl;

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

    if (!playerRegistry.otherPlayers[nam]) {
        playerRegistry.otherPlayers[nam] = {
            initialPos: initialPos,
            xPos: initialPos[1] - 1,
            yPos: initialPos[0] - 1
        };
    }

    function move() {
        const playerEl = document.getElementById(`other-player-${data.nickname}`);
        if (!playerEl) return;
        playerEl.style.transform = `translate(${(data.xPos * Status.tileSize)}px, ${(data.yPos * Status.tileSize)}px)`;
        playerEl.classList.remove("right", "left", "top", "down", "idle", "idle-right", "idle-left", "idle-top", "idle-down");
        playerEl.classList.add(data.direction);
    }

    function initPlayer(ele) {
        if (isfirst) return;
        isfirst = true;
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
                let xPos = ((initialPos[1] - 1) * Status.tileSize)
                let yPos = ((initialPos[0] - 1) * Status.tileSize)
                playerEl.style.transform = `translate(${xPos}px, ${yPos}px)`;
                Status.players[nam] = { xPos, yPos }

                const spriteScaleFactor = playerHeight / 32;
                playerEl.style.setProperty('--sprite-width', `${32 * spriteScaleFactor}px`);
                playerEl.style.setProperty('--sprite-height', `${32 * spriteScaleFactor}px`);
                playerEl.style.setProperty('--sprite-sheet-width', `${128 * spriteScaleFactor}px`);
            }
        }

        playerRegistry.oldTileSize = Status.tileSize;
    }

    return (
        vdm("div", {
            id: `other-player-${nam}`,
            class: "current-player idle-down",
            ref: initPlayer,
        },
            vdm("div", { class: "name_up_player" }, nam)
        ));
}