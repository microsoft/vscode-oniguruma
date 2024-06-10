/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { loadWASM, OnigString, OnigScanner, FindOption, Syntax } from '../index';

const REPO_ROOT = path.join(__dirname, '../../');
const wasm = fs.readFileSync(path.join(REPO_ROOT, './out/onig.wasm')).buffer;
const loadPromise = loadWASM({ instantiator: (imports) => WebAssembly.instantiate(wasm, imports) });

function testLib(name: string, callback: () => void) {
	test(name, async () => {
		await loadPromise;
		callback();
	});
}

testLib('simple1', () => {
	const scanner = new OnigScanner(['ell', 'wo']);
	const s = new OnigString('Hello world!');
	assert.deepStrictEqual(scanner.findNextMatchSync(s, 0), { index: 0, captureIndices: [{ start: 1, end: 4, length: 3 }] });
	assert.deepStrictEqual(scanner.findNextMatchSync(s, 2), { index: 1, captureIndices: [{ start: 6, end: 8, length: 2 }] });
	s.dispose();
	scanner.dispose();
});

testLib('simple2', () => {
	const scanner = new OnigScanner(['a', 'b', 'c']);
	assert.deepStrictEqual(scanner.findNextMatchSync('x', 0), null);
	assert.deepStrictEqual(scanner.findNextMatchSync('xxaxxbxxc', 0), { index: 0, captureIndices: [{ start: 2, end: 3, length: 1 }] });
	assert.deepStrictEqual(scanner.findNextMatchSync('xxaxxbxxc', 4), { index: 1, captureIndices: [{ start: 5, end: 6, length: 1 }] });
	assert.deepStrictEqual(scanner.findNextMatchSync('xxaxxbxxc', 7), { index: 2, captureIndices: [{ start: 8, end: 9, length: 1 }] });
	assert.deepStrictEqual(scanner.findNextMatchSync('xxaxxbxxc', 9), null);
	scanner.dispose();
});

testLib('unicode1', () => {
	const scanner1 = new OnigScanner(['1', '2']);
	assert.deepStrictEqual(scanner1.findNextMatchSync('ab…cde21', 5), { index: 1, captureIndices: [{ start: 6, end: 7, length: 1 }] });
	scanner1.dispose();

	const scanner2 = new OnigScanner(['\"'])
	assert.deepStrictEqual(scanner2.findNextMatchSync('{"…": 1}', 1), { index: 0, captureIndices: [{ start: 1, end: 2, length: 1 }] });
	scanner2.dispose();
});

testLib('unicode2', () => {
	const scanner = new OnigScanner(['Y', 'X'])
	assert.deepStrictEqual(scanner.findNextMatchSync('a💻bYX', 0), { index: 0, captureIndices: [{ start: 4, end: 5, length: 1 }] });
	assert.deepStrictEqual(scanner.findNextMatchSync('a💻bYX', 1), { index: 0, captureIndices: [{ start: 4, end: 5, length: 1 }] });
	assert.deepStrictEqual(scanner.findNextMatchSync('a💻bYX', 3), { index: 0, captureIndices: [{ start: 4, end: 5, length: 1 }] });
	assert.deepStrictEqual(scanner.findNextMatchSync('a💻bYX', 4), { index: 0, captureIndices: [{ start: 4, end: 5, length: 1 }] });
	assert.deepStrictEqual(scanner.findNextMatchSync('a💻bYX', 5), { index: 1, captureIndices: [{ start: 5, end: 6, length: 1 }] });
	scanner.dispose();
});

testLib('unicode3', () => {
	const scanner = new OnigScanner(['Возврат'])
	assert.deepStrictEqual(scanner.findNextMatchSync('Возврат long_var_name;', 0), { index: 0, captureIndices: [{ start: 0, end: 7, length: 7 }] });
	scanner.dispose();
});

testLib('unicode4', () => {
	const scanner = new OnigScanner(['X'])
	assert.deepStrictEqual(scanner.findNextMatchSync(`X${String.fromCharCode(0xd83c)}X`, 0), { index: 0, captureIndices: [{ start: 0, end: 1, length: 1 }] });
	assert.deepStrictEqual(scanner.findNextMatchSync(`X${String.fromCharCode(0xd83c)}X`, 1), { index: 0, captureIndices: [{ start: 2, end: 3, length: 1 }] });
	assert.deepStrictEqual(scanner.findNextMatchSync(`X${String.fromCharCode(0xd83c)}X`, 2), { index: 0, captureIndices: [{ start: 2, end: 3, length: 1 }] });
	assert.deepStrictEqual(scanner.findNextMatchSync(`X${String.fromCharCode(0xdfff)}X`, 0), { index: 0, captureIndices: [{ start: 0, end: 1, length: 1 }] });
	assert.deepStrictEqual(scanner.findNextMatchSync(`X${String.fromCharCode(0xdfff)}X`, 1), { index: 0, captureIndices: [{ start: 2, end: 3, length: 1 }] });
	assert.deepStrictEqual(scanner.findNextMatchSync(`X${String.fromCharCode(0xdfff)}X`, 2), { index: 0, captureIndices: [{ start: 2, end: 3, length: 1 }] });
	// These are actually valid, just testing the min & max
	assert.deepStrictEqual(scanner.findNextMatchSync(`X${String.fromCharCode(0xd800)}${String.fromCharCode(0xdc00)}X`, 2), { index: 0, captureIndices: [{ start: 3, end: 4, length: 1 }] });
	assert.deepStrictEqual(scanner.findNextMatchSync(`X${String.fromCharCode(0xdbff)}${String.fromCharCode(0xdfff)}X`, 2), { index: 0, captureIndices: [{ start: 3, end: 4, length: 1 }] });
	scanner.dispose();
});

