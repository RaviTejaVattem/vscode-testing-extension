import { IParsedNode, Position } from './types';
import * as ts from 'typescript';

export function findKarmaTestsAndSuites(fileContent: string) {
	const sourceFile = ts.createSourceFile(
		'./',
		fileContent,
		ts.ScriptTarget.Latest,
		true
	);

	const root: IParsedNode = {
		fn: 'describe',
		name: 'root',
		location: {
			source: 'filePath',
			start: { line: 0, character: 0 },
			end: { line: 0, character: 0 }
		},
		children: []
	};

	function visit(node: ts.Node, parent: IParsedNode) {
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
					character: sourceFile.getLineAndCharacterOfPosition(node.getStart())
						.character
				};
				const end: Position = {
					line: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line,
					character: sourceFile.getLineAndCharacterOfPosition(node.getEnd())
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
				parent.children.push(newNode);
				if (expression.text === 'describe') {
					ts.forEachChild(node, (child) => visit(child, newNode));
				}
			}
		} else {
			ts.forEachChild(node, (child) => visit(child, parent));
		}
	}

	visit(sourceFile, root);

	return root;
}
