const express = require('express')
const http = require('http')
const socketIO = require('socket.io')

let plays = [];

const MATRIX_WIDTH = 20;
const MATRIX_HEIGHT = 20;
const matrix = [];
const DEFAULT_COLOR = 'black';
const COLOR_LIST = ['red', 'blue', 'green', 'purple', 'yellow'];

let STARTED = false;
let NB_PLAYER = 1;
const MAX_BUFFER_BY_PLAYER = 3;
let BUFFER = {};

// GameLoop
setInterval(() => {
  const indexToPlay = plays.findIndex(play => play && play.color);
  if(indexToPlay !== -1) {
    const currentPlay = {...plays.splice(indexToPlay, 1, null)[0]};
    BUFFER[currentPlay.color]--;
    play(currentPlay);
  }
}, 200);


/**
 * initGame
 */
const initGame = () => {
  for (var i = 0; i < MATRIX_HEIGHT; i++) {
    if(!matrix[i]) matrix[i] = [];
    for (var j = 0; j < MATRIX_WIDTH; j++) {
      matrix[i][j] = DEFAULT_COLOR;
    }
  }
  plays = [];
  COLOR_LIST.forEach(color => BUFFER[color] = 0)
}

// Init Game
initGame();

/**
 * Is there at least one other {color} in the row or columns
 * @param {*} iTest
 * @param {*} jTest
 * @param {*} color
 */
const searchOnLines = (iTest , jTest , color) => {
  for (var i = 0; i < MATRIX_HEIGHT; i++) {
    if(matrix[i][jTest] === color) return true;
  }
  for (var j = 0; j < MATRIX_WIDTH; j++) {
    if(matrix[iTest][j] === color) return true;
  }
  return false;
}

/**
 * fillWithColor
 * @param {*} iTest
 * @param {*} jTest
 * @param {*} color
 */
const fillWithColor = (iTest, jTest, color) => {
  matrix[iTest][jTest] = color;

  // Complete AfterInRow
  var foundAfterInRow = false;
  const foundAfterInRowList = [];
  for (var i = (iTest + 1); i < MATRIX_HEIGHT; i++) {
    if(matrix[i][jTest] === color) {
      foundAfterInRow = true;
      break;
    }
    foundAfterInRowList.push(i);
  }
  if(foundAfterInRow) {
    foundAfterInRowList.forEach(e => matrix[e][jTest] = color)
  }
  // Complete BeforeInRow
  var foundBeforeInRow = false;
  const foundBeforeInRowList = [];
  for (var i = (iTest - 1); i >= 0; i--) {
    if(matrix[i][jTest] === color) {
      foundBeforeInRow = true;
      break;
    }
    foundBeforeInRowList.push(i);
  }
  if(foundBeforeInRow) {
    foundBeforeInRowList.forEach(e => matrix[e][jTest] = color)
  }
  // Complete AfterInCol
  var foundAfterInCol = false;
  const foundAfterInColList = [];
  for (var j = (jTest + 1); j < MATRIX_WIDTH; j++) {
    if(matrix[iTest][j] === color) {
      foundAfterInCol = true;
      break;
    }
    foundAfterInColList.push(j);
  }
  if(foundAfterInCol) {
    foundAfterInColList.forEach(e => matrix[iTest][e] = color)
  }
  // Complete BeforeInCol
  var foundBeforeInCol = false;
  const foundBeforeInColList = [];
  for (var j = (jTest - 1); j >= 0; j--) {
    if(matrix[iTest][j] === color) {
      foundBeforeInCol = true;
      break;
    }
    foundBeforeInColList.push(j);
  }
  if(foundBeforeInCol) {
    foundBeforeInColList.forEach(e => matrix[iTest][e] = color)
  }

}

/**
 * emitOK
 * @param {*} req
 * @param {*} res
 */
const emitOK = (req, res) => {
  io.sockets.emit('refresh', {
    matrix,
    uri: req.url,
  });
  res.send({
    status: 'DONE',
    uri: req.url,
    matrix,
  });
}
const emitError = (req, res, errorName) => {
  io.sockets.emit('error', {
    uri: req.url,
    errorName
  });
  res.status(400).send({
    status: errorName,
    uri: req.url,
    matrix,
  })
}

/**
 * getRandomInt
 * @param {*} min
 * @param {*} max
 */
const getRandomInt = (min, max) => Math.floor(Math.random() * ((max - min) + 1)) + min;

/**
 * randomOnMatrix
 * @param {*} color
 */
const randomOnMatrix = (color) => {
  const i = getRandomInt(0, MATRIX_WIDTH - 1);
  const j = getRandomInt(0, MATRIX_HEIGHT - 1);
  if(matrix[i][j] === DEFAULT_COLOR) {
    matrix[i][j] = color;
    return true;
  } else return randomOnMatrix(color);
}

/**
 * play
 * @param {*} req
 * @param {*} res
 * @param {*} i
 * @param {*} j
 * @param {*} color
 */
const play = ({ req, res, i, j, color }) => {

  const iInt = parseInt(i, 10);
  const jInt = parseInt(j, 10);

  if(matrix[iInt][jInt] !== DEFAULT_COLOR) {
    emitError(req, res, 'ANOTHER_PLAYER_HERE');
    return;
  }

  if(!searchOnLines(iInt, jInt, color)) {
    emitError(req, res, 'NO_OTHER_SAME_COLOR');
    return;
  }

  fillWithColor(iInt, jInt, color);
  emitOK(req, res);
}


// our localhost port
const port = 3005

const app = express()

app.use(express.static('public'))

app.get('/status', (req, res) => {
  res.send({
    status: 'OK',
    matrix,
  });
})

app.get('/start/:nb', (req, res) => {
  /*if(STARTED) {
    emitError(req, res, 'ALREADY_STARTED');
    return;
  }*/
  const { nb } = req.params;
  if(nb === undefined) {
    emitError(req, res, 'MISSING_PARAMS');
    return;
  }
  if(parseInt(nb, 10) > 5) {
    emitError(req, res, 'TOO_MANY_PLAYERS');
    return;
  }
  console.log(`[START] ${nb} players`);
  initGame();

  for (var i = 0; i < nb; i++) {
    // 2 cases per player
    randomOnMatrix(COLOR_LIST[i])
    randomOnMatrix(COLOR_LIST[i])
  }
  STARTED = true;
  NB_PLAYER = parseInt(nb, 10);
  emitOK(req, res);
})

app.get('/play/:color/:i/:j', (req, res) => {
  if(!STARTED) {
    emitError(req, res, 'NOT_STARTED');
    return;
  }
  const { i, j, color } = req.params;

  if(i === undefined
    || j === undefined
    || color === undefined) {
    emitError(req, res, 'MISSING_PARAMS');
    return;
  }

  if(BUFFER[color] >= MAX_BUFFER_BY_PLAYER) {
    emitError(req, res, 'TOO_MANY_QUERIES');
    return;
  }

  BUFFER[color]++;
  plays.push({ req, res, i, j, color });
})

// our server instance
const server = http.createServer(app)

// This creates our socket using the instance of the server
const io = socketIO(server)

// This is what the socket.io syntax is like, we will work this later
io.on('connection', socket => {
  console.log('User connected')
  socket.emit('refresh', {
    matrix,
    uri: STARTED ? 'Already started' : 'Not started yet',
  });

  socket.on('disconnect', () => {
    console.log('user disconnected')
  })
})

server.listen(port, () => console.log(`Listening on port ${port}`))
