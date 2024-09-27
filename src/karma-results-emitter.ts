import { io } from 'socket.io-client';
import { ApplicationConstants } from './constants';
import { parentPort } from 'worker_threads';

const KARMA_SOCKET_PING_INTERVAL = 1000 * 60 * 60 * 24;
const KARMA_SOCKET_PING_TIMEOUT = 1000 * 60 * 60 * 24;
const port = parseInt(process.env[ApplicationConstants.KarmaSocketPort]!);
const socket = io('http://localhost:' + port + '/', {
	forceNew: true,
	reconnection: true
});

Object.assign(socket, {
	pingTimeout: KARMA_SOCKET_PING_TIMEOUT,
	pingInterval: KARMA_SOCKET_PING_INTERVAL
});

parentPort!.on('message', (event: any) => {
	socket.emit(event.key, event?.results);
});