testLib('out of bounds', () => {
	const scanner = new OnigScanner(['X'])
	assert.deepStrictEqual(scanner.findNextMatchSync(`X💻X`, -1000), { index: 0, captureIndices: [{ start: 0, end: 1, length: 1 }] });
	assert.deepStrictEqual(scanner.findNextMatchSync(`X💻X`, 1000), null);
	scanner.dispose();
});

testLib('regex with \\G', () => {
	const str = new OnigString('first-and-second');
	const scanner = new OnigScanner(['\\G-and']);
	assert.deepStrictEqual(scanner.findNextMatchSync(str, 0), null);
	assert.deepStrictEqual(scanner.findNextMatchSync(str, 5), { index: 0, captureIndices: [{ start: 5, end: 9, length: 4 }] });
	scanner.dispose();
	str.dispose();
});

testLib('kkos/oniguruma#192', () => {
	const str = new OnigString("    while (i < len && f(array[i]))");
	const scanner = new OnigScanner(["(?x)\n  (?<!\\+\\+|--)(?<=[({\\[,?=>:*]|&&|\\|\\||\\?|\\*\\/|^await|[^\\._$[:alnum:]]await|^return|[^\\._$[:alnum:]]return|^default|[^\\._$[:alnum:]]default|^yield|[^\\._$[:alnum:]]yield|^)\\s*\n  (?!<\\s*[_$[:alpha:]][_$[:alnum:]]*((\\s+extends\\s+[^=>])|,)) # look ahead is not type parameter of arrow\n  (?=(<)\\s*(?:([_$[:alpha:]][-_$[:alnum:].]*)(?<!\\.|-)(:))?((?:[a-z][a-z0-9]*|([_$[:alpha:]][-_$[:alnum:].]*))(?<!\\.|-))(?=((<\\s*)|(\\s+))(?!\\?)|\\/?>))"]);
	assert.deepStrictEqual(scanner.findNextMatchSync(str, 0), null);
	scanner.dispose();
	str.dispose();
});

testLib('FindOption.NotBeginPosition', () => {
	const str = new OnigString('first-and-second');
	const scanner = new OnigScanner(['\\G-and']);
	assert.deepStrictEqual(scanner.findNextMatchSync(str, 5), { index: 0, captureIndices: [{ start: 5, end: 9, length: 4 }] });
	assert.deepStrictEqual(scanner.findNextMatchSync(str, 5, [FindOption.NotBeginPosition]), null);
	scanner.dispose();
	str.dispose();
});

testLib('FindOption.NotBeginString', () => {
	const str = new OnigString('first-and-first');
	const scanner = new OnigScanner(['\\Afirst']);
	assert.deepStrictEqual(scanner.findNextMatchSync(str, 10), null);
	assert.deepStrictEqual(scanner.findNextMatchSync(str, 0), { index: 0, captureIndices: [{ start: 0, end: 5, length: 5 }] });
	assert.deepStrictEqual(scanner.findNextMatchSync(str, 0, [FindOption.NotBeginString]), null);
	scanner.dispose();
	str.dispose();
});

testLib('FindOption.NotEndString', () => {
	const str = new OnigString('first-and-first');
	const scanner = new OnigScanner(['first\\z']);
	assert.deepStrictEqual(scanner.findNextMatchSync(str, 10), { index: 0, captureIndices: [{ start: 10, end: 15, length: 5 }] });
	assert.deepStrictEqual(scanner.findNextMatchSync(str, 10, [FindOption.NotEndString]), null);
	scanner.dispose();
	str.dispose();
});

testLib('Configure scanner', () => {
	const str = new OnigString('ABCD');
	const scanner = new OnigScanner(['^[a-z]*$'], { options: [FindOption.Ignorecase] });
	assert.deepStrictEqual(scanner.findNextMatchSync(str, 0), { index: 0, captureIndices: [{ start: 0, end: 4, length: 4 }] })
	scanner.dispose();
	str.dispose();
});

testLib('Configure syntax', () => {
	const str = new OnigString('first-and-first');
	const scanner = new OnigScanner(['^(?P<name>.*)$'], { syntax: Syntax.Python });
	assert.deepStrictEqual(scanner.findNextMatchSync(str, 0), { index: 0, captureIndices: [{ start: 0, end: 15, length: 15 }, { start: 0, end: 15, length: 15 }] })
	scanner.dispose();
	str.dispose();
});

testLib('Throw error', () => {
	assert.throws(() => new OnigScanner(['(?P<name>a*)']), /undefined group option/)
});

testLib('Group names to numbers', () => {
	const scanner = new OnigScanner(['(?<n1>a)(?<n2>b)(?<n1>c)'], {});
	assert.deepStrictEqual(scanner.groupsToNumber(0), new Map([['n1', [1, 3]], ['n2', [2]]]));
	scanner.dispose();
});
