# Save: structured items, living documents and orientation

Read this before preparing any structured field for Save. It adds to the Save
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
missing or cannot be verified, retain the same operationId and use save_read;
report the unverified effects without claiming they saved or dispatching a replacement.
One verified published operation proves the note and the structured effects it accounts for.
