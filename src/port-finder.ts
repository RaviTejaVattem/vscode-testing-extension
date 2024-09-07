import portfinder from 'portfinder';

let cachedPort: number | null = null;

export default async function getAvailablePort() {
	if (cachedPort !== null) {
		return cachedPort;
	}
	try {
		cachedPort = await portfinder.getPortPromise({ port: 3000 });
		return cachedPort;
	} catch (err) {
		console.log(err);
		return '';
	}
}
