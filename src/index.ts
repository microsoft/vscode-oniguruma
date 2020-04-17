/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { IOnigBinding, Pointer, IOnigMatch, IOnigCaptureIndex, OnigScanner as IOnigScanner, OnigString as IOnigString } from './types';
import OnigasmModuleFactory from './onig';

function throwLastOnigError(onigBinding: IOnigBinding): void {
	throw new Error(onigBinding.UTF8ToString(onigBinding._getLastOnigError()));
}

function createString(onigBinding: IOnigBinding, str: string): Pointer {
	const result = onigBinding._malloc(2 * (str.length + 1));
	onigBinding.stringToUTF16(str, result);
	return result;
}

class OnigString implements IOnigString {

	private readonly _onigBinding: IOnigBinding;
	public readonly content: string;
	private readonly _strPtr: Pointer;
	public readonly ptr: Pointer;

	constructor(onigBinding: IOnigBinding, str: string) {
		this._onigBinding = onigBinding;
		this.content = str;
		this._strPtr = createString(onigBinding, str);
		this.ptr = onigBinding._createOnigString(this._strPtr, str.length);
	}

	public dispose(): void {
		this._onigBinding._freeOnigString(this.ptr);
		this._onigBinding._free(this._strPtr);
	}
}

class OnigScanner implements IOnigScanner {

	private readonly _onigBinding: IOnigBinding;
	private readonly _ptr: Pointer;

	constructor(onigBinding: IOnigBinding, patterns: string[]) {
		let strPtrsArr: Pointer[] = [];
		let strLenArr: number[] = [];
		for (let i = 0, len = patterns.length; i < len; i++) {
			const str = patterns[i];
			strPtrsArr[i] = createString(onigBinding, str);
			strLenArr[i] = str.length;
		}
		const strPtrsPtr = onigBinding._malloc(4 * patterns.length);
		onigBinding.HEAPU32.set(strPtrsArr, strPtrsPtr / 4);

		const strLenPtr = onigBinding._malloc(4 * patterns.length);
		onigBinding.HEAPU32.set(strLenArr, strLenPtr / 4);

		const scannerPtr = onigBinding._createOnigScanner(strPtrsPtr, strLenPtr, patterns.length);

		for (let i = 0, len = patterns.length; i < len; i++) {
			onigBinding._free(strPtrsArr[i]);
		}
		onigBinding._free(strLenPtr);
		onigBinding._free(strPtrsPtr);

		if (scannerPtr === 0) {
			throwLastOnigError(onigBinding);
		}

		this._onigBinding = onigBinding;
		this._ptr = scannerPtr;
	}

	public dispose(): void {
		this._onigBinding._freeOnigScanner(this._ptr);
	}

	public findNextMatchSync(string: string | OnigString, startPosition: number): IOnigMatch | null {
		if (typeof string === 'string') {
			string = new OnigString(this._onigBinding, string);
			const result = this._findNextMatchSync(string, startPosition);
			string.dispose();
			return result;
		}
		return this._findNextMatchSync(string, startPosition);
	}

	private _findNextMatchSync(string: OnigString, startPosition: number): IOnigMatch | null {
		const onigBinding = this._onigBinding;
		const resultPtr = onigBinding._findNextOnigScannerMatch(this._ptr, string.ptr, startPosition);
		if (resultPtr === 0) {
			// no match
			return null;
		}
		const HEAPU32 = onigBinding.HEAPU32;
		let offset = resultPtr / 4; // byte offset -> uint32 offset
		const index = HEAPU32[offset++];
		const count = HEAPU32[offset++];
		let captureIndices: IOnigCaptureIndex[] = [];
		for (let i = 0; i < count; i++) {
			const beg = HEAPU32[offset++];
			const end = HEAPU32[offset++];
			captureIndices[i] = {
				start: beg,
				end: end,
				length: end - beg
			};
		}
		return {
			index: index,
			captureIndices: captureIndices
		};
	}
}

let onigBinding: IOnigBinding | null = null;
let initCalled = false;

type WASMLoader = (importObject: Record<string, Record<string, WebAssembly.ImportValue>> | undefined) => Promise<WebAssembly.WebAssemblyInstantiatedSource>;

function _loadWASM(loader: WASMLoader, resolve: () => void, reject: (err: any) => void): void {
	const { log, warn, error } = console
	OnigasmModuleFactory({
		instantiateWasm: (importObject, callback) => {
			loader(importObject).then(instantiatedSource => callback(instantiatedSource.instance), reject);
			return {}; // indicate async instantiation
		}
	}).then((binding) => {
		onigBinding = binding;
		resolve();
	});
	if (typeof print !== 'undefined') {
		// can be removed when https://github.com/emscripten-core/emscripten/issues/9829 is fixed.
		console.log = log
		console.error = error
		console.warn = warn
	}
}

export function loadWASM(data: ArrayBuffer | Response): Promise<void> {
	if (initCalled) {
		throw new Error(`Cannot invoke loadWASM more than once.`);
	}
	initCalled = true;

	let resolve: () => void;
	let reject: (err: any) => void;
	const result = new Promise<void>((_resolve, _reject) => { resolve = _resolve; reject = _reject; })

	if (data instanceof ArrayBuffer) {
		_loadWASM(importObject => WebAssembly.instantiate(data, importObject), resolve!, reject!);
	} else if (data instanceof Response && typeof WebAssembly.instantiateStreaming === 'function') {
		_loadWASM(importObject => WebAssembly.instantiateStreaming(data, importObject), resolve!, reject!);
	} else {
		_loadWASM(async importObject => {
			const arrayBuffer = await data.arrayBuffer();
			return WebAssembly.instantiate(arrayBuffer, importObject)
		}, resolve!, reject!)
	}

	return result;
}

export function createOnigString(str: string) {
	if (!onigBinding) {
		throw new Error(`Must invoke loadWASM first.`);
	}
	return new OnigString(onigBinding, str);
}

export function createOnigScanner(patterns: string[]) {
	if (!onigBinding) {
		throw new Error(`Must invoke loadWASM first.`);
	}
	return new OnigScanner(onigBinding, patterns);
}
