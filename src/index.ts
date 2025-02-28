/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { IOnigBinding, Pointer, IOnigMatch, IOnigCaptureIndex, OnigScanner as IOnigScanner, OnigString as IOnigString } from './types';
import OnigasmModuleFactory from './onig';

export const enum FindOption {
	/**
	 * equivalent of ONIG_OPTION_DEFAULT
	 */
	Default,
	/**
	 * equivalent of ONIG_OPTION_NONE
	 */
	None,
	/**
	 * equivalent of ONIG_OPTION_IGNORECASE
	 */
	Ignorecase,
	/**
	 * equivalent of ONIG_OPTION_EXTEND
	 */
	Extend,
	/**
	 * equivalent of ONIG_OPTION_MULTILINE
	 */
	Multiline,
	/**
	 * equivalent of ONIG_OPTION_SINGLELINE
	 */
	Singleline,
	/**
	 * equivalent of ONIG_OPTION_FIND_LONGEST
	 */
	FindLongest,
	/**
	 * equivalent of ONIG_OPTION_FIND_NOT_EMPTY
	 */
	FindNotEmpty,
	/**
	 * equivalent of ONIG_OPTION_NEGATE_SINGLELINE
	 */
	NegateSingleline,
	/**
	 * equivalent of ONIG_OPTION_DONT_CAPTURE_GROUP
	 */
	DontCaptureGroup,
	/**
	 * equivalent of ONIG_OPTION_CAPTURE_GROUP
	 */
	CaptureGroup,
	/**
	 * equivalent of ONIG_OPTION_NOTBOL
	 */
	Notbol,
	/**
	 * equivalent of ONIG_OPTION_NOTEOL
	 */
	Noteol,
	/**
	 * equivalent of ONIG_OPTION_CHECK_VALIDITY_OF_STRING
	 */
	CheckValidityOfString,
	/**
	 * equivalent of ONIG_OPTION_IGNORECASE_IS_ASCII
	 */
	IgnorecaseIsAscii,
	/**
	 * equivalent of ONIG_OPTION_WORD_IS_ASCII
	 */
	WordIsAscii,
	/**
	 * equivalent of ONIG_OPTION_DIGIT_IS_ASCII
	 */
	DigitIsAscii,
	/**
	 * equivalent of ONIG_OPTION_SPACE_IS_ASCII
	 */
	SpaceIsAscii,
	/**
	 * equivalent of ONIG_OPTION_POSIX_IS_ASCII
	 */
	PosixIsAscii,
	/**
	 * equivalent of ONIG_OPTION_TEXT_SEGMENT_EXTENDED_GRAPHEME_CLUSTER
	 */
	TextSegmentExtendedGraphemeCluster,
	/**
	 * equivalent of ONIG_OPTION_TEXT_SEGMENT_WORD
	 */
	TextSegmentWord,
	/**
	 * equivalent of ONIG_OPTION_NOT_BEGIN_STRING: (str) isn't considered as begin of string (* fail \A)
	 */
	NotBeginString,
	/**
	 * equivalent of ONIG_OPTION_NOT_END_STRING: (end) isn't considered as end of string (* fail \z, \Z)
	 */
	NotEndString,
	/**
	 * equivalent of ONIG_OPTION_NOT_BEGIN_POSITION: (start) isn't considered as start position of search (* fail \G)
	 */
	NotBeginPosition,
	/**
	 * equivalent of ONIG_OPTION_
	 */
	CallbackEachMatch,
	/**
	 * used for debugging purposes.
	 */
	DebugCall
}

export const enum Syntax {
	Default,
	Asis,
	PosixBasic,
	PosixExtended,
	Emacs,
	Grep,
	GnuRegex,
	Java,
	Perl,
	PerlNg,
	Ruby,
	Python,
	Oniguruma
}

let onigBinding: IOnigBinding | null = null;
let defaultDebugCall = false;

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
		const result = onigBinding._omalloc(this.utf8Length);
		onigBinding.HEAPU8.set(this.utf8Value, result);
		return result;
	}
}

export class OnigString implements IOnigString {

	private static LAST_ID = 0;
	private static _sharedPtr: Pointer = 0; // a pointer to a string of 10000 bytes
	private static _sharedPtrInUse: boolean = false;

	public readonly id = (++OnigString.LAST_ID);
	private readonly _onigBinding: IOnigBinding;
	public readonly content: string;
	public readonly utf16Length: number;
	public readonly utf8Length: number;
	public readonly utf16OffsetToUtf8: Uint32Array | null;
	public readonly utf8OffsetToUtf16: Uint32Array | null;
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

