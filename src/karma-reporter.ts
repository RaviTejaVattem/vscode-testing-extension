import { KarmaEventName } from './constants';
import { emitServerData } from './karma-results-emitter';

export function KarmaCustomReporter(
	this: any,
	baseReporterDecorator: any,
	config: any
) {
	baseReporterDecorator(this);

	this.onRunStart = (browsers: any, results: any) => {
		console.log('<--------> ~ results: onRunStart');
		this._browsers = [];
		emitServerData(KarmaEventName.RunStart, null);
	};

	// this.onSpecSuccess = (browsers: any, results: any) => {
	// 	emitServerData(KarmaEventName.SpecSuccess, results);
	// };
	// // this.onSpecSkipped = (browsers: any, results: any) => {
	// // 	emitServerData(KarmaEventName.SpecSkipped, results);
	// // };
	// this.onSpecFailure = (browsers: any, results: any) => {
	// 	emitServerData(KarmaEventName.SpecFailure, results);
	// };
	this.onSpecComplete = (browsers: any, results: any) => {
		if (!results.skipped) {
			emitServerData(KarmaEventName.SpecComplete, results);
		}
	};

	this.onRunComplete = (browsers: any, results: any) => {
		console.log('<--------> ~ this.onRunComplete ~ results:', results);
		emitServerData(KarmaEventName.RunComplete, {});
	};
}

KarmaCustomReporter.$inject = [
	'baseReporterDecorator',
	'config',
	'helper',
	'logger'
];
