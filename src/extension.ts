// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { IstanbulCoverageContext } from 'istanbul-to-vscode';
import path from 'path';
import portfinder from 'portfinder';
import { Server } from 'socket.io';
import { ExtensionContext, tests, TestRunProfileKind, workspace, commands, window, TestController, TestRunRequest, CancellationToken, TestItem } from 'vscode';
import {
	addTests,
	deleteCoverageDir,
	getRandomString,
	listenToTestResults,
	spawnAProcess,
	statusBarItem,
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
let server: Server | undefined;
let coverageFolderPath: string;
let extensionContext: ExtensionContext;
let controller: TestController;
let isServerRunning = false;

function stopServer() {
	if (!isServerRunning) {
		window.showInformationMessage('Karma server is not running');
		return;
	}

	writeToChannel('Stopping Karma server...');
	
	if (server) {
		server.disconnectSockets(true);
		server.close();
		server.removeAllListeners();
		server = undefined;
	}

	if (childProcess) {
		childProcess.kill('SIGINT');
		exec('kill -9 ' + childProcess?.pid);
		childProcess = undefined;
	}

	deleteCoverageDir(coverageFolderPath);
	
	isServerRunning = false;
	statusBarItem.text = '⏹️ Karma (Stopped)';
	statusBarItem.tooltip = 'Click to start Karma server';
	statusBarItem.command = 'karma.startServer';
	
	writeToChannel('Karma server stopped');
	window.showInformationMessage('Karma server stopped');
}

function startServer() {
	if (isServerRunning) {
		window.showInformationMessage('Karma server is already running');
		return;
	}

	writeToChannel('Starting Karma server...');
	statusBarItem.text = '⏳ Karma (Starting...)';
	statusBarItem.tooltip = 'Karma server is starting';
	statusBarItem.show();

	portfinder.getPorts(3, { port: 3000 }, (err, ports) => {
		if (err) {
			writeToChannel('Error while finding ports: ', err);
			window.showErrorMessage('Failed to start Karma server: Could not find available ports');
			statusBarItem.text = '❌ Karma (Error)';
			statusBarItem.tooltip = 'Failed to start server. Click to retry.';
			statusBarItem.command = 'karma.startServer';
			return;
		}
		initialize(ports);
	});
}

function initialize(ports: number[]) {
	availablePorts = ports;
	writeToChannel('Karma server starting on: ', availablePorts);
	
	childProcess = spawnAProcess(
		extensionContext.extensionPath + '/dist/karma.conf.js',
		ports
	);
	
	writeToChannel('Karma childprocess id ', childProcess?.pid);

	server = new Server(availablePorts[2]);
	listenToTestResults(server, controller);

	isServerRunning = true;
	statusBarItem.text = `✔️ Karma (${ports[0]})`;
	statusBarItem.tooltip = `Karma server running on ports: ${ports.join(', ')}\nClick to stop server`;
	statusBarItem.command = 'karma.stopServer';
	
	writeToChannel('Karma server started successfully');
	window.showInformationMessage('Karma server started successfully');

	process.on('exit', () => {
		stopServer();
	});
}

function restartServer() {
	writeToChannel('Restarting Karma server...');
	window.showInformationMessage('Restarting Karma server...');
	
	if (isServerRunning) {
		stopServer();
		// Give it a moment to fully stop
		setTimeout(() => {
			startServer();
		}, 1000);
	} else {
		startServer();
	}
}

export function activate(context: ExtensionContext) {
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	extensionContext = context;
	controller = tests.createTestController(
		'helloWorldTests',
		'Hello World Tests'
	);

	coverageFolderPath = path.join(
		context.extensionPath,
		'/dist/coverage/',
		getRandomString()
	);

	// Register commands
	context.subscriptions.push(
		commands.registerCommand('karma.startServer', startServer)
	);
	context.subscriptions.push(
		commands.registerCommand('karma.stopServer', stopServer)
	);
	context.subscriptions.push(
		commands.registerCommand('karma.restartServer', restartServer)
	);

	// Initialize status bar
	statusBarItem.text = '⏹️ Karma (Stopped)';
	statusBarItem.tooltip = 'Click to start Karma server';
	statusBarItem.command = 'karma.startServer';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	// Use the console to output diagnostic information (writeToChannel) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	writeToChannel(
		'Congratulations, your extension "angular-testing" is now active!'
	);

	controller.createRunProfile(
		'Run',
		TestRunProfileKind.Run,
		(request: TestRunRequest, token: CancellationToken) => runTests(controller, request, token),
		true
	);
	controller.createRunProfile(
		'Debug',
		TestRunProfileKind.Debug,
		(request: TestRunRequest, token: CancellationToken) => runTests(controller, request, token, true),
		true
	);
	const coverageProfile = controller.createRunProfile(
		'Coverage',
		TestRunProfileKind.Coverage,
		(request: TestRunRequest, token: CancellationToken) =>
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

	controller.resolveHandler = async (test: TestItem | undefined) => {
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
	stopServer();
	writeToChannel('Deactivated');
};
