---
name: delivery
description: Set up or inspect automatic Agent Upskill Shared Skills delivery on this Mac, and guide pause, resume, removal or recovery.
---

Use this plugin's [delivery bootstrap](scripts/delivery.mjs) and
[pinned release inventory](scripts/delivery-release.json). Read both before use.
Keep the same setup chat and preserve completed connection and login steps.
No hook, plugin-install side effect or HTTP MCP connection enrolls this computer.

For local status, pause or owned removal/recovery, go directly to the local
controls below after inspect --codex-home <real-existing-home>. Do not request
MCP access or helper login for signed-out/offline cleanup. Resume and rollback
retain their current authority checks. A missing/changed helper remains a repair
hold; do not download a replacement as an incidental local-control action.

1. Offer automatic delivery on this computer. Explain: the pinned signed component
   runs at login and nominally every five minutes while awake/online, including
   with Codex closed; it needs a separate Skills identity/read browser consent and
   Keychain session. The release is publisher-signed; the Keychain binary is ad-hoc
   signed, not Developer ID signed/notarized. Show the archive/helper/root pins,
   the private durable destination under Library/Application Support/AgentUpskill
   Shared Skills/delivery, and that Node >=22 must already be independently trusted.
   Obtain explicit approval before running prepare or helper login. A decline
   makes no helper, credential, scheduler or delivery change. Do not install Node,
   grant execution permissions, approve browser consent or expand runtime admission.

2. After explicit opt-in, confirm the enabled up plugin and actual bundled agentupskill-bundled-connect
   connector with no host/project shadow, including disabled shadows. Preserve
   older differently named connectors. Use current skills_identity from this
   connector to obtain authenticated principalId, workspaceId and entitlementVersion.
   Preserve an existing grant. If Skills identity is unavailable because access is
   missing, obtain explicit approval and browser consent for skills:identity and
   skills:read, preserving existing approved Memory/Skills scopes in the request;
   never replace a broader existing grant with a narrower grant. Do not request
   permission management, Memory lifecycle or unscoped authentication. Discovery
   or authentication failure is a hold. Do not copy or extract Codex credentials.

3. With that approval, run the script with the absolute trusted Node path and no
   NODE_OPTIONS/NODE_PATH: node <absolute-script> prepare --codex-home
   <real-existing-home>. The script verifies
   before import, then verifies signatures/source/package and stages durable code
   outside plugin caches. Its verified-helper result means packaged bytes only.
   It does not mean enrolled, scheduled or delivered. On an existing helper, use
   inspect --codex-home <real-existing-home> and local status first. An existing
   enrolled helper is verified and reused at its current durable path.
   The bridge retains a private helper-location record so offline recovery still
   finds that verified helper after enrollment is detached; it never relocates it.
   That record is scoped to the real Codex-home path, device/inode and OS owner;
   another home never adopts it. A stale same-home reference stays preserved but
   cannot block local controls through the verified active enrollment. Resolve it
   through exact removal/retirement before new account-sensitive setup.
   Preserve failed stages, pauses, edits and recovery evidence. Never chmod/overwrite
   a conflicting path.
   Run one helper setup/repair for a given target at a time. Unpublished stages
   remain for inspection; completed stages are cleaned and do not consume that cap.
   The current signed helper expires on 31 December 2026 UTC; its approved root
   expires on 1 January 2027. Fresh setup, login/network work and rollback application require
   current trust. Inspect and offline controls still verify the exact inventory,
   signatures and source at the recorded release-verification time after expiry,
   and report renewal_required; they do not resume delivery or refresh trust.

4. For subsequent calls use node <absolute-script> run COMMAND --codex-home
   <real-existing-home>. For login, automation-preview, automation-enroll,
   automation-setup, automation-resume, automation-check-now, automation-apply and
   migration and native-home recovery preparation/application also pass --expected-principal <principalId>
   --expected-workspace <workspaceId> --expected-entitlement <entitlementVersion>
   from the current authenticated skills_identity. Never invent these values.
   Run status first. A valid same-account helper session is preserved; signed-out
   requires login with human browser consent. The wrapper fixes the helper's
   service, Skills-only login, Keychain binary and trust pins. An account mismatch
   stops before enrollment; do not switch accounts, delete credentials or adopt
   another enrollment. Login preflights local status, preserves a matching session
   and holds a known mismatch before browser/network work. On first login, browser
   selection can persist a different account before the mismatch is detected.
   Inspect status and show the actual helper principal/workspace and real home.
   Only with separate explicit approval to sign out that helper session, run logout
   --confirmed-principal <inspected-principal> --confirmed-workspace
   <inspected-workspace>. It rereads that binding, uses released logout to suspend
   enrollment and delete only this home's helper session, and does not revoke remote
   tokens or sign out the website/MCP. Never log out automatically, reset an account,
   pass --switch-account or resume delivery afterward. Retry login only after fresh
   approval/browser consent. automation-status works locally without a network login.

