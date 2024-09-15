import { io } from 'socket.io-client';
import { ApplicationConstants } from './constants';
import { parentPort } from 'worker_threads';

const port = parseInt(process.env[ApplicationConstants.KarmaSocketPort]!);
const socket = io('http://localhost:' + port + '/', {
	forceNew: true,
	reconnection: true
});

parentPort!.on('message', (event: any) => {
	socket.emit(event.key, event?.results);
});
