#!/usr/bin/env node
// Agent Upskill Shared Skills sync (B4 Option C, trust model C-hash).
//
// Run only during Sync, with the user's approval. It copies the user's
// selected skills from the public, immutable, per-publication host into the
// Codex user skills folder and leaves nothing running.
//
// Trust (C-hash): the publication fingerprint comes from the authenticated
// skills_profile reply that the agent passes through. This script checks
//   digest(publication.signed) == --publication,
//   digest(catalog) == publication.signed.catalog_sha256, and
//   every selected file's bytes and SHA-256 == its catalog entry.
// There is no device-side publisher signature check. The byte origin is
// derived from the fingerprint alone; no URL is accepted from an argument or
// a server reply. GET only, redirects refused, selected packages only.
//
// Portable by design: node: built-ins and vendored code only, no POSIX owner
// or mode checks, no macOS paths. Node 22 or newer.
import * as fs from 'node:fs';
import nodePath from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {LIMITS, canonical, digest, sha256, requireThat, shape, hash, id, version, list, safePath, fileManifest, packageDigest} from './vendor/shared-skills-contracts.mjs';

export const EXIT = Object.freeze({
  ok: 0,            // sync applied (or nothing to change); --status: in sync
  usage: 1,         // bad or missing arguments
  verification: 2,  // download, fingerprint, hash, size or redirect check failed; nothing changed
  releaseRefused: 3,// release not available (withdrawn, expired, unknown): no install or update; deselected owned skills were still removed (listed)
  ownership: 4,     // managed record corrupt, ownership ambiguous, or another sync running; nothing changed
  statusDiffers: 5, // --status only: installed skills differ from the selection
  failed: 6         // unexpected local error; the managed record still describes what is on disk
});
export const ROOT_ENV = 'AGENTUPSKILL_SKILLS_ROOT';
export const RECORD = '.agentupskill-managed.json';
export const CONTAINER = 'agentupskill';
export const LAYOUTS = Object.freeze(['nested', 'direct']);
const RECORD_KIND = 'AgentUpskillManagedSkills';
const STAGING = /^\.agentupskill-staging-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LOCK = '.agentupskill-sync.lock';
const LOCK_TEMPORARY = /^\.agentupskill-lock-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const WORKERS_ZONE = 'agentupskill.workers.dev';
const METADATA_BYTES = 65536; // shared-skills lib/release-trust.mjs TRUST_LIMITS.metadataBytes
const REQUEST_MS = 30000, DEADLINE_MS = 10 * 60 * 1000, CONCURRENCY = 4;
// A sync holds the lock only for its local write phase (downloads finish
// first), which takes seconds. A lock older than this is from a dead run.
export const LOCK_STALE_MS = 10 * 60 * 1000;

export class SyncError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const fail = (code, message) => { throw new SyncError(code, message); };
const check = (condition, code, message) => { if (!condition) fail(code, message); };
function under(code, fn) {
  try { return fn(); } catch (error) { if (error instanceof SyncError) throw error; fail(code, error.message); }
}

// ---------- arguments ----------

const USAGE = `Usage:
  node skills-sync.mjs --publication <sha256> --release-status available --select <id@version> [...] [--layout nested|direct] [--json]
  node skills-sync.mjs --publication <sha256> --release-status available --select-none [--layout nested|direct] [--json]
  node skills-sync.mjs --status --publication <sha256> (--select <id@version> [...] | --select-none) [--release-status <status>] [--layout nested|direct] [--json]
Values come from the authenticated skills_profile reply. Up to ${LIMITS.packages} selections.`;

export function parseSelection(value) {
  const match = typeof value === 'string' ? /^([^@]+)@([^@]+)$/.exec(value) : null;
  check(match, EXIT.usage, `Selection must look like id@version: ${String(value).slice(0, 80)}`);
  under(EXIT.usage, () => { id(match[1]); version(match[2]); });
  return {id: match[1], version: match[2]};
}

export function parseArgs(argv) {
  const options = {publication: null, selections: [], selectNone: false, releaseStatus: null, status: false, layout: 'nested', json: false};
  const seen = new Set();
  const once = flag => { check(!seen.has(flag), EXIT.usage, `${flag} given twice`); seen.add(flag); };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = () => { check(i + 1 < argv.length && !argv[i + 1].startsWith('--'), EXIT.usage, `${flag} needs a value`); return argv[++i]; };
    switch (flag) {
      case '--publication': once(flag); options.publication = value(); break;
      case '--release-status': once(flag); options.releaseStatus = value(); break;
      case '--layout': once(flag); options.layout = value(); break;
      case '--select': {
        const start = options.selections.length;
        while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) options.selections.push(parseSelection(argv[++i]));
        check(options.selections.length > start, EXIT.usage, '--select needs at least one id@version');
        break;
      }
      case '--select-none': once(flag); options.selectNone = true; break;
      case '--status': once(flag); options.status = true; break;
      case '--json': once(flag); options.json = true; break;
      case '--help': case '-h': fail(EXIT.usage, USAGE);
      default: fail(EXIT.usage, `Unknown argument: ${String(flag).slice(0, 80)}\n${USAGE}`);
    }
  }
  check(options.publication !== null, EXIT.usage, `--publication is required\n${USAGE}`);
  under(EXIT.usage, () => hash(options.publication));
  check(LAYOUTS.includes(options.layout), EXIT.usage, `--layout must be one of: ${LAYOUTS.join(', ')}`);
  check(!(options.selectNone && options.selections.length), EXIT.usage, '--select-none cannot be combined with --select');
  // An empty selection removes every owned skill, so it must be explicit.
  check(options.selectNone || options.selections.length, EXIT.usage, `Give --select id@version, or --select-none to remove every installed Agent Upskill skill\n${USAGE}`);
  check(options.selections.length <= LIMITS.packages, EXIT.usage, `At most ${LIMITS.packages} selections`);
  check(new Set(options.selections.map(s => s.id)).size === options.selections.length, EXIT.usage, 'The same skill is selected twice');
  if (!options.status) check(options.releaseStatus !== null, EXIT.usage, '--release-status is required (pass release_status from skills_profile)');
  return options;
}

