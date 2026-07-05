import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal config. For shared ISR / Next Data Cache across isolates, add an
// incremental cache override (e.g. r2IncrementalCache) once an R2 bucket is
// provisioned — see https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig();
