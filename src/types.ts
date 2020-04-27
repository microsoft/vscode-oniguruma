/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

export type Pointer = number;

export interface IOnigBinding {
	HEAPU8: Uint8Array;
	HEAPU32: Uint32Array;

	_malloc(count: number): Pointer;
	_free(ptr: Pointer): void;
	UTF8ToString(ptr: Pointer): string;

	_getLastOnigError(): Pointer;
	_createOnigScanner(strPtrsPtr: Pointer, strLenPtr: Pointer, count: number): Pointer;
	_freeOnigScanner(ptr: Pointer): void;
	_findNextOnigScannerMatch(scanner: Pointer, strCacheId: number, strData: Pointer, strLength: number, position: number): number;
	_findNextOnigScannerMatchDbg(scanner: Pointer, strCacheId: number, strData: Pointer, strLength: number, position: number): number;
}

export interface IOnigCaptureIndex {
	start: number;
	end: number;
	length: number;
}

export interface IOnigMatch {
	index: number;
	captureIndices: IOnigCaptureIndex[];
}

export interface OnigScanner {
	findNextMatchSync(string: string | OnigString, startPosition: number): IOnigMatch | null;
	readonly dispose?: () => void;
}

export interface OnigString {
	readonly content: string;
	readonly dispose?: () => void;
}
