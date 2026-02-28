import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		include: ['src/test/**/*.test.ts'],
		globals: true,
	},
	resolve: {
		alias: [
			{ find: /^\.\/onig$/, replacement: resolve(__dirname, 'out/onig.js') }
		]
	}
});
