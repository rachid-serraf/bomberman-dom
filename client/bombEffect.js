import { nickname, ws } from "./app.js";
import { StateManagement, vdm } from "./miniframework.js";
import { getPlayerTiles } from "./players.js";
import { Status } from "./status.js";
export { vdmExplosion, vdmBombs, handleExplosions, handleExplosionsEffect, placeAbomb }

function vdmExplosion(explo) {
    const spriteScaleFactor = Status.tileSize / 32;

    return vdm("div", {
        id: "fire",
        class: "explosion",
        style: `
            width: ${Status.tileSize}px;
            height: ${Status.tileSize}px;
            transform: translate(${explo.left}px, ${explo.top}px);
            --bomb-width: ${32 * spriteScaleFactor}px;
            --bomb-height: ${32 * spriteScaleFactor}px;
            --bomb-sheet-width: ${192 * spriteScaleFactor}px;`
    });
}

function explosionEffect(top, left, bombPower = Status.bombPower) {
    let tileElementPositiveVx, tileElementNegativeVx, tileElementPositiveVy, tileElementNegativeVy;
    let [fpvx, fnvx, fpvy, fnvy] = [false, false, false, false];

    const time = Date.now();
    let exploAdd = []
    let flage = 0;

    for (let index = 0; index < bombPower; index++) {
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

        const tileElements = [
            tileElementPositiveVx,
            tileElementNegativeVx,
            tileElementPositiveVy,
            tileElementNegativeVy
        ];
        tileElements.forEach(tileElement => {
            if (tileElement && (tileElement.id === 'tree' || Status.allowd[tileElement.id])) {
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
                let playersPos = Status.players;
                for (const [key, value] of Object.entries(playersPos)) {
                    let playerPos = getPlayerTiles(value.xPos, value.yPos)

                    playerPos.uniqueTiles.forEach((tile) => {
                        if (tile.gridY + 1 == tileElement.getAttribute('data-row') && tile.gridX + 1 == tileElement.getAttribute('data-col') && !flage) {

                            Status.life[key] -= 1
                            // console.log(Status.life);

                            if (Status.life[key] === 2) {
                                // if (key === nickname) {
                                //     Status.isGameOver = true
                                //     // return
                                // }
                                // let players = StateManagement.get().MapState.players
                                // delete players[key]
                                Status.playersDead[key] = true
                                // console.log("dead players",Status.playersDead);
                                // console.log("all players", players);

                                // console.log(playerRegistry.otherPlayers[key]);
                                // delete playerRegistry.otherPlayers[key]
                                // console.log(playerRegistry.otherPlayers[key]);

                                // StateManagement.set({ MapState: { ...StateManagement.get().MapState, players: players } })
                            }

                            flage = 1;
                        }
                    })
                }
            }
        });
        StateManagement.set({ explosions: [...(StateManagement.get()?.explosions || []), ...exploAdd] })
    }
}

function handleExplosions(bombsfiler) {
    let ischange = false
    bombsfiler = bombsfiler.filter(bomb => {
        if (Date.now() - bomb.time > Status.TIME_EXPLOSION_BOMB) {
            explosionEffect(bomb.xgrid, bomb.ygrid, bomb.bombPower)
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
        bombPower: Status.bombPower,
        xgrid,
        ygrid,
        time: now
    }));
}