import { KarmaEventName, ServerEvent } from './constants';
import { getRandomString } from './coverage-details';
import { emitServerData, initializeServer } from './karma-results-emitter';

export function KarmaCustomReporter(
	this: any,
	baseReporterDecorator: any,
	config: any
) {
	baseReporterDecorator(this);
	initializeServer();

	this.onRunStart = (browsers: any, results: any) => {
		console.log('<--------> ~ results: onRunStart');
		this._browsers = [];
		emitServerData(KarmaEventName.RunStart, null);
	};

	this.onSpecComplete = (browsers: any, results: any) => {
		if (!results.skipped) {
			emitServerData(KarmaEventName.SpecComplete, results);
		}
	};

	this.onRunComplete = (browsers: any, results: any) => {
		console.log('<--------> ~ this.onRunComplete ~ results:', results);
		emitServerData(KarmaEventName.RunComplete, {});
		emitServerData(ServerEvent.CoverageData, getRandomString());
	};
}

KarmaCustomReporter.$inject = [
	'baseReporterDecorator',
	'config',
	'helper',
	'logger'
];
