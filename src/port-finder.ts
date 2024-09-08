import portfinder from 'portfinder';

let cachedPorts: number[] | null = null;

export default async function getAvailablePorts() {
	if (cachedPorts !== null) {
		return cachedPorts;
	}
	try {
		const port1 = await portfinder.getPortPromise({ port: 3000 });
		const port2 = await portfinder.getPortPromise({ port: port1 + 1 });
		cachedPorts = [port1, port2];
		return cachedPorts;
	} catch (err) {
		console.log(err);
		return [];
	}
}