// Only "available" allows installs and updates. Any other status (withdrawn,
// expired, or one this script does not know) still allows removing owned,
// deselected skills, so revocation can uninstall.
export function installsAllowed(status) { return status === 'available'; }
export function releaseLabel(status) {
  return status === 'withdrawn' ? 'was withdrawn' : status === 'expired' ? 'has expired' : `has status ${JSON.stringify(String(status).slice(0, 40))}`;
}

// ---------- paths (the path module is a parameter so path.win32 runs the same code) ----------

export function skillsRoot({env = process.env, homedir = os.homedir(), pathImpl = nodePath} = {}) {
  const override = env[ROOT_ENV];
  if (override !== undefined && override !== '') {
    check(pathImpl.isAbsolute(override), EXIT.usage, `${ROOT_ENV} must be an absolute path`);
    return pathImpl.normalize(override);
  }
  check(typeof homedir === 'string' && pathImpl.isAbsolute(homedir), EXIT.failed, 'Could not find the home folder');
  return pathImpl.join(homedir, '.agents', 'skills');
}

// Folder for one package, relative to the root, always with "/" separators.
export function packageRelative(layout, nativeName) {
  check(LAYOUTS.includes(layout), EXIT.usage, 'Unknown layout');
  return layout === 'nested' ? `${CONTAINER}/${nativeName}` : nativeName;
}

// A catalog-relative "/" path, joined under base with the platform separator.
export function nativePath(base, relative, pathImpl = nodePath) {
  safePath(relative);
  const target = pathImpl.join(base, ...relative.split('/'));
  const rel = pathImpl.relative(base, target);
  requireThat(rel !== '' && !rel.startsWith('..') && !pathImpl.isAbsolute(rel), 'Path escapes the skills folder');
  return target;
}

export function originFor(publication) {
  hash(publication);
  return `https://au-skills-release-${publication.slice(0, 32)}.${WORKERS_ZONE}`;
}

export function objectUrl(publication, segments) {
  const origin = originFor(publication);
  for (const segment of segments) safePath(segment);
  const url = new URL(`${origin}/bundles/${publication}/${segments.map(encodeURIComponent).join('/')}`);
  requireThat(url.origin === origin && !url.search && !url.hash, 'Unexpected object location');
  return url;
}

// ---------- download ----------

function deadline(ms = DEADLINE_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Download deadline exceeded')), ms);
  timer.unref?.();
  return {controller, signal: controller.signal, done: () => clearTimeout(timer)};
}

async function download(fetcher, url, {max, exact}, operation) {
  const signal = AbortSignal.any([operation.signal, AbortSignal.timeout(REQUEST_MS)]);
  let response;
  try {
    response = await fetcher(url.href, {method: 'GET', redirect: 'manual', headers: {Accept: 'application/octet-stream'}, signal});
  } catch (error) {
    fail(EXIT.verification, `Could not download ${url.pathname}: ${error?.message ?? error}`);
  }
  try {
    check(response && response.status === 200 && response.redirected !== true && response.type !== 'opaqueredirect',
      EXIT.verification, `Refused ${url.pathname}: HTTP ${response?.status ?? 'error'} (only a direct 200 is accepted; redirects are refused)`);
    const length = response.headers?.get?.('content-length');
    if (length !== null && length !== undefined) check(/^\d+$/.test(length) && Number(length) <= max, EXIT.verification, `${url.pathname} is larger than allowed`);
    // Only a declared zero-byte file may arrive without a body.
    check(response.body || exact === 0, EXIT.verification, `${url.pathname} has no body`);
    const chunks = []; let size = 0;
    for await (const chunk of response.body ?? []) {
      size += chunk.length;
      check(size <= max, EXIT.verification, `${url.pathname} is larger than allowed`);
      chunks.push(Buffer.from(chunk));
    }
    if (exact !== undefined) check(size === exact, EXIT.verification, `${url.pathname} has the wrong size`);
    return Buffer.concat(chunks, size);
  } catch (error) {
    try { await response?.body?.cancel?.(); } catch {}
    if (error instanceof SyncError) throw error;
    fail(EXIT.verification, `Could not download ${url.pathname}: ${error?.message ?? error}`);
  }
}

function parseJson(bytes, what) {
  try { return JSON.parse(bytes.toString('utf8')); } catch { fail(EXIT.verification, `${what} is not valid JSON`); }
}

async function pool(items, limit, worker, onFailure) {
  let next = 0, failure = null;
  const run = async () => {
    while (failure === null && next < items.length) {
      const item = items[next++];
      try { await worker(item); } catch (error) { failure ??= error; onFailure?.(); }
    }
  };
  // Every in-flight transfer settles before this returns.
  await Promise.all(Array.from({length: Math.min(limit, items.length)}, run));
  if (failure) throw failure;
}

function validatePackage(pkg) {
  under(EXIT.verification, () => {
    requireThat(pkg && typeof pkg === 'object' && !Array.isArray(pkg), 'Catalog package is not an object');
    id(pkg.id); version(pkg.version); id(pkg.native_name); safePath(pkg.native_name);
    requireThat((pkg.native_name === pkg.id || pkg.native_name === `au-${pkg.id}`) && pkg.native_name.length <= 64, `Unexpected folder name for ${pkg.id}`);
    hash(pkg.package_sha256);
    requireThat(packageDigest(pkg) === pkg.package_sha256, `Package metadata digest mismatch for ${pkg.id}`);
    fileManifest(pkg.files);
    requireThat(pkg.files.some(f => f.path === 'SKILL.md'), `${pkg.id} has no SKILL.md`);
  });
  return pkg;
}