		if (this.utf8Length < 10000 && !OnigString._sharedPtrInUse) {
			if (!OnigString._sharedPtr) {
				OnigString._sharedPtr = onigBinding._omalloc(10000);
			}
			OnigString._sharedPtrInUse = true;
			onigBinding.HEAPU8.set(utfString.utf8Value, OnigString._sharedPtr);
			this.ptr = OnigString._sharedPtr;
		} else {
			this.ptr = utfString.createString(onigBinding);
		}
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
		if (this.ptr === OnigString._sharedPtr) {
			OnigString._sharedPtrInUse = false;
		} else {
			this._onigBinding._ofree(this.ptr);
		}
	}
}

export interface IOnigScannerConfig {
	options?: FindOption[],
	syntax?: Syntax
}

export class OnigScanner implements IOnigScanner {

	private readonly _onigBinding: IOnigBinding;
	private readonly _ptr: Pointer;
	private readonly _options: FindOption[];

	constructor(patterns: string[], config?: IOnigScannerConfig) {
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
		const strPtrsPtr = onigBinding._omalloc(4 * patterns.length);
		onigBinding.HEAPU32.set(strPtrsArr, strPtrsPtr / 4);

		const strLenPtr = onigBinding._omalloc(4 * patterns.length);
		onigBinding.HEAPU32.set(strLenArr, strLenPtr / 4);

		this._onigBinding = onigBinding;
		this._options = config?.options ?? [FindOption.CaptureGroup];
		const opts = this.onigOptions(this._options);
		const syntax = this.onigSyntax(config?.syntax ?? Syntax.Default);
		const scannerPtr = onigBinding._createOnigScanner(strPtrsPtr, strLenPtr, patterns.length, opts, syntax);
		this._ptr = scannerPtr;

		for (let i = 0, len = patterns.length; i < len; i++) {
			onigBinding._ofree(strPtrsArr[i]);
		}
		onigBinding._ofree(strLenPtr);
		onigBinding._ofree(strPtrsPtr);

		if (scannerPtr === 0) {
			throwLastOnigError(onigBinding);
		}
	}

	public dispose(): void {
		this._onigBinding._freeOnigScanner(this._ptr);
	}

	public findNextMatchSync(string: string | OnigString, startPosition: number, options: FindOption[]): IOnigMatch | null;
	public findNextMatchSync(string: string | OnigString, startPosition: number, debugCall: boolean): IOnigMatch | null;
	public findNextMatchSync(string: string | OnigString, startPosition: number): IOnigMatch | null;
	public findNextMatchSync(string: string | OnigString, startPosition: number, arg?: FindOption[] | boolean): IOnigMatch | null {
		let debugCall = defaultDebugCall;
		let options = this._options;
		if (Array.isArray(arg)) {
			if (arg.includes(FindOption.DebugCall)) {
				debugCall = true;
			}
			options = options.concat(arg);
		} else if (typeof arg === 'boolean') {
			debugCall = arg;
		}
		if (typeof string === 'string') {
			string = new OnigString(string);
			const result = this._findNextMatchSync(string, startPosition, debugCall, options);
			string.dispose();
			return result;
		}
		return this._findNextMatchSync(string, startPosition, debugCall, options);
	}

