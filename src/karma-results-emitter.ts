import { Server } from 'socket.io';
import getAvailablePorts from './port-finder';

let server: Server | null = null;
let serverPromise: Promise<Server> | null = null;

const initializeServer = () => {
	if (!serverPromise) {
		serverPromise = getAvailablePorts()
			.then((ports) => {
				console.log('<--------> ~ ports inside server promise ~ ports:', ports);
				server = new Server(ports[1]);
				return server;
			})
			.catch((error) => {
				console.error('Error initializing server:', error);
				throw error; // Re-throw the error to propagate it to the caller
			});
	}
	return serverPromise;
};

export const emitServerData = (key: string, data: any) => {
	initializeServer()
		.then((s) => {
			s.emit(key, data);
		})
		.catch((error) => {
			console.error('Error in server.then inside emitServerData:', error);
		});
};
