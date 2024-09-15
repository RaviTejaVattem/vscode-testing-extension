import { exec, spawn } from 'child_process';
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
import { ApplicationConstants, KarmaEventName, ServerEvent } from './constants';
import getAvailablePorts from './port-finder';
import { IParsedNode } from './types';
import fs from 'fs';
import { Server } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';

let ports: number[];

let randomString: string;

export const getRandomString = () => {
	if (!randomString) {
		randomString = Math.random().toString(36).slice(2);
	}
	return randomString;
};

let outputChannel: OutputChannel = window.createOutputChannel(
	'Ravi angular - Extension Logs'
);

const testItems = new Map<string, TestItem>();

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
	outputChannel.appendLine(
		`Created root test item: ${tests.name} with testId: ${root.id}`
	);
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
		outputChannel.appendLine(`Added child test item: ${children.name}`);
	});
	return root;
}

export async function spawnAProcess(filePath: string) {
	ports = await getAvailablePorts();
	console.log('<--------> ~ ports:', ports);

	let childProcess;
	let wsFolders = workspace?.workspaceFolders;

	if (wsFolders && wsFolders.length > 0) {
		process.chdir(wsFolders[0].uri.fsPath);
		outputChannel.appendLine(
			`Changed directory to: ${wsFolders[0].uri.fsPath}`
		);
		childProcess = spawn(
			'npx',
			[
				'ng',
				'test',
				`--karma-config=${filePath}`,
				'--code-coverage',
				'--progress'
			],
			{
				env: {
					...process.env,
					[ApplicationConstants.KarmaPort]: `${ports[0]}`,
					[ApplicationConstants.KarmaSocketPort]: `${ports[1]}`,
					[ApplicationConstants.KarmaCoverageDir]: getRandomString()
				}
			}
		);
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

export function listenToTestResults(
	server: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
	controller: TestController
) {
	let run: TestRun;

	server.on('connect', (socket) => {
		console.log('Connected to server');
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
	});
}

export const deleteCoverageDir = (directory: string) => {
	if (fs.existsSync(directory)) {
		fs.rmdirSync(directory, { recursive: true });
	}
};

export function freePort(port: number) {
	// Find the process using the port
	exec(`lsof -i :${port} -t`, (err, stdout, stderr) => {
		if (err) {
			console.error(`Error finding process using port ${port}: ${stderr}`);
			return;
		}

		const pid = stdout.trim();
		if (pid) {
			// Kill the process using the PID
			exec(`kill -9 ${pid}`, (killErr, killStdout, killStderr) => {
				if (killErr) {
					console.error(`Error killing process ${pid}: ${killStderr}`);
				} else {
					console.log(`Process ${pid} using port ${port} has been killed.`);
				}
			});
		} else {
			console.log(`No process found using port ${port}.`);
		}
	});
}
