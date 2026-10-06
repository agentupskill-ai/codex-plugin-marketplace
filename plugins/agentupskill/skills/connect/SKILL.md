---
name: connect
description: Verify a Codex connection to Agent Upskill using the setup code supplied by the user.
---

Before calling a tool, discover the bundled connector's plugin-qualified name
and sign in with codex mcp login <that name> --scopes memory:identity. Never
request unscoped authentication; stop if consent requests broader access.
Let the user choose their account and approve browser consent.

Use the user's current setup code to call verify_client_connection on the
agentupskill-connect MCP server bundled with this plugin. Use the plugin-qualified
server name exposed by Codex, rather than a separately configured host server.
After identity-only sign-in, send the code as the code argument with
wait_for_listener: true. If it returns waiting_for_listener, the setup launch has
not been recorded yet. Ask the user to return to their setup page and retry
recording setup, then retry in this same chat. Do not open another chat.
Report connection success only when the tool returns connected: true. If the
tool fails or is unavailable, report the result and direct the user back to their
Agent Upskill setup page to check the connection or restart an expired attempt.
Do not substitute an identity call, simulate success, alter account permissions,
or save/import memory as part of this connection check.
