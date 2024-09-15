import { Server } from 'socket.io';
import { ApplicationConstants } from './constants';

const port = parseInt(process.env[ApplicationConstants.KarmaSocketPort]!);
const server = new Server(port);

export const emitServerData = (key: string, data: any) => {
	server.emit(key, data);
};
