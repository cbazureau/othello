const express = require('express')
const http = require('http')
const socketIO = require('socket.io')

const MATRIX_WIDTH = 8;
const MATRIX_HEIGHT = 8;
const matrix = [];
const DEFAULT_COLOR = 'green';
const COLOR_LIST = ['white', 'black'];

let STARTED = false;
let NEXT_PLAYER = COLOR_LIST[0];

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
}

// Init Game
initGame();

/**
 * checkDirection
 * @param {*} iTest
 * @param {*} jTest
 * @param {*} iVector
 * @param {*} jVector
 * @param {*} color
 */
const checkDirection = (iTest, jTest, iVector, jVector, color) => {
  const flippableCases = [];
  const iStart = (iTest + iVector);
  const jStart = (jTest + jVector);
  let i = iStart;
  let j = jStart;
  if(!matrix[iStart]
    || !matrix[iStart][jStart]
    || matrix[iStart][jStart] === DEFAULT_COLOR
    || matrix[iStart][jStart] === color) {
    return [];
  }
  flippableCases.push([iStart, jStart]);
  while(i < MATRIX_HEIGHT && i > 0 && j < MATRIX_WIDTH && j > 0) {
    if(matrix[i][j] === DEFAULT_COLOR) {
      return [];
    }
    if(matrix[i][j] === color) {
      return flippableCases;
    }
    flippableCases.push([i, j]);
    i = i + iVector;
    j = j + jVector;
  }
  return [];
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
    next: NEXT_PLAYER,
  });
  res.send({
    status: 'DONE',
    uri: req.url,
    matrix,
  });
}

/**
 * emitError
 * @param {*} req
 * @param {*} res
 * @param {*} errorName
 */
const emitError = (req, res, errorName) => {
  io.sockets.emit('error', {
    uri: req.url,
    errorName,
    next: NEXT_PLAYER,
  });
  res.status(400).send({
    status: errorName,
    uri: req.url,
    matrix,
  })
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

  if(i === undefined
    || j === undefined
    || color === undefined) {
    emitError(req, res, 'MISSING_PARAMS');
    return;
  }

  const iInt = parseInt(i, 10);
  const jInt = parseInt(j, 10);

  if(NEXT_PLAYER !== color) {
    emitError(req, res, 'NOT_YOUR_TURN');
    return;
  }

  if(matrix[iInt][jInt] !== DEFAULT_COLOR) {
    emitError(req, res, 'ANOTHER_PLAYER_HERE');
    return;
  }

  const results = [
    ...checkDirection(iInt, jInt, -1, -1, color),
    ...checkDirection(iInt, jInt, -1, 0, color),
    ...checkDirection(iInt, jInt, -1, 1, color),
    ...checkDirection(iInt, jInt, 0, -1, color),
    ...checkDirection(iInt, jInt, 0, 0, color),
    ...checkDirection(iInt, jInt, 0, 1, color),
    ...checkDirection(iInt, jInt, 1, -1, color),
    ...checkDirection(iInt, jInt, 1, 0, color),
    ...checkDirection(iInt, jInt, 1, 1, color),
  ]

  if(results.length === 0) {
    emitError(req, res, 'IMPOSSIBLE_PLAY');
    return;
  }

  matrix[iInt][jInt] = color;

  results.forEach(p => matrix[p[0]][p[1]] = color);
  const nextIndex = (COLOR_LIST.indexOf(NEXT_PLAYER) + 1) % COLOR_LIST.length;
  console.log('nextIndex', nextIndex)
  NEXT_PLAYER = COLOR_LIST[nextIndex];

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
});

app.get('/start', (req, res) => {
  console.log(`[START] 2 players game`);
  initGame();
  matrix[3][3] = COLOR_LIST[0];
  matrix[3][4] = COLOR_LIST[1];
  matrix[4][4] = COLOR_LIST[0];
  matrix[4][3] = COLOR_LIST[1];
  STARTED = true;
  NEXT_PLAYER = COLOR_LIST[0];
  emitOK(req, res);
})

app.get('/play/:color/:i/:j', (req, res) => {
  if(!STARTED) {
    emitError(req, res, 'NOT_STARTED');
    return;
  }
  const { i, j, color } = req.params;

  play({ req, res, i, j, color });
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
    next: NEXT_PLAYER,
  });

  socket.on('disconnect', () => {
    console.log('user disconnected')
  })
})

server.listen(port, () => console.log(`Listening on port ${port}`))
