# Save: knowledge compilation

Read all of this before calling save whenever the Save skill's capability checks
pass. It adds to the Save steps; the note, privacy, operationId, receipt and
reporting rules in SKILL.md still apply.

Ordinary Save also compiles knowledge on a host whose discovered save schema
advertises structured.compilation AND whose fresh session_context returns
knowledge.available: true with schemaVersion: 1. These are capability checks;
plugin version or model familiarity never proves support. On such a host, prepare
all compilation before dispatching Save: one overview of this cumulative note,
every affected reusable topic document, and one recent-memory briefing.
Complete compilation as part of the same Save. If compilation or source loading fails before
dispatch, retain the draft and report Save incomplete: no new note was published.
On older hosts without this capability, preserve legacy Save, explicitly report
compilation unavailable, and do not pretend a note-only receipt includes knowledge.

For bounded assessed maintenance, additionally require the discovered save schema
to advertise structured.compilation.assessment and fresh session_context.knowledge
to return assessment.available: true, schemaVersion: 1 and compilerVersion:
'wiki-save-v1'. Use that writer only with both checks. Older compilation hosts keep
their save-v1 workflow; report assessment unavailable and coverage unknown. Never
send unsupported assessment fields or claim assessed maintenance from legacy Save.
Once assessment support is advertised, never downgrade to save-v1 to evade a
failed or unresolved assessment. Conflicting capability reports require a fresh
schema/context check; retain the draft while support remains uncertain.

Read the service's capacities from fresh session_context.knowledge.limits. Honor
both these capacities and the discovered Save schema. The expanded host advertises
affectedTopics: 10, outputs: 12, topicSources: 64, assessmentSources: 768,
consideredTopics: 128, overviewWords: 240 and briefingWords: 500. The briefing
still uses the seven-or-fewer sources selected by the plan. A compilation host
without the limits descriptor retains two affected topics and four compiled
outputs, 32 references per topic, 72 references per assessment source list, 64
considered topics and exclusions, and 120/250 overview/briefing words. Retain the
draft and refresh discovery if the descriptor and the Save schema conflict.

Use session_context.knowledge.plan: it selects at most seven current session notes
by latest saved time then path. Replace repeated checkpoints with that session's
current note; history and generated documents never enter the recent window.
Load every selected older note and the existing affected documents through Sync at
session_context.sourceCommit. Read every complete returned source, honor omissions
and acknowledge only those source paths actually read.
For sync_ack and sync_replay, use the projectId and deliveryId from that same
Sync response with the conversationId of the conversation that ran that Sync.
corpusProjectId and session_context.projectId identify the corpus; never use
them, a repository name or a project name for acknowledgment or replay. The new cumulative note is
an in-memory prospective source; never fabricate its Git hash or future commit.
Plan sources include path/title/time/sourceURL for acquisition; compilation.sources
contain ONLY {conversationId,revisionId,contentHash}, or {prospective:true} for this
new note. Strip acquisition metadata deliberately; keep pinned revision/hash bytes.
Use coverage.omitted from the plan for the briefing. If a stale source or plan is
rejected, reload and reconcile the complete draft before a new dispatch; never
silently remove a required output or broaden the window to fit a budget.

Before choosing affected topics, assess this note's changed information against
compact knowledge discovery, prior source dependencies and any newly relevant
uncited information. Do not assume the recent briefing window is the complete
affected scope. Read the necessary bounded source/page closure: the changed note,
at most six other briefing notes, every affected complete topic page and its
explicit evidence dependencies. Load needed additional originals within the
advertised source limits and pin each read to the same sourceCommit. Assess full
sources for semantic evidence. Preserve exact source
revision/hash provenance and distinguish an examined exclusion with its rationale
from a source or topic never assessed. Missing dependencies or unknown selection
must remain visibly incomplete, never a fabricated complete-coverage claim.

Revise every affected generated section in the same atomic Save. Replace obsolete
current claims and retain their prior rationale/history, attributed conflicts and
unresolved questions.
Unchanged facts survive; unrelated authored/external sections stay verbatim.
Reuse stable topic role/key and document IDs, not titles; a rename must not create
a duplicate topic. Do not rewrite unrelated topic bodies to advance coverage.
If required evidence is missing or the actual topic, source, or byte limit
prevents complete closure, stop BEFORE Save dispatch. Retain the complete
cumulative note, proposed page changes and assessment draft. Name the unresolved
topics/dependencies and the precise limit.
Report Save incomplete with prior publication intact and explain the next action:
resolve missing evidence or request separately scoped broader maintenance. Never
drop an affected page, publish a note-only success, create repeated Saves to bypass
the bound or start a background queue. A retained draft is not a saved checkpoint.

