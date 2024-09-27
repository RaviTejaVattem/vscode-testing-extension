import { IParsedNode, Position } from './types';
import * as ts from 'typescript';
import * as vscode from 'vscode';

const describeKeys = ['describe', 'fdescribe'];
const itKeys = ['it', 'fit'];
const keysToCheck = [...describeKeys, ...itKeys];

export async function findKarmaTestsAndSuites(file: vscode.Uri) {
	const rawContent = await vscode.workspace.fs.readFile(file);
	const content = new TextDecoder().decode(rawContent);
	const sourceFile = ts.createSourceFile(
		'./',
		content,
		ts.ScriptTarget.Latest,
		true
	);

	const getPosition = (position: number) => ({
		line: sourceFile.getLineAndCharacterOfPosition(position).line,
		column: sourceFile.getLineAndCharacterOfPosition(position).character
	});

	const getNode = (node: ts.Node): IParsedNode | undefined => {
		if (ts.isCallExpression(node)) {
			const { expression, arguments: args } = node;
			if (
				ts.isIdentifier(expression) &&
				keysToCheck.includes(expression.text)
			) {
				const testName =
					args[0] && ts.isStringLiteral(args[0]) ? args[0].text : '';
				const start: Position = getPosition(node.getStart());
				const end: Position = getPosition(node.getEnd());
				return {
					fn: expression.text,
					name: testName,
					location: {
						source: file.fsPath,
						start,
						end
					},
					children: []
				};
			}
		}
	};

	const parsedNodes: IParsedNode[] = [];

	const visit = (node: ts.Node, parent: IParsedNode | null): void => {
		const currentNode = getNode(node);
		if (currentNode) {
			if (parent) {
				parent.children.push(currentNode);
			} else {
				parsedNodes.push(currentNode);
			}
			if (describeKeys.includes(currentNode.fn)) {
				node.forEachChild((child) => visit(child, currentNode));
			}
		} else {
			node.forEachChild((child) => visit(child, parent));
		}
	};

	visit(sourceFile, null);

	return parsedNodes.length > 0
		? parsedNodes
		: [
				{
					name: `Incorrect >>>> ${file.fsPath.split('/').pop()}`,
					children: [],
					location: undefined,
					fn: ''
				}
		  ];
}