5. Inspect automation-status. Existing complete enrollment needs no new enrollment:
   report its actual scheduler/receipt/hold state; preserve a pause until explicit
   resume. For incomplete setup inspect its reason before retrying automation-setup.
   For new enrollment, open https://app.agentupskill.ai/signup/skills for the user
   to review/save exact choices themselves, then run automation-preview with
   --codex <actual Desktop bundled CLI>. The script saves an exclusive private
   preview and returns preview_file plus its complete preview. Show/open that full
   preview, explain its account/home/runtime, roots, access baseline, schedule and
   exact confirmation_sha256. Explain the warnings in step 6 before asking the user
   to confirm that exact digest before
   automation-enroll --preview-file <returned-file> --confirmation-sha256 <digest>.
   Never manufacture this approval from general setup approval or a website save.
   Runtime, root, browser-proof or integrity holds remain holds.

6. Enrollment warnings are substantive: ordinary website additions/explicit version
   choices/removals within baseline need no repeated Apply, but updates can mix old
   instructions/new files or interrupt active/resumed changed-skill work; removal
   cannot retract loaded instructions or undo output. Supported disables apply
   across projects sharing this Codex home on this computer; project-specific skill
   disables are unsupported. Preserve local disables, system/unowned skills,
   unchanged entries, credentials and unrelated project configuration/permissions.
   Start a fresh chat after verified delivery; disable changes may require restart.
   Five minutes is a nominal check interval, not a delivery-time guarantee.

7. An old native bundle leaves enrollment paused. Use automation-migration-preview
   with exact owned --native-root and --native-plans-root discovered from existing
   local receipts; never guess/adopt by name. Review complete private backup and
   exact preview, host/Sites limitations and every affected old skill. Obtain both
   its exact digest confirmation and explicit confirmation that all old-bundle
   workflows have finished. Only then run automation-migrate --operation <digest>
   --confirmation-sha256 <digest> --old-workflows-finished all-old-skills. Decline
   leaves it paused. No cache edits, silent deletion, duplicate sources or automatic
   migration. Pending/edited/unpreservable state requires the released exact recovery.

If migration holds because only the old native home filesystem device number
changed, keep it paused. With the current helper use
   automation-native-home-recovery-preview --native-root <receipt-proven-root>.
Do not infer a reboot or the same physical Mac from matching path/owner/inode.
Legacy records contain no historical hardware/volume ID; cloned/restored homes can
match these attributes. The operator must independently know the intended Mac/home;
uncertainty stays held and this never authorizes adoption on another Mac.
Show/open its complete returned preview_file, original/current identities, account,
full private backup, inventory, every old skill and host/Sites warnings. Obtain
both its exact confirmation_sha256 and explicit confirmation that this is the same
intended Mac and Codex home. Only then use automation-native-home-recover
   --preview-file <returned-file> --confirmation-sha256 <digest>
   --same-mac-home confirmed.
Recovery preserves the original ownership record and changes only the native home
binding after strict checks; it never removes a plugin, migrates or enables delivery.
A changed owner/inode/account, edits, pending native work or unrelated drift stays
held. Prepare a fresh canonical migration preview after recovery and obtain the
separate migration/all-old-workflows-finished/background-activation approvals.
Eight live recovery archives are allowed. Failed or stale previews stay preserved.
For an exact stale/failed archive, use automation-native-home-recovery-retire-preview
   --native-root <receipt-proven-root> --recovery-directory <exact-UUID>.
Show/open the complete returned preview_file and obtain its exact digest approval
before automation-native-home-recovery-retire --preview-file <returned-file>
   --confirmation-sha256 <digest>.
