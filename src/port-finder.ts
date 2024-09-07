import portfinder from 'portfinder';

export default async function getAvailablePort() {
	try {
		return await portfinder.getPortPromise({ port: 3000 });
	} catch (err) {
		console.log(err);
		return '';
	}
}
