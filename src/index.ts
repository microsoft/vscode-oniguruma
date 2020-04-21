/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { IOnigBinding, Pointer, IOnigMatch, IOnigCaptureIndex, OnigScanner as IOnigScanner, OnigString as IOnigString } from './types';
import OnigasmModuleFactory from './onig';

let onigBinding: IOnigBinding | null = null;

function throwLastOnigError(onigBinding: IOnigBinding): void {
	throw new Error(onigBinding.UTF8ToString(onigBinding._getLastOnigError()));
}

class UtfString {

	private static _utf8ByteLength(str: string): number {
		let result = 0;
		for (let i = 0, len = str.length; i < len; i++) {
			const charCode = str.charCodeAt(i);

			let codepoint = charCode;
			let wasSurrogatePair = false;

			if (charCode >= 0xd800 && charCode <= 0xdbff) {
				// Hit a high surrogate, try to look for a matching low surrogate
				if (i + 1 < len) {
					const nextCharCode = str.charCodeAt(i + 1);
					if (nextCharCode >= 0xdc00 && nextCharCode <= 0xdfff) {
						// Found the matching low surrogate
						codepoint = (((charCode - 0xd800) << 10) + 0x10000) | (nextCharCode - 0xdc00);
						wasSurrogatePair = true;
					}
				}
			}

			if (codepoint <= 0x7f) {
				result += 1;
			} else if (codepoint <= 0x7ff) {
				result += 2;
			} else if (codepoint <= 0xffff) {
				result += 3;
			} else {
				result += 4;
			}

			if (wasSurrogatePair) {
				i++;
			}
		}

		return result;
	}

	public readonly utf16Length: number;
	public readonly utf8Length: number;
	public readonly utf16Value: string;
	public readonly utf8Value: Uint8Array;
	public readonly utf16OffsetToUtf8: Uint32Array | null;
	public readonly utf8OffsetToUtf16: Uint32Array | null;

	constructor(str: string) {
		const utf16Length = str.length;
		const utf8Length = UtfString._utf8ByteLength(str);
		const computeIndicesMapping = (utf8Length !== utf16Length);
		const utf16OffsetToUtf8 = computeIndicesMapping ? new Uint32Array(utf16Length + 1) : null!;
		if (computeIndicesMapping) {
			utf16OffsetToUtf8[utf16Length] = utf8Length;
		}
		const utf8OffsetToUtf16 = computeIndicesMapping ? new Uint32Array(utf8Length + 1) : null!;
		if (computeIndicesMapping) {
			utf8OffsetToUtf16[utf8Length] = utf16Length;
		}
		const utf8Value = new Uint8Array(utf8Length);

		let i8 = 0;
		for (let i16 = 0; i16 < utf16Length; i16++) {
			const charCode = str.charCodeAt(i16);

			let codePoint = charCode;
			let wasSurrogatePair = false;

			if (charCode >= 0xd800 && charCode <= 0xdbff) {
				// Hit a high surrogate, try to look for a matching low surrogate
				if (i16 + 1 < utf16Length) {
					const nextCharCode = str.charCodeAt(i16 + 1);
					if (nextCharCode >= 0xdc00 && nextCharCode <= 0xdfff) {
						// Found the matching low surrogate
						codePoint = (((charCode - 0xd800) << 10) + 0x10000) | (nextCharCode - 0xdc00);
						wasSurrogatePair = true;
					}
				}
			}

			if (computeIndicesMapping) {
				utf16OffsetToUtf8[i16] = i8;
				if (wasSurrogatePair) {
					utf16OffsetToUtf8[i16 + 1] = i8;
				}

				if (codePoint <= 0x7f) {
					utf8OffsetToUtf16[i8 + 0] = i16;
				} else if (codePoint <= 0x7ff) {
					utf8OffsetToUtf16[i8 + 0] = i16;
					utf8OffsetToUtf16[i8 + 1] = i16;
				} else if (codePoint <= 0xffff) {
					utf8OffsetToUtf16[i8 + 0] = i16;
					utf8OffsetToUtf16[i8 + 1] = i16;
					utf8OffsetToUtf16[i8 + 2] = i16;
				} else {
					utf8OffsetToUtf16[i8 + 0] = i16;
					utf8OffsetToUtf16[i8 + 1] = i16;
					utf8OffsetToUtf16[i8 + 2] = i16;
					utf8OffsetToUtf16[i8 + 3] = i16;
				}
			}

			if (codePoint <= 0x7f) {
				utf8Value[i8++] = codePoint;
			} else if (codePoint <= 0x7ff) {
				utf8Value[i8++] = 0b11000000 | ((codePoint & 0b00000000000000000000011111000000) >>> 6);
				utf8Value[i8++] = 0b10000000 | ((codePoint & 0b00000000000000000000000000111111) >>> 0);
			} else if (codePoint <= 0xffff) {
				utf8Value[i8++] = 0b11100000 | ((codePoint & 0b00000000000000001111000000000000) >>> 12);
				utf8Value[i8++] = 0b10000000 | ((codePoint & 0b00000000000000000000111111000000) >>> 6);
				utf8Value[i8++] = 0b10000000 | ((codePoint & 0b00000000000000000000000000111111) >>> 0);
			} else {
				utf8Value[i8++] = 0b11110000 | ((codePoint & 0b00000000000111000000000000000000) >>> 18);
				utf8Value[i8++] = 0b10000000 | ((codePoint & 0b00000000000000111111000000000000) >>> 12);
				utf8Value[i8++] = 0b10000000 | ((codePoint & 0b00000000000000000000111111000000) >>> 6);
				utf8Value[i8++] = 0b10000000 | ((codePoint & 0b00000000000000000000000000111111) >>> 0);
			}

			if (wasSurrogatePair) {
				i16++;
			}
		}

		this.utf16Length = utf16Length;
		this.utf8Length = utf8Length;
		this.utf16Value = str;
		this.utf8Value = utf8Value;
		this.utf16OffsetToUtf8 = utf16OffsetToUtf8;
		this.utf8OffsetToUtf16 = utf8OffsetToUtf16;
	}

