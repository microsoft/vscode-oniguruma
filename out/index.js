"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDefaultDebugCall = exports.createOnigScanner = exports.createOnigString = exports.loadWASM = exports.OnigScanner = exports.OnigString = void 0;
const onig_1 = __importDefault(require("./onig"));
let onigBinding = null;
let defaultDebugCall = false;
function throwLastOnigError(onigBinding) {
    throw new Error(onigBinding.UTF8ToString(onigBinding._getLastOnigError()));
}
class UtfString {
    static _utf8ByteLength(str) {
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
            }
            else if (codepoint <= 0x7ff) {
                result += 2;
            }
            else if (codepoint <= 0xffff) {
                result += 3;
            }
            else {
                result += 4;
            }
            if (wasSurrogatePair) {
                i++;
            }
        }
        return result;
    }
    constructor(str) {
        const utf16Length = str.length;
        const utf8Length = UtfString._utf8ByteLength(str);
        const computeIndicesMapping = (utf8Length !== utf16Length);
        const utf16OffsetToUtf8 = computeIndicesMapping ? new Uint32Array(utf16Length + 1) : null;
        if (computeIndicesMapping) {
            utf16OffsetToUtf8[utf16Length] = utf8Length;
        }
        const utf8OffsetToUtf16 = computeIndicesMapping ? new Uint32Array(utf8Length + 1) : null;
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
                }
                else if (codePoint <= 0x7ff) {
                    utf8OffsetToUtf16[i8 + 0] = i16;
                    utf8OffsetToUtf16[i8 + 1] = i16;
                }
                else if (codePoint <= 0xffff) {
                    utf8OffsetToUtf16[i8 + 0] = i16;
                    utf8OffsetToUtf16[i8 + 1] = i16;
                    utf8OffsetToUtf16[i8 + 2] = i16;
                }
                else {
                    utf8OffsetToUtf16[i8 + 0] = i16;
                    utf8OffsetToUtf16[i8 + 1] = i16;
                    utf8OffsetToUtf16[i8 + 2] = i16;
                    utf8OffsetToUtf16[i8 + 3] = i16;
                }
            }
            if (codePoint <= 0x7f) {
                utf8Value[i8++] = codePoint;
            }
            else if (codePoint <= 0x7ff) {
                utf8Value[i8++] = 0b11000000 | ((codePoint & 0b00000000000000000000011111000000) >>> 6);
                utf8Value[i8++] = 0b10000000 | ((codePoint & 0b00000000000000000000000000111111) >>> 0);
            }
            else if (codePoint <= 0xffff) {
                utf8Value[i8++] = 0b11100000 | ((codePoint & 0b00000000000000001111000000000000) >>> 12);
                utf8Value[i8++] = 0b10000000 | ((codePoint & 0b00000000000000000000111111000000) >>> 6);
                utf8Value[i8++] = 0b10000000 | ((codePoint & 0b00000000000000000000000000111111) >>> 0);
            }
            else {
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
    createString(onigBinding) {
        const result = onigBinding._omalloc(this.utf8Length);
        onigBinding.HEAPU8.set(this.utf8Value, result);
        return result;
    }
}
class OnigString {
    constructor(str) {
        this.id = (++OnigString.LAST_ID);
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
        }
        else {
            this.ptr = utfString.createString(onigBinding);
        }
    }
    convertUtf8OffsetToUtf16(utf8Offset) {
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
    convertUtf16OffsetToUtf8(utf16Offset) {
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
    dispose() {
        if (this.ptr === OnigString._sharedPtr) {
            OnigString._sharedPtrInUse = false;
        }
        else {
            this._onigBinding._ofree(this.ptr);
        }
    }
}
exports.OnigString = OnigString;
OnigString.LAST_ID = 0;
OnigString._sharedPtr = 0; // a pointer to a string of 10000 bytes
OnigString._sharedPtrInUse = false;
class OnigScanner {
    constructor(patterns, config) {
        var _a, _b;
        if (!onigBinding) {
            throw new Error(`Must invoke loadWASM first.`);
        }
        const strPtrsArr = [];
        const strLenArr = [];
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
        this._options = (_a = config === null || config === void 0 ? void 0 : config.options) !== null && _a !== void 0 ? _a : [10 /* FindOption.CaptureGroup */];
        const opts = this.onigOptions(this._options);
        const syntax = this.onigSyntax((_b = config === null || config === void 0 ? void 0 : config.syntax) !== null && _b !== void 0 ? _b : 0 /* Syntax.Default */);
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
    dispose() {
        this._onigBinding._freeOnigScanner(this._ptr);
    }
    findNextMatchSync(string, startPosition, arg) {
        let debugCall = defaultDebugCall;
        let options = this._options;
        if (Array.isArray(arg)) {
            if (arg.includes(25 /* FindOption.DebugCall */)) {
                debugCall = true;
            }
            options = options.concat(arg);
        }
        else if (typeof arg === 'boolean') {
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
    _findNextMatchSync(string, startPosition, debugCall, options) {
        const onigBinding = this._onigBinding;
        const opts = this.onigOptions(options);
        let resultPtr;
        if (debugCall) {
            resultPtr = onigBinding._findNextOnigScannerMatchDbg(this._ptr, string.id, string.ptr, string.utf8Length, string.convertUtf16OffsetToUtf8(startPosition), opts);
        }
        else {
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
        let captureIndices = [];
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
    onigOptions(options) {
        return options.map(o => this.onigOption(o)).reduce((acc, o) => acc | o, this._onigBinding.ONIG_OPTION_NONE);
    }
    onigSyntax(syntax) {
        switch (syntax) {
            case 0 /* Syntax.Default */:
                return this._onigBinding.ONIG_SYNTAX_DEFAULT;
            case 1 /* Syntax.Asis */:
                return this._onigBinding.ONIG_SYNTAX_ASIS;
            case 2 /* Syntax.PosixBasic */:
                return this._onigBinding.ONIG_SYNTAX_POSIX_BASIC;
            case 3 /* Syntax.PosixExtended */:
                return this._onigBinding.ONIG_SYNTAX_POSIX_EXTENDED;
            case 4 /* Syntax.Emacs */:
                return this._onigBinding.ONIG_SYNTAX_EMACS;
            case 5 /* Syntax.Grep */:
                return this._onigBinding.ONIG_SYNTAX_GREP;
            case 6 /* Syntax.GnuRegex */:
                return this._onigBinding.ONIG_SYNTAX_GNU_REGEX;
            case 7 /* Syntax.Java */:
                return this._onigBinding.ONIG_SYNTAX_JAVA;
            case 8 /* Syntax.Perl */:
                return this._onigBinding.ONIG_SYNTAX_PERL;
            case 9 /* Syntax.PerlNg */:
                return this._onigBinding.ONIG_SYNTAX_PERL_NG;
            case 10 /* Syntax.Ruby */:
                return this._onigBinding.ONIG_SYNTAX_RUBY;
            case 11 /* Syntax.Python */:
                return this._onigBinding.ONIG_SYNTAX_PYTHON;
            case 12 /* Syntax.Oniguruma */:
                return this._onigBinding.ONIG_SYNTAX_ONIGURUMA;
        }
    }
    onigOption(option) {
        switch (option) {
            case 1 /* FindOption.None */:
                return this._onigBinding.ONIG_OPTION_NONE;
            case 0 /* FindOption.Default */:
                return this._onigBinding.ONIG_OPTION_DEFAULT;
            case 2 /* FindOption.Ignorecase */:
                return this._onigBinding.ONIG_OPTION_IGNORECASE;
            case 3 /* FindOption.Extend */:
                return this._onigBinding.ONIG_OPTION_EXTEND;
            case 4 /* FindOption.Multiline */:
                return this._onigBinding.ONIG_OPTION_MULTILINE;
            case 5 /* FindOption.Singleline */:
                return this._onigBinding.ONIG_OPTION_SINGLELINE;
            case 6 /* FindOption.FindLongest */:
                return this._onigBinding.ONIG_OPTION_FIND_LONGEST;
            case 7 /* FindOption.FindNotEmpty */:
                return this._onigBinding.ONIG_OPTION_FIND_NOT_EMPTY;
            case 8 /* FindOption.NegateSingleline */:
                return this._onigBinding.ONIG_OPTION_NEGATE_SINGLELINE;
            case 9 /* FindOption.DontCaptureGroup */:
                return this._onigBinding.ONIG_OPTION_DONT_CAPTURE_GROUP;
            case 10 /* FindOption.CaptureGroup */:
                return this._onigBinding.ONIG_OPTION_CAPTURE_GROUP;
            case 11 /* FindOption.Notbol */:
                return this._onigBinding.ONIG_OPTION_NOTBOL;
            case 12 /* FindOption.Noteol */:
                return this._onigBinding.ONIG_OPTION_NOTEOL;
            case 13 /* FindOption.CheckValidityOfString */:
                return this._onigBinding.ONIG_OPTION_CHECK_VALIDITY_OF_STRING;
            case 14 /* FindOption.IgnorecaseIsAscii */:
                return this._onigBinding.ONIG_OPTION_IGNORECASE_IS_ASCII;
            case 15 /* FindOption.WordIsAscii */:
                return this._onigBinding.ONIG_OPTION_WORD_IS_ASCII;
            case 16 /* FindOption.DigitIsAscii */:
                return this._onigBinding.ONIG_OPTION_DIGIT_IS_ASCII;
            case 17 /* FindOption.SpaceIsAscii */:
                return this._onigBinding.ONIG_OPTION_SPACE_IS_ASCII;
            case 18 /* FindOption.PosixIsAscii */:
                return this._onigBinding.ONIG_OPTION_POSIX_IS_ASCII;
            case 19 /* FindOption.TextSegmentExtendedGraphemeCluster */:
                return this._onigBinding.ONIG_OPTION_TEXT_SEGMENT_EXTENDED_GRAPHEME_CLUSTER;
            case 20 /* FindOption.TextSegmentWord */:
                return this._onigBinding.ONIG_OPTION_TEXT_SEGMENT_WORD;
            case 21 /* FindOption.NotBeginString */:
                return this._onigBinding.ONIG_OPTION_NOT_BEGIN_STRING;
            case 22 /* FindOption.NotEndString */:
                return this._onigBinding.ONIG_OPTION_NOT_END_STRING;
            case 23 /* FindOption.NotBeginPosition */:
                return this._onigBinding.ONIG_OPTION_NOT_BEGIN_POSITION;
            case 24 /* FindOption.CallbackEachMatch */:
                return this._onigBinding.ONIG_OPTION_CALLBACK_EACH_MATCH;
            case 25 /* FindOption.DebugCall */:
                return this._onigBinding.ONIG_OPTION_DEFAULT;
        }
    }
}
exports.OnigScanner = OnigScanner;
function _loadWASM(loader, print, resolve, reject) {
    (0, onig_1.default)({
        print: print,
        instantiateWasm: (importObject, callback) => {
            if (typeof performance === 'undefined') {
                // performance.now() is not available in this environment, so use Date.now()
                const get_now = () => Date.now();
                importObject.env.emscripten_get_now = get_now;
                importObject.wasi_snapshot_preview1.emscripten_get_now = get_now;
            }
            loader(importObject).then(instantiatedSource => callback(instantiatedSource.instance), reject);
            return {}; // indicate async instantiation
        }
    }).then((binding) => {
        onigBinding = binding;
        resolve();
    });
}
function isInstantiatorOptionsObject(dataOrOptions) {
    return (typeof dataOrOptions.instantiator === 'function');
}
function isDataOptionsObject(dataOrOptions) {
    return (typeof dataOrOptions.data !== 'undefined');
}
function isResponse(dataOrOptions) {
    return (typeof Response !== 'undefined' && dataOrOptions instanceof Response);
}
let initCalled = false;
let initPromise = null;
function loadWASM(dataOrOptions) {
    if (initCalled) {
        // Already initialized
        return initPromise;
    }
    initCalled = true;
    let loader;
    let print;
    if (isInstantiatorOptionsObject(dataOrOptions)) {
        loader = dataOrOptions.instantiator;
        print = dataOrOptions.print;
    }
    else {
        let data;
        if (isDataOptionsObject(dataOrOptions)) {
            data = dataOrOptions.data;
            print = dataOrOptions.print;
        }
        else {
            data = dataOrOptions;
        }
        if (isResponse(data)) {
            if (typeof WebAssembly.instantiateStreaming === 'function') {
                loader = _makeResponseStreamingLoader(data);
            }
            else {
                loader = _makeResponseNonStreamingLoader(data);
            }
        }
        else {
            loader = _makeArrayBufferLoader(data);
        }
    }
    let resolve;
    let reject;
    initPromise = new Promise((_resolve, _reject) => { resolve = _resolve; reject = _reject; });
    _loadWASM(loader, print, resolve, reject);
    return initPromise;
}
exports.loadWASM = loadWASM;
function _makeArrayBufferLoader(data) {
    return importObject => WebAssembly.instantiate(data, importObject);
}
function _makeResponseStreamingLoader(data) {
    return importObject => WebAssembly.instantiateStreaming(data, importObject);
}
function _makeResponseNonStreamingLoader(data) {
    return async (importObject) => {
        const arrayBuffer = await data.arrayBuffer();
        return WebAssembly.instantiate(arrayBuffer, importObject);
    };
}
function createOnigString(str) {
    return new OnigString(str);
}
exports.createOnigString = createOnigString;
function createOnigScanner(patterns) {
    return new OnigScanner(patterns);
}
exports.createOnigScanner = createOnigScanner;
function setDefaultDebugCall(_defaultDebugCall) {
    defaultDebugCall = _defaultDebugCall;
}
exports.setDefaultDebugCall = setDefaultDebugCall;
