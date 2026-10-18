#!/usr/bin/env node
// Thin entry (excluded from coverage like packages/db/src/scripts/**): all logic is in the tested run().
import { run } from '../src/cli.mjs';

process.exitCode = await run(process.argv.slice(2));
