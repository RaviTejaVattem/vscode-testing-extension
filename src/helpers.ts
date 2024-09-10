import { spawn } from 'child_process';
import * as http from 'http';
import { io } from 'socket.io-client';
import {
	OutputChannel,
	Range,
	TestController,
	TestItem,
	TestRun,
	TestRunRequest,
	Uri,
	window,
	workspace
} from 'vscode';
import getAvailablePorts from './port-finder';
import { IParsedNode } from './types';
import { KarmaEventName } from './constants';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';

let outputChannel: OutputChannel = window.createOutputChannel(
	'Ravi angular - Extension Logs'
);

const testItems = new Map<string, TestItem>();

// let wsFolders = workspace?.workspaceFolders;
// let karmaConfig = undefined;
// if (wsFolders && wsFolders.length > 0) {
// 	karmaConfig = config(wsFolders[0].uri.fsPath);
// }

// const karmaConfigString = `module.exports = ${karmaConfig!.toString()};`;

// const tempKarmaConfigPath = join(tmpdir(), 'karma.config.js');
// writeFileSync(tempKarmaConfigPath, karmaConfigString);

function setRange(testItem: TestItem, nodeDetails: IParsedNode) {
	if (nodeDetails.location) {
		testItem.range = new Range(
			nodeDetails.location.start.line,
			nodeDetails.location.start.column,
			nodeDetails.location.end.line,
			nodeDetails.location.end.column
		);
	}
}

export async function addTests(
	controller: TestController,
	tests: IParsedNode,
	file: Uri,
	parentName: string = ''
) {
	let root = controller.createTestItem(
		`${parentName} ${tests.name}`.trim(),
		tests.name,
		file
	);
	setRange(root, tests);
	outputChannel.appendLine(
		`Created root test item: ${tests.name} with testId: ${root.id}`
	);
	tests.children.forEach(async (children) => {
		const childNode = await addTests(controller, children, file, tests.name);
		testItems.set(`${tests.name} ${children.name}`, childNode);
		setRange(childNode, children);
		root.children.add(childNode);
		outputChannel.appendLine(`Added child test item: ${children.name}`);
	});
	return root;
}

export function spawnAProcess(filePath: string, ports: number[]) {
	let childProcess;
	let wsFolders = workspace?.workspaceFolders;

	if (wsFolders && wsFolders.length > 0) {
		// const tempKarmaConfigPath = createTempKarmaConfig(filePath);

		process.chdir(wsFolders[0].uri.fsPath);
		outputChannel.appendLine(
			`Changed directory to: ${wsFolders[0].uri.fsPath}`
		);
		childProcess = spawn('npx', [
			'ng',
			'test',
			`--karma-config=${filePath}`,
			'--code-coverage',
			'--progress'
		]);
		childProcess.stdout.on('data', (data) => {
			console.log(`Main server - stdout: ${data}`);
			outputChannel.appendLine(`Main server - stdout: ${data}`);
		});
		childProcess.stderr.on('data', (data) => {
			console.error(`Main server - stderr: ${data}`);
			outputChannel.appendLine(`Main server - stderr: ${data}`);
		});
		childProcess.on('close', (code) => {
			console.log(`Main server - child process exited with code ${code}`);
			outputChannel.appendLine(`Main server process exited with code ${code}`);
		});
	}

	return childProcess;
}

export async function testExecution(
	node: TestItem,
	run: TestRun,
	runEverything: boolean | undefined
) {
	let result;
	let wsFolders = workspace?.workspaceFolders;
	// const testData = JSON.stringify(testItems, null, 2);
	// const filePath = `${tmpdir()}/testItem.json`;
	// writeFileSync(filePath, testData);
	// console.log(`Test item data written to file: ${filePath}`);

	if (wsFolders && wsFolders.length > 0) {
		// await debug.startDebugging(wsFolders[0], {
		// 	type: 'chrome',
		// 	name: 'Run Tests',
		// 	request: 'attach',
		// 	port: 9222,
		// 	webRoot: wsFolders[0],
		// 	sourceMaps: true,
		// 	sourceMapPathOverrides: {
		// 		'webpack:///src/*': '${webRoot}/src/*'
		// 	},
		// 	skipFiles: ['node_modules/**']
		// });

		let testName = node.parent
			? `${node.parent.label} ${node.label}`
			: `${node.label}`;

		console.log('<--------> ~ testExecution ~ testName:', testName);

		const ports = await getAvailablePorts();
		console.log('<--------> ~ testExecution ~ port:', ports);

		console.log('<--------> ~ testExecution ~ node.id:', node.id);

		const requestBody = runEverything
			? {}
			: {
					args: [`--testRunId=${node.id}`, `--grep=${testName}`],
					refresh: true
			  };
		const options = {
			hostname: 'localhost',
			path: '/run',
			port: ports[0],
			method: 'POST',
			headers: { 'Content-Type': 'application/json' }
		};

		const request = http.request(options, (responseMessage) => {
			let data = '';

			responseMessage.on('data', (chunk) => {
				console.log('>>>chunk:', chunk.toString());
			});

			responseMessage.on('end', () => {
				try {
					// const jsonData = JSON.parse(data);
					// console.log(data);
					console.log('>>> execution end:', data);
				} catch (error) {
					console.error('Error parsing JSON:', error);
				} finally {
					run.end();
				}
			});
		});

		request.write(JSON.stringify(requestBody));
		request.end();

		return request;
	}
}

export function listenToTestResults(port: number, controller: TestController) {
	const socket = io(`http://localhost:${port}`);
	let run: TestRun;

	socket.on('connect', () => {
		console.log('Connected to server');
	});

	socket.on(KarmaEventName.RunStart, () => {
		console.log('On run start');
		run = controller.createTestRun(
			new TestRunRequest(),
			'testRunRequest',
			true
		);
	});

	socket.on(KarmaEventName.RunComplete, () => {
		console.log('On run complete');
		run.end();
	});
	socket.on(KarmaEventName.SpecSuccess, (result: any) => {
		const testItem = testItems.get(result.fullName);
		if (!testItem) {
			console.error('Test item not found:', result.fullName);
			return;
		}
		run.passed(testItem);
	});
	socket.on(KarmaEventName.SpecFailure, (result: any) => {
		const testItem = testItems.get(result.fullName);
		if (!testItem) {
			console.error('Test item not found:', result.fullName);
			return;
		}
		run.failed(testItem, { message: result.log });
	});

	socket.on(KarmaEventName.SpecComplete, (result: any) => {
		// console.log('Received specComplete result:', result);
		const testItem = testItems.get(result.fullName);
		if (!testItem) {
			console.error('Test item not found:', result.fullName);
			return;
		}

		if (result.skipped) {
			run.skipped(testItem);
		} else if (result.success) {
			run.passed(testItem);
		} else {
			run.failed(testItem, { message: result.log.join('') });
		}

		// switch (true) {
		// 	case result.skipped:
		// 		run.skipped(testItem);
		// 		break;
		// 	case result.success:
		// 		run.passed(testItem);
		// 		break;
		// 	case result.failed:
		// 		run.failed(testItem, { message: result.log });
		// 		break;
		// 	default:
		// 		run.errored(testItem, { message: result.log });
		// 		break;
		// }
	});
}
