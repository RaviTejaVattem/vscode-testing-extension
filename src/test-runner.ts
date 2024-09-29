import * as fs from 'fs';
import { IstanbulCoverageContext } from 'istanbul-to-vscode';
import path from 'path';
import * as vscode from 'vscode';
import { testExecution, writeToChannel } from './helpers';

const loopAndRunTests = async (
	run: vscode.TestRun,
	controller: vscode.TestController,
	request: vscode.TestRunRequest,
	cancellationToken: vscode.CancellationToken,
	isDebug: boolean = false
) => {
	run.token.onCancellationRequested(() => {
		run.end();
		return;
	});

	if (!cancellationToken.isCancellationRequested) {
		if (request.include) {
			await Promise.all(
				request.include.map((t) =>
					runNode(t, request, run, isDebug, cancellationToken)
				)
			);
		} else {
			runAll(controller.items, run, isDebug, cancellationToken);
		}
	}
};

export async function runTests(
	controller: vscode.TestController,
	request: vscode.TestRunRequest,
	cancellationToken: vscode.CancellationToken,
	isDebug: boolean = false
): Promise<void> {
	const run = controller.createTestRun(request);
	await loopAndRunTests(run, controller, request, cancellationToken, isDebug);
	run.end();
}

export async function runTestCoverage(
	controller: vscode.TestController,
	request: vscode.TestRunRequest,
	context: IstanbulCoverageContext,
	coverageFolderPath: string
): Promise<void> {
	const run = controller.createTestRun(request);
	if (context) {
		const filePath = path.join(coverageFolderPath, 'coverage-final.json');

		if (fs.existsSync(filePath)) {
			await context.apply(run, coverageFolderPath);
		} else {
			writeToChannel('No coverage found, re-run the tests');
		}
	}
	run.end();
}

async function runAll(
	items: vscode.TestItemCollection,
	run: vscode.TestRun,
	isDebug: boolean = false,
	cancellationToken?: vscode.CancellationToken
): Promise<void> {
	mapTestItems(items, (t) => {
		run.started(t);
	});

	await testExecution(undefined, run, isDebug);
}

async function runNode(
	node: vscode.TestItem,
	request: vscode.TestRunRequest,
	run: vscode.TestRun,
	isDebug: boolean = false,
	cancellationToken?: vscode.CancellationToken,
	runEverything?: boolean
): Promise<void> {
	// Users can hide or filter out tests from their run. If the request says
	// they've done that for this node, then don't run it.
	if (request.exclude?.includes(node)) {
		return;
	}

	run.started(node);
	await testExecution(node, run, isDebug);
	run.end();
}

const mapTestItems = <T>(
	items: vscode.TestItemCollection,
	mapper: (t: vscode.TestItem) => T
): T[] => {
	const result: T[] = [];
	items.forEach((t) => result.push(mapper(t)));
	return result;
};
