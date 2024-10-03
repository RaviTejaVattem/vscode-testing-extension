import * as fs from 'fs';
import {
	TestRun,
	TestController,
	TestRunRequest,
	CancellationToken,
	TestItemCollection,
	TestItem
} from 'vscode';
import { IstanbulCoverageContext } from 'istanbul-to-vscode';
import path from 'path';
import { testExecution, writeToChannel } from './helpers';

const loopAndRunTests = async (
	run: TestRun,
	controller: TestController,
	request: TestRunRequest,
	cancellationToken: CancellationToken,
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
	controller: TestController,
	request: TestRunRequest,
	cancellationToken: CancellationToken,
	isDebug: boolean = false
): Promise<void> {
	const run = controller.createTestRun(request);
	await loopAndRunTests(run, controller, request, cancellationToken, isDebug);
	run.end();
}

export async function runTestCoverage(
	controller: TestController,
	request: TestRunRequest,
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
	items: TestItemCollection,
	run: TestRun,
	isDebug: boolean = false,
	cancellationToken?: CancellationToken
): Promise<void> {
	mapTestItems(items, (t) => {
		run.started(t);
	});

	await testExecution(undefined, run, isDebug);
}

async function runNode(
	node: TestItem,
	request: TestRunRequest,
	run: TestRun,
	isDebug: boolean = false,
	cancellationToken?: CancellationToken,
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
	items: TestItemCollection,
	mapper: (t: TestItem) => T
): T[] => {
	const result: T[] = [];
	items.forEach((t) => result.push(mapper(t)));
	return result;
};
