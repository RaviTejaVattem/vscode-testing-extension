// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config: any) {
	config.set({
		basePath: '',
		frameworks: ['jasmine', '@angular-devkit/build-angular'],
		plugins: [
			require('karma-jasmine'),
			require('karma-chrome-launcher'),
			require('karma-jasmine-html-reporter'),
			require('karma-coverage'),
			require('karma-mocha-reporter'),
			require('karma-jasmine-diff-reporter'),
			require('karma-sonarqube-unit-reporter'),
			require('@angular-devkit/build-angular/plugins/karma')
		],
		client: {
			jasmine: {
				// you can add configuration options for Jasmine here
				// the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
				// for example, you can disable the random execution with `random: false`
				// or set a specific seed with `seed: 4321`
				random: false
			},
			clearContext: false // leave Jasmine Spec Runner output visible in browser
		},
		preprocessors: {
			'src/app/infrastructure/!(mocks)/**/*.ts': ['coverage']
		},
		jasmineHtmlReporter: {
			suppressAll: true // removes the duplicated traces
		},
		coverageReporter: {
			dir: require('path').join(__dirname, './coverage/qnb'),
			subdir: '.',
			reporters: [{ type: 'text-summary' }, { type: 'lcov' }, { type: 'json' }]
		},
		jasmineDiffReporter: {
			color: {
				expectedBg: 'bgMagenta',
				expectedWhitespaceBg: 'bgMagenta',
				actualBg: 'bgBlue',
				actualWhitespaceBg: 'bgBlue'
			}
		},
		sonarQubeUnitReporter: {
			sonarQubeVersion: 'LATEST',
			outputFile: './reports/qnb/ut_report.xml',
			overrideTestDescription: true,
			testPaths: ['./src'],
			testFilePattern: '.spec.ts',
			useBrowserName: false
		},
		reporters: ['jasmine-diff', 'mocha', 'kjhtml', 'sonarqubeUnit'],
		port: 9876,
		colors: true,
		logLevel: config.LOG_INFO,
		autoWatch: true,
		browsers: ['ChromeHeadless'],
		singleRun: false,
		restartOnFileChange: true,
		proxies: {
			'/home/quote-policy/src/assets/': '/src/assets/'
		}
	});
};
