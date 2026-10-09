---
name: connect
description: Verify a Codex connection to Agent Upskill using the setup code supplied by the user.
---

For installation or interrupted setup, first read [the setup procedure](references/setup.md).
Preserve completed installation and sign-in. If Codex needs a reload to expose
tools, return to this same chat afterward. For an expired code, get a fresh one
from the setup page and replace the earlier code; do not reinstall or reset access.

Before calling a tool, discover the actual registered name of the bundled
connector agentupskill-bundled-connect. Confirm no host or project MCP entry
shadows that name. Do not assume Codex adds a plugin prefix. Sign in with
codex mcp login <the registered name> --scopes memory:identity. Never
request unscoped authentication; stop if consent requests broader access.
Let the user choose their account and approve browser consent.

Use the user's current setup code to call verify_client_connection on the
agentupskill-bundled-connect MCP server bundled with this plugin. Use its actual
registered name. A disabled host entry can override a same-name plugin server;
stop if a host or project entry uses this bundled name. Preserve older differently
named connectors and credentials.
After identity-only sign-in, send the code as the code argument with
wait_for_listener: true. Retry waiting_for_listener at most five more times.
After six waiting responses, ask the user to return to their setup page and retry
recording setup, then retry in this same chat. Waiting does not consume the code.
Stop on an error. Do not open another chat.
Report connection success only when the tool returns connected: true. If the
tool fails or is unavailable, report the result and direct the user back to their
Agent Upskill setup page to check the connection or restart an expired attempt.
Do not substitute an identity call, simulate success, alter account permissions,
or save/import memory as part of this connection check.
