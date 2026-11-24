#!/bin/sh
# the server copy of src/65-cellplan.js (the one rule for where a lock goes in the IDS stock sheet)
cd "$(dirname "$0")/.." && { echo "// GENERATED from src/65-cellplan.js by tools/sync-cellplan.sh — edit that file, not this one"; echo "// deno-lint-ignore-file"; cat src/65-cellplan.js; echo; echo "export { cellPlan, cellQuotaTabs };"; } > supabase/functions/gsheet/cellplan.js
