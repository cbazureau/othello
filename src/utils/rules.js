const DEFAULT_COLOR = 'green';
const COLOR_LIST = [ 'white', 'black' ];
const MATRIX_WIDTH = 8;
const MATRIX_HEIGHT = 8;

const STATUS = {
	OK: 'OK',
	ANOTHER_PLAYER_HERE: 'ANOTHER_PLAYER_HERE',
	IMPOSSIBLE_PLAY: 'IMPOSSIBLE_PLAY',
	NOT_YOUR_TURN: 'NOT_YOUR_TURN',
	NOT_STARTED: 'NOT_STARTED',
	MISSING_PARAMS: 'MISSING_PARAMS',
	YOU_CANNOT_PASS: 'YOU_CANNOT_PASS',
	END_WHITE_VICTORY: 'END_WHITE_VICTORY',
	END_BLACK_VICTORY: 'END_BLACK_VICTORY',
	END_DRAW: 'END_DRAW',
};

/**
 * getOppositeColor
 * @param {*} color
 */
const getOppositeColor = (color) => {
	const nextIndex = (COLOR_LIST.indexOf(color) + 1) % COLOR_LIST.length;
	return COLOR_LIST[nextIndex];
};

/**
 * checkDirection
 * @param {*} matrix
 * @param {*} iTest
 * @param {*} jTest
 * @param {*} iVector
 * @param {*} jVector
 * @param {*} color
 */
const checkDirection = (matrix, iTest, jTest, iVector, jVector, color) => {
	const flippableCases = [];
	const iStart = iTest + iVector;
	const jStart = jTest + jVector;
	let i = iStart;
	let j = jStart;
	if (
		!matrix[iStart] ||
		matrix[iStart][jStart] === undefined ||
		matrix[iStart][jStart] === DEFAULT_COLOR ||
		matrix[iStart][jStart] === color
	) {
		return [];
	}
	flippableCases.push([ iStart, jStart ]);
	while (i < MATRIX_HEIGHT && i >= 0 && j < MATRIX_WIDTH && j >= 0) {
		if (matrix[i][j] === DEFAULT_COLOR) {
			return [];
		}
		if (matrix[i][j] === color) {
			return flippableCases;
		}
		flippableCases.push([ i, j ]);
		i = i + iVector;
		j = j + jVector;
	}
	return [];
};

/**
 * estimatePlay
 * @param {*} matrix
 * @param {*} iInt
 * @param {*} jInt
 * @param {*} color
 */
const estimatePlay = (matrix, iInt, jInt, color) => {
	if (matrix[iInt][jInt] !== DEFAULT_COLOR) {
		return {
			status: STATUS.ANOTHER_PLAYER_HERE,
		};
	}
	const results = [
		...checkDirection(matrix, iInt, jInt, -1, -1, color),
		...checkDirection(matrix, iInt, jInt, -1, 0, color),
		...checkDirection(matrix, iInt, jInt, -1, 1, color),
		...checkDirection(matrix, iInt, jInt, 0, -1, color),
		...checkDirection(matrix, iInt, jInt, 0, 0, color),
		...checkDirection(matrix, iInt, jInt, 0, 1, color),
		...checkDirection(matrix, iInt, jInt, 1, -1, color),
		...checkDirection(matrix, iInt, jInt, 1, 0, color),
		...checkDirection(matrix, iInt, jInt, 1, 1, color),
	];

	if (results.length === 0) {
		return {
			status: STATUS.IMPOSSIBLE_PLAY,
		};
	}

	const finalResults = [];
	for (var i = 0; i < results.length; i++) {
		if (!finalResults.some((r) => r[0] === results[i][0] && r[1] === results[i][1])) {
			finalResults.push(results[i]);
		}
	}

	return {
		status: STATUS.OK,
		results: finalResults,
	};
};

/**
 * playablePlaces
 * @param {*} matrix
 * @param {*} color
 */
const playablePlaces = (matrix, color) => {
	const pp = [];
	for (var i = 0; i < MATRIX_HEIGHT; i++) {
		for (var j = 0; j < MATRIX_WIDTH; j++) {
			const { status, results } = estimatePlay(matrix, i, j, color);
			if (status === STATUS.OK) pp.push([ i, j, results ]);
		}
	}
	return pp;
};

module.exports = {
	DEFAULT_COLOR,
	COLOR_LIST,
	STATUS,
	MATRIX_WIDTH,
	MATRIX_HEIGHT,
	playablePlaces,
	checkDirection,
	getOppositeColor,
	estimatePlay,
};
