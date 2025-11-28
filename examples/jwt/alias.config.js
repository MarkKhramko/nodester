// alias.config.js
const moduleAlias = require("module-alias");


const _root = __dirname;

moduleAlias.addAliases({
	"#configs":       _root + "/src/configs",
	"#constants":     _root + "/src/app/constants",
	"#controllers":   _root + "/src/app/controllers",
	"#db":            _root + "/src/db",
	"#facades":       _root + "/src/app/facades",
	"#factories":     _root + "/src/app/factories",
	"#filters":       _root + "/src/app/filters",
	"#middlewares":   _root + "/src/app/middlewares",
	"#models":        _root + "/src/db/models",
	"#routing":       _root + "/src/routing",
	"#services":      _root + "/src/app/services",
	"#utils":         _root + "/src/app/utils"
});
