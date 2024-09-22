// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { IstanbulCoverageContext } from 'istanbul-to-vscode';
import * as vscode from 'vscode';
import { runTestCoverage, runTests } from './test-runner';
import {
	addTests,
	deleteCoverageDir as deleteDirectory,
	freePort,
	getRandomString,
	listenToTestResults,
	spawnAProcess
} from './helpers';
import { findKarmaTestsAndSuites } from './parser';
import getAvailablePorts from './port-finder';
import path from 'path';
import { Server } from 'socket.io';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export const coverageContext = new IstanbulCoverageContext();
let extensionContext: vscode.ExtensionContext;
let availablePorts: number[] = [];

export function activate(context: vscode.ExtensionContext) {
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const controller = vscode.tests.createTestController(
		'helloWorldTests',
		'Hello World Tests'
	);
	extensionContext = context;

	(async () => {
		availablePorts = await getAvailablePorts();
		console.log('Karma server starting on: ', availablePorts);
		spawnAProcess(context.extensionPath + '/dist/karma.conf.js');

		const server = new Server(availablePorts[2]);
		listenToTestResults(server, controller);

		context.subscriptions.push({
			dispose: () => {
				if (server) {
					server.close();
					console.log('Server closed');
				}
			}
		});
	})();
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
			runTestCoverage(controller, request, context, coverageContext),
		false
	);

	coverageProfile.loadDetailedCoverage = coverageContext.loadDetailedCoverage;

	vscode.workspace.onDidChangeTextDocument(async (e) => {
		if (
			e.document.languageId === 'typescript' &&
			e.document.fileName.endsWith('.spec.ts')
		) {
			const tests = await findKarmaTestsAndSuites(e.document.uri);
			const items = await addTests(controller, tests, e.document.uri);
			controller.items.add(items);
		}
	});

	controller.resolveHandler = async (test) => {
		await findSpecFiles();
		await discoverAllFilesInWorkspace();
	};

	let testItems: vscode.TestItem[] = [];
	// We could also listen to document changes to re-parse unsaved changes:
	vscode.workspace.onDidChangeTextDocument((e) =>
		parseTestsInDocument(e.document)
	);

	// In this function, we'll get the file TestItem if we've already found it,
	// otherwise we'll create it with `canResolveChildren = true` to indicate it
	// can be passed to the `controller.resolveHandler` to gets its children.
	function getOrCreateFile(uri: vscode.Uri) {
		const existing = controller.items.get(uri.toString());
		if (existing) {
			return existing;
		}

		const file = controller.createTestItem(
			uri.toString(),
			uri.path.split('/').pop()!,
			uri
		);
		file.canResolveChildren = true;
		return file;
	}

	function parseTestsInDocument(e: vscode.TextDocument) {
		// if (e.uri.scheme === 'file' && e.uri.path.endsWith('.md')) {
		parseTestsInFileContents(getOrCreateFile(e.uri), e.getText());
		// }
	}

	async function findSpecFiles() {
		const specFiles = await vscode.workspace.findFiles(
			'**/*.spec.ts',
			'**/node_modules/**'
		);
		specFiles.forEach(async (file) => {
			const tests = await findKarmaTestsAndSuites(file);
			const items = await addTests(controller, tests, file);
			controller.items.add(items); // Pass an array of TestItem objects
		});
	}

	async function parseTestsInFileContents(
		file: vscode.TestItem,
		contents?: string
	) {
		// If a document is open, VS Code already knows its contents. If this is being
		// called from the resolveHandler when a document isn't open, we'll need to
		// read them from disk ourselves.
		if (contents === undefined) {
			const rawContent = await vscode.workspace.fs.readFile(file.uri!);
			contents = new TextDecoder().decode(rawContent);
		}

		// some custom logic to fill in test.children from the contents...
		return new Promise<vscode.TestItem[]>((resolve) => {
			// Your code here to fill in the testItems array
			resolve(testItems);
		});
	}

	let disposable = vscode.commands.registerCommand(
		'coverage-gutters.helloWorld',
		() => {
			// The code you place here will be executed every time your command is executed
			// Display a message box to the user
			vscode.window.showInformationMessage(
				'Hello World from coverage-gutters!'
			);
		}
	);

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
	const folderName = path.join(
		extensionContext.extensionPath,
		'/dist/coverage/',
		getRandomString()
	);
	deleteDirectory(folderName);
	freePort(availablePorts[0]);
	freePort(availablePorts[1]);
	console.log('Deactivated');
}

async function discoverAllFilesInWorkspace() {
	if (!vscode.workspace.workspaceFolders) {
		return []; // handle the case of no open folders
	}

	return Promise.all(
		vscode.workspace.workspaceFolders.map(async (workspaceFolder) => {
			const pattern = new vscode.RelativePattern(
				workspaceFolder,
				'**/*.spec.ts'
			);
			const watcher = vscode.workspace.createFileSystemWatcher(pattern);

			// When files are created, make sure there's a corresponding "file" node in the tree
			watcher.onDidCreate((uri) => console.log(uri));
			// When files change, re-parse them. Note that you could optimize this so
			// that you only re-parse children that have been resolved in the past.
			// watcher.onDidChange(uri => parseTestsInFileContents(getOrCreateFile(uri)));
			// // And, finally, delete TestItems for removed files. This is simple, since
			// // we use the URI as the TestItem's ID.
			// watcher.onDidDelete(uri => controller.items.delete(uri.toString()));

			// for (const file of await vscode.workspace.findFiles(pattern)) {
			// 	getOrCreateFile(file);
			// }

			return watcher;
		})
	);
}
