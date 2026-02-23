/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

export type Pointer = number;

export interface IOnigBinding {
	HEAPU8: Uint8Array;
	HEAPU32: Uint32Array;

	_omalloc(count: number): Pointer;
	_ofree(ptr: Pointer): void;
	UTF8ToString(ptr: Pointer): string;

	_getLastOnigError(): Pointer;
	_createOnigScanner(strPtrsPtr: Pointer, strLenPtr: Pointer, count: number, options: number, syntax: Pointer): Pointer;
	_freeOnigScanner(ptr: Pointer): void;
	_findNextOnigScannerMatch(scanner: Pointer, strCacheId: number, strData: Pointer, strLength: number, position: number, options: number): number;
	_findNextOnigScannerMatchDbg(scanner: Pointer, strCacheId: number, strData: Pointer, strLength: number, position: number, options: number): number;
	_groupsToNumber(scanner: Pointer, patternIndex: number): Pointer;
	_freeOnigGroups(groups: Pointer): void;

	ONIG_OPTION_DEFAULT: number;
	ONIG_OPTION_NONE: number;
	ONIG_OPTION_IGNORECASE: number;
	ONIG_OPTION_EXTEND: number;
	ONIG_OPTION_MULTILINE: number;
	ONIG_OPTION_SINGLELINE: number;
	ONIG_OPTION_FIND_LONGEST: number;
	ONIG_OPTION_FIND_NOT_EMPTY: number;
	ONIG_OPTION_NEGATE_SINGLELINE: number;
	ONIG_OPTION_DONT_CAPTURE_GROUP: number;
	ONIG_OPTION_CAPTURE_GROUP: number;
	ONIG_OPTION_NOTBOL: number;
	ONIG_OPTION_NOTEOL: number;
	ONIG_OPTION_POSIX_REGION: number;
	ONIG_OPTION_CHECK_VALIDITY_OF_STRING: number;
	ONIG_OPTION_IGNORECASE_IS_ASCII: number;
	ONIG_OPTION_WORD_IS_ASCII: number;
	ONIG_OPTION_DIGIT_IS_ASCII: number;
	ONIG_OPTION_SPACE_IS_ASCII: number;
	ONIG_OPTION_POSIX_IS_ASCII: number;
	ONIG_OPTION_TEXT_SEGMENT_EXTENDED_GRAPHEME_CLUSTER: number;
	ONIG_OPTION_TEXT_SEGMENT_WORD: number;
	ONIG_OPTION_NOT_BEGIN_STRING: number;
	ONIG_OPTION_NOT_END_STRING: number;
	ONIG_OPTION_NOT_BEGIN_POSITION: number;
	ONIG_OPTION_CALLBACK_EACH_MATCH: number;
	ONIG_OPTION_MAXBIT: number;

	ONIG_SYNTAX_DEFAULT: Pointer;
	ONIG_SYNTAX_ASIS: Pointer;
	ONIG_SYNTAX_POSIX_BASIC: Pointer;
	ONIG_SYNTAX_POSIX_EXTENDED: Pointer;
	ONIG_SYNTAX_EMACS: Pointer;
	ONIG_SYNTAX_GREP: Pointer;
	ONIG_SYNTAX_GNU_REGEX: Pointer;
	ONIG_SYNTAX_JAVA: Pointer;
	ONIG_SYNTAX_PERL: Pointer;
	ONIG_SYNTAX_PERL_NG: Pointer;
	ONIG_SYNTAX_RUBY: Pointer;
	ONIG_SYNTAX_PYTHON: Pointer;
	ONIG_SYNTAX_ONIGURUMA: Pointer;
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
