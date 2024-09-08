import { Server } from 'socket.io';
import getAvailablePorts from './port-finder';

export function KarmaCustomReporter(
	this: any,
	baseReporterDecorator: any,
	config: any
) {
	const serverPorts = getAvailablePorts();
	const server = serverPorts.then((ports) => {
		console.log('<--------> ~ ports inside server promise ~ ports:', ports);
		return new Server(ports[1]); // S
	});

	baseReporterDecorator(this);

	let output: any = {
		result: []
	};

	const updateResults = function (result: any) {
		output.result.push(result);
		// this.write("");
	};

	const clear = () => {
		this.browsers = {};
	};

	this.onRunComplete = function (browsers: any, results: any) {
		// output.summary = results;
		// process.stdout.write(output);
		// this.write(output);
		process.stdout.write(JSON.stringify(output));
		clear();
	};

	// this.specSuccess = function (browsers, result) {
	// 	updateResults(result);
	// };

	// this.specFailure = function (browsers, result) {
	// 	updateResults(result);
	// };

	// this.specSkipped = function (browsers, result) {
	// 	updateResults(result);
	// };

	this.adapters = [
		// function (msg: any) {
		// 	process.stdout.write.bind(process.stdout)(msg + 'rn');
		// }
	];

	this.onSpecComplete = (browsers: any, results: any) => {
		updateResults(results);
		server.then((s) => {
			console.log('<--------> ~ server.then inside specComplete ~ s:');
			s.emit('specComplete', results);
		});
	};
	clear();
}

KarmaCustomReporter.$inject = [
	'baseReporterDecorator',
	'config',
	'helper',
	'logger'
];
