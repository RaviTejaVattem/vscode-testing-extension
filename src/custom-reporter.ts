import * as fs from 'fs';
import * as vscode from 'vscode';

const CustomReporter = function (
	this: any,
	baseReporterDecorator: any,
	config: any
) {
	baseReporterDecorator(this);

	this.onRunComplete = function (browsers: any, results: any) {
		console.log('Number of tests executed: ' + results.total);
		console.log('Number of tests succeeded: ' + results.success);
		console.log('Number of tests failed: ' + results.failed);
		console.log('Number of tests skipped: ' + results.skipped);
	};

	this.specSuccess = function (browsers: any, result: any) {
		vscode.window.showInformationMessage('Test passed: ' + result.description);
		// fs.appendFileSync(
		// 	'./output.txt',
		// 	'Test passed: ' + JSON.stringify(result) + '\n' + Date.now() + '\n'
		// );
	};

	this.specFailure = function (browsers: any, result: any) {
		vscode.window.showInformationMessage('Test failed: ' + result.description);
		// fs.appendFileSync(
		// 	'./output.txt',
		// 	'Test failed: ' + JSON.stringify(result) + '\n' + Date.now() + '\n'
		// );
	};

	this.specSkipped = function (browsers: any, result: any) {
		console.log('Test skipped: ' + result.description);
	};

	this.onBrowserLog = (browser: any, log: string, type: any) => {
		// fs.appendFileSync(
		// 	'./output.txt',
		// 	'Browser log ' + JSON.stringify(log, type) + '\n' + Date.now() + '\n'
		// );
	};

	// this.onSpecComplete = (browser, result) => {
	//   fs.appendFileSync('./output.txt', 'Spec complete: ' + JSON.stringify(result) + '\n' + Date.now() + '\n');
	// }
};

// // Pseudo type casting to make sure the constructor has the correct prototype chain
// util.inherits(CustomReporter, require('karma').reporter.Reporter);

// Dependency injection
(CustomReporter as any).$inject = ['baseReporterDecorator', 'config'];

export const reporter = {
	custom: ['type', CustomReporter]
};
