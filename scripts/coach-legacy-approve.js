#!/usr/bin/env node
/**
 * CLI for legacy coach approval migration.
 *
 * Patches manually-created coach accounts with approved verification flags
 * using server/api-util/legacyCoachApprovalSharetribe.js.
 *
 * Usage:
 *   yarn run coach-legacy-approve --user-id=<uuid>
 *   yarn run coach-legacy-approve --user-id=<uuid> --apply
 *   yarn run coach-legacy-approve --dry-run
 *   yarn run coach-legacy-approve --apply --max-pages=5
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
require('../server/env').configureEnv();

const { runLegacyCoachApprovalScan } = require('../server/api-util/legacyCoachApprovalSharetribe');

const parseArgs = argv => {
  const opts = {
    dryRun: true,
    userId: '',
    maxPages: 20,
    perPage: 100,
  };

  argv.forEach(arg => {
    if (arg === '--apply') {
      opts.dryRun = false;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg.startsWith('--user-id=')) {
      opts.userId = arg.slice('--user-id='.length).trim();
    } else if (arg.startsWith('--max-pages=')) {
      opts.maxPages = Number(arg.slice('--max-pages='.length));
    } else if (arg.startsWith('--per-page=')) {
      opts.perPage = Number(arg.slice('--per-page='.length));
    }
  });

  return opts;
};

const logResult = (result, dryRun) => {
  const base = {
    userId: result.userId || null,
    displayName: result.displayName || null,
    status: result.status,
  };

  if (result.status === 'dry_run' || result.status === 'patched') {
    // eslint-disable-next-line no-console
    console.log('[coach-legacy-approve] candidate', {
      ...base,
      mode: dryRun ? 'dry-run' : 'apply',
      eligibilityReason: result.reason || null,
      approvalFieldsAdded: result.patch || {},
    });
    return;
  }

  if (result.status === 'skipped') {
    // eslint-disable-next-line no-console
    console.log('[coach-legacy-approve] skipped', {
      ...base,
      skippedReason: result.reason || 'unknown',
    });
    return;
  }

  if (result.status === 'error') {
    // eslint-disable-next-line no-console
    console.error('[coach-legacy-approve] error', {
      ...base,
      message: result.reason || 'unknown error',
    });
  }
};

const main = async () => {
  const opts = parseArgs(process.argv.slice(2));

  // eslint-disable-next-line no-console
  console.log('[coach-legacy-approve] starting', {
    dryRun: opts.dryRun,
    userId: opts.userId || null,
    maxPages: opts.maxPages,
    perPage: opts.perPage,
  });

  if (opts.dryRun) {
    // eslint-disable-next-line no-console
    console.log('[coach-legacy-approve] dry-run mode (pass --apply to write changes)');
  }

  const summary = await runLegacyCoachApprovalScan(opts);

  summary.results.forEach(result => logResult(result, summary.dryRun));

  // eslint-disable-next-line no-console
  console.log('[coach-legacy-approve] summary', {
    dryRun: summary.dryRun,
    scanned: summary.scanned,
    eligible: summary.eligible,
    patched: summary.patched,
    skipped: summary.skipped,
    errors: summary.errors,
  });

  if (summary.errors > 0) {
    process.exitCode = 1;
  }
};

main().catch(error => {
  console.error('[coach-legacy-approve] failed:', error);
  process.exit(1);
});
