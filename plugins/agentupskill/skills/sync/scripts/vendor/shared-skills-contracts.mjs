// Vendored verbatim subset of agentupskill-ai/shared-skills lib/contracts.mjs
// at commit 96e374b12985a7fd4eade221202a47099a97c138 (git blob
// 04db513129edb10bc2f6567bbcfba9519027aa34; the same blob as 5f6fd0f, which
// mcp-server's vendored @agentupskill/shared-skills 0.6.0 is built from).
// Only lines are removed, never changed: tests/client-skills-sync.test.mjs
// checks each export below against the pinned package. Imports node:crypto only.
import { createHash } from 'node:crypto';
export const LIMITS = Object.freeze({ files: 128, fileBytes: 2097152, packageBytes: 4194304, buildBytes: 8388608, catalogPackages: 512, packages: 15, jsonBytes: 1048576, provenanceBytes: 262144 });
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const digest = value => sha256(canonical(value));
export function requireThat(condition, message) { if (!condition) throw new Error(message); }
export const hash = value => requireThat(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), 'Invalid SHA-256');
export const id = value => requireThat(typeof value === 'string' && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value) && value.length <= 60, 'Invalid stable identifier');
export const version = value => requireThat(typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value) && value.length < 32, 'Unsupported package version');
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function shape(value, required, optional = []) {
  requireThat(value && typeof value === 'object' && !Array.isArray(value), 'Expected an object');
  requireThat(required.every(k => Object.hasOwn(value, k)) && Object.keys(value).every(k => required.includes(k) || optional.includes(k)), 'Missing or unknown contract field');
}
export function list(value, maximum = LIMITS.files) { requireThat(Array.isArray(value) && value.length <= maximum, 'Invalid or oversized list'); }
export function safePath(value) {
  requireThat(typeof value === 'string' && value.length <= 200 && value.length > 0, 'Invalid path');
  for (const part of value.split('/')) {
    requireThat((part === '.agents' || /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(part)) && !part.endsWith('.') && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part), 'Unsafe or nonportable path');
  }
  return value;
}
export function uniquePaths(paths) {
  const spelling = new Map(), files = new Set();
  for (const name of paths) {
    safePath(name); requireThat(!files.has(name), 'Duplicate file path'); files.add(name);
    const parts = name.split('/');
    for (let i = 1; i <= parts.length; i++) {
      const prefix = parts.slice(0, i).join('/'), key = prefix.toLowerCase();
      requireThat(!spelling.has(key) || spelling.get(key) === prefix, 'Case collision'); spelling.set(key, prefix);
    }
  }
  for (const name of paths) {
    const parts = name.split('/');
    for (let i = 1; i < parts.length; i++) requireThat(!files.has(parts.slice(0, i).join('/')), 'File/directory collision');
  }
}
export function fileManifest(files) {
  list(files); uniquePaths(files.map(f => f.path));
  for (const f of files) {
    shape(f, ['path', 'sha256', 'bytes']); hash(f.sha256);
    requireThat(Number.isSafeInteger(f.bytes) && f.bytes >= 0 && f.bytes <= LIMITS.fileBytes, 'File size limit');
  }
  requireThat(files.reduce((s, f) => s + f.bytes, 0) <= LIMITS.packageBytes, 'Package size limit');
}
export function packageDigest(pkg) { const { package_sha256, ...rest } = pkg; return digest(rest); }
