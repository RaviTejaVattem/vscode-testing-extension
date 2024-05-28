import { TestController, TestItem } from 'vscode';
import { IParsedNode } from './types';

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

export function addTests(controller: TestController, tests: IParsedNode) {
	let root = controller.createTestItem(tests.name, tests.name);

	tests.children.forEach((children) => {
		root.children.add(addTests(controller, children));
	});
	return root;
}
