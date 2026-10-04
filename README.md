# Agent Upskill connection plugin

A skills-only Codex marketplace containing the Agent Upskill connection check.
Version: 0.2.0. Marketplace: agentupskill-setup. Plugin: agentupskill.

Start from your signed-in Agent Upskill setup page and choose **Set up in Codex**.
Send the prepared request, review the installation, and approve it in Codex.
Return to the setup page after installation; it guides sign-in and verification.
No ZIP download or customer Terminal commands are required.

The plugin contains no MCP registration, account data, repository access, or
credentials. Installing it does not enroll an account or grant service access.
The setup page configures agentupskill-connect separately with memory:identity.
Verification succeeds only after an authenticated verify_client_connection call
returns connected: true for the current account and setup attempt.

## Publishing

Publish only these generated files in a dedicated customer-readable Git repository.
Record the reviewed commit and verify anonymous Git access before enabling the
setup link. Do not copy the infrastructure repository or customer configuration.