Use stable compilation role/key identities from knowledge.artifacts, not document
titles. Roles: note-overview with key=this conversationId; topic with a stable short
key; recent-briefing with key=recent. Reuse the document and generated section IDs;
load its exact current JSON/hash before an update. New role documents require
checked attributable direction from this explicit Save request; that assertion is
about authorization to save, not independent verification of all knowledge. Create
generated sections with refresh: explicit-save. Preserve authored/external sections
verbatim and leave their ownership intact. Do not assign project-orientation or
claim operator review merely because content was generated.

Each document change includes compilation: {schemaVersion:1,role,key,
compilerVersion:'wiki-save-v1',sources:[...],coverage:{omitted:0}} for the assessed
writer; use compilerVersion: 'save-v1' only on the older compilation host described
above. The briefing uses the plan's omitted count. The overview has exactly the
prospective source. Topics cite every current note used within the per-topic
source limit. State any known coverage gap.
The briefing cites exactly the plan's seven-or-fewer sources, including prospective
only if selected. The service resolves prospective to the exact rendered note's
revision and SHA-256. It computes each document's sourceFingerprint; never supply
that per-document output field.
Include structured.compilation: {sourceCommit:session_context.sourceCommit,
keys:['note-overview:<conversationId>',...affectedTopicKeys.map(key=>'topic:'+key),
'recent-briefing:recent']}.
Declare the complete intended set before Save. The service rejects missing or
extra declared outputs, duplicate identities and stale references atomically.

On the assessment-capable host, also include structured.compilation.assessment:
{schemaVersion:1,sourceCommit:session_context.sourceCommit,
compilerVersion:'wiki-save-v1',scope:{kind:'current-notes',sourceFingerprint,eligibleCount},
examinedSources:[...],changedSources:[...],consideredTopics:[...],affectedKeys:[...],
exclusions:[...],unresolved:[]}.
Copy scope from fresh knowledge.assessment.scope, never invent its fingerprint or
eligible count. For examinedSources and changedSources, apply assessmentSources to
each list of exact {conversationId,revisionId,contentHash} references or
{prospective:true}. Include the prospective note in both lists. List sources
actually examined in examinedSources and the complete changed-source set requiring
assessment in changedSources.
consideredTopics contains exact {id,key,revisionId,contentHash} records for assessed
existing topics. affectedKeys lists every affected topic's stable key within the
affectedTopics limit. Apply the consideredTopics limit to both consideredTopics
and exclusions, whose {key,rationale} judgments cover examined, unaffected topics.
These are raw topic keys; structured.compilation.keys uses
role:key (for example, topic:deployment). Bind every declared affected key to its
intended topic output. Discover necessary pending sources and topic dependencies
from the fresh bounded index and complete selected pages; reconcile any returned
pendingSources/dependencies with that closure. unresolved must be empty before
dispatch. A source fingerprint is a scope fence, not proof of semantic coverage.
The service validates the source/base, dependency closure, considered page hashes
and declared effects, then binds the resolved assessment to publication and the
original receipt. Semantic judgments remain client declarations, not independent
verification, operator acceptance or model-quality evidence.

Before dispatch, check every claim against this artifact's declared sources.
For each corrected or superseded decision, retain the original choice, its stated
reason and original source citation, then the replacement, its stated reason and
superseding source citation. Mark which choice is current, who accepted it and the
supported chronology. Preserve both reasons and both sources; the replacement's
citation does not replace evidence for the original decision. When correcting a
measurement, retain the former value explicitly as withdrawn with its original
citation and cite the correction for the current value. Do not leave both current.

Preserve unchanged relevant facts, constraints, rationale and source references
while revising an affected page. Check the complete existing page against the new
draft so a shorter answer does not silently lose support details, history or
navigation. Every retained fact must remain supported and currently authorized;
unchanged wording does not authorize reuse of withdrawn evidence. Keep source
notes and immutable revisions byte-for-byte intact. Preserve exact source paths,
revision IDs and hashes; do not rewrite originals or invent source coordinates.
Topic and briefing claims must be supported by their own declared source IDs,
including citations; reject and revise a draft with an undeclared source.

