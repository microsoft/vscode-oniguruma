"use strict";
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const index_1 = require("../index");
const tape_1 = __importDefault(require("tape"));
const REPO_ROOT = path.join(__dirname, '../../');
const wasm = fs.readFileSync(path.join(REPO_ROOT, './out/onig.wasm')).buffer;
const loadPromise = index_1.loadWASM(wasm);
function testLib(name, callback) {
    tape_1.default(name, async (t) => {
        await loadPromise;
        callback(t);
        t.end();
    });
}
testLib('simple1', (t) => {
    const scanner = new index_1.OnigScanner(['ell', 'wo']);
    const s = new index_1.OnigString('Hello world!');
    t.deepEqual(scanner.findNextMatchSync(s, 0), { index: 0, captureIndices: [{ start: 1, end: 4, length: 3 }] });
    t.deepEqual(scanner.findNextMatchSync(s, 2), { index: 1, captureIndices: [{ start: 6, end: 8, length: 2 }] });
});
testLib('simple2', (t) => {
    const scanner = new index_1.OnigScanner(['a', 'b', 'c']);
    t.deepEqual(scanner.findNextMatchSync('x', 0), null);
    t.deepEqual(scanner.findNextMatchSync('xxaxxbxxc', 0), { index: 0, captureIndices: [{ start: 2, end: 3, length: 1 }] });
    t.deepEqual(scanner.findNextMatchSync('xxaxxbxxc', 4), { index: 1, captureIndices: [{ start: 5, end: 6, length: 1 }] });
    t.deepEqual(scanner.findNextMatchSync('xxaxxbxxc', 7), { index: 2, captureIndices: [{ start: 8, end: 9, length: 1 }] });
    t.deepEqual(scanner.findNextMatchSync('xxaxxbxxc', 9), null);
});
testLib('unicode1', (t) => {
    const scanner1 = new index_1.OnigScanner(['1', '2']);
    t.deepEqual(scanner1.findNextMatchSync('ab…cde21', 5), { index: 1, captureIndices: [{ start: 6, end: 7, length: 1 }] });
    const scanner2 = new index_1.OnigScanner(['\"']);
    t.deepEqual(scanner2.findNextMatchSync('{"…": 1}', 1), { index: 0, captureIndices: [{ start: 1, end: 2, length: 1 }] });
});
testLib('unicode2', (t) => {
    const scanner = new index_1.OnigScanner(['Y', 'X']);
    t.deepEqual(scanner.findNextMatchSync('a💻bYX', 0), { index: 0, captureIndices: [{ start: 4, end: 5, length: 1 }] });
    t.deepEqual(scanner.findNextMatchSync('a💻bYX', 1), { index: 0, captureIndices: [{ start: 4, end: 5, length: 1 }] });
    t.deepEqual(scanner.findNextMatchSync('a💻bYX', 3), { index: 0, captureIndices: [{ start: 4, end: 5, length: 1 }] });
    t.deepEqual(scanner.findNextMatchSync('a💻bYX', 4), { index: 0, captureIndices: [{ start: 4, end: 5, length: 1 }] });
    t.deepEqual(scanner.findNextMatchSync('a💻bYX', 5), { index: 1, captureIndices: [{ start: 5, end: 6, length: 1 }] });
});
testLib('unicode3', (t) => {
    const scanner = new index_1.OnigScanner(['Возврат']);
    t.deepEqual(scanner.findNextMatchSync('Возврат long_var_name;', 0), { index: 0, captureIndices: [{ start: 0, end: 7, length: 7 }] });
});
testLib('unicode4', (t) => {
    const scanner = new index_1.OnigScanner(['X']);
    t.deepEqual(scanner.findNextMatchSync(`X${String.fromCharCode(0xd83c)}X`, 0), { index: 0, captureIndices: [{ start: 0, end: 1, length: 1 }] });
    t.deepEqual(scanner.findNextMatchSync(`X${String.fromCharCode(0xd83c)}X`, 1), { index: 0, captureIndices: [{ start: 2, end: 3, length: 1 }] });
    t.deepEqual(scanner.findNextMatchSync(`X${String.fromCharCode(0xd83c)}X`, 2), { index: 0, captureIndices: [{ start: 2, end: 3, length: 1 }] });
    t.deepEqual(scanner.findNextMatchSync(`X${String.fromCharCode(0xdfff)}X`, 0), { index: 0, captureIndices: [{ start: 0, end: 1, length: 1 }] });
    t.deepEqual(scanner.findNextMatchSync(`X${String.fromCharCode(0xdfff)}X`, 1), { index: 0, captureIndices: [{ start: 2, end: 3, length: 1 }] });
    t.deepEqual(scanner.findNextMatchSync(`X${String.fromCharCode(0xdfff)}X`, 2), { index: 0, captureIndices: [{ start: 2, end: 3, length: 1 }] });
    // These are actually valid, just testing the min & max
    t.deepEqual(scanner.findNextMatchSync(`X${String.fromCharCode(0xd800)}${String.fromCharCode(0xdc00)}X`, 2), { index: 0, captureIndices: [{ start: 3, end: 4, length: 1 }] });
    t.deepEqual(scanner.findNextMatchSync(`X${String.fromCharCode(0xdbff)}${String.fromCharCode(0xdfff)}X`, 2), { index: 0, captureIndices: [{ start: 3, end: 4, length: 1 }] });
});
testLib('out of bounds', (t) => {
    const scanner = new index_1.OnigScanner(['X']);
    t.deepEqual(scanner.findNextMatchSync(`X💻X`, -1000), { index: 0, captureIndices: [{ start: 0, end: 1, length: 1 }] });
    t.deepEqual(scanner.findNextMatchSync(`X💻X`, 1000), null);
});
testLib('regex with \\G', (t) => {
    const str = new index_1.OnigString('first-and-second');
    const scanner = new index_1.OnigScanner(['\\G-and']);
    t.deepEqual(scanner.findNextMatchSync(str, 0), null);
    t.deepEqual(scanner.findNextMatchSync(str, 5), { index: 0, captureIndices: [{ start: 5, end: 9, length: 4 }] });
});
