"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const onig_1 = __importDefault(require("./onig"));
let onigBinding = null;
let defaultDebugCall = false;
function throwLastOnigError(onigBinding) {
    throw new Error(onigBinding.UTF8ToString(onigBinding._getLastOnigError()));
}
class UtfString {
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
    createString(onigBinding) {
        const result = onigBinding._malloc(this.utf8Length);
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
                OnigString._sharedPtr = onigBinding._malloc(10000);
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
            this._onigBinding._free(this.ptr);
        }
    }
}
exports.OnigString = OnigString;
OnigString.LAST_ID = 0;
OnigString._sharedPtr = 0; // a pointer to a string of 10000 bytes
OnigString._sharedPtrInUse = false;
class OnigScanner {
    constructor(patterns) {
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
    dispose() {
        this._onigBinding._freeOnigScanner(this._ptr);
    }
    findNextMatchSync(string, startPosition, debugCall = defaultDebugCall) {
        if (typeof string === 'string') {
            string = new OnigString(string);
            const result = this._findNextMatchSync(string, startPosition, debugCall);
            string.dispose();
            return result;
        }
        return this._findNextMatchSync(string, startPosition, debugCall);
    }
    _findNextMatchSync(string, startPosition, debugCall) {
        const onigBinding = this._onigBinding;
        let resultPtr;
        if (debugCall) {
            resultPtr = onigBinding._findNextOnigScannerMatchDbg(this._ptr, string.id, string.ptr, string.utf8Length, string.convertUtf16OffsetToUtf8(startPosition));
        }
        else {
            resultPtr = onigBinding._findNextOnigScannerMatch(this._ptr, string.id, string.ptr, string.utf8Length, string.convertUtf16OffsetToUtf8(startPosition));
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
}
exports.OnigScanner = OnigScanner;
function _loadWASM(loader, print, resolve, reject) {
    onig_1.default({
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
let initCalled = false;
function loadWASM(dataOrOptions) {
    if (initCalled) {
        throw new Error(`Cannot invoke loadWASM more than once.`);
    }
    initCalled = true;
    let data;
    let print;
    if (dataOrOptions instanceof ArrayBuffer || dataOrOptions instanceof Response) {
        data = dataOrOptions;
    }
    else {
        data = dataOrOptions.data;
        print = dataOrOptions.print;
    }
    let resolve;
    let reject;
    const result = new Promise((_resolve, _reject) => { resolve = _resolve; reject = _reject; });
    let loader;
    if (data instanceof ArrayBuffer) {
        loader = _makeArrayBufferLoader(data);
    }
    else if (data instanceof Response && typeof WebAssembly.instantiateStreaming === 'function') {
        loader = _makeResponseStreamingLoader(data);
    }
    else {
        loader = _makeResponseNonStreamingLoader(data);
    }
    _loadWASM(loader, print, resolve, reject);
    return result;
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
