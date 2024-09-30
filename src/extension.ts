// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { IstanbulCoverageContext } from 'istanbul-to-vscode';
import path from 'path';
import portfinder from 'portfinder';
import { Server } from 'socket.io';
import * as vscode from 'vscode';
import {
	addTests,
	deleteCoverageDir,
	getRandomString,
	listenToTestResults,
	spawnAProcess,
	writeToChannel
} from './helpers';
import { findKarmaTestsAndSuites } from './parser';
import { runTestCoverage, runTests } from './test-runner';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export const coverageContext = new IstanbulCoverageContext();
let availablePorts: number[] = [];

export function activate(context: vscode.ExtensionContext) {
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const controller = vscode.tests.createTestController(
		'helloWorldTests',
		'Hello World Tests'
	);

	const coverageFolderPath = path.join(
		context.extensionPath,
		'/dist/coverage/',
		getRandomString()
	);

	portfinder.getPorts(3, { port: 3000 }, (err, ports) => {
		if (err) {
			writeToChannel('Error while finding ports: ', err);
			return;
		}
		initialize(ports);
	});

	function initialize(ports: number[]) {
		availablePorts = ports;
		writeToChannel('Karma server starting on: ', availablePorts);
		const childProcess = spawnAProcess(
			context.extensionPath + '/dist/karma.conf.js',
			ports
		);
		writeToChannel('Karma childprocess id ', childProcess?.pid);

		process.stdin.on('close', () => childProcess?.kill('SIGKILL'));

		const server = new Server(availablePorts[2]);
		listenToTestResults(server, controller);

		context.subscriptions.push({
			dispose: () => {
				childProcess?.kill('SIGKILL');
				if (server) {
					server.removeAllListeners();
					server.close();
					writeToChannel('Server closed');
				}
				deleteCoverageDir(coverageFolderPath);
			}
		});
	}
	// Use the console to output diagnostic information (writeToChannel) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	writeToChannel(
		'Congratulations, your extension "coverage-gutters" is now active!'
	);

	controller.createRunProfile(
		'Run',
		vscode.TestRunProfileKind.Run,
		(request, token) => runTests(controller, request, token),
		true
	);
	controller.createRunProfile(
		'Debug',
		vscode.TestRunProfileKind.Debug,
		(request, token) => runTests(controller, request, token, true),
		true
	);
	const coverageProfile = controller.createRunProfile(
		'Coverage',
		vscode.TestRunProfileKind.Coverage,
		(request, token) =>
			runTestCoverage(controller, request, coverageContext, coverageFolderPath),
		false
	);

	coverageProfile.loadDetailedCoverage = coverageContext.loadDetailedCoverage;

	vscode.workspace.onDidChangeTextDocument(async (e) => {
		if (
			e.document.languageId === 'typescript' &&
			e.document.fileName.endsWith('.spec.ts')
		) {
			const tests = await findKarmaTestsAndSuites(e.document.uri);
			tests.forEach(async (test) => {
				const items = await addTests(controller, test, e.document.uri);
				controller.items.add(items);
			});
		}
	});

	controller.resolveHandler = async (test) => {
		await findSpecFiles();
	};

	async function findSpecFiles() {
		const specFiles = await vscode.workspace.findFiles(
			'**/*.spec.ts',
			'**/node_modules/**'
		);
		specFiles.forEach(async (file) => {
			const tests = await findKarmaTestsAndSuites(file);
			tests.forEach(async (test) => {
				const items = await addTests(controller, test, file);
				controller.items.add(items); // Pass an array of TestItem objects
			});
		});
	}
}

export function deactivate() {
	writeToChannel('Deactivated');
}
