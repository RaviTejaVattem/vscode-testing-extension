// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { IstanbulCoverageContext } from 'istanbul-to-vscode';
import path from 'path';
import portfinder from 'portfinder';
import { Server } from 'socket.io';
import { ExtensionContext, tests, TestRunProfileKind, workspace } from 'vscode';
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
import { ChildProcessWithoutNullStreams, exec } from 'child_process';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export const coverageContext = new IstanbulCoverageContext();
let availablePorts: number[] = [];
let childProcess: ChildProcessWithoutNullStreams | undefined;
let server: Server;
let coverageFolderPath: string;

export function activate(context: ExtensionContext) {
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const controller = tests.createTestController(
		'helloWorldTests',
		'Hello World Tests'
	);

	coverageFolderPath = path.join(
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
		console.log('<--------> ~ portfinder.getPorts ~ process.pid:', process.pid);
		writeToChannel('Karma childprocess id ', childProcess?.pid);
		console.log(
			'<--------> ~ initialize ~ childProcess.pid:',
			childProcess?.pid
		);

		server = new Server(availablePorts[2]);
		listenToTestResults(server, controller);

		process.on('exit', () => {
			deleteCoverageDir(coverageFolderPath);
			server.disconnectSockets(true);
			server.close();
			server.removeAllListeners();
			childProcess?.kill('SIGINT');
			exec('kill -9 ' + childProcess?.pid);
		});
	}
	// Use the console to output diagnostic information (writeToChannel) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	writeToChannel(
		'Congratulations, your extension "angular-testing" is now active!'
	);

	controller.createRunProfile(
		'Run',
		TestRunProfileKind.Run,
		(request, token) => runTests(controller, request, token),
		true
	);
	controller.createRunProfile(
		'Debug',
		TestRunProfileKind.Debug,
		(request, token) => runTests(controller, request, token, true),
		true
	);
	const coverageProfile = controller.createRunProfile(
		'Coverage',
		TestRunProfileKind.Coverage,
		(request, token) =>
			runTestCoverage(controller, request, coverageContext, coverageFolderPath),
		false
	);

	coverageProfile.loadDetailedCoverage = coverageContext.loadDetailedCoverage;

	workspace.onDidChangeTextDocument(async (e) => {
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
		const specFiles = await workspace.findFiles(
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

export const deactivate = async () => {
	childProcess?.kill('SIGKILL');
	exec('kill -9 ' + childProcess?.pid);
	writeToChannel('Deactivated');
};
