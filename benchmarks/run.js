'use strict';

const autocannon = require('autocannon');
const Table = require('cli-table3');
const http = require('http');
const { spawn } = require('child_process');
const Path = require('path');
const { EXPRESS_PATH, NQL_PATH } = require('./complex-query');

const ROOT = Path.resolve(__dirname);
const SERVER = Path.join(__dirname, 'server.js');

const TARGETS = ['nodester', 'express'];
const COMPLEX_TARGETS = ['nodester', 'nodester-direct', 'express'];
const SCENARIOS = {
	text: {
		method: 'GET',
		path: '/text',
		description: 'plain text response',
		expectedBody: 'hello world'
	},
	json: {
		method: 'GET',
		path: '/json',
		description: 'fixed JSON response',
		expectedBody: JSON.stringify({
			framework: 'benchmark',
			message: 'hello world',
			items: [1, 2, 3]
		})
	},
	params: {
		method: 'GET',
		path: '/users/42',
		description: 'one named path parameter + JSON response',
		expectedBody: JSON.stringify({ id: '42' })
	},
	post: {
		method: 'POST',
		path: '/echo',
		description: 'JSON body parse + JSON response',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({ message: 'hello world', n: 42 })
	}
};
SCENARIOS.post.expectedBody = SCENARIOS.post.body;
SCENARIOS.complex = {
	method: 'GET',
	pathFor: (target) => target === 'nodester' ? NQL_PATH : EXPRESS_PATH,
	description: 'Sequelize SQLite query with filters, nested associations, ordering, limit, and count',
	validateBody: (body) => {
		const payload = JSON.parse(body);
		if (payload.totalUsers !== 20 || payload.users.length !== 20) {
			throw new Error('complex query returned an unexpected user count');
		}
		if (
			payload.users[0]?.posts?.length !== 2 ||
			payload.users[0].posts[0]?.comments?.length !== 1 ||
			payload.users[0].posts[0]?.score !== 100 ||
			payload.users[0]?.postsCount !== 5
		) {
			throw new Error('complex query did not return nested posts and comments');
		}
	}
};

const numberEnv = (name, fallback) => {
	const value = Number(process.env[name] ?? fallback);
	return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const options = {
	duration: numberEnv('BENCH_DURATION', 10),
	warmup: numberEnv('BENCH_WARMUP', 2),
	connections: numberEnv('BENCH_CONNECTIONS', 100),
	pipelining: numberEnv('BENCH_PIPELINING', 1),
	basePort: numberEnv('BENCH_BASE_PORT', 4100),
	output: process.env.BENCH_OUTPUT || null
};

const scenarioNames = process.env.BENCH_SCENARIOS
	? process.env.BENCH_SCENARIOS.split(',').map((name) => name.trim()).filter(Boolean)
	: Object.keys(SCENARIOS);

function targetsForScenario(name) {
	return name === 'complex' ? COMPLEX_TARGETS : TARGETS;
}

function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message) {
	console.log(`[benchmark] ${ message }`);
}

function startTarget(target, scenario, port) {
	const child = spawn(process.execPath, [
		SERVER,
		'--target', target,
		'--scenario', scenario,
		'--port', String(port)
	], {
		cwd: ROOT,
		env: { ...process.env, NODE_ENV: 'production', DEBUG: '' },
		stdio: ['ignore', 'pipe', 'pipe']
	});

	let stdout = '';
	let stderr = '';
	child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
	child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

	return { child, getLogs: () => ({ stdout, stderr }) };
}

async function waitForReady(processInfo, port) {
	const startedAt = Date.now();
	let lastError;

	while (Date.now() - startedAt < 10000) {
		if (processInfo.child.exitCode !== null) {
			const logs = processInfo.getLogs();
			throw new Error(`Server exited before becoming ready.\n${ logs.stderr || logs.stdout }`);
		}

		try {
			await request({ port, path: '/__benchmark_ready_probe__' });
			return;
		}
		catch (error) {
			lastError = error;
			await wait(50);
		}
	}

	throw new Error(`Timed out waiting for server on port ${ port }: ${ lastError?.message }`);
}

