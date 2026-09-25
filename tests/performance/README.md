# Collab storage benchmarks

Run from the repository root with the Node version in `.node-version`:

```bash
mkdir -p .context
node --import tsx tests/performance/CollabStorageBenchmark.ts > .context/storage-benchmark.json
```

Optional positional arguments select synthetic payload sizes in MiB (integers from 1 to 128).
The defaults are 1, 32, and 128 MiB; SQLite files are slightly larger.
The fixture uses the current authority schema, one synthetic Host, and closed Tickets with 16 KiB bodies.
It contains no user data and lives in a temporary directory removed on completion.

Each size has four workloads, each repeated three times in a fresh Node process:

- `recovery`: open three valid, equal-generation primary, temporary, and backup images through the production snapshot store and full integrity validation.
- `recovery-retention`: repeat recovery with explicit full garbage collection before each candidate read, to distinguish retained buffers from objects awaiting collection. This is a diagnostic; production does not invoke GC, and its timing/RSS must not be substituted for ordinary recovery measurements.
- `serial`: await each of 16 small Project mutations, including their durable snapshot promotion.
- `burst`: submit the same 16 mutations together through the production mutation queue.

Fixture generation runs in a separate process and is excluded from measurements.
Before collecting samples, the harness verifies its event-loop monitor against a deliberate 100 ms synchronous pause in a separate process.
It fails if the monitor reports less than 80 ms; the control's measurements are retained separately from the workload samples.
Write timings exclude initial database opening; recovery timings include opening but exclude SQL.js initialization.
The harness checks the recovered source/generation and the final write generation/value.
Files use real reads, writes, fsync, and rename operations; operating-system filesystem caches are not flushed.

The JSON includes elapsed milliseconds, process high-water RSS in MiB, sampled ArrayBuffer memory in MiB, and maximum event-loop delay in milliseconds.
RSS is the operating system's process-lifetime high-water mark, including SQL.js initialization and initial opening for write workloads.
ArrayBuffer sampling and event-loop monitoring cover the measured workload, with 1 ms sampling resolution and brief timer warmup/drain periods.
Sampling can miss transient peaks and does not measure all native or Wasm memory. The retention diagnostic additionally samples immediately before and after each candidate read.
Garbage collection and allocator reuse can reduce reachable buffers without reducing resident memory immediately.
Compare medians on the same machine, Node version, and workload; these are diagnostic measurements, not CI timing gates or Electron responsiveness guarantees.

For the cache eviction workload, run the public-projection regression scenario with Jest's timing report:

```bash
npm run test:unit -- --runInBand tests/unit/app/collab/client/CollabClientProjection.test.ts --testNamePattern='evicts older details' --json --outputFile=.context/cache-benchmark.json
```

Repeat it three times in separate processes and compare the matching assertion's duration.
This measures the complete scenario: seed 31 valid details and 16 pages, verify cached reads, receive a newer oversized complete Ticket, and verify eviction through offline reads.
It uses an in-memory store port to isolate projection/serialization work; it does not measure filesystem latency or network latency.
Adjacent regression cases cover the exact 4 MiB UTF-8 boundary, one excess byte, escaping, multibyte text, and equal-timestamp eviction order.
