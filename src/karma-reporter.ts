import { resolve } from 'path';
import { KarmaEventName } from './constants';
import { Worker } from 'worker_threads';

export function KarmaCustomReporter(
	this: any,
	baseReporterDecorator: any,
	config: any
) {
	baseReporterDecorator(this);

	const workerScriptFile = resolve(__dirname, './karma-results-emitter.js');
	const worker = new Worker(workerScriptFile);

	this.onRunStart = (browsers: any, results: any) => {
		this._browsers = [];
		worker.postMessage({ key: KarmaEventName.RunStart });
	};

	this.onSpecComplete = (browsers: any, results: any) => {
		if (!results.skipped) {
			worker.postMessage({ key: KarmaEventName.SpecComplete, results });
		}
	};

	this.onRunComplete = (browsers: any, results: any) => {
		worker.postMessage({ key: KarmaEventName.RunComplete });
	};
}

KarmaCustomReporter.$inject = [
	'baseReporterDecorator',
	'config',
	'helper',
	'logger'
];
