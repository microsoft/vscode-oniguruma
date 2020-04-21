/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

const path = require('path');

module.exports = {
	entry: './out/index.js',
	mode: 'production',
	// mode: 'development',
	output: {
		library: 'onig',
		libraryTarget: 'umd',
		globalObject: 'this',
		path: path.resolve(__dirname, 'release')
	},
	resolve: {
		extensions: ['.js']
	}
};