function request({ port, path, method = 'GET', headers = {}, body }) {
	return new Promise((resolve, reject) => {
		const req = http.request({
			hostname: '127.0.0.1',
			port,
			path,
			method,
			headers
		}, (res) => {
			const chunks = [];
			res.on('data', (chunk) => chunks.push(chunk));
			res.once('end', () => resolve({
				statusCode: res.statusCode,
				body: Buffer.concat(chunks).toString()
			}));
		});
		req.once('error', reject);
		if (body) req.write(body);
		req.end();
	});
}

async function stopTarget(processInfo) {
	if (processInfo.child.exitCode !== null) return;

	processInfo.child.kill('SIGTERM');
	await new Promise((resolve) => {
		const timer = setTimeout(() => {
			if (processInfo.child.exitCode === null) processInfo.child.kill('SIGKILL');
		}, 2000);
		processInfo.child.once('exit', () => {
			clearTimeout(timer);
			resolve();
		});
	});
}

async function runAutocannon(config, phase) {
	return autocannon({
		url: `http://127.0.0.1:${ config.port }${ getScenarioPath(config) }`,
		method: config.scenario.method,
		headers: config.scenario.headers,
		body: config.scenario.body,
		connections: options.connections,
		pipelining: options.pipelining,
		duration: phase === 'warmup' ? options.warmup : options.duration,
		renderProgressBar: false,
		quiet: true
	});
}

function getScenarioPath(config) {
	return config.scenario.pathFor ? config.scenario.pathFor(config.target) : config.scenario.path;
}

function preflight(config, statusCode) {
	return request({
		port: config.port,
		path: getScenarioPath(config),
		method: config.scenario.method,
		headers: config.scenario.headers,
		body: config.scenario.body
	}).then((response) => {
		if (response.statusCode !== statusCode) {
			throw new Error(`${ config.target } ${ config.name } returned ${ response.statusCode }, expected ${ statusCode }`);
		}
		if (typeof config.scenario.expectedBody !== 'undefined' && response.body !== config.scenario.expectedBody) {
			throw new Error(`${ config.target } ${ config.name } returned a different response body`);
		}
		if (config.scenario.validateBody) config.scenario.validateBody(response.body);
		return response.body;
	});
}

function summarize(result) {
	return {
		requestsPerSecond: result.requests.average,
		latencyMs: {
			average: result.latency.average,
			p50: result.latency.p50,
			p90: result.latency.p90,
			p99: result.latency.p99,
			max: result.latency.max
		},
		throughputBytesPerSecond: result.throughput.average,
		errors: result.errors,
		timeouts: result.timeouts,
		non2xx: result.non2xx
	};
}

function formatNumber(value, digits = 1) {
	return Number(value || 0).toLocaleString('en-US', {
		maximumFractionDigits: digits,
		minimumFractionDigits: digits
	});
}

function printResult(target, name, result) {
	log(`${ target } / ${ name }: ${ formatNumber(result.requestsPerSecond) } req/s | avg ${ formatNumber(result.latencyMs.average) } ms | p99 ${ formatNumber(result.latencyMs.p99) } ms | errors ${ result.errors } | non-2xx ${ result.non2xx }`);
}