Use the exact canonical native-root spelling from receipts, including case.
Preserve unowned entries (such as Finder metadata) without adopting them; corrupted
UUID-shaped owned archives remain held. After recovery, original-state.json,
preview.json and consent.json are permanent private ownership dependencies: never
edit, delete, hard-link or change their permissions. Losing integrity holds even
migration/removal. Retirement preserves these files and completed audit pointers.
Retirement is local/offline, keeps every file in place, frees only the live-preview
slot (not disk space), withdraws future application of that preview and changes no
ownership, skill, scheduler or pause. Completed ownership audit pointers remain
valid. Do not delete evidence by hand or retire without the exact confirmation.
A previous helper supports only local controls: use the explicit renewal flow below
before new recovery. The renewal detaches the old enrollment with skills kept,
retires only its helper reference, prepares the current pinned helper and requires
a NEW complete enrollment preview and exact user confirmation. Existing credentials
are preserved. The old helper cannot retire recovery archives that it predates.
Never swap helpers or reuse old enrollment consent silently.

8. After a successful migration, inspect status and finish automation-setup then
   automation-resume only when activating background delivery was included in the
   explicit migration approval. Preserve any separate user pause or recovery hold.
   Read back automation-status after setup/migration and run automation-check-now
   only when enabled. Report the actual installed revision/hash or hold/partial
   outcome; inspect status again. Enrolled-and-enabled alone is not first delivery.
   The website has no live device confirmation; installed never proves chat availability.
   Future website saves use the same released background coordinator.

For pause use automation-pause. Explicit resume uses automation-resume after
current identity checks, then status/check-now. For enrollment removal, explain
keep versus owned removal, run automation-remove-enrollment-preview --skills
keep|remove. The wrapper returns preview_file and the complete preview, preserving
the helper’s canonical bytes in an exclusive private file. Show that preview and
obtain its exact digest approval before automation-remove-enrollment --preview-file
<returned-file> --confirmation-sha256 <preview.confirmation_sha256>. This cleanup works signed out/offline and
never changes website choices. Rollback/removal/cleanup retain their released
preview, exact-confirmation and pause gates; use automation-rollback-preview or
automation-remove-preview and automation-local-apply only for the reviewed exact
operation. For a rollback automation-local-apply, pass the current authenticated
skills_identity binding using the expected-account flags; the wrapper reads the
exact verified local plan and checks that account before restoration. Cleanup and
removal stay available signed out/offline. For an interrupted helper session, use
lock-status (different from automation locks). After reviewing its actual owner,
host, token and in-flight state and obtaining explicit recovery approval, use
unlock --lock-token <exact-token>. The released check requires the same host,
stopped owner, unchanged lock and no in-flight marker. These commands and explicitly
approved helper logout remain local and available with expired/previous helper pins.
Never remove an in-flight marker or ambiguous lock automatically. Inspect automation-lock-status or
automation-stage-status for interrupted work. Only after reviewing its concrete
repair action, use the released automation-lock-unlock/automation-stage-unlock with
the exact token and a verified stopped owner; staging purges require the exact
name and fresh status digest. Detached migration abandonment retains the released
automation-migration-abandon-preview/automation-migration-abandon exact archive,
operation and confirmation gates. Retain uncertain evidence.
Never unlock a live/ambiguous owner or silently resume after rollback/removal.

For renewal, a plugin may retain at most one previous exact helper pin with its
complete independent inventory; unknown pins are holds. A known previous helper
supports local controls and migration recovery only, never native-home recovery, new enrollment, remote operations or
rollback. First detach its enrollment through the exact removal flow, settling all
owned migration recovery. Run retire-helper-preview --codex-home <home>, show its
complete preview/digest and obtain explicit exact confirmation before
retire-helper --codex-home <home> --confirmation-sha256 <digest>. It checks that
enrollment is absent, detached removal ownership and migration settlement still
hold, then archives only the locator; helper files, receipts, skills and credentials
stay intact. Separately approve current prepare/login/enrollment as needed.
If a retained helper is missing, inspect reports its exact root/pin. Obtain
explicit download/repair approval for that original protected path, then run
repair --codex-home <home>. It restores only the same reviewed archive to a missing
path and preserves conflicts. Expired/previous repairs still permit only local
controls. Never repair or retire incidentally during a status/cleanup request.
