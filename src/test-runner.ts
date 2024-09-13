import * as fs from 'fs';
import { IstanbulCoverageContext } from 'istanbul-to-vscode';
import path from 'path';
import * as vscode from 'vscode';
import { getCoverageFolderName, testExecution } from './helpers';

export async function runTests(
	controller: vscode.TestController,
	request: vscode.TestRunRequest,
	cancellationToken: vscode.CancellationToken,
	isDebug: boolean = false
): Promise<void> {
	const run = controller.createTestRun(request);
	run.token.onCancellationRequested(() => {
		run.end();
		return;
	});

	if (!cancellationToken.isCancellationRequested) {
		if (request.include) {
			await Promise.all(
				request.include.map((t) =>
					runNode(t, request, run, cancellationToken, isDebug)
				)
			);
		} else {
			runAll(controller.items, run, cancellationToken, isDebug);
		}
	}
	run.end();
}

export async function runTestCoverage(
	controller: vscode.TestController,
	request: vscode.TestRunRequest,
	extensionContext: vscode.ExtensionContext,
	context?: IstanbulCoverageContext
): Promise<void> {
	const run = controller.createTestRun(request);
	let wsFolders = vscode.workspace?.workspaceFolders;
	if (context) {
		const dirPath = path.join(
			extensionContext.extensionPath,
			'/dist/coverage/',
			getCoverageFolderName()
		);
		const filePath = path.join(dirPath, 'coverage-final.json');

		if (fs.existsSync(filePath)) {
			await context.apply(run, dirPath);
		} else {
			console.log('No coverage found, re-run the tests');
		}
	}

	run.end();
}

async function runAll(
	items: vscode.TestItemCollection,
	run: vscode.TestRun,
	cancellationToken?: vscode.CancellationToken,
	isDebug: boolean = false
): Promise<void> {
	mapTestItems(items, (t) => {
		run.started(t);
	});

	await testExecution(undefined, run);
}

async function runNode(
	node: vscode.TestItem,
	request: vscode.TestRunRequest,
	run: vscode.TestRun,
	cancellationToken?: vscode.CancellationToken,
	isDebug: boolean = false,
	runEverything?: boolean
): Promise<void> {
	// Users can hide or filter out tests from their run. If the request says
	// they've done that for this node, then don't run it.
	if (request.exclude?.includes(node)) {
		return;
	}

	run.started(node);
	await testExecution(node, run);
	run.end();
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
