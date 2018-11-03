// TARS
const axios = require('axios');
const socket = require('socket.io-client')('http://localhost:3005');
const color = process.argv[2];

socket.on('connect', () => console.log('[TARS] connect'));
socket.on('disconnect', () => console.log('[TARS] disconnect'));
socket.on('refresh', ({ next, playablePlaces, status }) => {
	if (color === next) {
		if (status.indexOf('END_') > -1) {
			// DO NOTHING
		} else if (playablePlaces.length === 0) {
			console.log('[TARS] pass');
			socket.emit('pass', {
				color,
			});
		} else {
			const play = playablePlaces[Math.floor(Math.random() * playablePlaces.length)];
			console.log('[TARS] refresh', play);
			setTimeout(() => {
				socket.emit('play', {
					i: play[0],
					j: play[1],
					color,
				});
			}, 300);
		}
	}
});
