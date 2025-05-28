export const Status = {
  tileSize: 0, // this var have value in function (Game => contanerRef)
  TIME_EXPLOSION_BOMB: 2000,
  numberCanSetBomb: 1,
  players: {},
  bombPower: 2,
  Speed: 0,
  allowd: {
    "grass": true,
    "apple": true,
    "corn": true,
    "sombola": true
  },
  life: {},
  isGameOver: false,
  playersDead: {},
  onInputMsg: "",
  gameInitializing: false,
}