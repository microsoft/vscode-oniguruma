// Applies the patches in patches/ to deps/oniguruma. A patch that is already applied is skipped, so the build can run again.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../');
const onig = path.join(root, 'deps/oniguruma');
const dir = path.join(root, 'patches');

for (const name of fs.readdirSync(dir).filter(name => name.endsWith('.patch')).sort()) {
	const patch = path.join(dir, name);
	const apply = (...args) => execFileSync('git', ['-C', onig, 'apply', ...args, patch], { stdio: 'pipe' });
	try {
		apply('--reverse', '--check');
		console.log(`${name}: already applied`);
		continue;
	} catch (e) {
		// not applied yet
	}
	apply();
	console.log(`${name}: applied`);
}
