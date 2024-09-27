export type Position = {
	line: number;
	column: number;
};

export type IParsedNode = {
	fn: string;
	name: string;
	location:
		| {
				source?: string | null | undefined;
				start: Position;
				end: Position;
		  }
		| undefined;
	children: IParsedNode[];
};