function printReport(results) {
	console.log('\nNodester vs Express stress test');
	console.log(`Config: ${ options.duration }s test, ${ options.warmup }s warmup, ${ options.connections } connections, pipelining ${ options.pipelining }`);
	console.log('Each row is an isolated server process with the same route and payload.\n');
	const table = new Table({
		head: ['Scenario', 'Target', 'Req/s', 'Avg ms', 'p50 ms', 'p99 ms', 'Max ms', 'Errors', 'Non-2xx'],
		colAligns: ['left', 'left', 'right', 'right', 'right', 'right', 'right', 'right', 'right'],
		style: { head: [], border: [] },
		chars: {
			top: '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
			bottom: '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
			left: '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼',
			right: '║', 'right-mid': '╢', 'middle': '│'
		}
	});

	for (const [name, entries] of Object.entries(results)) {
		for (const target of targetsForScenario(name)) {
			const result = entries[target];
			table.push([
				name,
				target,
				formatNumber(result.requestsPerSecond),
				formatNumber(result.latencyMs.average),
				formatNumber(result.latencyMs.p50),
				formatNumber(result.latencyMs.p99),
				formatNumber(result.latencyMs.max),
				String(result.errors),
				String(result.non2xx)
			]);
		}
	}
	console.log(table.toString());

	console.log('\nHigher Req/s is better; lower latency and errors are better. Results vary with Node version, CPU, OS, and background load.');
}

async function run() {
	const results = {};
	let scenarioIndex = 0;
	const unknownScenarios = scenarioNames.filter((name) => !SCENARIOS[name]);
	if (unknownScenarios.length > 0) {
		throw new Error(`Unknown benchmark scenario(s): ${ unknownScenarios.join(', ') }`);
	}
	const totalRuns = scenarioNames.reduce((total, name) => total + targetsForScenario(name).length, 0);
	let completedRuns = 0;

	console.log('\nNodester vs Express stress test');
	console.log(`Configuration: ${ options.duration }s measurement, ${ options.warmup }s warmup, ${ options.connections } connections, pipelining ${ options.pipelining }`);
	console.log(`Plan: ${ scenarioNames.length } workloads across ${ totalRuns } isolated server processes`);
	console.log('');

	for (const name of scenarioNames) {
		const scenario = SCENARIOS[name];
		results[name] = {};
		let complexResponseBody;
		for (const target of targetsForScenario(name)) {
			const port = options.basePort + scenarioIndex;
			scenarioIndex += 1;
			const config = { name, target, port, scenario };
			log(`[${ completedRuns + 1 }/${ totalRuns }] Starting ${ target } for ${ name }: ${ scenario.description }`);
			const processInfo = startTarget(target, name, port);

			try {
				await waitForReady(processInfo, port);
				log(`${ target } is ready at http://127.0.0.1:${ port }${ getScenarioPath(config) }`);
				const responseBody = await preflight(config, 200);
				log(`Preflight passed: ${ scenario.method } ${ getScenarioPath(config) } returned the expected response`);
				if (name === 'complex') {
					if (complexResponseBody === undefined) {
						complexResponseBody = responseBody;
						log(`${ target } complex JSON saved as the comparison baseline`);
					}
					else if (responseBody !== complexResponseBody) {
						throw new Error('Nodester and Express returned different complex JSON bodies');
					}
					else log(`${ target } complex JSON matches the other framework exactly`);
				}
				if (options.warmup > 0) {
					log(`Warming up for ${ options.warmup }s...`);
					await runAutocannon(config, 'warmup');
					log('Warmup complete');
				}
				log(`Measuring for ${ options.duration }s...`);
				const result = await runAutocannon(config, 'test');
				results[name][target] = summarize(result);
				printResult(target, name, results[name][target]);
				completedRuns += 1;
			}
			finally {
				log(`Stopping ${ target } for ${ name }`);
				await stopTarget(processInfo);
				log('Server stopped\n');
			}
		}
	}

	printReport(results);
	if (options.output) {
		const fs = require('fs');
		fs.writeFileSync(options.output, `${ JSON.stringify({ generatedAt: new Date().toISOString(), options, results }, null, 2) }\n`);
		console.log(`\nJSON results written to ${ options.output }`);
	}
}

run().catch((error) => {
	console.error(`\nBenchmark failed: ${ error.stack || error }`);
	process.exitCode = 1;
});