// Fetch and verify the publication and catalog; resolve the selection.
export async function resolveRelease({publication, selections, fetcher, operation}) {
  const publicationBytes = await download(fetcher, objectUrl(publication, ['publication.json']), {max: METADATA_BYTES}, operation);
  const envelope = parseJson(publicationBytes, 'publication.json');
  check(envelope && typeof envelope === 'object' && envelope.signed && typeof envelope.signed === 'object', EXIT.verification, 'publication.json has no signed body');
  check(digest(envelope.signed) === publication, EXIT.verification, 'publication.json does not match the publication fingerprint from your account');
  const signed = envelope.signed;
  check(signed.kind === 'SharedSkillsPublication', EXIT.verification, 'publication.json is not a skills publication');
  under(EXIT.verification, () => hash(signed.catalog_sha256));
  const catalogBytes = await download(fetcher, objectUrl(publication, ['catalog', 'release.json']), {max: LIMITS.jsonBytes}, operation);
  const catalog = parseJson(catalogBytes, 'catalog/release.json');
  check(digest(catalog) === signed.catalog_sha256, EXIT.verification, 'catalog/release.json does not match the publication');
  check(catalog && catalog.kind === 'CatalogRelease' && catalog.release_id === signed.release_id, EXIT.verification, 'The catalog does not belong to this publication');
  under(EXIT.verification, () => list(catalog.packages, LIMITS.catalogPackages));
  const chosen = selections.map(selection => {
    const matches = catalog.packages.filter(p => p && p.id === selection.id);
    check(matches.length === 1 && matches[0].version === selection.version, EXIT.verification, `${selection.id}@${selection.version} is not in this publication`);
    return validatePackage(matches[0]);
  });
  const names = chosen.map(p => p.native_name.toLowerCase());
  check(new Set(names).size === names.length, EXIT.verification, 'Two selected skills share a folder name');
  return chosen;
}

async function downloadPackages(packages, {publication, fetcher, operation}) {
  const bytes = new Map(packages.map(p => [p.id, new Map()]));
  const jobs = packages.flatMap(p => p.files.map(file => ({p, file})));
  const failed = new AbortController();
  const signal = AbortSignal.any([operation.signal, failed.signal]);
  await pool(jobs, CONCURRENCY, async ({p, file}) => {
    const url = objectUrl(publication, ['catalog', 'packages', p.id, p.version, p.package_sha256, ...file.path.split('/')]);
    const body = await download(fetcher, url, {max: file.bytes, exact: file.bytes}, {signal});
    check(sha256(body) === file.sha256, EXIT.verification, `${p.id}/${file.path} does not match its published fingerprint`);
    bytes.get(p.id).set(file.path, body);
  }, () => failed.abort(new Error('Another download failed')));
  return bytes;
}

// ---------- the managed record ----------

const manifestOf = files => files.map(({path, sha256: hex, bytes}) => ({path, sha256: hex, bytes}));
const sameManifest = (a, b) => canonical([...a].sort((x, y) => x.path < y.path ? -1 : 1)) === canonical([...b].sort((x, y) => x.path < y.path ? -1 : 1));

function emptyRecord() { return {kind: RECORD_KIND, schema_version: 1, publication_sha256: null, packages: []}; }

export function validateRecord(record) {
  shape(record, ['kind', 'schema_version', 'publication_sha256', 'packages']);
  requireThat(record.kind === RECORD_KIND && record.schema_version === 1, 'Unknown record kind or version');
  if (record.publication_sha256 !== null) hash(record.publication_sha256);
  list(record.packages, LIMITS.packages * 2);
  const dirs = new Set(), ids = new Set();
  for (const entry of record.packages) {
    shape(entry, ['id', 'version', 'native_name', 'package_sha256', 'dir', 'files'], ['previous_files']);
    id(entry.id); version(entry.version); id(entry.native_name); safePath(entry.native_name); hash(entry.package_sha256);
    requireThat(LAYOUTS.some(layout => packageRelative(layout, entry.native_name) === entry.dir), 'Unexpected owned folder');
    fileManifest(entry.files);
    if (Object.hasOwn(entry, 'previous_files')) fileManifest(entry.previous_files);
    const key = entry.dir.toLowerCase();
    requireThat(!dirs.has(key) && !ids.has(entry.id), 'Duplicate owned folder or skill');
    dirs.add(key); ids.add(entry.id);
  }
  return record;
}

function lstatOrNull(file) {
  try { return fs.lstatSync(file); } catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null; throw error; }
}

export function readRecord(root) {
  const file = nodePath.join(root, RECORD);
  const st = lstatOrNull(file);
  if (!st) return emptyRecord();
  check(st.isFile() && st.size <= LIMITS.jsonBytes, EXIT.ownership, `The managed record ${file} is not a regular file. Nothing was changed; inspect or move it.`);
  const bytes = fs.readFileSync(file);
  let record;
  try { record = validateRecord(JSON.parse(bytes.toString('utf8'))); } catch { record = null; }
  check(record && bytes.equals(Buffer.from(canonical(record) + '\n')), EXIT.ownership, `The managed record ${file} is corrupt or was edited. Nothing was changed; inspect or move it.`);
  return record;
}

