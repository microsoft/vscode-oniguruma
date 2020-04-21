/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

export function loadWASM(data: ArrayBuffer | Response): Promise<void>;

export class OnigString {
	readonly content: string;
	constructor(content: string);
	public dispose(): void;
}

export class OnigScanner {
	constructor(patterns: string[]);
	public dispose(): void;
	findNextMatchSync(string: string | OnigString, startPosition: number): IOnigMatch;
}

export interface IOnigCaptureIndex {
	index: number
	start: number
	end: number
	length: number
}

export interface IOnigMatch {
	index: number
	captureIndices: IOnigCaptureIndex[]
}
