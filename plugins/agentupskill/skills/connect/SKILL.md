---
name: connect
description: Verify a Codex connection to Agent Upskill using the setup code supplied by the user.
---

Use the user's current setup code to call verify_client_connection on the
agentupskill-connect MCP server. Send the code as the code argument exactly once.
Report connection success only when the tool returns connected: true. If the
tool fails or is unavailable, report the result and direct the user back to their
Agent Upskill setup page to check the connection or restart an expired attempt.
Do not substitute an identity call, simulate success, alter account permissions,
or save/import memory as part of this connection check.
