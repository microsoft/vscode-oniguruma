/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

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

export function loadWASM(options: IOptions): Promise<void>;
export function loadWASM(data: ArrayBufferView | ArrayBuffer | Response): Promise<void>;
export function createOnigString(str: string): OnigString;
export function createOnigScanner(patterns: string[]): OnigScanner;
export function setDefaultDebugCall(defaultDebugCall: boolean): void;

export class OnigString {
	readonly content: string;
	constructor(content: string);
	public dispose(): void;
}

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

export interface IOnigScannerConfig {
	options?: FindOption[],
	syntax?: Syntax
}

export class OnigScanner {
	constructor(patterns: string[], config?: IOnigScannerConfig);
	public dispose(): void;
	public findNextMatchSync(string: string | OnigString, startPosition: number, options: FindOption[]): IOnigMatch | null;
	public findNextMatchSync(string: string | OnigString, startPosition: number, debugCall: boolean): IOnigMatch | null;
	public findNextMatchSync(string: string | OnigString, startPosition: number): IOnigMatch | null;
}

export interface IOnigCaptureIndex {
	start: number
	end: number
	length: number
}

export interface IOnigMatch {
	index: number
	captureIndices: IOnigCaptureIndex[]
}
