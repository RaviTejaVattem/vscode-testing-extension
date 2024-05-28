export type Position = {
	line: number;
	character: number;
};

export type IParsedNode = {
	fn: string;
	name: string;
	location: {
		source?: string | null | undefined;
		start: Position;
		end: Position;
	};
	children: IParsedNode[];
};
