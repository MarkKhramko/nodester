const express = require('express');
// Utils:
const cwd = process.cwd();
const Path = require('path');
// Custom error.
const { Err } = require('nodester/factories/errors');


class RolesRouter extends express.Router {
	constructor(
		rolesToRoutesMap={},
		pathToControllers=null
	) {
		super();

		// rolesToRoutesMap is a map of role -> route -> controller:
		if (!rolesToRoutesMap) {
			const err = new Err('"rolesToRoutesMap" argument is required.');
			throw err;
		}

		if (!pathToControllers) {
			const err = new Err('"pathToControllers" argument is required.');
			throw err;
		}

		// Extract all available roles.
		const roles = Object.keys(rolesToRoutesMap);

		// Flip map (Make it route -> role -> controller):
		const routesToRolesMap = {};
		for (const role of roles) {
			const roleRoutes = rolesToRoutesMap[role]
			
			for (const route in roleRoutes) {
				// If this route is set:
				if (!!routesToRolesMap[route]) {
					// Add role to set.
					routesToRolesMap[route][role] = roleRoutes[route];
				}
				else {
					// Create set for this role.
					routesToRolesMap[route] = { [role]: roleRoutes[route] };
				}
			}
		}

		// At this point we have a map of route -> role -> controller.
		// Let's now set these routes to this Router:
		for (const route in routesToRolesMap) {
			const rolesAndControllersMap = routesToRolesMap[route];

			// Split route by space, as it has structure [<Rest method> <Route>]
			const routeParts = route.split(/\s+/);
			const routeMethod = routeParts[0].toLocaleLowerCase();
			const routePath = routeParts[1].replace(/\s\s+/g, ' ');

			// Set up this route:
			this.route(routePath)[routeMethod]((req, res, next) => {
				// Extract role:
				const role = req?.user?.role ?? 'visitor';

				// If no handler for this role-route, skip:
				if (!rolesAndControllersMap[role]) {
					return next();
				}

				const controllerAndMethod = rolesAndControllersMap[role].split('.');
				const controllerName = controllerAndMethod[0];
				const controllerMethod = controllerAndMethod[1];

				// Get controller from path.
				const controller = require(Path.join(cwd, pathToControllers, controllerName));

				return controller[controllerMethod](req, res, next);
			});
		}
	}
}

module.exports = RolesRouter;
