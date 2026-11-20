# Sync: history and full refresh

Read this for a cited historical revision, an explicit history request, or before
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
