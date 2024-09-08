import { spawn } from 'child_process';
import * as http from 'http';
import {
	OutputChannel,
	Range,
	TestController,
	TestItem,
	TestRun,
	Uri,
	window,
	workspace
} from 'vscode';
import getAvailablePorts from './port-finder';
import { IParsedNode } from './types';
import { io } from 'socket.io-client';

let outputChannel: OutputChannel = window.createOutputChannel(
	'Ravi angular - Extension Logs'
);

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
	file: Uri
) {
	let root = controller.createTestItem(tests.name, tests.name, file);
	setRange(root, tests);
	outputChannel.appendLine(`Created root test item: ${tests.name}`);
	tests.children.forEach(async (children) => {
		const childNode = await addTests(controller, children, file);
		setRange(childNode, children);
		root.children.add(childNode);
		outputChannel.appendLine(`Added child test item: ${children.name}`);
	});
	return root;
}

export function spawnAProcess(filePath: string, ports: number[]) {
	listenToTestResults(ports[1]);
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

export async function testExecution(node: TestItem, run: TestRun) {
	let result;
	let wsFolders = workspace?.workspaceFolders;

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

		let testName = node.parent ? `${node.parent.id} ${node.id}` : `${node.id}`;

		console.log('<--------> ~ testExecution ~ testName:', testName);

		const ports = await getAvailablePorts();
		console.log('<--------> ~ testExecution ~ port:', ports);
		// process.chdir(wsFolders[0].uri.fsPath);
		// result = spawnSync('npx', [
		// 	'karma',
		// 	'run',
		// 	`--port=${port}`,
		// 	'--',
		// 	`--grep=${testName}`,
		// 	'--progress=true',
		// 	'--no-watch'
		// ]);
		// outputChannel.appendLine(`Test server - result: ${JSON.stringify(result)}`);

		// if (result.error) {
		// 	console.error(`Test server - error: ${result.error.message}`);
		// 	outputChannel.appendLine(`Test server - error: ${result.error.message}`);
		// }

		// if (result.stdout) {
		// 	console.log(`Test server - stdout: ${result.stdout}`);
		// 	outputChannel.appendLine(`Test server - stdout: ${result.stdout}`);
		// }

		// if (result.stderr) {
		// 	console.log(`Test server - stderr: ${result.stderr}`);
		// 	outputChannel.appendLine(`Test server - stderr: ${result.stderr}`);
		// }

		// if (result.status === 0) {
		// 	run.passed(node);
		// 	outputChannel.appendLine(`Test server - test passed`);
		// } else {
		// 	outputChannel.appendLine(`Test server - test failed`);
		// 	run.failed(node, {
		// 		message: 'test failed'
		// 	});
		// }

		// console.log(
		// 	`Test server - child process exited with code ${result.status}`
		// );
		// outputChannel.appendLine(
		// 	`Test server - child process exited with code ${result.status}`
		// );

		const requestBody = {
			args: [`--grep=${testName}`],
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
				}
			});
		});

		request.write(JSON.stringify(requestBody));
		request.end();

		return request;
	}
}

function listenToTestResults(port: number) {
	const socket = io(`http://localhost:${port}`);

	socket.on('connect', () => {
		console.log('Connected to server');
	});

	socket.on('specComplete', (result: any) => {
		console.log('Received specComplete result:', result);
	});
}
