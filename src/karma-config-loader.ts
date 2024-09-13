import { getRandomString } from './coverage-details';
import { KarmaCustomReporter } from './karma-reporter';
import getAvailablePorts from './port-finder';

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
			dir: `coverage/${getRandomString()}`,
			subdir: '.',
			file: 'coverage-final.json'
		};
		config.reporters = ['progress', 'kjhtml', 'custom'];
		config.port = (await getAvailablePorts())[0];
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
