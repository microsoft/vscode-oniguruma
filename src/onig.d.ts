/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as types from './types';

declare function init(options: {
	instantiateWasm(
		importObject: Record<string, Record<string, WebAssembly.ImportValue>> | undefined,
		callback: (value: WebAssembly.Instance) => void
	): void;
}): Promise<types.IOnigBinding>;

export default init;
