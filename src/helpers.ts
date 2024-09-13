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
import { KarmaEventName, ServerEvent } from './constants';
import getAvailablePorts from './port-finder';
import { IParsedNode } from './types';

let outputChannel: OutputChannel = window.createOutputChannel(
	'Ravi angular - Extension Logs'
);

const testItems = new Map<string, TestItem>();

let coverageFolderName = '';

export const getCoverageFolderName = () => coverageFolderName;

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

export async function testExecution(node: TestItem | undefined, run: TestRun) {
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

	let requestBody = {};
	if (node) {
		let testName = node.parent
			? `${node.parent.label} ${node.label}`
			: `${node.label}`;

		requestBody = {
			args: [`--testRunId=${node.id}`, `--grep=${testName}`],
			refresh: true
		};
		console.log('<--------> ~ testExecution ~ testName:', testName);
		console.log('<--------> ~ testExecution ~ node.id:', node.id);
	}

	const ports = await getAvailablePorts();
	console.log('<--------> ~ testExecution ~ port:', ports);

	const options = {
		hostname: 'localhost',
		path: '/run',
		port: ports[0],
		method: 'POST',
		headers: { 'Content-Type': 'application/json' }
	};

	const request = http.request(options, (responseMessage) => {
		let data = '';

		responseMessage.on('end', () => {
			try {
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

export function listenToTestResults(port: number, controller: TestController) {
	const socket = io(`http://localhost:${port}`);
	let run: TestRun;

	socket.on(ServerEvent.CoverageData, (coverageDir: any) => {
		console.log('<--------> ~ socket.on ~ coverage file:', coverageDir);
		coverageFolderName = coverageDir;
	});

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

	socket.on(KarmaEventName.SpecComplete, (result: any) => {
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
	});
}
