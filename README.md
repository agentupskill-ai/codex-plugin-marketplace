# Agent Upskill connection plugin

A Codex marketplace bundling the Agent Upskill MCP connector and setup, connect, delivery, save and sync skills.
Version: 0.8.19. Marketplace: agentupskill-setup. Plugin: up.
Commands: up:setup, up:connect, up:delivery, up:save and up:sync.

Start from your signed-in Agent Upskill setup page and choose **Set up in Codex**.
Send the prepared request, review installation and complete browser sign-in.
Keep using that same chat: it verifies connectivity automatically.
No ZIP download, customer Terminal commands or additional setup chats are required.

The connector uses Streamable HTTP at https://app.agentupskill.ai/mcp.
Authentication is ON_USE. Initial Individual setup requests Memory identity/read/write and Skills identity/read/write in one browser consent. Narrower grants remain supported.
Saving uses the current Memory read/write grant; missing access requires explicit browser consent.
Syncing needs memory:identity and memory:read. Missing tools alone do not justify re-login. During actual authorization recovery, preserve all previously approved Memory and Skills scopes and require browser consent. Let the user choose their account and approve access.
Explicit saves publish cumulative notes immediately and retain earlier revisions.
Do not create a separate host MCP entry. Installing the plugin grants no service
access and includes no account data, repository access, credentials or hooks.
Verification succeeds only after an authenticated verify_client_connection call
returns connected: true for the current account and setup attempt.

## Single-command installation

On macOS with Node 22.17+ and Codex installed, run the reviewed archive command shown by your setup chat:

npx --yes --ignore-scripts --package=https://github.com/agentupskill-ai/codex-plugin-marketplace/archive/<reviewed-commit>.tar.gz agentupskill-install --ref <reviewed-commit>

Replace both placeholders with the exact reviewed commit from the setup page. Use the reviewed guarded installer for upgrades, repairs and all interrupted or re-registration retries, never direct native commands, including when Node/npm is unavailable. Manual native setup is allowed only for verified fresh setup with no prior marketplace registration, plugin installation or retained local delivery state. If that eligibility or installer support is unverified, preserve the exact public ref, authentication and permissions and ask the setup operator for reviewed support. The command uses native Codex marketplace registration and plugin installation. It preserves completed steps and stops on conflicts or disabled installations. Retries can restore an absent marketplace only at the explicitly reviewed target; partial or changed checkouts remain holds. Exact installed-cache bytes are checked against the reviewed checkout. Enabled 0.6.0/0.7.0/0.8.0/0.8.1/0.8.2/0.8.3/0.8.4/0.8.5/0.8.6/0.8.7/0.8.8/0.8.9/0.8.10/0.8.11/0.8.12/0.8.13/0.8.14/0.8.15/0.8.16/0.8.18 customers can explicitly approve a reviewed native update with --upgrade-from <verified-predecessor-commit>. It does not log in, edit MCP settings, repair credentials or save memory. Continue in your setup chat for browser consent and verification. After connection, the optional delivery skill stages the independently pinned signed background component in private durable storage. Choose the Codex open-app mode to reuse its existing sign-in, or explicitly choose a separate helper session. That separate session also requires Skills browser consent. Both require exact per-computer enrollment approval. Installation alone never enrolls a computer. Before upgrading an enrolled previous helper pin, disclose that account delivery and rollback need explicit renewal with a new preview and consent. With 0.8.19, the retained 8aa1 helper also holds automation-native-home-recovery-retire-preview and automation-native-home-recovery-retire because its payload differs from the current signed helper; other supported local controls remain available. The installer holds affected native mutations until the user specifically accepts losing those two commands; only then append --acknowledge-retained-helper-retirement-hold, including on interrupted retries. This flag does not approve renewal or override unknown/differing references. Current-helper and unreferenced computers need no extra acknowledgment. An already registered 0.8.19 recopy repair with a retained 8aa1 reference also requires the flag if it mutates native state; a verified matching no-op remains flag-free. If review holds after removing the predecessor marketplace, preserve the remaining cached bytes, references and credentials and use operator-supported reconciliation before retrying this exact installer; do not rely on a hidden delivery skill or direct native commands. If archive retirement is needed first, use the delivery skill for its exact preview and confirmation on a verified 0.8.16 or 0.8.18 installation. Otherwise ask the setup operator to review compatible existing controls. Signed helper expiry remains a renewal deadline, not permission to bypass trust or rollback checks.

## Publishing

Publish only the allowlisted generated files in a dedicated customer-readable Git repository.
Record the reviewed commit and verify anonymous Git access before enabling the
setup link. Do not copy the infrastructure repository or customer configuration.
