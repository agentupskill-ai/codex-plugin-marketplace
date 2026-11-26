# Sync: recovery and history

## Connection and packet recovery

Follow only the branch for the failed step. Keep the draft, exact inputs, error and selectors.
Re-authenticate only for expired sign-in or insufficient required access. For missing tools, rediscover the bundled connector or reload this chat.
A missing tool alone cannot establish a missing grant. Do not reinstall, reset access or re-login merely to expose tools.
Confirm the latest complete approved scope set from the user or their approval record,
including any reductions. A prior combined setup used memory:identity,memory:read,memory:write,skills:identity,skills:read,skills:write. Do not infer
consent from discovery, credentials or an older grant. Never inspect token stores.
Use only explicit scopes. Never restore withdrawn scopes or use unscoped login. Show the proposed scope union before login. For confirmed first-time Memory-only
access, use exactly the required Memory scopes. Stop on broader browser consent.
- not_initialized: memory setup is not finished. Ask the user to finish setup on
  their Agent Upskill setup page or sign in to Codex again, then retry once. If it
  persists, do not retry repeatedly, reinstall or reset anything. Tell the user:
  "Message the person who invited you to Agent Upskill."
- source_preparing: keep the draft. Wait the full retryAfterSeconds from receipt.
  Repeat only the read or ACK that was preparing, with that call's own selectors.
  Retry a Save only if it explicitly returned unstaged, using the same operationId
  and byte-identical payload. After three preparing attempts, stop and retain the draft
  and original selector. Report the pending step and suggest resuming it later.
- rate_limited: the call did not run. Wait retryAfterSeconds and repeat the same
  call once (same operationId for a save). If still rate_limited, stop and ask
  the user to try again in a few minutes.
- capacity with reason: "delivery_quota", from any call including a Sync made
  while saving: never escalate this one. Finish reading each pending packet and
  acknowledge it with the projectId and deliveryId from that packet's own Sync
  response, then fetch one selection at a time. If none can be acknowledged,
  wait for a pending packet to expire.
- capacity without reason: "delivery_quota", including from save itself: a limit
  the user cannot fix. Keep the draft and operationId; do not retry repeatedly.
  Tell the user: "Message the person who invited you to Agent Upskill."
Whenever a response gives action: contact_operator or says to contact the
operator, tell the user "Message the person who invited you to Agent Upskill." instead of naming an operator,
after following its other guidance: when it says to call save_receipt, do so with
the same selector. Keep any returned selector or operationId; never prepare a
replacement.

For stale_delivery on ACK or replay: The packet is stale. Keep your draft and stop queued work at the old commit. Refresh session_context and discovery, then pin a new Sync delivery at the new source commit. Account for every returned document. Reuse a complete, previously read body only after verifying its hash. Read changed, missing or clipped bodies in full. ACK with complete:true using the original conversationId and the projectId and deliveryId from this fresh packet. Reconcile affected briefing and compilation dependencies before continuing.

## History and full refresh

Read this section for a cited historical revision, an explicit history request, or before
using fresh: true. Everything in SKILL.md still applies.

For a cited historical revision, inspect support for sync.historical and pass
historical: [{path,revisionId,contentHash}] with that pinned sourceCommit. Verify
the complete returned document matches the exact revision and hash. When explicit
history discovery is needed and memory_history is advertised, pass conversationId,
sourceCommit and the needed query/sort/familyPath; continue with its returned cursor
and unchanged selectors. Never construct a cursor or reuse browser authority tokens.
Map a history row's checkpointId to historical.revisionId and sourceHash to
historical.contentHash; preserve its exact path. Do not send paths together with
historical in the same sync request.
History beyond one page remains explicit continuation, not all history loaded.
If historical support or a citation is unavailable, report that exact evidence
unavailable; do not silently substitute current content. Refresh discovery and
select again after source changes or stale_delivery, preserving the requested
historical identity. Current policy still controls retained historical evidence.
Use fresh: true only when acknowledged bodies were lost through compaction or
the user requests a full refresh. Normal Sync tracks complete received content
per account, application and conversation; earlier checkpoint versions remain history.
