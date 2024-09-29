import { ApplicationConstants } from './constants';
import { KarmaCustomReporter } from './karma-reporter';

export class KarmaConfigLoader {
	karmaPlugin = { [`reporter:custom`]: ['type', KarmaCustomReporter] };
	loadConfig(config: any) {
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
		config.logLevel = config.LOG_INFO;
		config.autoWatch = false;
		config.browsers = ['MyChromeHeadless'];
		config.singleRun = false;
		config.browserNoActivityTimeout = 1000 * 60 * 60 * 24;
		config.browserDisconnectTimeout = 30_000;
		config.pingTimeout = 1000 * 60 * 60 * 24;
		config.captureTimeout = 1000 * 90;
		config.browserSocketTimeout = 30_000;
		config.processKillTimeout = 2000;
		config.retryLimit = 3;
		config.customLaunchers = {
			MyChromeHeadless: {
				base: 'ChromeHeadless',
				flags: [
					'--disable-gpu',
					'--disable-dev-shm-usage',
					`--remote-debugging-port=${
						process.env[ApplicationConstants.KarmaDebugPort]
					}`
				]
			}
		};
	}
}
