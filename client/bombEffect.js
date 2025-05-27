import { nickname, ws } from "./app.js";
import { StateManagement, vdm } from "./miniframework.js";
import { getPlayerTiles } from "./players.js";
import { Status } from "./status.js";

export { vdmBombs, vdmExplosion, handleExplosions, handleExplosionsEffect, placeAbomb}

function vdmExplosion(explo) {
    let tile = document.querySelector(
        `[data-row="${explo.row}"][data-col="${explo.col}"]`
    );
    if (!tile) return;

    const rect = tile.getBoundingClientRect();
    const spriteScaleFactor = Status.tileSize / 32;

    return vdm("div", {
        id: "fire",
        class: "explosion",
        style: `
            width: ${Status.tileSize}px;
            height: ${Status.tileSize}px;
            transform: translate(${rect.left}px, ${rect.top}px);
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
    let playerKilled = {};

    exploAdd.push({ nickname, row: top, col: left, time })
    killPlayer(top, left);
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

        const tileElements = [
            tileElementPositiveVx,
            tileElementNegativeVx,
            tileElementPositiveVy,
            tileElementNegativeVy
        ];

        tileElements.forEach(tileElement => {
            if (tileElement && (tileElement.id === 'tree' || Status.allowd[tileElement.id])) {
                let row = tileElement.getAttribute('data-row')
                let col = tileElement.getAttribute('data-col')
                exploAdd.push({ nickname, row, col, time })

                if (tileElement.id === 'tree') {

                    ws.send(JSON.stringify({
                        type: "generet_item",
                        row,
                        col,
                    }))
                }
                killPlayer(row, col);
            }
        });
    }
    function killPlayer(row, col) {
        let playersPos = Status.players;
        for (const [key, value] of Object.entries(playersPos)) {
            let playerPos = getPlayerTiles(value.xPos, value.yPos)

            playerPos.uniqueTiles.forEach((tile) => {
                if (tile.gridY + 1 == row && tile.gridX + 1 == col) {
                    playerKilled[key] = true;
                    flage = 1;
                }
            })
        }
    }

    for (const [key, value] of Object.entries(playerKilled)) {
        if (value === true) {
            Status.life[key] -= 1
            if (Status.life[key] === 0) {
                Status.playersDead[key] = true
            }
        }
    }
    ws.send(JSON.stringify({
        type: "explo_effect",
        exploAdd
    }))
    ws.send(JSON.stringify({
        type: "players_life",
        life: Status.life
    }))
}

function handleExplosions(bombsfiler) {
    let ischange = false
    bombsfiler = bombsfiler.filter(bomb => {
        if (Date.now() - bomb.time > Status.TIME_EXPLOSION_BOMB) {
            if (bomb.nickname === nickname) {
                explosionEffect(bomb.xgrid, bomb.ygrid, bomb.bombPower)
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
        if (Date.now() - explo.time > 900) {
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
    if (!tileElement) return;

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