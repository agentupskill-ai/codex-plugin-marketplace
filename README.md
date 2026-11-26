# Agent Upskill for Codex

Use the setup page in your Agent Upskill account to add up@agentupskill-setup
from the official marketplace. Approve access and choose your account in the browser.
If sign-in is needed, have Codex discover the installed connector's registered
name and verify its endpoint is https://app.agentupskill.ai/mcp. Stop on a
conflicting host or project entry, even if disabled. For a new combined setup,
after approval, use codex mcp login <registered name> --scopes memory:identity,memory:read,memory:write,skills:identity,skills:read,skills:write.
Choose your own account and review the browser consent. Stop if it requests
broader access. An existing grant's approved scopes must be preserved.

After connecting, use Sync for your saved context and selected skills, and Save
to keep a note for a future chat. Skills are read when needed.
