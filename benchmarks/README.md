# Nodester vs Express benchmark

This benchmark uses [autocannon](https://github.com/mcollina/autocannon), the same style of HTTP load generator commonly used in Node.js framework benchmarks. It starts each framework in its own child process, warms it up, then measures equivalent workloads with the same client settings.

## Run it

From this benchmark directory:

```sh
cd benchmarks
npm install
npm run benchmark
```

For a fast local smoke test:

```sh
npm run benchmark:quick
```

The default run uses a 2-second warmup, a 10-second measurement, 100 concurrent connections, and no pipelining. Override these values with environment variables:

```sh
BENCH_DURATION=30 BENCH_WARMUP=5 BENCH_CONNECTIONS=200 npm run benchmark
```

Run only selected workloads when iterating on one path:

```sh
BENCH_SCENARIOS=complex BENCH_DURATION=10 BENCH_WARMUP=2 npm run benchmark
```

Set `BENCH_OUTPUT=benchmark-results.json` to save the raw summary as JSON. The benchmark does not claim that one result is universal: run it on the same machine, with the same Node.js version, CPU governor, and background load when comparing changes.

The benchmark is intentionally an independent package. Its `package.json` owns the benchmark dependencies and includes the local parent package as `nodester: file:..`; the Nodester package itself does not depend on Express or autocannon.

## Workloads

| Workload | What it measures |
| --- | --- |
| `text` | Static plain-text response and route dispatch |
| `json` | Static JSON response and route dispatch |
| `params` | Named path-parameter matching plus JSON response |
| `post` | JSON parsing, request body access, and JSON response |
| `complex` | Sequelize + SQLite filtering, nested `User -> Post -> Comment` associations, ordering, limit, and `findAndCountAll` |

The GET workloads disable Nodester's database-query, body-parser, and cookie defaults so they measure the HTTP/router path rather than unused application features. The POST workload adds `body-parser.json()` to Nodester and `express.json()` to Express, using the same JSON request body.

The `complex` workload creates an in-memory SQLite database and identical Sequelize models/data in each isolated server process. It runs three targets:

- `nodester`: NQL middleware plus `traverse()` plus Sequelize.
- `nodester-direct`: Nodester router plus direct Sequelize options, with NQL disabled. This isolates NQL/traversal overhead from Nodester's HTTP path.
- `express`: Express's built-in `req.query` parser plus manually written Sequelize options. Express does not import or execute Nodester's NQL parser.

Nodester receives the NQL query below; the direct and Express controls receive ordinary query parameters.

```text
Nodester NQL:
status=active&limit=20&order_by=id&order=asc&fn=count(posts)&includes=posts(status=published&score=gte(97)&limit=2).comments(approved=1&limit=1)

Express query parameters:
status=active&post_status=published&post_score_gte=97&post_limit=2&comment_approved=1&comment_limit=1&limit=20&order_by=id&order=asc&include=posts.comments&count=posts
```

Both paths query the same hierarchy and must return exactly the same canonical JSON body before the load phase begins. Database setup and seeding happen before readiness and are not included in request timings.

Both servers bind to `127.0.0.1`, use the same keep-alive window, and are stopped after every isolated target/workload run. The terminal report uses a Unicode box table and includes requests per second, average/p50/p99/max latency, throughput, errors, timeouts, and non-2xx responses.

## Interpreting results

Compare Nodester and Express within the same workload. Higher requests/second is better; lower latency and zero errors are better. If you publish results, include the complete command, Node.js version, operating system, CPU, and whether the run was done in a container or CI.
