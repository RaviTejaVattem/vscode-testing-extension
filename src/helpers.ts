import { spawn } from 'child_process';
import fs from 'fs';
import * as http from 'http';
import { join } from 'path';
import { Server } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import {
	debug,
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
import { ApplicationConstants, KarmaEventName } from './constants';
import { IParsedNode } from './types';

const statusBarItem = window.createStatusBarItem();
const testItems = new Map<string, TestItem>();

let ports: number[];
let randomString: string;
let outputChannel: OutputChannel = window.createOutputChannel(
	'Karma test - extension logs'
);

export const getRandomString = () => {
	if (!randomString) {
		randomString = Math.random().toString(36).slice(2);
	}
	return randomString;
};

export const writeToChannel = (message: string, options: any = '') => {
	outputChannel.appendLine(message + JSON.stringify(options, null, 2));
};

const startDebugSession = async () => {
	const debugConfig = {
		name: 'Karma Test Explorer Debugging',
		type: 'chrome',
		request: 'attach',
		browserAttachLocation: 'workspace',
		address: 'localhost',
		port: ports[1],
		timeout: 60000
	};

	const debugSession = await debug.startDebugging(undefined, debugConfig);
	if (debugSession) {
		writeToChannel('Debugger started successfully');
	} else {
		console.error('Failed to start debugger');
	}
};

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
	parentName?: string
) {
	let name = parentName ?? tests.name;
	let root = controller.createTestItem(name, tests.name, file);
	setRange(root, tests);
	tests.children.forEach(async (children) => {
		const childNode = await addTests(
			controller,
			children,
			file,
			`${name} ${children.name}`
		);
		testItems.set(childNode.id, childNode);
		setRange(childNode, children);
		root.children.add(childNode);
	});
	return root;
}

export function spawnAProcess(filePath: string, availablePorts: number[]) {
	ports = availablePorts;
	statusBarItem.text = `✔️ ${ports[0]}`;
	statusBarItem.tooltip = `Karma is running on port: ${ports[0]}`;
	writeToChannel('<--------> ~ ports:', ports);

	let childProcess;
	let wsFolders = workspace?.workspaceFolders;

	if (wsFolders && wsFolders.length > 0) {
		const workspacePath = wsFolders[0].uri.fsPath;
		writeToChannel('Changed directory to: ', workspacePath);

		let processArgs = [
			`${workspacePath}/node_modules/@angular/cli/bin/ng`,
			'test',
			`--karma-config=${filePath}`,
			'--code-coverage',
			'--progress=false'
		];

		const processEnv = {
			...process.env,
			[ApplicationConstants.KarmaPort]: `${ports[0]}`,
			[ApplicationConstants.KarmaDebugPort]: `${ports[1]}`,
			[ApplicationConstants.KarmaSocketPort]: `${ports[2]}`,
			[ApplicationConstants.KarmaCoverageDir]: getRandomString()
		};

		childProcess = spawn('node', processArgs, {
			env: processEnv,
			shell: false,
			cwd: workspacePath
		});
		childProcess.stdout.on('data', (data) => {
			writeToChannel('Main server - stdout: ', data.toString());
		});
		childProcess.stderr.on('data', (data) => {
			writeToChannel('Main server - stderr: ', data.toString());
		});
		childProcess.on('close', (code) => {
			writeToChannel('Main server - child process exited with code ' + code);
		});
	}

	return childProcess;
}

export async function testExecution(
	node: TestItem | undefined,
	run: TestRun,
	isDebugRun: boolean = false
) {
	if (isDebugRun) {
		await startDebugSession();
	}
	let requestBody = {};
	if (node) {
		let testName = node.parent
			? `${node.parent.label} ${node.label}`
			: `${node.label}`;

		requestBody = {
			args: [`--testRunId=${node.id}`, `--grep=${testName}`],
			refresh: true
		};
	}

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
				writeToChannel('>>> execution end:', data);
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

export function listenToTestResults(
	server: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
	controller: TestController
) {
	let run: TestRun;

	server.on(KarmaEventName.Connect, (socket) => {
		writeToChannel('Connected to server');
		statusBarItem.show();
		socket.on(KarmaEventName.RunStart, () => {
			writeToChannel('On run start');
			run = controller.createTestRun(
				new TestRunRequest(),
				'testRunRequest',
				true
			);
		});

		socket.on(KarmaEventName.RunComplete, () => {
			writeToChannel('On run complete');
			run.end();
			debug.stopDebugging();
			writeToChannel('Debugger stopped successfully');
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
	});
}

export const deleteCoverageDir = (directory: string) => {
	if (fs.existsSync(directory)) {
		fs.rmSync(directory, { recursive: true });
	}
};
