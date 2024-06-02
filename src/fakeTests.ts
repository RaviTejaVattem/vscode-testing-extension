import * as vscode from 'vscode';
import { IParsedNode } from './types';
import { IstanbulCoverageContext } from 'istanbul-to-vscode';
import path from 'path';
import { testExecution } from './helpers';

export function loadFakeTests(controller: vscode.TestController) {
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

	return [];
}

export async function runFakeTests(
	controller: vscode.TestController,
	request: vscode.TestRunRequest,
	context?: IstanbulCoverageContext
): Promise<void> {
	const run = controller.createTestRun(request);
	let wsFolders = vscode.workspace?.workspaceFolders;
	if (request.include) {
		await Promise.all(request.include.map((t) => runNode(t, request, run)));
	} else {
		await Promise.all(
			mapTestItems(controller.items, (t) => runNode(t, request, run))
		);
	}
	if (context) {
		if (wsFolders && wsFolders.length > 0) {
			const dirPath = path.join(wsFolders[0].uri.fsPath, '/coverage/qnb');
			await context.apply(run, dirPath);
		}
	}

	run.end();
}

async function runNode(
	node: vscode.TestItem,
	request: vscode.TestRunRequest,
	run: vscode.TestRun
): Promise<void> {
	// Users can hide or filter out tests from their run. If the request says
	// they've done that for this node, then don't run it.
	if (request.exclude?.includes(node)) {
		return;
	}

	if (node.children.size > 0) {
		// recurse and run all children if this is a "suite"
		await Promise.all(
			mapTestItems(node.children, (t) => runNode(t, request, run))
		);
	} else {
		run.started(node);
		await testExecution(node, run);
	}
}

// Small helper that works like "array.map" for children of a test collection
const mapTestItems = <T>(
	items: vscode.TestItemCollection,
	mapper: (t: vscode.TestItem) => T
): T[] => {
	const result: T[] = [];
	items.forEach((t) => result.push(mapper(t)));
	return result;
};
