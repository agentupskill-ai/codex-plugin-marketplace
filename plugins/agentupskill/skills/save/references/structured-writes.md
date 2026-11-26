# Save: recovery and structured writes

## Connection and checkpoint recovery

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

For stale_delivery on Save: The source or access changed during Save. Publication is uncertain. Keep the original conversation ID, operation ID and exact payload. Call the original save_receipt first. If access needs reconciliation or the receipt is unresolved, keep the operation pending. Once published, verify its original content with save_read before reporting it.

## Structured items, living documents and orientation

Read this section before preparing any structured field for Save. It adds to the Save
steps; everything in SKILL.md still applies.

Before preparing structured writes, inspect the actually discovered save tool's
input schema. It must advertise structured; plugin version, a merge or absent
session_context descriptors do not prove support. If the schema omits structured
or you cannot inspect it, omit that field, preserve useful proposed items/document
changes in the complete cumulative note, and report that only the note was saved:
item/document persistence was unavailable. Do not deploy or change connectors to
enable it. The remaining structured instructions apply only when supported.

Use optional structured items for reusable facts alongside that readable note.
Keep all ten meanings available: Decision, Observation, Learning, Preference / Constraint,
Procedure, Open item, Reference, Assumption, Feedback and Goal. Split useful mixed
clauses without losing secondary observations or constraints; retain their common
parent source and never invent finer source coordinates. Leave uncertain category
or unknown metadata absent. Do not bulk-convert old notes or force every sentence
into an item. Category is separate from acceptance, evidence and lifecycle.
Proposals are not chosen decisions, synthetic UPDATE/ROLLBACK markers are not
execution, design contracts are not measurements, and merge is not deployment.
Preserve actor, evidence strength, effective chronology and attribution; old text
does not override later scoped authority. A requirement needs explicit attributable
authority. authority.verification: checked means you checked the cited direct
authority; it is your assertion, not service authentication or permission to act.
Use reported for a saved approval claim whose underlying authority was not checked.
Scope is not a permission grant. Expiry and review dates have different meanings.

On a supporting host, session_context returns compact current structured identity/path/revision/hash metadata,
not their bodies. Fetch needed full catalog/documents using sync with selected paths,
that sourceCommit and an adequate budget; read every complete document before sync_ack.
Use fresh only if an already acknowledged body is unavailable in your current context;
fresh deliberately resets this conversation's receipt baseline. Never upsert from
metadata alone. Index review notices are capped with reviewCount/reviewTruncated;
inspect full linked records before applying changes.
Reuse existing item IDs for corrections across conversations, retaining relevant
provenance, rationale and relationships in the complete replacement value. New
items omit id; the platform returns opaque IDs in savedArtifacts. An item upsert
requires the current catalog expectedHash, or null only before the first catalog.
Omitting items preserves the catalog. dependsOn, supersedes and conflictsWith
reference existing item IDs and exact revisions plus a source; do not infer links
from similar wording. A changed or withdrawn premise flags review without reversing
an accepted decision. Use returned IDs for references in a later save when needed.

Living documents have separate IDs, sections and version histories. Only create or
patch a document within the user's existing direction. Propose uncertain changes
in the note without applying them. A create needs checked authority and section
ownership: authored, generated or external. A patch names the existing document ID,
exact expectedHash and only the named section IDs with their full replacement bodies.
Preserve unrelated sections and authored priorities/narrative. Authored edits require
checked authority; generated sections refresh only with checked authority or their
recorded explicit-save policy. External sections require fresh source references
and retain the external system's status authority. Never infer shipped or accepted
from a merge or an agent report. itemIds link sections to current existing items.
Retain linked item IDs/sources when still relevant; a supplied list replaces that list.

Before writing orientation metadata, inspect the actual nested create/update schema
for purpose, reviewedAt, nullable clearing and metadata-only sections support.
On an older host preserve the proposed orientation in the note and report it as
unpersisted. Never silently strip unsupported metadata or infer support from version.
Assign, clear or transfer purpose only under explicit operator direction, using
revisionOrigin: operator-directed and checked attributable authority. Omission
preserves purpose; update purpose: null clears it and its review date. Use one
atomic save to clear the old designation and assign another with current hashes.
If existing designations are ambiguous, retain access, show the candidates and
repair only within operator direction; never choose a winner by title or ID.
A reviewedAt declaration reports an actual review of the complete resulting
document, with checked authority and its supporting source, not operator acceptance.
Use metadata-only sections: [] to renew a review or change purpose when supported.
Future dates are invalid; retain the proposed handoff for correction, never silently
clamp/drop the declaration. Changed content, sources, links, state, purpose or
attribution invalidates current review unless renewed. Generated refreshes may
legitimately leave the current version not reviewed; prior evidence stays in history.
A byte-identical patch preserves review. Clearing and declaring review together is
invalid. Preserve authored priorities and never migrate the legacy brief silently.

After dispatch, verify structured effects before reporting them.
For structured writes, require the returned artifacts and their complete texts to
account for every requested item upsert and document create/patch, including the
requested values and returned IDs/revisions. Verify each savedArtifacts text against
its contentHash and show the affected items/documents with immutable source links.
A note-only receipt does not prove requested structured effects. If effects are
missing or cannot be verified, recover the original save_receipt first.
For missing exact content, retain the same operationId and use save_read.
Report unverified effects without claiming they saved or dispatching a replacement.
One verified published operation proves the note and the structured effects it accounts for.
