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
	freePort,
	getRandomString,
	listenToTestResults,
	spawnAProcess
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
			console.log(err);
			return;
		}
		initialize(ports);
	});

	function initialize(ports: number[]) {
		availablePorts = ports;
		console.log('Karma server starting on: ', availablePorts);
		spawnAProcess(context.extensionPath + '/dist/karma.conf.js', ports);

		const server = new Server(availablePorts[2]);
		listenToTestResults(server, controller);

		context.subscriptions.push({
			dispose: () => {
				if (server) {
					server.close();
					console.log('Server closed');
				}
				deleteCoverageDir(coverageFolderPath);
			}
		});
	}
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log(
		'Congratulations, your extension "coverage-gutters" is now active!'
	);

	const runProfile = controller.createRunProfile(
		'Run',
		vscode.TestRunProfileKind.Run,
		(request, token) => runTests(controller, request, token),
		true
	);
	const debugProfile = controller.createRunProfile(
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

	let disposable = vscode.commands.registerCommand(
		'coverage-gutters.helloWorld',
		() => {
			vscode.window.showInformationMessage(
				'Hello World from coverage-gutters!'
			);
		}
	);

	context.subscriptions.push(disposable);
}

export function deactivate() {
	freePort(availablePorts[0]);
	freePort(availablePorts[1]);
	console.log('Deactivated');
}