Separate factual uncertainty from an operational blocker. Attribute conflicting
reports, proposals and unknown facts in the page; preserve their evidence without
promoting them to acceptance or inventing a resolution. A faithfully represented
factual dispute may remain in a complete update. assessment.unresolved is for work
that prevents safe bounded publication: required evidence not read or unavailable,
stale source/target, missing affected output or exceeded limits. Put unresolved
factual reports in prose, not that operational-blocker list. If operational work
remains, retain the draft and report Save incomplete; never claim completion with
operational blockers or publish only part of the affected closure.

Build consideredTopics and exclusions only from the current authorized topic set
actually supplied and examined in this attempt, using exact identities and hashes.
An exclusion means that an examined, authorized topic needs no change; give the
source-based reason and preserve its body. A withdrawn, withheld, unreadable or
out-of-scope page is not an unchanged-topic exclusion. Do not list it outside the
supplied eligible set, copy its content or restore it from prior context. Report
unavailable required scope without disclosing withheld content; stop publication
when that prevents the required closure. Preserve the prior authorized publication.

The note overview is derived ONLY from the complete cumulative note being saved:
if that note contains only Save-workflow direction, summarize only that direction.
Do not turn it into a recap of the other selected sessions. Older facts belong in
its overview only if the cumulative note itself retains them. Preserve explicit
failure behavior: if compilation cannot finish, report Save incomplete, with no new
publication before dispatch. Do not reduce this to "compilation is mandatory."
An unapproved schedule does not establish that none is running; leave execution
unknown unless a source proves it. A replacement's stated benefit does not prove
the former choice lacked that feature. Label such connections as inference or
omit them; never invent a deficiency, operational status or causal rationale.

Publish through the actual discovered typed Save tool arguments. Validate required
fields, declared effects, citations and bounds before dispatch. Do not substitute
a prose status or an invented response wrapper for that production interface;
a caller's separate response-format contract does not change the Save schema.


Give each event its own evidence and subject. Use cited source notes to explain
a change to a reported fact. Use the operation result or receipt to explain what
happened to a proposed edit and whether it published. When both appear, describe
them in separate sentences. Link their timing or cause only if evidence explicitly
connects the two. A stale base means the proposed edit used a different version
from the current source. Report that mismatch. An intended destination revision
requires its own evidence. If the operation outcome is unavailable, say so.

When reporting a measurement, check whether its execution date is established.
Give the actual date when a source identifies it. If it is absent, explicitly
say the test date is unknown, including when a reporting rule requires a date.
A note date, document timestamp, correction date or Save time establishes only
the event it describes. A page modification dates the page revision itself. Apply these checks to the saved page and the reader's
answer before returning either.

Use concise generated-section templates, omitting empty headings:
Overview: Current recap; decisions with their acceptance; unresolved work/unknowns.
Topic: Current knowledge; prior/corrected/superseded knowledge; reported or proposed
claims and conflicts; source references. An approved replacement supersedes the
old choice; preserve the reason/history without treating both as current. Keep
unverified reports attributed, withdrawn counts withdrawn, unknown dates unknown,
and merge/deployment/human acceptance distinct. Never import an unrelated fact.
Briefing: Recent recap; unresolved work; coverage (selected sources, saved times and
omissions). Up to three cross-session insights are optional: add compilation.insights
[{text,sourceConversationIds:[...]}], each backed by at least two distinct selected
sessions. These render as Inference, never as accepted fact or new instruction.
Zero insights is valid and preferable to an invented connection. The overview and
briefing word caps cover generated section prose plus insight text. Keep citations
in section.sources ({reference,conversationId,span?}) and exact machine source refs
in compilation.sources. Observe the discovered tool's write limits and the read
limits on stored outputs. Use adequate supported Sync packet budgets to load and
verify complete evidence. Never truncate source notes or prune history to fit.

After dispatch, retain the original UUID and EXACT title/body/structured request.
Any uncertain result uses save_receipt/save_read for that same operation. Verify
all declared role/key outputs, resolved source references, sourceFingerprint and
returned savedArtifacts hashes against the original publication before reporting
success. For assessed maintenance, also verify the original receipt's assessment
and its bound artifact effects against the exact submitted assessment; missing or
inconsistent evidence leaves maintenance unverified. A receipt for only the note
is insufficient. Reading an overview never
acknowledges its full source note. Stale summaries remain historical context and
must be labelled stale until a later explicit Save refreshes them. Discovery/read
performs no inference, background update or dreaming.
