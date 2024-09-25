import { IParsedNode, Position } from './types';
import * as ts from 'typescript';
import * as vscode from 'vscode';

export async function findKarmaTestsAndSuites(file: vscode.Uri) {
	const rawContent = await vscode.workspace.fs.readFile(file);
	const content = new TextDecoder().decode(rawContent);
	const sourceFile = ts.createSourceFile(
		'./',
		content,
		ts.ScriptTarget.Latest,
		true
	);

	let root: IParsedNode = {} as IParsedNode;

	function visit(node: ts.Node, parent: IParsedNode | null) {
		if (ts.isCallExpression(node)) {
			const { expression, arguments: args } = node;
			if (
				ts.isIdentifier(expression) &&
				(expression.text === 'describe' ||
					expression.text === 'it' ||
					expression.text === 'fdescribe' ||
					expression.text === 'fit')
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
				if (expression.text === 'describe' || expression.text === 'fdescribe') {
					ts.forEachChild(node, (child) => visit(child, newNode));
				}
			}
		} else {
			ts.forEachChild(node, (child) => visit(child, parent));
		}
	}

	visit(sourceFile, null);

	if (!root.name) {
		root.name = `Incorrect >>>> ${file.fsPath.split('/').pop()}`;
		root.location = undefined;
		root.children = [];
	}

	return [root];
}
