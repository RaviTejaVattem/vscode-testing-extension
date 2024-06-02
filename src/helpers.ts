import {
	Range,
	TestController,
	TestItem,
	TestRun,
	Uri,
	workspace
} from 'vscode';
import { IParsedNode } from './types';
import { spawn } from 'child_process';
import { read } from 'fs';
import path from 'path';
import { dir } from 'console';
import * as karma from './karma-test';
import { spawnSync } from 'child_process';

// const nestedSuite = controller.createTestItem(
// 	'neested',
// 	'Nested Suite',
// 	undefined
// );
// nestedSuite.children.replace([
// 	controller.createTestItem('test1', 'Test #1'),
// 	controller.createTestItem('test2', 'Test #2')
// ]);
// const test3 = controller.createTestItem('test3', 'Test #3');
// const test4 = controller.createTestItem('test4', 'Test #4');

// return [nestedSuite, test3, test4];

// fileData: IParsedNode = {};

// {
// 	fn: string;
// 	name: string;
// 	location: {
// 		source?: string | null | undefined;
// 		start: Position;
// 		end: Position;
// 	};
// 	children: IParsedNode[];
// };

export async function addTests(
	controller: TestController,
	tests: IParsedNode,
	file: Uri
) {
	let root = controller.createTestItem(tests.name, tests.name, file);
	tests.children.forEach(async (children) => {
		root.children.add(await addTests(controller, children, file));
	});
	return root;
}

export function spawnAProcess() {
	let childProcess;
	let wsFolders = workspace?.workspaceFolders;

	if (wsFolders && wsFolders.length > 0) {
		process.chdir(wsFolders[0].uri.fsPath);
		childProcess = spawn('npx', [
			'ng',
			'test',
			'--karma-config=karma.conf.js',
			'--code-coverage',
			'--progress'
		]);
		childProcess.stdout.on('data', (data) => {
			console.log(`Main server - stdout: ${data}`);
		});
		childProcess.stderr.on('data', (data) => {
			console.error(`Main server - stderr: ${data}`);
		});
		childProcess.on('close', (code) => {
			console.log(`Main server - child process exited with code ${code}`);
		});
	}

	return childProcess;
}

export async function testExecution(node: TestItem, run: TestRun) {
	let childProcess;
	let wsFolders = workspace?.workspaceFolders;

	if (node.parent && wsFolders && wsFolders.length > 0) {
		const testName = `${node.parent.id} ${node.id}`;
		process.chdir(wsFolders[0].uri.fsPath);
		const result = spawnSync('npx', [
			'karma',
			'run',
			'--port 9876',
			'--',
			`--grep=${testName}`,
			'--progress=true',
			'--no-watch'
		]);

		if (result.error) {
			console.error(`Test server - error: ${result.error.message}`);
		}

		if (result.stdout) {
			console.log(`Test server - stdout: ${result.stdout}`);
		}

		if (result.stderr) {
			console.log(`Test server - stderr: ${result.stderr}`);
		}

		if (result.status === 0) {
			run.passed(node);
		} else {
			run.failed(node, {
				message: 'test failed'
			});
		}

		console.log(
			`Test server - child process exited with code ${result.status}`
		);
	}
}