	private _findNextMatchSync(string: OnigString, startPosition: number, debugCall: boolean, options: FindOption[]): IOnigMatch | null {
		const onigBinding = this._onigBinding;
		const opts = this.onigOptions(options);
		let resultPtr: Pointer;
		if (debugCall) {
			resultPtr = onigBinding._findNextOnigScannerMatchDbg(this._ptr, string.id, string.ptr, string.utf8Length, string.convertUtf16OffsetToUtf8(startPosition), opts);
		} else {
			resultPtr = onigBinding._findNextOnigScannerMatch(this._ptr, string.id, string.ptr, string.utf8Length, string.convertUtf16OffsetToUtf8(startPosition), opts);
		}
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

	private onigOptions(options: FindOption[]): number {
		return options.map(o => this.onigOption(o)).reduce((acc, o) => acc | o, this._onigBinding.ONIG_OPTION_NONE);
	}

	private onigSyntax(syntax: Syntax): Pointer {
		switch(syntax) {
			case Syntax.Default:
				return this._onigBinding.ONIG_SYNTAX_DEFAULT;
			case Syntax.Asis:
				return this._onigBinding.ONIG_SYNTAX_ASIS;
			case Syntax.PosixBasic:
				return this._onigBinding.ONIG_SYNTAX_POSIX_BASIC;
			case Syntax.PosixExtended:
				return this._onigBinding.ONIG_SYNTAX_POSIX_EXTENDED;
			case Syntax.Emacs:
				return this._onigBinding.ONIG_SYNTAX_EMACS;
			case Syntax.Grep:
				return this._onigBinding.ONIG_SYNTAX_GREP;
			case Syntax.GnuRegex:
				return this._onigBinding.ONIG_SYNTAX_GNU_REGEX;
			case Syntax.Java:
				return this._onigBinding.ONIG_SYNTAX_JAVA;
			case Syntax.Perl:
				return this._onigBinding.ONIG_SYNTAX_PERL;
			case Syntax.PerlNg:
				return this._onigBinding.ONIG_SYNTAX_PERL_NG;
			case Syntax.Ruby:
				return this._onigBinding.ONIG_SYNTAX_RUBY;
			case Syntax.Python:
				return this._onigBinding.ONIG_SYNTAX_PYTHON;
			case Syntax.Oniguruma:
				return this._onigBinding.ONIG_SYNTAX_ONIGURUMA;
		}
	}

	private onigOption(option: FindOption): number {
		switch (option) {
			case FindOption.None:
				return this._onigBinding.ONIG_OPTION_NONE;
			case FindOption.Default:
				return this._onigBinding.ONIG_OPTION_DEFAULT;
			case FindOption.Ignorecase:
				return this._onigBinding.ONIG_OPTION_IGNORECASE;
			case FindOption.Extend:
				return this._onigBinding.ONIG_OPTION_EXTEND;
			case FindOption.Multiline:
				return this._onigBinding.ONIG_OPTION_MULTILINE;
			case FindOption.Singleline:
				return this._onigBinding.ONIG_OPTION_SINGLELINE;
			case FindOption.FindLongest:
				return this._onigBinding.ONIG_OPTION_FIND_LONGEST;
			case FindOption.FindNotEmpty:
				return this._onigBinding.ONIG_OPTION_FIND_NOT_EMPTY;
			case FindOption.NegateSingleline:
				return this._onigBinding.ONIG_OPTION_NEGATE_SINGLELINE;
			case FindOption.DontCaptureGroup:
				return this._onigBinding.ONIG_OPTION_DONT_CAPTURE_GROUP;
			case FindOption.CaptureGroup:
				return this._onigBinding.ONIG_OPTION_CAPTURE_GROUP;
			case FindOption.Notbol:
				return this._onigBinding.ONIG_OPTION_NOTBOL;
			case FindOption.Noteol:
				return this._onigBinding.ONIG_OPTION_NOTEOL;
			case FindOption.CheckValidityOfString:
				return this._onigBinding.ONIG_OPTION_CHECK_VALIDITY_OF_STRING;
			case FindOption.IgnorecaseIsAscii:
				return this._onigBinding.ONIG_OPTION_IGNORECASE_IS_ASCII;
			case FindOption.WordIsAscii:
				return this._onigBinding.ONIG_OPTION_WORD_IS_ASCII;
			case FindOption.DigitIsAscii:
				return this._onigBinding.ONIG_OPTION_DIGIT_IS_ASCII;
			case FindOption.SpaceIsAscii:
				return this._onigBinding.ONIG_OPTION_SPACE_IS_ASCII;
			case FindOption.PosixIsAscii:
				return this._onigBinding.ONIG_OPTION_POSIX_IS_ASCII;
			case FindOption.TextSegmentExtendedGraphemeCluster:
				return this._onigBinding.ONIG_OPTION_TEXT_SEGMENT_EXTENDED_GRAPHEME_CLUSTER;
			case FindOption.TextSegmentWord:
				return this._onigBinding.ONIG_OPTION_TEXT_SEGMENT_WORD;
			case FindOption.NotBeginString:
				return this._onigBinding.ONIG_OPTION_NOT_BEGIN_STRING;
			case FindOption.NotEndString:
				return this._onigBinding.ONIG_OPTION_NOT_END_STRING;
			case FindOption.NotBeginPosition:
				return this._onigBinding.ONIG_OPTION_NOT_BEGIN_POSITION;
			case FindOption.CallbackEachMatch:
				return this._onigBinding.ONIG_OPTION_CALLBACK_EACH_MATCH;
			case FindOption.DebugCall:
				return this._onigBinding.ONIG_OPTION_DEFAULT;
		}
	}

	public groupsToNumber(patternIndex: number): Map<string, number[]> {
		const onigBinding = this._onigBinding;
		const resultPtr = onigBinding._groupsToNumber(this._ptr, patternIndex);
		let result = new Map<string, number[]>();
		try {
		  let offset = resultPtr / 4; // byte offset -> uint32 offset
		  const HEAPU32 = onigBinding.HEAPU32;
		  const count = HEAPU32[offset++];

			let namesOffset = HEAPU32[offset++] / 4;
			let names: string[] = [];
			for (let i = 0; i < count; i++) {
				names[i] = onigBinding.UTF8ToString(HEAPU32[namesOffset++]);
			}

			let groupNumbersOffset = HEAPU32[offset++] / 4;
			for (let i = 0; i < count; i++) {
				const numbersCount = HEAPU32[groupNumbersOffset++];
				let numbersOffset = HEAPU32[groupNumbersOffset++] / 4;
				let numbers: number[] = [];
				for (let j = 0; j < numbersCount; j++) {
					numbers[j] = HEAPU32[numbersOffset++];
				}
				result.set(names[i], numbers);
			}
		} finally {
			this._onigBinding._freeOnigGroups(resultPtr);
		}
		return result;
	}
}

export interface WebAssemblyInstantiator {
	(importObject: Record<string, Record<string, WebAssembly.ImportValue>> | undefined): Promise<WebAssembly.WebAssemblyInstantiatedSource>;
}
interface ICommonOptions {
	print?(str: string): void;
}
interface IInstantiatorOptions extends ICommonOptions {
	instantiator: WebAssemblyInstantiator;
}
interface IDataOptions extends ICommonOptions {
	data: ArrayBufferView | ArrayBuffer | Response;
}
export type IOptions = IInstantiatorOptions | IDataOptions;

function _loadWASM(loader: WebAssemblyInstantiator, print: ((str: string) => void) | undefined, resolve: () => void, reject: (err: any) => void): void {
	OnigasmModuleFactory({
		print: print,
		instantiateWasm: (importObject, callback) => {
			if (typeof performance === 'undefined') {
				// performance.now() is not available in this environment, so use Date.now()
				const get_now = () => Date.now();
				(<any>importObject).env.emscripten_get_now = get_now;
				(<any>importObject).wasi_snapshot_preview1.emscripten_get_now = get_now;
			}
			loader(importObject).then(instantiatedSource => callback(instantiatedSource.instance), reject);
			return {}; // indicate async instantiation
		}
	}).then((binding) => {
		onigBinding = binding;
		resolve();
	});
}

function isInstantiatorOptionsObject(dataOrOptions: ArrayBufferView | ArrayBuffer | Response | IOptions): dataOrOptions is IInstantiatorOptions {
	return (typeof (<IInstantiatorOptions>dataOrOptions).instantiator === 'function');
}

function isDataOptionsObject(dataOrOptions: ArrayBufferView | ArrayBuffer | Response | IOptions): dataOrOptions is IDataOptions {
	return (typeof (<IDataOptions>dataOrOptions).data !== 'undefined');
}

function isResponse(dataOrOptions: ArrayBufferView | ArrayBuffer | Response | IOptions): dataOrOptions is Response {
	return (typeof Response !== 'undefined' && dataOrOptions instanceof Response);
}

let initCalled = false;
let initPromise: Promise<void> | null = null;

export function loadWASM(options: IOptions): Promise<void>;
export function loadWASM(data: ArrayBufferView | ArrayBuffer | Response): Promise<void>;
export function loadWASM(dataOrOptions: ArrayBufferView | ArrayBuffer | Response | IOptions): Promise<void> {
	if (initCalled) {
		// Already initialized
		return initPromise!;
	}
	initCalled = true;

	let loader: WebAssemblyInstantiator;
	let print: ((str: string) => void) | undefined;

	if (isInstantiatorOptionsObject(dataOrOptions)) {
		loader = dataOrOptions.instantiator;
		print = dataOrOptions.print;
	} else {
		let data: ArrayBufferView | ArrayBuffer | Response;
		if (isDataOptionsObject(dataOrOptions)) {
			data = dataOrOptions.data;
			print = dataOrOptions.print;
		} else {
			data = dataOrOptions;
		}

		if (isResponse(data)) {
			if (typeof WebAssembly.instantiateStreaming === 'function') {
				loader = _makeResponseStreamingLoader(data);
			} else {
				loader = _makeResponseNonStreamingLoader(data);
			}
		} else {
			loader = _makeArrayBufferLoader(data);
		}
	}

	let resolve: () => void;
	let reject: (err: any) => void;
	initPromise = new Promise<void>((_resolve, _reject) => { resolve = _resolve; reject = _reject; })

	_loadWASM(loader, print, resolve!, reject!);

	return initPromise;
}

function _makeArrayBufferLoader(data: ArrayBufferView | ArrayBuffer): WebAssemblyInstantiator {
	return importObject => WebAssembly.instantiate(data, importObject);
}
function _makeResponseStreamingLoader(data: Response): WebAssemblyInstantiator {
	return importObject => WebAssembly.instantiateStreaming(data, importObject);
}
function _makeResponseNonStreamingLoader(data: Response): WebAssemblyInstantiator {
	return async importObject => {
		const arrayBuffer = await data.arrayBuffer();
		return WebAssembly.instantiate(arrayBuffer, importObject)
	};
}

export function createOnigString(str: string) {
	return new OnigString(str);
}

export function createOnigScanner(patterns: string[]) {
	return new OnigScanner(patterns);
}

export function setDefaultDebugCall(_defaultDebugCall: boolean): void {
	defaultDebugCall = _defaultDebugCall;
}
