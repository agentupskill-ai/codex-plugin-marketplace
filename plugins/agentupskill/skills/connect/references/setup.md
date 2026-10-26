# Codex setup procedure

Use the source, reviewed commit, version, account identifier and current code in
the user's prepared request. Retrieve files from that exact commit read-only
before changing installation or configuration: the marketplace, plugin manifest,
MCP manifest, setup/connect/delivery skills and references, package.json, install.mjs,
and the delivery script with its pinned release inventory. Stop if
retrieval fails. Never register a marketplace just to inspect it. Verify the
marketplace is agentupskill-setup, plugin up v0.8.6,
and one HTTP connector agentupskill-bundled-connect at
https://app.agentupskill.ai/mcp, authentication ON_USE.
There must be no plugin hooks, credential fields or account data. The installer and optional delivery bootstrap are the only executables; the npm
package has no dependencies or lifecycle scripts. Read each before running it. Inspect supported Codex commands and existing
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
checks metadata and preserves completed steps using native Codex commands. Before any native mutation,
the installer reads this home's enrollment and retained helper reference as data.
If either identifies a helper outside the current and one previous accepted pins,
it holds the upgrade. Keep the installed plugin for local status/pause and exact
removal, migration recovery and helper-reference retirement before retrying.
If the installed plugin has no delivery skill, or no plugin is installed, stop
and ask the setup operator to review the original standalone helper's verified
local controls or the published up 0.8.1 recovery route. That intermediate release
is https://github.com/agentupskill-ai/codex-plugin-marketplace at exact commit
efca0730ecdc648c3e8000cb1040f6441aac9547 and retains the original 0.8.0 helper pin.
Review its full published package and obtain its exact setup approval before any
intermediate native installation; then use its exact removal/retirement flow.
Never run a helper merely because a local record names its path.
Do not delete delivery state or credentials to clear this hold.
If Node/npm is unavailable, use the same native commands directly after the same
checks: codex plugin marketplace add <source> --ref <reviewed commit>, then
codex plugin add up@agentupskill-setup. Do not make the customer run
Terminal commands or download a ZIP. An existing agentupskill@agentupskill-setup installation needs a reviewed native
rename migration before installing up@agentupskill-setup. Stop instead of adding a
second copy of its connector. Preserve the installed plugin and credentials.
For an enabled up 0.6.0, 0.7.0, 0.8.0, 0.8.1, 0.8.2, 0.8.3, 0.8.4 or 0.8.5 installation, inspect its exact predecessor commit
and metadata too. Explicitly include the native pinned-marketplace retarget and
plugin update in the approval. Use the reviewed installer with --upgrade-from
<verified predecessor commit>. It uses only scoped native marketplace controls
and plugin add, with readback; it never uninstalls the plugin or resets credentials.
Unknown versions, disabled entries, legacy names and conflicting sources remain
holds. On retry preserve the completed marketplace update and inspect installed
state before repeating anything.

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
Return to the connect skill for actual verification, then offer optional delivery
using the packaged delivery skill in this same chat. Installation, a launch click
and authentication alone never prove connection. Do not save/import memory.

On a failed step, report the actual failure and stop; retain completed steps.
If a supported Codex reload is required to expose tools, return to the same chat
and retry discovery, not installation. If the code expires, use Get a fresh code
on the setup page and send its continuation message in this chat. Old codes are
invalidated. No replacement chat or reset of account, sign-in or repository is
needed. If recovery remains unavailable, report that limitation honestly.
