# Agent Upskill connection plugin

A Codex marketplace bundling the Agent Upskill MCP connector and setup, connect, delivery, save and sync skills.
Version: 0.8.4. Marketplace: agentupskill-setup. Plugin: up.
Commands: up:setup, up:connect, up:delivery, up:save and up:sync.

Start from your signed-in Agent Upskill setup page and choose **Set up in Codex**.
Send the prepared request, review installation and complete browser sign-in.
Keep using that same chat: it verifies connectivity automatically.
No ZIP download, customer Terminal commands or additional setup chats are required.

The connector uses Streamable HTTP at https://app.agentupskill.ai/mcp.
Authentication is ON_USE. Initial Individual setup requests Memory identity/read/write and Skills identity/read/write in one browser consent. Narrower grants remain supported.
Saving uses the current Memory read/write grant; missing access requires explicit browser consent.
Syncing needs memory:identity and memory:read. Let the user choose their account and approve access.
Explicit saves publish cumulative notes immediately and retain earlier revisions.
Do not create a separate host MCP entry. Installing the plugin grants no service
access and includes no account data, repository access, credentials or hooks.
Verification succeeds only after an authenticated verify_client_connection call
returns connected: true for the current account and setup attempt.

## Single-command installation

With Node 22.17+ and Codex installed, run the reviewed archive command shown by your setup chat:

npx --yes --ignore-scripts --package=https://github.com/agentupskill-ai/codex-plugin-marketplace/archive/<reviewed-commit>.tar.gz agentupskill-install --ref <reviewed-commit>

Replace both placeholders with the exact reviewed commit from the setup page. The command uses native Codex marketplace registration and plugin installation. It preserves completed steps and stops on conflicts or disabled installations. Enabled 0.6.0/0.7.0/0.8.0/0.8.1/0.8.2/0.8.3 customers can explicitly approve a reviewed native update with --upgrade-from <verified-predecessor-commit>. It does not log in, edit MCP settings, repair credentials or save memory. Continue in your setup chat for browser consent and verification. After connection, the optional delivery skill stages the independently pinned signed background component in private durable storage. It requires separate browser consent and exact per-computer enrollment approval. Installation alone never enrolls a computer.

## Publishing

Publish only the allowlisted generated files in a dedicated customer-readable Git repository.
Record the reviewed commit and verify anonymous Git access before enabling the
setup link. Do not copy the infrastructure repository or customer configuration.
