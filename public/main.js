var TABLE_LOADED = false;
var CURRENT_PLAYER = undefined;

// Start
function start() {
	document.getElementById('log').innerHTML = '';
	fetch('/restart');
}
// Pass
function pass() {
	fetch(`/pass/${CURRENT_PLAYER}`);
}

// Add action in log Panel
function addAction({ status, play }) {
	const div = document.createElement('div');
	let message = '';
	if (play && play.i !== undefined) {
		message = `<span class="log-play log-play-${play.color}">i${play.i} / j${play.j}</span>`;
	} else if (play && play.color) {
		message = `<span class="log-play log-play-${play.color}">NO PLAY</span>`;
	}
	div.innerHTML = `${message}<span class="log-play">${status}</span>`;
	div.className = 'log-entry';
	document.getElementById('log').appendChild(div);
	document.getElementById('log').scrollTo(0, document.getElementById('log').scrollHeight);
}
// reloadTable
function reloadTable({ matrix, uri, next, status, playablePlaces, counter, pass, play }) {
	addAction({
		status,
		play,
	});
	if (!TABLE_LOADED) {
		document.getElementById('gameboard').innerHTML = '';
		const table = document.createElement('table');
		document.getElementById('gameboard').appendChild(table);
		for (var i = 0; i < matrix.length; i++) {
			var tr = document.createElement('tr');
			table.appendChild(tr);
			for (var j = 0; j < matrix[i].length; j++) {
				var tdElement = document.createElement('td');
				tr.appendChild(tdElement);
				var span = document.createElement('span');
				span.setAttribute('url', `./play/${next}/${i}/${j}`);
				span.onclick = function() {
					fetch(this.getAttribute('url'));
				};
				span.className = `piece piece-${matrix[i][j]} pos-${i}-${j}`;
				tdElement.appendChild(span);
			}
		}
	}

	for (var i = 0; i < matrix.length; i++) {
		for (var j = 0; j < matrix[i].length; j++) {
			var elem = document.getElementsByClassName(`pos-${i}-${j}`)[0];
			elem.setAttribute('url', `./play/${next}/${i}/${j}`);
			if (!elem.classList.contains(`piece-${matrix[i][j]}`)) {
				elem.classList.remove(`piece-black`);
				elem.classList.remove(`piece-white`);
				elem.classList.remove(`piece-green`);

				if (matrix[i][j] !== 'green') elem.classList.add(`piece-${matrix[i][j]}`);
			}
			elem.classList.remove(`piece-border-white`);
			elem.classList.remove(`piece-border-black`);
			if (playablePlaces.some((p) => p[0] === i && p[1] === j)) {
				elem.classList.add(`piece-border-${next}`);
			}
		}
	}

	document.getElementById('counter-black').innerHTML = counter.black;
	document.getElementById('counter-white').innerHTML = counter.white;
	document.getElementById('btn-pass').classList.remove(`btn-black`);
	document.getElementById('btn-pass').classList.remove(`btn-white`);
	document.getElementById('btn-pass').classList.add(`btn-${next}`);
	document.getElementById('btn-pass').removeAttribute('disabled');
	if (playablePlaces.length !== 0) {
		document.getElementById('btn-pass').setAttribute('disabled', 'disabled');
		document.getElementById('btn-pass').innerHTML = `${playablePlaces.length} plays`;
	} else {
		document.getElementById('btn-pass').innerHTML = `Pass turn`;
	}
	TABLE_LOADED = true;
	CURRENT_PLAYER = next;
}

const socket = io('http://localhost:3005');
socket.on('refresh', reloadTable);
socket.emit('change color', 'red');
