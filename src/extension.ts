// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { IstanbulCoverageContext } from 'istanbul-to-vscode';
import { loadFakeTests, runFakeTests } from './fakeTests';
import { request } from 'http';
import { findKarmaTestsAndSuites } from './parser';
import { addTests, spawnAProcess } from './helpers';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export const coverageContext = new IstanbulCoverageContext();

export function activate(context: vscode.ExtensionContext) {
	enum ItemType {
		File,
		TestCase
	}

	const testData = new WeakMap<vscode.TestItem, ItemType>();

	const getType = (testItem: vscode.TestItem) => testData.get(testItem)!;

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log(
		'Congratulations, your extension "coverage-gutters" is now active!'
	);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const controller = vscode.tests.createTestController(
		'helloWorldTests',
		'Hello World Tests'
	);

	let nodeServer = spawnAProcess();

	// context.subscriptions.push({
	// 	dispose: () => {
	// 		if (nodeServer) {
	// 			nodeServer.kill();
	// 		}
	// 	}
	// });

	const runProfile = controller.createRunProfile(
		'Run',
		vscode.TestRunProfileKind.Run,
		(request, token) => runFakeTests(controller, request),
		true
	);
	const coverageProfile = controller.createRunProfile(
		'Coverage',
		vscode.TestRunProfileKind.Coverage,
		(request, token) => runFakeTests(controller, request, coverageContext),
		false
	);

	coverageProfile.loadDetailedCoverage = coverageContext.loadDetailedCoverage;

	controller.resolveHandler = async (test) => {
		controller.items.replace(loadFakeTests(controller));
		await findSpecFiles();
		await discoverAllFilesInWorkspace();
	};

	let testItems: vscode.TestItem[] = [];

	// When text documents are open, parse tests in them.
	vscode.workspace.onDidOpenTextDocument((event) => {
		// spawnAProcess();
		// const tests = findKarmaTestsAndSuites(event.getText());
		// const items = addTests(controller, tests);
		// controller.items.replace([items]); // Pass an array of TestItem objects
		// testItems.push(getOrCreateFile(event.uri));
	});
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

	async function runHandler(
		shouldDebug: boolean,
		request: vscode.TestRunRequest,
		token: vscode.CancellationToken
	) {
		const run = controller.createTestRun(request);
		// const queue: vscode.TestItem[] = [];

		// // Loop through all included tests, or all known tests, and add them to our queue
		// if (request.include) {
		// 	request.include.forEach((test) => queue.push(test));
		// } else {
		// 	controller.items.forEach((test) => queue.push(test));
		// }

		// // For every test that was queued, try to run it. Call run.passed() or run.failed().
		// // The `TestMessage` can contain extra information, like a failing location or
		// // a diff output. But here we'll just give it a textual message.
		// while (queue.length > 0 && !token.isCancellationRequested) {
		// 	const test = queue.pop()!;

		// 	// Skip tests the user asked to exclude
		// 	if (request.exclude?.includes(test)) {
		// 		continue;
		// 	}

		// 	switch (getType(test)) {
		// 		case ItemType.File:
		// 			// If we're running a file and don't know what it contains yet, parse it now
		// 			if (test.children.size === 0) {
		// 				// await parseTestsInFileContents(test);
		// 			}
		// 			break;
		// 		case ItemType.TestCase:
		// 			// Otherwise, just run the test case. Note that we don't need to manually
		// 			// set the state of parent tests; they'll be set automatically.
		// 			const start = Date.now();
		// 			try {
		// 				// await assertTestPasses(test);
		// 				run.passed(test, Date.now() - start);
		// 			} catch (e: any) {
		// 				run.failed(
		// 					test,
		// 					new vscode.TestMessage(e.message),
		// 					Date.now() - start
		// 				);
		// 			}
		// 			break;
		// 	}

		// 	test.children.forEach((test) => queue.push(test));
		// }

		// Make sure to end the run after all tests have been executed:
		run.end();
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}

async function* readCoverageOutput(): AsyncGenerator<vscode.FileCoverage> {
	// In a real extension, this would read the coverage output from the test run
	// and yield it as a `vscode.FileCoverage` object.
	// For the purposes of this example, we'll just yield a hard-coded value.
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (workspaceFolders) {
		yield {
			uri: vscode.Uri.file(workspaceFolders[0].uri.fsPath + '/test1.ts'),
			statementCoverage: { covered: 10, total: 20 }
		};
	}
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