	public createString(onigBinding: IOnigBinding): Pointer {
		const result = onigBinding._malloc(this.utf8Length);
		onigBinding.HEAPU8.set(this.utf8Value, result);
		return result;
	}
}

export class OnigString implements IOnigString {

	private readonly _onigBinding: IOnigBinding;
	public readonly content: string;
	public readonly utf16Length: number;
	public readonly utf8Length: number;
	public readonly utf16OffsetToUtf8: Uint32Array | null;
	public readonly utf8OffsetToUtf16: Uint32Array | null;
	private readonly _strPtr: Pointer;
	public readonly ptr: Pointer;

	constructor(str: string) {
		if (!onigBinding) {
			throw new Error(`Must invoke loadWASM first.`);
		}
		this._onigBinding = onigBinding;
		this.content = str;
		const utfString = new UtfString(str);
		this.utf16Length = utfString.utf16Length;
		this.utf8Length = utfString.utf8Length;
		this.utf16OffsetToUtf8 = utfString.utf16OffsetToUtf8;
		this.utf8OffsetToUtf16 = utfString.utf8OffsetToUtf16;
		this._strPtr = utfString.createString(onigBinding);
		this.ptr = onigBinding._createOnigString(this._strPtr, this.utf8Length);
	}

	public convertUtf8OffsetToUtf16(utf8Offset: number): number {
		if (this.utf8OffsetToUtf16) {
			if (utf8Offset < 0) {
				return 0;
			}
			if (utf8Offset > this.utf8Length) {
				return this.utf16Length;
			}
			return this.utf8OffsetToUtf16[utf8Offset];
		}
		return utf8Offset;
	}

	public convertUtf16OffsetToUtf8(utf16Offset: number): number {
		if (this.utf16OffsetToUtf8) {
			if (utf16Offset < 0) {
				return 0;
			}
			if (utf16Offset > this.utf16Length) {
				return this.utf8Length;
			}
			return this.utf16OffsetToUtf8[utf16Offset];
		}
		return utf16Offset;
	}

	public dispose(): void {
		this._onigBinding._freeOnigString(this.ptr);
		this._onigBinding._free(this._strPtr);
	}
}

export class OnigScanner implements IOnigScanner {

	private readonly _onigBinding: IOnigBinding;
	private readonly _ptr: Pointer;

	constructor(patterns: string[]) {
		if (!onigBinding) {
			throw new Error(`Must invoke loadWASM first.`);
		}
		const strPtrsArr: Pointer[] = [];
		const strLenArr: number[] = [];
		for (let i = 0, len = patterns.length; i < len; i++) {
			const utfString = new UtfString(patterns[i]);
			strPtrsArr[i] = utfString.createString(onigBinding);
			strLenArr[i] = utfString.utf8Length;
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
			string = new OnigString(string);
			const result = this._findNextMatchSync(string, startPosition);
			string.dispose();
			return result;
		}
		return this._findNextMatchSync(string, startPosition);
	}

	private _findNextMatchSync(string: OnigString, startPosition: number): IOnigMatch | null {
		const onigBinding = this._onigBinding;
		const resultPtr = onigBinding._findNextOnigScannerMatch(this._ptr, string.ptr, string.convertUtf16OffsetToUtf8(startPosition));
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
			const beg = string.convertUtf8OffsetToUtf16(HEAPU32[offset++]);
			const end = string.convertUtf8OffsetToUtf16(HEAPU32[offset++]);
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

let initCalled = false;
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
	return new OnigString(str);
}

export function createOnigScanner(patterns: string[]) {
	return new OnigScanner(patterns);
}
