# Agent Upskill connection plugin

A Codex marketplace bundling the Agent Upskill MCP connector and connection skill.
Version: 0.3.0. Marketplace: agentupskill-setup. Plugin: agentupskill.

Start from your signed-in Agent Upskill setup page and choose **Set up in Codex**.
Send the prepared request, review installation and complete browser sign-in.
Keep using that same chat: it verifies connectivity automatically.
No ZIP download, customer Terminal commands or additional setup chats are required.

The connector uses Streamable HTTP at https://app.agentupskill.ai/mcp.
Authentication is ON_USE; the prepared request explicitly requests only
memory:identity before calling a tool. Stop if consent requests broader access.
Do not create a separate host MCP entry. Installing the plugin grants no service
access and includes no account data, repository access, credentials or hooks.
Verification succeeds only after an authenticated verify_client_connection call
returns connected: true for the current account and setup attempt.

## Publishing

Publish only these six generated files in a dedicated customer-readable Git repository.
Record the reviewed commit and verify anonymous Git access before enabling the
setup link. Do not copy the infrastructure repository or customer configuration.
