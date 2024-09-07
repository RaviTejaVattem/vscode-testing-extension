export function KarmaCustomReporter(
	this: any,
	baseReporterDecorator: any,
	config: any
) {
	baseReporterDecorator(this);

	let output: any = {
		result: []
	};

	const updateResults = function (result: any) {
		output.result.push(JSON.stringify(result));
		// this.write("");
	};

	this.onRunComplete = function (browsers: any, results: any) {
		// output.summary = results;
		// process.stdout.write(output);
		// this.write(output);
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
		function (msg: any) {
			process.stdout.write.bind(process.stdout)(msg + 'rn');
		}
	];

	this.onSpecComplete = (browsers: any, results: any) => {
		updateResults(results);
	};
}

KarmaCustomReporter.$inject = [
	'baseReporterDecorator',
	'config',
	'helper',
	'logger'
];
