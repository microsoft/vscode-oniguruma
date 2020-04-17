"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const onig_1 = __importDefault(require("./onig"));
function throwLastOnigError(onigBinding) {
    throw new Error(onigBinding.UTF8ToString(onigBinding._getLastOnigError()));
}
function createString(onigBinding, str) {
    const result = onigBinding._malloc(2 * (str.length + 1));
    onigBinding.stringToUTF16(str, result);
    return result;
}
class OnigString {
    constructor(onigBinding, str) {
        this._onigBinding = onigBinding;
        this.content = str;
        this._strPtr = createString(onigBinding, str);
        this.ptr = onigBinding._createOnigString(this._strPtr, str.length);
    }
    dispose() {
        this._onigBinding._freeOnigString(this.ptr);
        this._onigBinding._free(this._strPtr);
    }
}
class OnigScanner {
    constructor(onigBinding, patterns) {
        let strPtrsArr = [];
        let strLenArr = [];
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
    dispose() {
        this._onigBinding._freeOnigScanner(this._ptr);
    }
    findNextMatchSync(string, startPosition) {
        if (typeof string === 'string') {
            string = new OnigString(this._onigBinding, string);
            const result = this._findNextMatchSync(string, startPosition);
            string.dispose();
            return result;
        }
        return this._findNextMatchSync(string, startPosition);
    }
    _findNextMatchSync(string, startPosition) {
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
        let captureIndices = [];
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
let onigBinding = null;
let initCalled = false;
function _loadWASM(loader, resolve, reject) {
    const { log, warn, error } = console;
    onig_1.default({
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
        console.log = log;
        console.error = error;
        console.warn = warn;
    }
}
function loadWASM(data) {
    if (initCalled) {
        throw new Error(`Cannot invoke loadWASM more than once.`);
    }
    initCalled = true;
    let resolve;
    let reject;
    const result = new Promise((_resolve, _reject) => { resolve = _resolve; reject = _reject; });
    if (data instanceof ArrayBuffer) {
        _loadWASM(importObject => WebAssembly.instantiate(data, importObject), resolve, reject);
    }
    else if (data instanceof Response && typeof WebAssembly.instantiateStreaming === 'function') {
        _loadWASM(importObject => WebAssembly.instantiateStreaming(data, importObject), resolve, reject);
    }
    else {
        _loadWASM(async (importObject) => {
            const arrayBuffer = await data.arrayBuffer();
            return WebAssembly.instantiate(arrayBuffer, importObject);
        }, resolve, reject);
    }
    return result;
}
exports.loadWASM = loadWASM;
function createOnigString(str) {
    if (!onigBinding) {
        throw new Error(`Must invoke loadWASM first.`);
    }
    return new OnigString(onigBinding, str);
}
exports.createOnigString = createOnigString;
function createOnigScanner(patterns) {
    if (!onigBinding) {
        throw new Error(`Must invoke loadWASM first.`);
    }
    return new OnigScanner(onigBinding, patterns);
}
exports.createOnigScanner = createOnigScanner;
