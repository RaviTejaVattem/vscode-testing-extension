import portfinder from 'portfinder';

let cachedPorts: number[] = [];

export default async function getAvailablePorts() {
	if (cachedPorts.length >= 2) {
		console.log('<--------> ~ getAvailablePorts ~ cachedPorts:', cachedPorts);
		return cachedPorts;
	}
	try {
		const port1 = await portfinder.getPortPromise({ port: 3000 });
		const port2 = await portfinder.getPortPromise({ port: port1 + 1 });
		cachedPorts = [port1, port2];
		console.log('No cached ports found, fetching new ones: ', cachedPorts);
		return cachedPorts;
	} catch (err) {
		console.log(err);
		return [];
	}
}
