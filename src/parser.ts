import { IParsedNode, Position } from './types';
import * as ts from 'typescript';

export function findKarmaTestsAndSuites(fileContent: string) {
	const sourceFile = ts.createSourceFile(
		'./',
		fileContent,
		ts.ScriptTarget.Latest,
		true
	);

	let root: IParsedNode = {} as IParsedNode;

	function visit(node: ts.Node, parent: IParsedNode | null) {
		if (ts.isCallExpression(node)) {
			const { expression, arguments: args } = node;
			if (
				ts.isIdentifier(expression) &&
				(expression.text === 'describe' || expression.text === 'it')
			) {
				const testName =
					args[0] && ts.isStringLiteral(args[0]) ? args[0].text : '';
				const start: Position = {
					line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line,
					column: sourceFile.getLineAndCharacterOfPosition(node.getStart())
						.character
				};
				const end: Position = {
					line: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line,
					column: sourceFile.getLineAndCharacterOfPosition(node.getEnd())
						.character
				};
				const newNode: IParsedNode = {
					fn: expression.text as 'describe' | 'it',
					name: testName,
					location: {
						source: 'filePath',
						start,
						end
					},
					children: []
				};
				if (parent) {
					parent.children.push(newNode);
				} else {
					root = { ...newNode };
				}
				if (expression.text === 'describe') {
					ts.forEachChild(node, (child) => visit(child, newNode));
				}
			}
		} else {
			ts.forEachChild(node, (child) => visit(child, parent));
		}
	}

	visit(sourceFile, null);

	return root;
}