function writeRecord(root, record, scratch, at) {
  validateRecord(record);
  at(scratch);
  const temporary = nodePath.join(scratch, `record-${randomUUID()}.json`);
  const fd = fs.openSync(temporary, 'wx');
  try { fs.writeSync(fd, Buffer.from(canonical(record) + '\n')); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  at(root);
  fs.renameSync(temporary, nodePath.join(root, RECORD));
  syncDir(root);
}

// Flush a folder's entries after a rename, where the platform allows opening
// a folder (POSIX). Windows refuses, and NTFS renames are journaled.
function syncDir(dir) {
  let fd;
  try { fd = fs.openSync(dir, 'r'); fs.fsyncSync(fd); } catch {} finally { if (fd !== undefined) try { fs.closeSync(fd); } catch {} }
}

// Whether names in the folder holding root compare without letter case
// (APFS and NTFS by default). Read-only probe: look up the same folder with
// its name case-swapped and compare identities. A folder whose name has no
// letters, or a missing root, is checked through its nearest existing
// ancestor; with nothing to probe, assume case-insensitive (the stricter case).
export function volumeCaseInsensitive(root) {
  let dir = root;
  while (!lstatOrNull(dir)) { const up = nodePath.dirname(dir); if (up === dir) return true; dir = up; }
  for (let current = dir; ; current = nodePath.dirname(current)) {
    const name = nodePath.basename(current), swapped = [...name].map(c => c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase()).join('');
    if (swapped !== name) {
      const a = lstatOrNull(current), b = lstatOrNull(nodePath.join(nodePath.dirname(current), swapped));
      return Boolean(a && b && a.ino === b.ino && a.dev === b.dev);
    }
    if (nodePath.dirname(current) === current) return true;
  }
}
const sameName = (a, b, insensitive) => insensitive ? a.toLowerCase() === b.toLowerCase() : a === b;

// ---------- path anchoring ----------

// The skills folder itself must be a plain folder, never a link.
function plainRoot(root) {
  const st = lstatOrNull(root);
  check(!st || (st.isDirectory() && !st.isSymbolicLink()), EXIT.ownership, `${root} is a link or not a folder. Agent Upskill only writes into a plain folder. Nothing was changed.`);
  return st;
}

// Node has no portable directory handle with no-follow semantics, so every
// write and rename first checks the folder it lands in: each component from
// the root down must be a plain folder (lstat), and its real path must still
// sit under the root's real path taken when writing began. A link or a swap
// anywhere on the way fails closed. The window left is between this check
// and the single syscall that follows it.
function anchor(root, insensitive) {
  plainRoot(root);
  const real = fs.realpathSync(root);
  const check_ = dir => {
    const rel = nodePath.relative(root, dir);
    requireThat(!rel.startsWith('..') && !nodePath.isAbsolute(rel), 'Path escapes the skills folder');
    const stopped = `the sync stopped. Earlier changes in this run were kept and recorded.`;
    let current = root;
    for (const part of ['', ...(rel ? rel.split(nodePath.sep) : [])]) {
      if (part) current = nodePath.join(current, part);
      const st = lstatOrNull(current);
      check(st && st.isDirectory() && !st.isSymbolicLink(), EXIT.failed, `${current} is a link or was replaced; ${stopped}`);
    }
    check(sameName(fs.realpathSync(dir), nodePath.join(real, rel), insensitive), EXIT.failed, `${dir} no longer resolves inside ${real}; ${stopped}`);
  };
  check_.root = root;
  return check_;
}

// Create dir under the root one level at a time, checking each parent before
// creating the next folder, so nothing is ever created through a link.
function ensureDir(dir, at) {
  const rel = nodePath.relative(at.root, dir);
  let current = at.root;
  at(current);
  for (const part of rel ? rel.split(nodePath.sep) : []) {
    const next = nodePath.join(current, part);
    if (!lstatOrNull(next)) { at(current); fs.mkdirSync(next); }
    at(next);
    current = next;
  }
}

// ---------- folder state ----------

function readTree(dir) {
  const files = new Map(), dirs = new Set();
  let entries = 0, total = 0;
  const walk = (absolute, relative) => {
    for (const name of fs.readdirSync(absolute)) {
      const child = nodePath.join(absolute, name), rel = relative ? `${relative}/${name}` : name, st = fs.lstatSync(child);
      requireThat(++entries <= LIMITS.files * 4, 'Too many entries');
      if (st.isDirectory()) { dirs.add(rel); walk(child, rel); }
      else {
        requireThat(st.isFile(), `${rel} is not a regular file`);
        total += st.size; requireThat(total <= LIMITS.packageBytes, 'Folder too large');
        const bytes = fs.readFileSync(child);
        files.set(rel, {sha256: sha256(bytes), bytes: bytes.length});
      }
    }
  };
  walk(dir, '');
  return {files, dirs};
}

function treeMatches(tree, manifest) {
  if (tree.files.size !== manifest.length) return false;
  const parents = new Set();
  for (const file of manifest) {
    const found = tree.files.get(file.path);
    if (!found || found.sha256 !== file.sha256 || found.bytes !== file.bytes) return false;
    const parts = file.path.split('/');
    for (let i = 1; i < parts.length; i++) parents.add(parts.slice(0, i).join('/'));
  }
  return [...tree.dirs].every(dir => parents.has(dir));
}

// current | previous | missing | foreign | modified
function ownedState(root, entry) {
  const target = nativePath(root, entry.dir);
  const st = lstatOrNull(target);
  if (!st) return 'missing';
  if (st.isSymbolicLink() || !st.isDirectory()) return 'foreign';
  let tree;
  // Contract violations (extra entries, links, size) mean changed; I/O errors surface as they are.
  try { tree = readTree(target); } catch (error) { if (error.code) throw error; return 'modified'; }
  if (treeMatches(tree, entry.files)) return 'current';
  if (entry.previous_files && treeMatches(tree, entry.previous_files)) return 'previous';
  return 'modified';
}

function containerProblem(root, layout) {
  if (layout !== 'nested') return null;
  const st = lstatOrNull(nodePath.join(root, CONTAINER));
  if (st && (st.isSymbolicLink() || !st.isDirectory())) return `${nodePath.join(root, CONTAINER)} exists and is not a plain folder`;
  return null;
}

// Owned folders must still hold exactly what was written.
function ownedStates(root, record) {
  return new Map(record.packages.map(entry => [entry.dir.toLowerCase(), ownedState(root, entry)]));
}

function ownedProblems(root, record, states = ownedStates(root, record)) {
  const problems = [];
  for (const entry of record.packages) {
    const state = states.get(entry.dir.toLowerCase());
    if (state === 'foreign' || state === 'modified') problems.push(`${nativePath(root, entry.dir)} was changed after Agent Upskill installed it`);
  }
  return problems;
}

// The first spelling along dir that differs from ours only by letter case.
function caseTwin(root, dir) {
  let current = root;
  for (const part of dir.split('/')) {
    const st = lstatOrNull(current);
    const twin = st && st.isDirectory() && !st.isSymbolicLink() ? fs.readdirSync(current).find(name => name !== part && name.toLowerCase() === part.toLowerCase()) : undefined;
    if (twin) return nodePath.join(current, twin);
    current = nodePath.join(current, part);
  }
  return null;
}

// Problems with placing new folders at dirs (root-relative, "/"), shared by
// sync and --status. On a case-insensitive volume a name that differs only by
// letter case is the same folder, so it is a conflict found here, at planning,
// before any removal is applied.
function conflictsFor(root, record, dirs, layout, insensitive) {
  const problems = [];
  const container = containerProblem(root, layout);
  if (container) problems.push(container);
  const owned = new Set(record.packages.map(entry => entry.dir));
  for (const dir of dirs) {
    if (owned.has(dir)) continue;
    const target = nativePath(root, dir);
    const twin = insensitive ? caseTwin(root, dir) : null;
    if (twin) problems.push(`${twin} differs from ${target} only by letter case; on this disk they are the same folder`);
    else if (lstatOrNull(target)) problems.push(`${target} already exists and was not installed by Agent Upskill`);
  }
  return problems;
}

// What the local record alone can decide for a selection. Shared by sync and
// --status so both resolve names the same way: an owned skill keeps its
// recorded folder name; a new one is placed under its catalog id (the sync
// then uses the catalog's native_name, which equals the id for every package
// in the current publication).
function localSteps(root, record, selections, layout, states) {
  const chosen = new Set(selections.map(s => s.id));
  const remove = record.packages.filter(entry => !chosen.has(entry.id));
  const keep = [], add = [], update = [], missing = [];
  for (const s of selections) {
    const entry = record.packages.find(e => e.id === s.id);
    if (!entry) add.push({...s, dir: packageRelative(layout, s.id)});
    else if (entry.version !== s.version || entry.dir !== packageRelative(layout, entry.native_name)) update.push({...s, from: entry.version, dir: packageRelative(layout, entry.native_name)});
    else if (states.get(entry.dir.toLowerCase()) === 'current') keep.push(entry);
    else missing.push(s);
  }
  return {remove, keep, add, update, missing};
}

// desired: [{id, version, native_name, package_sha256, dir, files}]
function plan(root, record, desired, layout, insensitive) {
  const states = ownedStates(root, record);
  const problems = [...ownedProblems(root, record, states)];
  const byDir = new Map(record.packages.map(entry => [entry.dir.toLowerCase(), entry]));
  const wanted = new Set(desired.map(entry => entry.dir.toLowerCase()));
  const remove = record.packages.filter(entry => !wanted.has(entry.dir.toLowerCase()));
  const add = [], update = [], unchanged = [];
  for (const entry of desired) {
    const owned = byDir.get(entry.dir.toLowerCase());
    if (!owned) { add.push({entry}); continue; }
    const state = states.get(owned.dir.toLowerCase());
    if (state === 'current' && owned.package_sha256 === entry.package_sha256 && owned.id === entry.id && owned.version === entry.version && sameManifest(owned.files, entry.files)) unchanged.push({entry, owned});
    else if (state === 'current' || state === 'previous' || state === 'missing') update.push({entry, owned, state});
  }
  problems.push(...conflictsFor(root, record, add.map(step => step.entry.dir), layout, insensitive));
  return {remove, add, update, unchanged, problems};
}

// A published id@version is immutable (shared-skills lib/filesystem-store.mjs,
// "Conflicting immutable skill ID/version"). --status compares only id and
// version, so a same-version content change would reach the device without
// being shown in the preview; refuse it instead of replacing the folder.
function immutableConflicts(record, desired) {
  const messages = [];
  for (const entry of desired) {
    const owned = record.packages.find(e => e.id === entry.id && e.version === entry.version);
    if (owned && owned.package_sha256 !== entry.package_sha256) messages.push(`The published package for ${entry.id}@${entry.version} changed without a new version (installed ${owned.package_sha256.slice(0, 12)}, now ${entry.package_sha256.slice(0, 12)}).`);
  }
  return messages;
}
const immutableRefusal = messages => `${messages.join('\n')}\nA skill version must never change, so nothing was changed. Please report this: message the person who invited you to Agent Upskill.`;

function desiredEntries(chosen, layout) {
  return chosen.map(p => ({id: p.id, version: p.version, native_name: p.native_name, package_sha256: p.package_sha256, dir: packageRelative(layout, p.native_name), files: manifestOf(p.files)}));
}

// ---------- lock and staging ----------

function acquireLock(root) {
  const file = nodePath.join(root, LOCK), owner = {pid: process.pid, host: os.hostname(), token: randomUUID()};
  for (let attempt = 0; attempt < 3; attempt++) {
    // Write the owner to a private file, then hard-link it into place: the
    // link is atomic, so the lock is never seen empty or half written.
    const temporary = nodePath.join(root, `.agentupskill-lock-${randomUUID()}`);
    fs.writeFileSync(temporary, JSON.stringify(owner), {flag: 'wx'});
    try { fs.linkSync(temporary, file); return owner; }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    finally { fs.rmSync(temporary, {force: true}); }
    // Stale: unreadable, older than LOCK_STALE_MS, or held by a process on
    // this computer that is no longer running.
    let raw = null, held = null, age = 0;
    try { raw = fs.readFileSync(file); age = Date.now() - fs.lstatSync(file).mtimeMs; held = JSON.parse(raw.toString('utf8')); } catch {}
    if (raw === null) continue; // released between our link and our read
    const readable = held && Number.isSafeInteger(held.pid) && typeof held.host === 'string';
    const stale = !readable || age > LOCK_STALE_MS || (held.host === os.hostname() && !alive(held.pid));
    const busy = `Another skills sync is running${readable ? ` (on ${held.host.slice(0, 64)}, started ${Math.round(age / 1000)} seconds ago)` : ''}. Nothing was changed. Try again shortly; a lock left by a stopped sync clears itself after ${LOCK_STALE_MS / 60000} minutes.`;
    check(stale && attempt < 2, EXIT.ownership, busy);
    // Take over by renaming the stale lock aside: only one run can win the
    // rename. If what was moved is not the stale lock we read, put it back.
    const aside = nodePath.join(root, `.agentupskill-lock-${randomUUID()}`);
    try { fs.renameSync(file, aside); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    let moved = null;
    try { moved = fs.readFileSync(aside); } catch {}
    if (!moved || !moved.equals(raw)) {
      try { fs.linkSync(aside, file); } catch {}
      fs.rmSync(aside, {force: true});
      fail(EXIT.ownership, busy);
    }
    fs.rmSync(aside, {force: true});
  }
  fail(EXIT.ownership, 'Could not take the sync lock');
}

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; }
}

