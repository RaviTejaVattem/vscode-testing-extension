const PORT = 5000;

export function createTempKarmaConfig(portNumber: number): string {
	const karmaConfig = {
		basePath: '',
		frameworks: ['jasmine', '@angular-devkit/build-angular'],
		plugins: [
			'karma-jasmine',
			'karma-chrome-launcher',
			'karma-jasmine-html-reporter',
			'karma-coverage',
			'@angular-devkit/build-angular/plugins/karma'
		],
		client: {
			clearContext: false
		},
		jasmineHtmlReporter: {
			suppressAll: true
		},
		// coverageReporter: {
		// 	dir: join(options.karmaConfigHomePath, './coverage/'),
		// 	subdir: '.',
		// 	reporters: [{ type: 'lcov' }, { type: 'text-summary' }]
		// },
		reporters: ['progress', 'kjhtml'],
		port: portNumber,
		colors: true,
		// logLevel: config.LOG_INFO,
		autoWatch: false,
		browsers: ['ChromeHeadless'],
		singleRun: false
		// proxies: {
		// 	'/home/quote-policy/src/assets/': '/src/assets/'
		// }

		// return test;
	};

	// Convert the function to a string
	return `module.exports = function (config) {
	config.set(
		${JSON.stringify(karmaConfig)});	}`;
}
