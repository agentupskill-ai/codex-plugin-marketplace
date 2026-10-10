# Codex setup procedure

Use the source, reviewed commit, version, account identifier and current code in
the user's prepared request. Retrieve files from that exact commit read-only
before changing installation or configuration: the marketplace, plugin manifest,
MCP manifest, this skill and reference, package.json and install.mjs. Stop if
retrieval fails. Never register a marketplace just to inspect it. Verify the
marketplace is agentupskill-setup, plugin up v0.7.0,
and one HTTP connector agentupskill-bundled-connect at
https://app.agentupskill.ai/mcp, authentication ON_USE.
There must be no plugin hooks, credential fields or account data. The standalone
installer is the only executable; its npm package has no dependencies or lifecycle
scripts. Read it before running it. Inspect supported Codex commands and existing
configuration without exposing credentials. Stop on conflicting source, commit,
version or connection. Preserve other marketplaces, plugins and credentials.

Before any install or login, present one combined approval: the exact source,
commit and version; registration/install only if needed; combined Individual sign-in
with Memory identity/read/write and Skills identity/read/write at the bundled endpoint; the account the user will select in
the browser; and verification with their current code in this same chat. End:
Reply "approve" to continue. This covers those setup actions, not changed scope,
Codex execution permissions or browser consent. Do not ask the user to compose a
technical approval or repeat it at each ordinary stage.

After approval, run the reviewed archive with Node/npm using:
npx --yes --ignore-scripts --package=<source>/archive/<reviewed commit>.tar.gz agentupskill-install --ref <reviewed commit>
Replace the placeholders only with the reviewed source and commit. The wrapper
checks metadata and preserves completed steps using native Codex commands.
If Node/npm is unavailable, use the same native commands directly after the same
checks: codex plugin marketplace add <source> --ref <reviewed commit>, then
codex plugin add up@agentupskill-setup. Do not make the customer run
Terminal commands or download a ZIP. An existing agentupskill@agentupskill-setup installation needs a reviewed native
rename migration before installing up@agentupskill-setup. Stop instead of adding a
second copy of its connector. Preserve the installed plugin and credentials.
A different installed version needs reviewed native update controls, not removal,
reinstallation or credential resets.

Discover the actual registered name of the plugin's bundled connector; do not
require or invent a plugin prefix. Check that no host or project MCP entry shadows
that name, even if disabled. Preserve older differently named standalone entries.
Do not create a host/project entry, duplicate a connection, edit global config or
silently migrate a collision. Explain the exact conflict and stop.

Use codex mcp login <the registered name> --scopes memory:identity,memory:read,memory:write,skills:identity,skills:read,skills:write before a
bundled tool call when sign-in or the full setup grant is missing. Existing narrower
grants require fresh browser consent; token refresh never expands access. Preserve an
existing full setup grant. Never use unscoped automatic login.
Stop if browser consent requests Memory lifecycle, permission management or access
beyond the six named scopes. Let the user select the setup-page email and Individual, and approve
consent themselves. Do not collect credentials or approve on their behalf.
Return to the connect skill for actual verification. Installation, a launch click
and authentication alone never prove connection. Do not save/import memory.

On a failed step, report the actual failure and stop; retain completed steps.
If a supported Codex reload is required to expose tools, return to the same chat
and retry discovery, not installation. If the code expires, use Get a fresh code
on the setup page and send its continuation message in this chat. Old codes are
invalidated. No replacement chat or reset of account, sign-in or repository is
needed. If recovery remains unavailable, report that limitation honestly.
