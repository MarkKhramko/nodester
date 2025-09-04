const Path = require('path');


module.exports = {
	paths: {
		controllers: Path.join(process.cwd(), 'src/app/controllers'),
		facades:     Path.join(process.cwd(), 'src/app/facades'),
		filters:     Path.join(process.cwd(), 'src/app/filters'),
		models:      Path.join(process.cwd(), 'src/db/models'),
		providers:   Path.join(process.cwd(), 'src/app/providers'),
	}
}
