const Path = require('path');
const rootDir = process.cwd();


module.exports = {
	paths: {
		controllers: Path.join(rootDir, 'src/app/controllers'),
		facades:     Path.join(rootDir, 'src/app/facades'),
		filters:     Path.join(rootDir, 'src/app/filters'),
		models:      Path.join(rootDir, 'src/db/models'),
		providers:   Path.join(rootDir, 'src/app/providers'),
	}
}
