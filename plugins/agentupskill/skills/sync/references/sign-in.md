# Sign-in and scope recovery for Save and Sync

Read this when the Save or Sync skill sends you here: an authorization error, or
the requested operation needs a Memory scope not yet approved.

Use the agentupskill-bundled-connect MCP connector bundled with this plugin.
Discover its actual registered name; stop if a host or project entry shadows it.
Preserve other connectors and credentials. Missing tools are not proof of missing
authorization. First retry discovery or the supported Codex reload in this same
chat; do not reinstall, reset access or re-login merely to expose tools.
If an authorization error confirms missing or expired sign-in or insufficient
required Memory access, recover with explicit browser consent. Also enter this
path when the latest approval record or the user confirms that the requested
operation needs a Memory scope not yet approved, even after successful discovery
with no authorization error. A valid read-only grant still needs Memory write
consent for Save; a valid Skills-only grant needs the requested Memory scopes.
Missing tools alone establish neither condition.
Establish the complete previously approved scope set from the prior setup/chat
approval record or the user's explicit confirmation of that complete set. Use
the latest approval, including later reductions; never restore withdrawn scopes
from an older record. A current combined Individual setup approval means these
six scopes:
memory:identity,memory:read,memory:write,skills:identity,skills:read,skills:write.
That approval record is the source for preserving consent; it is not evidence
that a current token is valid. Never open Keychain items, OAuth credential files
or token stores to discover scopes. A tool listing does not establish them.
If the prior set is unknown, ask the user to confirm it and keep recovery held
until established; do not guess or silently narrow access.

The Memory scopes each operation needs:
- Save: memory:identity,memory:read,memory:write
- Sync: memory:identity,memory:read

For an existing grant, preserve every already approved Memory and Skills scope
and include the scopes needed for the requested operation; never replace a broader
grant with a narrower one. For example, prior Memory read-only plus an explicit
Save request needs Memory identity/read/write; prior combined setup retains all
six scopes even for Sync. Show the complete proposed scope union before re-login.
Only for a confirmed first-time Memory-only connection, use codex mcp login
<registered name> --scopes with exactly that operation's scopes above.
For an existing connection, pass its verified approved scope union explicitly
to --scopes. Never use unscoped login. Do not add new Skills, permission-management
or Memory lifecycle access as part of Save or Sync. Let the user choose their account
and approve the actual browser consent; a tool listing or token refresh grants
no additional access. Do not collect credentials or approve on their behalf.
Discover the tools again after login; if they remain unavailable, report that
result. Installing the plugin alone grants no access.
