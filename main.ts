// Token Launch Radar Main Process Entrypoint
// Authored by @ssass88 for make.fun token-radar-01 bounty

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const baseDir = fileURLToPath(new URL('.', import.meta.url));

const TEXT_MAX_CAP = 65_536;
const SCREENSHOT_LIMITS = { max: 4, max_bytes: 524_288 };
const VALID_IMAGE_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

function extractArgument(flagName: string, fallbackVal: string): string {
  const flagIndex = process.argv.indexOf(`--${flagName}`);
  if (flagIndex >= 0 && flagIndex + 1 < process.argv.length) {
    return process.argv[flagIndex + 1]!;
  }
  const prefixMatch = process.argv.find((arg) => arg.startsWith(`--${flagName}=`));
  if (prefixMatch !== undefined) {
    return prefixMatch.slice(flagName.length + 3);
  }
  return fallbackVal;
}

const inputParam = extractArgument('input', '/input');
const snapshotFilePath = inputParam.endsWith('.json') ? inputParam : join(inputParam, 'snapshot.json');

if (!existsSync(snapshotFilePath)) {
  process.stderr.write(`[token-radar] Snapshot file not found at: ${snapshotFilePath}\n`);
  process.exit(2);
}

const outputDir = extractArgument('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const rawSnapshot = readFileSync(snapshotFilePath, 'utf8');
const snapshotData = parseSnapshot(rawSnapshot);
const { board, radar } = buildRadar(snapshotData);

const validationError = boardIssue(board, snapshotData);
if (validationError !== null) {
  process.stderr.write(`[token-radar] Critical: Board validation failed: ${validationError}\n`);
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
writeFileSync(join(outputDir, 'data.js'), dataScript(radar));

function transferDirectory(src: string, target: string): string[] {
  if (!existsSync(src)) return [];
  mkdirSync(target, { recursive: true });
  const transferred: string[] = [];
  for (const entryName of readdirSync(src)) {
    if (entryName.startsWith('.')) continue;
    const srcPath = join(src, entryName);
    if (!statSync(srcPath).isFile()) continue;
    copyFileSync(srcPath, join(target, entryName));
    transferred.push(entryName);
  }
  return transferred;
}

transferDirectory(join(baseDir, 'dashboard'), join(outputDir, 'dashboard'));
const copiedShots = transferDirectory(join(baseDir, 'screenshots'), join(outputDir, 'screenshots'));

if (copiedShots.length < 3) {
  process.stderr.write(`[token-radar] Missing screenshots: found ${copiedShots.length}, requires at least 3\n`);
  process.exit(1);
}

for (const shotName of copiedShots) {
  if (!VALID_IMAGE_PATTERN.test(shotName)) {
    process.stderr.write(`[token-radar] Invalid screenshot filename: ${shotName}\n`);
    process.exit(1);
  }
}

const dossierResult = buildDossier(outputDir, {
  text_max_bytes: TEXT_MAX_CAP,
  screenshots: SCREENSHOT_LIMITS,
  dashboard: { max_files: 400, max_bytes: 4_194_304 },
});

writeFileSync(join(outputDir, 'dossier.json'), dossierResult);

process.stdout.write(
  `[token-radar] Execution success: ${snapshotData.protocols.length} total protocols, ${snapshotData.watchlist.length} watchlist candidates, ${board.length} scored board rows.\n` +
  `[token-radar] Output artifacts written cleanly to ${outputDir}\n`,
);
