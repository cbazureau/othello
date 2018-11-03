const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const {
	estimatePlay,
	getOppositeColor,
	playablePlaces,
	STATUS,
	COLOR_LIST,
	DEFAULT_COLOR,
	MATRIX_WIDTH,
	MATRIX_HEIGHT,
} = require('../utils/rules');

let matrix = [];
let STARTED = false;
let NEXT_PLAYER = COLOR_LIST[0];
let PASS = 0;
const COUNTER = {};

/**
 * initGame
 */
const initGame = () => {
	matrix = [];
	for (var i = 0; i < MATRIX_HEIGHT; i++) {
		if (!matrix[i]) matrix[i] = [];
		for (var j = 0; j < MATRIX_WIDTH; j++) {
			matrix[i][j] = DEFAULT_COLOR;
		}
	}
	matrix[3][3] = COLOR_LIST[0];
	matrix[3][4] = COLOR_LIST[1];
	matrix[4][4] = COLOR_LIST[0];
	matrix[4][3] = COLOR_LIST[1];
	COUNTER[COLOR_LIST[0]] = 2;
	COUNTER[COLOR_LIST[1]] = 2;
	STARTED = true;
	NEXT_PLAYER = COLOR_LIST[0];
};

/**
 * emitRefresh
 * @param {*} req
 * @param {*} res
 * @param {*} currentPlay
 * @param {*} status
 */
const emitRefresh = (req, res, currentPlay, status) => {
	const uri = req ? req.url : '';
	const next = NEXT_PLAYER;

	const total = COUNTER.black + COUNTER.white;
	if (PASS === 2 || total === 64) {
		if (COUNTER.black > COUNTER.white) status = STATUS.END_BLACK_VICTORY;
		if (COUNTER.white > COUNTER.black) status = STATUS.END_WHITE_VICTORY;
		if (COUNTER.white === COUNTER.black) status = STATUS.END_DRAW;
	}
	const result = {
		matrix,
		uri,
		status: status || STATUS.OK,
		next,
		play: currentPlay,
		playablePlaces: playablePlaces(matrix, next),
		counter: COUNTER,
		pass: PASS,
	};
	io.sockets.emit('refresh', result);
	if (res && req) res.send(result);
};

/**
 *
 * @param {*} color
 */
const pass = ({ req, res, color }) => {
	if (NEXT_PLAYER !== color) {
		emitRefresh(req, res, { color }, STATUS.NOT_YOUR_TURN);
		return;
	}
	if (playablePlaces(matrix, NEXT_PLAYER).length > 0) {
		emitRefresh(req, res, { color }, STATUS.YOU_CANNOT_PASS);
		return;
	}
	PASS++;
	NEXT_PLAYER = getOppositeColor(color);
	emitRefresh(req, res, { color }, STATUS.OK);
};

/**
 * play
 * @param {*} req
 * @param {*} res
 * @param {*} i
 * @param {*} j
 * @param {*} color
 */
const play = ({ req, res, i, j, color }) => {
	if (!STARTED) {
		emitRefresh(req, res, undefined, STATUS.NOT_STARTED);
		return;
	}

	if (i === undefined || j === undefined || color === undefined) {
		emitRefresh(req, res, undefined, STATUS.MISSING_PARAMS);
		return;
	}

	const iInt = parseInt(i, 10);
	const jInt = parseInt(j, 10);
	const currentPlay = {
		i: iInt,
		j: jInt,
		color,
	};

	if (NEXT_PLAYER !== color) {
		emitRefresh(req, res, currentPlay, STATUS.NOT_YOUR_TURN);
		return;
	}

	const estimation = estimatePlay(matrix, iInt, jInt, color);

	if (estimation.status !== STATUS.OK) {
		emitRefresh(req, res, currentPlay, estimation.status);
		return;
	}

	matrix[iInt][jInt] = color;
	estimation.results.forEach((p) => (matrix[p[0]][p[1]] = color));
	NEXT_PLAYER = getOppositeColor(color);
	COUNTER[color] = COUNTER[color] + estimation.results.length + 1;
	COUNTER[NEXT_PLAYER] = COUNTER[NEXT_PLAYER] - estimation.results.length;
	PASS = 0;

	emitRefresh(req, res, currentPlay, STATUS.OK);
};

// our localhost port
const port = 3005;
const app = express();
app.use(express.static(__dirname + '/public'));

app.get('/status', (req, res) => {
	res.send({
		status: STATUS.OK,
		matrix,
	});
});

app.get('/pass/:color', (req, res) => {
	const { color } = req.params;
	if (color === undefined) {
		emitRefresh(req, res, undefined, STATUS.MISSING_PARAMS);
		return;
	}
	pass({ req, res, color });
});

app.get('/restart', (req, res) => {
	initGame();
	emitRefresh(req, res);
});

app.get('/play/:color/:i/:j', (req, res) => {
	const { i, j, color } = req.params;
	play({ req, res, i, j, color });
});

// our server instance
const server = http.createServer(app);

// initGame
initGame();

// This creates our socket using the instance of the server
const io = socketIO(server);
io.on('connection', (socket) => {
	console.log('[socket] user connected');
	emitRefresh();
	socket.on('play', ({ i, j, color }) => play({ i, j, color }));
	socket.on('pass', ({ color }) => pass({ color }));
	socket.on('disconnect', () => console.log('[socket] user disconnected'));
});
server.listen(port, () => console.log(`Listening on port ${port}`));