function releaseLock(root, owner) {
  const file = nodePath.join(root, LOCK);
  try { if (JSON.parse(fs.readFileSync(file, 'utf8')).token === owner.token) fs.unlinkSync(file); } catch {}
}

// Staging folders are dot-prefixed (Codex skips hidden folders under a skills
// root) and named with a fresh UUID. Under the lock, any left over belong to a
// run that was killed.
function clearStaleStaging(root) {
  for (const name of fs.readdirSync(root)) {
    const st = fs.lstatSync(nodePath.join(root, name));
    if (STAGING.test(name) && st.isDirectory() && !st.isSymbolicLink()) fs.rmSync(nodePath.join(root, name), {recursive: true, force: true});
    // A lock temp lives for microseconds; only an old one is from a killed run.
    else if (LOCK_TEMPORARY.test(name) && st.isFile() && Date.now() - st.mtimeMs > 60000) fs.rmSync(nodePath.join(root, name), {force: true});
  }
}

function writeNewFile(file, bytes, at) {
  ensureDir(nodePath.dirname(file), at);
  const fd = fs.openSync(file, 'wx');
  try { fs.writeSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}

function stagePackage(folder, entry, bytes, at) {
  at(nodePath.dirname(folder));
  fs.mkdirSync(folder);
  for (const file of entry.files) writeNewFile(nativePath(folder, file.path), bytes.get(file.path), at);
  requireThat(treeMatches(readTree(folder), entry.files), `Staged copy of ${entry.id} does not read back correctly`);
}

function place(staged, target, at) {
  // Earlier steps of this run may already be applied, so this is not "nothing changed".
  check(!lstatOrNull(target), EXIT.failed, `${target} appeared during the sync; it was left untouched. Earlier changes in this run were kept and recorded; sync again after moving it.`);
  ensureDir(nodePath.dirname(target), at); at(staged);
  fs.renameSync(staged, target);
  at(target);
  syncDir(nodePath.dirname(target));
}

// Move an owned folder into staging, then prove the moved folder is the one
// that was checked. Anything else is put back, or kept under a recovery name
// this script never deletes.
function moveOutOwned(root, target, dest, manifests, at) {
  at(nodePath.dirname(target)); at(nodePath.dirname(dest));
  fs.renameSync(target, dest);
  syncDir(nodePath.dirname(target));
  let owned = false;
  try {
    const st = fs.lstatSync(dest);
    owned = st.isDirectory() && !st.isSymbolicLink() && manifests.some(m => m && treeMatches(readTree(dest), m));
  } catch { owned = false; }
  if (owned) return;
  const kept = lstatOrNull(target) ? nodePath.join(root, `.agentupskill-recovered-${randomUUID()}`) : target;
  fs.renameSync(dest, kept);
  fail(EXIT.failed, `${target} was replaced during the sync and was not deleted; it is ${kept === target ? 'back in place' : `kept at ${kept}`}. Earlier changes in this run were kept and recorded.`);
}

// ---------- sync ----------

// Apply planned steps under the lock. Order: removals, additions, updates.
// The record is written before each rename, so a crash leaves "owned and
// missing" (reinstalled next time), never an unowned folder.
async function applyChanges({root, at, staging, record, steps, staged, hooks, publication}) {
  let slot = 0;
  const scratch = kind => nodePath.join(staging, `${kind}-${slot++}`);
  const save = () => writeRecord(root, record, staging, at);
  const replaceEntry = (dir, next) => { record = {...record, packages: [...record.packages.filter(e => e.dir.toLowerCase() !== dir.toLowerCase()), ...(next ? [next] : [])]}; };
  // If something else took the target, stop claiming it: the record must
  // never list a folder this run did not place.
  const placeOwned = (entry, target) => {
    try { place(staged.get(entry.id), target, at); }
    catch (error) {
      if (lstatOrNull(target)) { replaceEntry(entry.dir, null); try { save(); } catch {} }
      throw error;
    }
  };
  for (const entry of steps.remove) {
    const target = nativePath(root, entry.dir);
    // Recheck just before moving it: an edit since the plan is never deleted.
    const state = ownedState(root, entry);
    check(state === 'current' || state === 'previous' || state === 'missing', EXIT.failed, `${target} was changed during the sync and was left untouched. Earlier changes in this run were kept and recorded.`);
    await hooks.beforeMoveOut?.(entry);
    if (state !== 'missing') moveOutOwned(root, target, scratch('old'), [entry.files, entry.previous_files], at);
    replaceEntry(entry.dir, null); save();
  }
  for (const {entry} of steps.add) {
    replaceEntry(entry.dir, entry); save();
    await hooks.beforePlace?.(entry);
    placeOwned(entry, nativePath(root, entry.dir));
  }
  // Updates record the new manifest plus what is on disk now, swap, then drop
  // the old manifest. Either manifest proves ownership in between.
  for (const {entry, owned, state} of steps.update) {
    const target = nativePath(root, entry.dir);
    const onDisk = state === 'current' ? owned.files : state === 'previous' ? owned.previous_files : null;
    replaceEntry(entry.dir, onDisk ? {...entry, previous_files: onDisk} : entry); save();
    if (onDisk) { await hooks.beforeMoveOut?.(entry); moveOutOwned(root, target, scratch('old'), [onDisk], at); }
    await hooks.betweenRenames?.(entry);
    placeOwned(entry, target);
    replaceEntry(entry.dir, entry); save();
  }
  record = {...record, publication_sha256: publication ?? record.publication_sha256, packages: [...record.packages].sort((a, b) => a.dir < b.dir ? -1 : 1)};
  save();
  // Remove the shared container once this run emptied it of owned skills.
  // rmdir refuses a non-empty folder, so anything else inside keeps it.
  const nested = dir => dir.startsWith(`${CONTAINER}/`);
  if (steps.remove.some(e => nested(e.dir)) && !record.packages.some(e => nested(e.dir))) {
    const container = nodePath.join(root, CONTAINER);
    try { at(container); fs.rmdirSync(container); syncDir(root); } catch {}
  }
  return record;
}

// Write phase shared by the full and removal-only paths: lock, re-plan from
// the current record, stage, apply.
async function underLock({root, insensitive, hooks, makeSteps, staging: stageNew, publication}) {
  fs.mkdirSync(root, {recursive: true});
  const at = anchor(root, insensitive);
  const owner = acquireLock(root);
  let staging = null;
  try {
    at(root);
    clearStaleStaging(root);
    const record = readRecord(root);
    const steps = makeSteps(record);
    check(!steps.problems.length, EXIT.ownership, `${steps.problems.join('\n')}\nNothing was changed. Move that folder elsewhere, then sync again.`);
    staging = nodePath.join(root, `.agentupskill-staging-${randomUUID()}`);
    fs.mkdirSync(staging);
    at(staging);
    const staged = new Map();
    let slot = 0;
    for (const step of [...steps.add, ...steps.update]) {
      const folder = nodePath.join(staging, `new-${slot++}`);
      stagePackage(folder, step.entry, stageNew(step.entry.id), at);
      staged.set(step.entry.id, folder);
    }
    await hooks.afterStaging?.();
    await applyChanges({root, at, staging, record, steps, staged, hooks, publication});
    return steps;
  } finally {
    if (staging) { try { fs.rmSync(staging, {recursive: true, force: true}); } catch {} }
    releaseLock(root, owner);
  }
}

const skillPath = (root, dir) => nativePath(nativePath(root, dir), 'SKILL.md');

/**
 * Make the skills folder match the selection. root is required: only main()
 * resolves the home folder. hooks are fault-injection points for tests;
 * caseInsensitive overrides the volume probe for tests.
 *
 * With release status "available", missing or changed skills are downloaded
 * and verified first. Otherwise (withdrawn, expired, unknown) nothing is
 * installed or updated, but owned skills that are no longer selected are
 * still removed. Removal-only runs use the local record alone: no network.
 */
export async function syncSkills({root, publication, selections, releaseStatus, layout = 'nested', fetcher = globalThis.fetch, hooks = {}, caseInsensitive}) {
  check(typeof root === 'string' && nodePath.isAbsolute(root), EXIT.usage, 'An absolute skills folder is required');
  check(Array.isArray(selections) && selections.length <= LIMITS.packages, EXIT.usage, 'Too many selections');
  under(EXIT.usage, () => { hash(publication); for (const s of selections) { id(s.id); version(s.version); } });
  check(LAYOUTS.includes(layout), EXIT.usage, 'Unknown layout');
  check(typeof releaseStatus === 'string' && releaseStatus.length > 0, EXIT.releaseRefused, 'The release status is required. Nothing was changed.');
  const allowed = installsAllowed(releaseStatus);
  const rootStat = plainRoot(root);
  const insensitive = caseInsensitive ?? volumeCaseInsensitive(root);

  // Refuse early, before any download, if what we own was changed.
  const early = rootStat ? readRecord(root) : emptyRecord();
  const earlyStates = rootStat ? ownedStates(root, early) : new Map();
  const earlyProblems = rootStat ? ownedProblems(root, early, earlyStates) : [];
  check(!earlyProblems.length, EXIT.ownership, `${earlyProblems.join('\n')}\nNothing was changed. Move that folder elsewhere, then sync again.`);
  const local = localSteps(root, early, selections, layout, earlyStates);
  const installs = [...local.add, ...local.update, ...local.missing];
  const result = (steps, blocked = []) => {
    const done = {
      root, layout, publication_sha256: publication, release_status: releaseStatus,
      removed: steps.remove.map(e => ({id: e.id, version: e.version})),
      added: steps.add.map(({entry}) => ({id: entry.id, version: entry.version, skill_md: skillPath(root, entry.dir)})),
      updated: steps.update.map(({entry, owned}) => ({id: entry.id, from: owned.version, version: entry.version, skill_md: skillPath(root, entry.dir)})),
      unchanged: steps.unchanged.map(({entry}) => ({id: entry.id, version: entry.version})),
      blocked
    };
    return {state: !allowed ? 'blocked' : done.added.length || done.updated.length || done.removed.length ? 'changed' : 'unchanged', ...done};
  };

  // Removal-only: the release allows no installs, or nothing needs one and
  // the publication is the one already recorded. No host is contacted.
  if (!allowed || (!installs.length && early.publication_sha256 === publication) || (!selections.length)) {
    const blocked = allowed ? [] : installs.map(s => ({id: s.id, version: s.version}));
    const removalSteps = record => {
      const states = ownedStates(root, record);
      const now = localSteps(root, record, selections, layout, states);
      return {remove: now.remove, add: [], update: [], unchanged: now.keep.map(entry => ({entry})), problems: ownedProblems(root, record, states)};
    };
    if (!local.remove.length) return result(removalSteps(early), blocked);
    const steps = await underLock({root, insensitive, hooks, makeSteps: removalSteps, staging: () => null, publication: null});
    return result(steps, blocked);
  }

  // Phase 1: download and verify everything in memory. No writes yet.
  check(typeof fetcher === 'function', EXIT.usage, 'No fetch available (Node 22 or newer is required)');
  const operation = deadline();
  let bytes, desired, needed;
  try {
    const chosen = await resolveRelease({publication, selections, fetcher, operation});
    desired = desiredEntries(chosen, layout);
    const changedVersions = immutableConflicts(early, desired);
    check(!changedVersions.length, EXIT.verification, immutableRefusal(changedVersions));
    const firstPlan = rootStat ? plan(root, early, desired, layout, insensitive) : {add: desired.map(entry => ({entry})), update: [], problems: []};
    check(!firstPlan.problems.length, EXIT.ownership, `${firstPlan.problems.join('\n')}\nNothing was changed. Move that folder elsewhere, then sync again.`);
    needed = new Set([...firstPlan.add, ...firstPlan.update].map(step => step.entry.id));
    bytes = await downloadPackages(chosen.filter(p => needed.has(p.id)), {publication, fetcher, operation});
  } finally { operation.done(); }

  // Phase 2: write, under the lock.
  const steps = await underLock({root, insensitive, hooks, publication, staging: id => bytes.get(id), makeSteps: record => {
    const changedVersions = immutableConflicts(record, desired);
    check(!changedVersions.length, EXIT.verification, immutableRefusal(changedVersions));
    const steps = plan(root, record, desired, layout, insensitive);
    if (!steps.problems.length) check([...steps.add, ...steps.update].every(step => needed.has(step.entry.id)), EXIT.ownership, 'The skills folder changed during the sync. Nothing was changed; run it again.');
    return steps;
  }});
  return result(steps);
}

/** Report installed vs selected. Purely local: no network, lock or writes. */
export function skillsStatus({root, publication, selections, layout = 'nested', releaseStatus = null, caseInsensitive}) {
  check(typeof root === 'string' && nodePath.isAbsolute(root), EXIT.usage, 'An absolute skills folder is required');
  under(EXIT.usage, () => { hash(publication); for (const s of selections) { id(s.id); version(s.version); } });
  check(LAYOUTS.includes(layout), EXIT.usage, 'Unknown layout');
  const allowed = releaseStatus === null || releaseStatus === undefined || installsAllowed(releaseStatus);
  const rootStat = plainRoot(root);
  const insensitive = caseInsensitive ?? volumeCaseInsensitive(root);
  const record = rootStat ? readRecord(root) : emptyRecord();
  const states = rootStat ? ownedStates(root, record) : new Map();
  const problems = rootStat ? ownedProblems(root, record, states) : [];
  const local = localSteps(root, record, selections, layout, states);
  if (rootStat && allowed) problems.push(...conflictsFor(root, record, [...local.add, ...local.update].map(s => s.dir), layout, insensitive));
  const pick = list => list.map(s => s.from === undefined ? {id: s.id, version: s.version} : {id: s.id, from: s.from, version: s.version});
  const toAdd = allowed ? pick(local.add) : [], toUpdate = allowed ? pick(local.update) : [], missing = allowed ? pick(local.missing) : [];
  const blocked = allowed ? [] : pick([...local.add, ...local.update, ...local.missing]);
  const toRemove = local.remove.map(e => ({id: e.id, version: e.version}));
  const publicationChanged = allowed && local.keep.length > 0 && record.publication_sha256 !== publication;
  const inSync = !toAdd.length && !toUpdate.length && !toRemove.length && !missing.length && !publicationChanged;
  return {
    state: problems.length ? 'refused' : inSync ? 'in-sync' : 'differs',
    root, layout, publication_sha256: publication, recorded_publication_sha256: record.publication_sha256, release_status: releaseStatus ?? null,
    publication_changed: publicationChanged, to_add: toAdd, to_update: toUpdate, to_remove: toRemove, missing, blocked, problems,
    installed: record.packages.map(e => ({id: e.id, version: e.version, skill_md: skillPath(root, e.dir)}))
  };
}

// ---------- CLI ----------

function formatSync(result) {
  const short = result.publication_sha256.slice(0, 12);
  if (result.state === 'blocked') {
    const lines = [`This skills release ${releaseLabel(result.release_status)}, so nothing was installed or updated. ${result.removed.length} deselected skill(s) removed from ${result.root}.`];
    for (const r of result.removed) lines.push(`Removed ${r.id} ${r.version}`);
    for (const b of result.blocked) lines.push(`Not installed: ${b.id} ${b.version}`);
    return lines.join('\n');
  }
  if (result.state === 'unchanged') return `Skills already up to date: ${result.unchanged.length} installed in ${result.root} (publication ${short}).`;
  const lines = [`Skills synced into ${result.root} (publication ${short}): ${result.added.length} added, ${result.updated.length} updated, ${result.removed.length} removed, ${result.unchanged.length} unchanged.`];
  for (const a of result.added) lines.push(`Added ${a.id} ${a.version}: ${a.skill_md}`);
  for (const u of result.updated) lines.push(u.from === u.version ? `Reinstalled ${u.id} ${u.version}: ${u.skill_md}` : `Updated ${u.id} ${u.from} -> ${u.version}: ${u.skill_md}`);
  for (const r of result.removed) lines.push(`Removed ${r.id} ${r.version}`);
  return lines.join('\n');
}

function formatStatus(result) {
  if (result.state === 'refused') return `Skills sync would be refused:\n${result.problems.join('\n')}`;
  if (result.state === 'in-sync') return `Skills are in sync: ${result.installed.length} installed in ${result.root}.` + (result.blocked.length ? ` The release ${releaseLabel(result.release_status)}; ${result.blocked.length} selected skill(s) can't be installed.` : '');
  const lines = [`Skills differ from your selection (folder ${result.root}):`];
  for (const a of result.to_add) lines.push(`To add: ${a.id} ${a.version}`);
  for (const u of result.to_update) lines.push(`To update: ${u.id} ${u.from} -> ${u.version}`);
  for (const r of result.to_remove) lines.push(`To remove: ${r.id} ${r.version}`);
  for (const m of result.missing) lines.push(`To reinstall: ${m.id} ${m.version}`);
  for (const b of result.blocked) lines.push(`Blocked (release ${releaseLabel(result.release_status)}): ${b.id} ${b.version}`);
  if (result.publication_changed) lines.push('The skills publication changed since the last sync.');
  return lines.join('\n');
}

export async function main(argv = process.argv.slice(2), {env = process.env, homedir = os.homedir(), fetcher = globalThis.fetch, stdout = process.stdout, stderr = process.stderr} = {}) {
  let json = argv.includes('--json');
  try {
    check(Number(process.versions.node.split('.')[0]) >= 22, EXIT.failed, 'Node 22 or newer is required');
    const options = parseArgs(argv);
    json = options.json;
    const root = skillsRoot({env, homedir});
    if (options.status) {
      const result = skillsStatus({root, publication: options.publication, selections: options.selections, layout: options.layout, releaseStatus: options.releaseStatus});
      const code = result.state === 'refused' ? EXIT.ownership : result.state === 'in-sync' ? EXIT.ok : EXIT.statusDiffers;
      stdout.write((json ? JSON.stringify({...result, exit_code: code}) : formatStatus(result)) + '\n');
      return code;
    }
    const result = await syncSkills({root, publication: options.publication, selections: options.selections, releaseStatus: options.releaseStatus, layout: options.layout, fetcher});
    const code = result.state === 'blocked' ? EXIT.releaseRefused : EXIT.ok;
    stdout.write((json ? JSON.stringify({...result, exit_code: code}) : formatSync(result)) + '\n');
    return code;
  } catch (error) {
    const code = error instanceof SyncError ? error.code : EXIT.failed;
    const message = error instanceof SyncError ? error.message : `Skills sync stopped: ${error?.message ?? error}`;
    if (json) stdout.write(JSON.stringify({state: 'error', exit_code: code, message}) + '\n');
    else stderr.write(message + '\n');
    return code;
  }
}

const invoked = (() => { try { return fs.realpathSync(process.argv[1] ?? '') === fs.realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })();
if (invoked) process.exitCode = await main();
