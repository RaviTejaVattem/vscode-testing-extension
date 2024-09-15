import { ApplicationConstants } from './constants';
import { KarmaCustomReporter } from './karma-reporter';

export class KarmaConfigLoader {
	karmaPlugin = { [`reporter:custom`]: ['type', KarmaCustomReporter] };
	async loadConfig(config: any) {
		config.basePath = '';
		config.frameworks = ['jasmine', '@angular-devkit/build-angular'];
		config.plugins = [
			'karma-jasmine',
			'karma-chrome-launcher',
			'karma-jasmine-html-reporter',
			'karma-coverage',
			'@angular-devkit/build-angular/plugins/karma',
			this.karmaPlugin
		];
		config.client = {
			clearContext: false,
			jasmine: {
				random: false,
				timeoutInterval: 10000
			}
		};
		config.jasmineHtmlReporter = {
			suppressAll: true
		};
		config.coverageReporter = {
			type: 'json',
			dir: `coverage/${process.env[ApplicationConstants.KarmaCoverageDir]}`,
			subdir: '.',
			file: 'coverage-final.json'
		};
		config.reporters = ['progress', 'kjhtml', 'custom'];
		config.port = process.env[ApplicationConstants.KarmaPort];
		console.log('<--------> ~ port inside config:', config.port);
		config.logLevel = config.LOG_INFO;
		config.autoWatch = false;
		config.browsers = ['ChromeHeadless'];
		config.singleRun = false;
		// proxies: {
		// 	'/home/quote-policy/src/assets/': '/src/assets/'
		// }

		// return test;
	}
}
