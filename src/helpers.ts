import { Range, TestController, TestItem, Uri, workspace } from 'vscode';
import { IParsedNode } from './types';
import { spawn } from 'child_process';
import { read } from 'fs';
import path from 'path';
import { dir } from 'console';
import * as karma from './karma-test';

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

export function addTests(
	controller: TestController,
	tests: IParsedNode,
	file: Uri
) {
	let root = controller.createTestItem(tests.name, tests.name, file);
	// item.range = new Range(start.range.start, end.range.end);
	tests.children.forEach((children) => {
		root.children.add(addTests(controller, children, file));
	});
	return root;
}

export function spawnAProcess() {
	// const child = spawn('node', [
	// 	'./node_modules/@angular/cli/bin/ng',
	// 	'test',
	// 	'test-pjkt',
	// 	'--karma-config=karma.conf.js',
	// 	'--progress=false'
	// ]);

	// // Listen to the output
	// child.stdout.on('data', (data) => {
	// 	console.log(`stdout: ${data}`);

	// 	// Conditionally kill the process
	// 	if (data.includes('some condition')) {
	// 		child.kill();
	// 	}
	// });

	// child.stderr.on('data', (data) => {
	// 	console.error(`stderr: ${data}`);
	// });

	// child.on('close', (code) => {
	// 	console.log(`child process exited with code ${code}`);
	// });

	// return child;
	let childProcess;
	let wsFolders = workspace?.workspaceFolders;

	if (wsFolders && wsFolders.length > 0) {
		process.chdir(wsFolders[0].uri.fsPath);
		childProcess = spawn('npx', [
			'ng',
			'test',
			'--karma-config=karma.conf.js',
			'--progress=false'
		]);
		childProcess.stdout.on('data', (data) => {
			console.log(`stdout: ${data}`);
		});
		childProcess.stderr.on('data', (data) => {
			console.error(`stderr: ${data}`);
		});
		childProcess.on('close', (code) => {
			console.log(`child process exited with code ${code}`);
		});
	}

	return childProcess;
}
