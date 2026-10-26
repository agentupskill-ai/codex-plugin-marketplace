#!/usr/bin/env node
import * as fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export const release=JSON.parse(fs.readFileSync(new URL('./delivery-release.json',import.meta.url),'utf8'));
const pins=[release,...release.previous_releases];
const fail=message=>{throw new Error(message);};
const check=(value,message)=>{if(!value)fail(message);};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const exists=file=>{try{fs.lstatSync(file);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const denyACL=/^\s*\d+:\s+(?:(?:user|group):\S+|[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12})\s+(?:inherited\s+)?deny\s+[a-z][a-z_,]*(?:\s+inherited)?\s*$/;
// This bootstrap cannot import its packaged verifier until every imported byte
// matches the independent inventory. Check ancestors/ACLs before that import.
export function trustedDirectory(dir,{run=spawnSync}={}){
  check(path.isAbsolute(dir)&&path.normalize(dir)===dir,'Expected a canonical protected directory');
  let current=path.parse(dir).root;
  for(const segment of [null,...dir.slice(current.length).split(path.sep).filter(Boolean)]){
    if(segment!==null)current=path.join(current,segment);
    const s=fs.lstatSync(current);
    check(s.isDirectory()&&!s.isSymbolicLink()&&(s.uid===0||s.uid===process.getuid())&&!(s.mode&0o022)&&fs.realpathSync(current)===current,'Unsafe helper storage ancestor; preserve it for inspection');
    const acl=run('/bin/ls',['-lde',current],{encoding:'utf8',timeout:10000,maxBuffer:8192,env:{LC_ALL:'C'}});
    check(!acl.error&&acl.status===0&&!acl.signal&&typeof acl.stdout==='string','Could not verify helper storage ACL');
    const lines=acl.stdout.trimEnd().split('\n');
    check(lines[0]&&lines.length<=64&&lines.slice(1).every(line=>denyACL.test(line))&&!(lines[0].slice(0,11).includes('+')&&lines.length===1),'Unsafe helper storage ACL');
  }
}
function privateDirectory(dir,trust){
  trust(dir);const s=fs.lstatSync(dir);
  check(s.uid===process.getuid()&&!(s.mode&0o077),'Helper storage must be private and owned; existing permissions were preserved');
}
function makePrivate(dir,trust){
  if(!exists(dir)){trust(path.dirname(dir));fs.mkdirSync(dir,{mode:0o700});}
  privateDirectory(dir,trust);
}
function privateJSON(file,max){
  const s=fs.lstatSync(file);
  check(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.uid===process.getuid()&&!(s.mode&0o077)&&s.size<=max,'Unsafe private delivery metadata; preserve it for inspection');
  return JSON.parse(fs.readFileSync(file,'utf8'));
}
export function helperLocatorFile(storage,home){
  check(path.isAbsolute(home??'')&&fs.realpathSync(home)===home,'Use the real existing Codex home');
  const s=fs.statSync(home),identity=JSON.stringify([home,s.dev,s.ino,s.uid]);
  return path.join(storage,'helper-'+sha(Buffer.from(identity))+'.json');
}
function helperLocator(storage,home,trust){
  if(!home)return null;
  const file=helperLocatorFile(storage,home);
  if(!exists(file))return null;
  privateDirectory(storage,trust);const value=privateJSON(file,4096);
  check(Object.keys(value).sort().join(',')==='helper_root,helper_sha256'&&typeof value.helper_root==='string'&&/^[a-f0-9]{64}$/.test(value.helper_sha256)&&!value.helper_root.includes('/plugins/cache/')&&!value.helper_root.includes('/.tmp/'),'Invalid retained helper reference');
  return value;
}
function rememberHelper(storage,home,root,trust,helper_sha256){
  makePrivate(path.dirname(storage),trust);makePrivate(storage,trust);
  const prior=helperLocator(storage,home,trust);
  if(prior!==null)return prior.helper_root===root&&prior.helper_sha256===helper_sha256;
  fs.writeFileSync(helperLocatorFile(storage,home),JSON.stringify({helper_root:root,helper_sha256})+'\n',{flag:'wx',mode:0o600});
  return true;
}
export const defaultStorage=()=>path.join(os.homedir(),'Library','Application Support','AgentUpskill Shared Skills','delivery');
const targetFor=storage=>path.join(storage,'helpers',`agentupskill-helper-${release.helper_sha256}`);
export function verifyPinnedInventory(root,files=release.files){
  const expected=new Map(files.map(f=>[f.path,f]));let count=0;
  const walk=(dir,prefix='')=>{
    const d=fs.lstatSync(dir);check(d.isDirectory()&&!d.isSymbolicLink()&&d.uid===process.getuid()&&!(d.mode&0o077),'Unsafe helper directory');
    for(const name of fs.readdirSync(dir)){
      check(++count<=512&&/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name),'Unexpected helper entry');
      const rel=prefix?`${prefix}/${name}`:name,file=path.join(dir,name),s=fs.lstatSync(file);
      check(!s.isSymbolicLink()&&s.uid===process.getuid()&&!(s.mode&0o077),'Unsafe helper entry');
      if(s.isDirectory()){check([...expected.keys()].some(p=>p.startsWith(rel+'/')),'Unexpected helper directory');walk(file,rel);}
      else{
        const row=expected.get(rel);
        check(row&&s.isFile()&&s.nlink===1&&s.size===row.bytes&&Boolean(s.mode&0o100)===row.executable,'Changed or foreign helper file; preserve it for inspection');
        const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
        try{check(sha(fs.readFileSync(fd))===row.sha256,'Helper bytes differ from the independently pinned release');}finally{fs.closeSync(fd);}
        expected.delete(rel);
      }
    }
  };
  walk(root);check(expected.size===0,'Incomplete helper package; preserve it for inspection');
}
export async function verifyPinnedHelper(root,trust,{pin=release,allowExpired=false,now=Date.now(),verificationOptions={}}={}){
  privateDirectory(root,trust);verifyPinnedInventory(root,pin.files);
  const {verifyHelperPackage}=await import(pathToFileURL(path.join(root,'lib/helper-package.mjs')).href);
  const options={...verificationOptions,now};
  let result;
  try{result=verifyHelperPackage(root,pin.root_pin,options);}
  catch(error){
    if(!allowExpired||error.message!=='Trust metadata expired')throw error;
    // Exact reviewed code keeps local shutdown/recovery after metadata expiry.
    result={...verifyHelperPackage(root,pin.root_pin,{...options,now:Date.parse(pin.verified_at)}),trust_expired:true};
  }
  check(result.helper_sha256===pin.helper_sha256&&result.source_commit===pin.source_commit&&result.keychain_sha256===pin.keychain_sha256,'Signed helper differs from the pinned release');
  return result;
}
function supported(){
  check(process.platform==='darwin'&&process.arch==='arm64'&&Number(process.versions.node.split('.')[0])>=22,'Delivery setup requires trusted Node >=22 on macOS arm64; runtime admission is checked separately');
  check(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH,'Use a trusted Node invocation without interpreter injection options');
}
export async function inspectDelivery({home,storage=defaultStorage(),trust=trustedDirectory,verifyPackage=verifyPinnedHelper,platformCheck=supported,allowExpired=false,now=Date.now(),acceptedPins=pins}={}){
  platformCheck();let root=targetFor(storage);
  check(acceptedPins.length>=1&&acceptedPins.length<=2&&new Set(acceptedPins.map(p=>p.helper_sha256)).size===acceptedPins.length,'Review at most the current and one previous immutable helper pin');
  const select=hash=>{const pin=acceptedPins.find(p=>p.helper_sha256===hash);check(pin,'Unknown helper pin; preserve it for review');return pin;};
  const describe=(root,result,pin)=>({state:'verified-helper',helper_root:root,helper_sha256:result.helper_sha256,keychain_sha256:result.keychain_sha256??pin.keychain_sha256,trust_expired:result.trust_expired??false,previous_helper:pin.helper_sha256!==acceptedPins[0].helper_sha256,availability:'not-checked'});
  // A customer may already have enrolled the released standalone helper. Treat
  // its private record as data until the candidate's complete bytes are pinned;
  // then use the released ownership reader. Never relocate an enrolled helper.
  if(home){
    check(path.isAbsolute(home)&&fs.realpathSync(home)===home,'Use the real existing Codex home');
    const state=path.join(home,'shared-skills-automation'),file=path.join(state,'enrollment.json');
    if(exists(file)){
      privateDirectory(state,trust);const value=privateJSON(file,2*1024*1024);root=value.preview?.specification?.helper_root;
      check(typeof root==='string'&&!root.includes('/plugins/cache/')&&!root.includes('/.tmp/'),'Existing enrollment does not identify a durable helper');
      const pin=select(value.preview?.helper_sha256);
      if(!exists(root))return {state:'retained-helper-missing',helper_root:root,helper_sha256:pin.helper_sha256,availability:'not-checked',next_action:'Explicitly review repair at this exact path; enrollment ownership is not verified until the pinned helper is restored.'};
      const result=await verifyPackage(root,trust,{pin,allowExpired,now});
      const {readOwnedAutomationEnrollment}=await import(pathToFileURL(path.join(root,'lib/automation-enrollment.mjs')).href);
      const owned=readOwnedAutomationEnrollment(home);
      check(owned?.preview.specification.helper_root===root&&owned.preview.helper_sha256===pin.helper_sha256,'Existing helper enrollment needs exact local review');
      return {...describe(root,result,pin),existing_enrollment:true};
    }
  }
  if(!exists(storage))return {state:'not-installed',enrolled:false,availability:'not-checked'};
  privateDirectory(storage,trust);
  const retained=helperLocator(storage,home,trust),pin=retained?select(retained.helper_sha256):acceptedPins[0];root=retained?.helper_root??root;
  if(retained&&!exists(root))return {state:'retained-helper-missing',...retained,availability:'not-checked',next_action:'Explicitly approve repair of this exact pinned helper at its original path; do not download during local cleanup.'};
  if(!exists(root))return {state:'not-installed',enrolled:false,availability:'not-checked'};
  const result=await verifyPackage(root,trust,{pin,allowExpired,now});
  return describe(root,result,pin);
}
export async function prepareDelivery({home,storage=defaultStorage(),trust=trustedDirectory,verifyPackage=verifyPinnedHelper,platformCheck=supported,fetcher=fetch,run=spawnSync,repair=false}={}){
  platformCheck();
  const current=await inspectDelivery({home,storage,trust,verifyPackage,platformCheck,allowExpired:repair});
  if(current.state==='verified-helper'){
    if(current.existing_enrollment)check(rememberHelper(storage,home,current.helper_root,trust,current.helper_sha256),'Retained helper reference conflicts; use local controls and exact retirement before new setup');
    return current;
  }
  const missing=current.state==='retained-helper-missing';
  check(!repair||missing,'Repair requires a private reference to an exact missing helper');
  check(!missing||repair,'Retained helper is missing; explicit exact-path repair approval is required');
  const pin=missing?pins.find(p=>p.helper_sha256===current.helper_sha256):release;
  // The parent app directory may already contain the released session locks.
  // Never change its permissions or remove any existing state.
  makePrivate(path.dirname(storage),trust);makePrivate(storage,trust);
  const helpers=path.join(storage,'helpers');makePrivate(helpers,trust);
  const root=missing?current.helper_root:targetFor(storage);trust(path.dirname(root));
  if(exists(root))return inspectDelivery({home,storage,trust,verifyPackage,platformCheck,allowExpired:repair});
  const stageParent=missing?path.dirname(root):helpers;
  check(fs.readdirSync(stageParent).filter(n=>n.startsWith('.agentupskill-helper-stage-')).length<8,'Helper setup staging capacity reached; preserve unpublished stages and review them before another attempt');
  const stage=path.join(stageParent,`.agentupskill-helper-stage-${randomUUID()}`);fs.mkdirSync(stage,{mode:0o700});
  // Failed stages are retained. A retry uses a new exclusive stage and never
  // overlays, adopts or executes bytes from a prior partial download.
  const response=await fetcher(`${pin.origin}/${pin.archive}`,{redirect:'error',signal:AbortSignal.timeout(30000)});
  check(response.ok&&response.body,'Pinned helper download unavailable; completed setup is preserved');
  const chunks=[];let total=0;
  for await(const chunk of response.body){total+=chunk.length;check(total<=pin.archive_bytes,'Helper archive exceeds its pinned size');chunks.push(chunk);}
  const bytes=Buffer.concat(chunks);
  check(bytes.length===pin.archive_bytes&&sha(bytes)===pin.archive_sha256,'Helper archive hash mismatch; no downloaded code was imported');
  const archive=path.join(stage,'download.tgz');fs.writeFileSync(archive,bytes,{flag:'wx',mode:0o600});
  const env={PATH:'/usr/bin:/bin',HOME:os.homedir(),LC_ALL:'C'};
  const listing=run('/usr/bin/tar',['-tzf',archive],{encoding:'utf8',shell:false,timeout:10000,maxBuffer:65536,env});
  const prefix='agentupskill-helper-'+pin.helper_sha256;
  check(!listing.error&&listing.status===0&&!listing.signal&&typeof listing.stdout==='string'&&listing.stdout.trim().split('\n').every(p=>
    (p===prefix+'/'||p.startsWith(prefix+'/'))&&/^[A-Za-z0-9._/-]+$/.test(p)&&!p.replace(/\/$/,'').split('/').some(s=>s==='..'||s==='.'||s==='')),'Invalid archive listing');
  // Only this exact independently pinned archive reaches the system extractor.
  // It contains regular files/directories only; the full inventory is rechecked.
  const oldMask=process.umask(0o077);let extracted;
  try{extracted=run('/usr/bin/tar',['-xzf',archive,'--no-same-owner','--no-same-permissions','-C',stage],{encoding:'utf8',shell:false,timeout:10000,maxBuffer:65536,env});}finally{process.umask(oldMask);}
  check(!extracted.error&&extracted.status===0&&!extracted.signal,'Helper extraction failed; retain the private stage and retry');
  const staged=path.join(stage,prefix);await verifyPackage(staged,trust,{pin,allowExpired:repair});
  // Complete concurrent installs remain intact.
  // ponytail: rename can replace a raced empty directory from the same trusted
  // OS user; add native no-replace if concurrent external writers must be supported.
  if(exists(root))return inspectDelivery({home,storage,trust,verifyPackage,platformCheck,allowExpired:repair});
  try{fs.renameSync(staged,root);}catch(e){if(!['EEXIST','ENOTEMPTY'].includes(e.code))throw e;}
  if(!exists(staged)){fs.unlinkSync(archive);fs.rmdirSync(stage);}
  return inspectDelivery({home,storage,trust,verifyPackage,platformCheck,allowExpired:repair});
}

export async function retireHelper({home,storage=defaultStorage(),confirmation,trust=trustedDirectory,inspect=inspectDelivery}={}){
  check(path.isAbsolute(home??'')&&fs.realpathSync(home)===home,'Use the real existing Codex home');
  privateDirectory(storage,trust);const reference=helperLocator(storage,home,trust),file=helperLocatorFile(storage,home);
  check(reference&&!exists(path.join(home,'shared-skills-automation')),'Detach the exact enrollment before retiring its helper reference');
  const info=await inspect({home,storage,allowExpired:true,trust});
  check(info.state==='verified-helper','Repair the exact missing helper first; do not discard unresolved recovery evidence');
  const {assertFilesystemMigrationsSettled}=await import(pathToFileURL(path.join(info.helper_root,'lib/filesystem-migration.mjs')).href);
  const {verifyDetachedAutomationRemoval}=await import(pathToFileURL(path.join(info.helper_root,'lib/automation-removal.mjs')).href);
  const archives=fs.readdirSync(home).filter(n=>n.startsWith('shared-skills-automation-detached-')).sort();
  check(archives.length<=32,'Detached recovery evidence needs inspection');
  for(const name of archives)verifyDetachedAutomationRemoval(home,path.join(home,name));
  assertFilesystemMigrationsSettled(home);
  const stat=fs.statSync(home),preview={action:'retire-helper-reference',codex_home:home,home_identity:{device:stat.dev,inode:stat.ino,uid:stat.uid},reference_file:file,reference,reference_sha256:sha(fs.readFileSync(file)),detached_archives:archives,notice:'Retire only the helper locator. Preserve helper files, all detached evidence, skills and credentials. New setup requires separate approval.'};
  const digest=sha(Buffer.from(JSON.stringify(preview)));
  if(confirmation===undefined)return {preview,confirmation_sha256:digest};
  check(confirmation===digest&&!exists(path.join(home,'shared-skills-automation'))&&sha(fs.readFileSync(file))===preview.reference_sha256,'Confirm the fresh exact helper-reference retirement preview');
  const archive=path.join(storage,'retired-helper-'+randomUUID()+'.json');
  fs.renameSync(file,archive);
  return {state:'helper-reference-retired',retained_reference:archive,helper_preserved:true,evidence_preserved:true};
}

const accountCommands=new Set(['login','automation-preview','automation-enroll','automation-setup','automation-resume','automation-check-now','automation-apply','automation-migration-preview','automation-migrate','automation-native-home-recovery-preview','automation-native-home-recover']);
const localCommands=new Set(['status','logout','lock-status','unlock','automation-status','automation-pause','automation-remove-enrollment-preview','automation-remove-enrollment','automation-cleanup-preview','automation-remove-preview','automation-rollback-preview','automation-local-apply','automation-finalize','automation-lock-status','automation-lock-unlock','automation-stage-status','automation-stage-unlock','automation-stage-purge-partial','automation-stage-purge-quarantine','automation-migration-recovery-preview','automation-migration-finalize','automation-migration-abandon-preview','automation-migration-abandon','automation-native-home-recovery-retire-preview','automation-native-home-recovery-retire']);
export async function runDelivery(command,options,{storage=defaultStorage(),inspect=inspectDelivery,run=spawnSync,trust=trustedDirectory}={}){
  check(accountCommands.has(command)||localCommands.has(command),'Unsupported delivery setup command');
  const {home,expected,flags=[]}=options;
  check(path.isAbsolute(home??'')&&fs.realpathSync(home)===home&&fs.statSync(home).isDirectory(),'Use the real existing Codex home');
  check(!flags.includes('--codex-home')&&!flags.includes('--keychain-helper')&&!flags.includes('--keychain-sha256')&&!flags.includes('--root-pin')&&!flags.includes('--service')&&!flags.includes('--artifact-origin')&&!flags.includes('--artifact-layout')&&!flags.includes('--switch-account'),'Fixed account/trust arguments cannot be replaced');
  const info=await inspect({storage,home,allowExpired:localCommands.has(command)});check(info.state==='verified-helper','Approve and prepare the pinned helper first');
  if(info.previous_helper&&['automation-native-home-recovery-retire-preview','automation-native-home-recovery-retire'].includes(command)){
    const previous=release.previous_releases.find(pin=>pin.helper_sha256===info.helper_sha256);
    // Compare the whole executable payload, not only the two command modules.
    // Release envelopes differ by release. The runtime admission table is
    // excluded because neither offline retirement command invokes admission.
    const excluded=new Set(['helper.json','keychain.json','proofs.json','source.json','lib/host-prerequisites.mjs']);
    const current=release.files.filter(entry=>!excluded.has(entry.path)),prior=previous?.files.filter(entry=>!excluded.has(entry.path));
    check(prior&&current.length>0&&prior.length===current.length&&current.every(entry=>prior.some(old=>old.path===entry.path&&old.sha256===entry.sha256&&old.bytes===entry.bytes&&old.executable===entry.executable)),'Previous helper predates or differs from the reviewed recovery archive retirement implementation; preserve it and use exact renewal first');
  }
  const node=fs.realpathSync(process.execPath),root=info.helper_root;
  let needsAccount=accountCommands.has(command);
  if(command==='automation-local-apply'){
    const index=flags.indexOf('--operation'),operation=flags[index+1];
    check(index>=0&&/^[a-f0-9]{64}$/.test(operation??''),'Use the exact local operation digest');
    const {readFilesystemLocalPlan}=await import(pathToFileURL(path.join(root,'lib/filesystem-store.mjs')).href);
    needsAccount=readFilesystemLocalPlan(path.join(home,'shared-skills-automation','delivery'),operation).action==='rollback';
  }
  if(needsAccount)check(expected&&['principalId','workspaceId','entitlementVersion'].every(k=>typeof expected[k]==='string'&&expected[k].length>0&&expected[k].length<=256),'Use the current authenticated skills_identity binding');
  if(needsAccount)check(!info.trust_expired,'Helper trust expired: local controls remain available; reviewed renewal is required before account/network operations or rollback');
  if(needsAccount)check(!info.previous_helper,'Previous helper supports local controls only; remove/detach its enrollment and retire its reference before explicitly preparing the current helper');
  const remembered=!info.existing_enrollment||rememberHelper(storage,home,root,trust,info.helper_sha256);
  if(needsAccount)check(remembered,'Retained helper reference conflicts; preserve it and use local removal/retirement before new account operations');
  trust(path.dirname(node));
  const report=value=>info.trust_expired||info.previous_helper||!remembered?{...value,helper_trust_expired:info.trust_expired??false,previous_helper:info.previous_helper??false,renewal_required:Boolean(info.trust_expired||info.previous_helper),helper_reference_conflict:!remembered}:value;
  let exactOutput;
  const execute=(cmd,args=[])=>{
    const auth=['login','status','logout'].includes(cmd)?['--keychain-helper',path.join(root,'native/keychain-bridge'),'--keychain-sha256',info.keychain_sha256??release.keychain_sha256]:[];
    const r=run(node,[path.join(root,'scripts/connected-skills.mjs'),cmd,'--codex-home',home,...auth,...args],{encoding:'utf8',shell:false,timeout:900000,maxBuffer:4*1024*1024,env:{HOME:os.homedir(),PATH:'/usr/bin:/bin:/usr/sbin:/sbin',LANG:'en_US.UTF-8'}});
    check(!r.error&&r.status===0&&!r.signal,`Delivery step ${cmd} failed or was interrupted. ${typeof r.stderr==='string'&&r.stderr.startsWith('Shared Skills login: ')?r.stderr.slice(0,4096).trim():'Inspect local status and retained evidence before retry.'} Completed steps are preserved.`);
    try{const value=JSON.parse(r.stdout);exactOutput=r.stdout;return value;}catch{fail('Unsupported helper response; do not claim success');}
  };
  const sameAccount=value=>check(value.state==='signed-in-local'&&value.service==='https://app.agentupskill.ai'&&value.codex_profile===home&&value.principal_id===expected?.principalId&&value.workspace_id===expected?.workspaceId&&value.entitlement_version===expected?.entitlementVersion,'Helper account differs from the connected website account; preserve credentials and stop before enrollment. Inspect status and obtain separate explicit approval for helper logout before retrying login');
  if(needsAccount){
    if(command!=='login')sameAccount(execute('status'));
  }
  if(command==='login'){
    const current=execute('status');
    if(current.state!=='signed-out'){sameAccount(current);return current;}
    check(current.codex_profile===home,'Helper status home mismatch');
    const value=execute('login',['--service','https://app.agentupskill.ai',...flags]);sameAccount(value);return value;
  }
  if(command==='logout'){
    check(flags.length===4&&flags[0]==='--confirmed-principal'&&flags[2]==='--confirmed-workspace'&&flags[1]&&flags[3],'Explicitly approve the inspected helper principal/workspace before helper logout');
    const current=execute('status');
    check(current.state==='signed-in-local'&&current.service==='https://app.agentupskill.ai'&&current.codex_profile===home&&current.principal_id===flags[1]&&current.workspace_id===flags[3],'Helper logout binding changed; inspect status and obtain fresh approval');
    return report(execute('logout'));
  }
  const extra=command==='automation-preview'?['--root-pin',release.root_pin,'--artifact-origin','https://agentupskill.workers.dev','--artifact-layout','publication-workers-v1']:[];
  const value=execute(command,[...extra,...flags]);
  if(command==='automation-preview'){
    check(value.specification?.account?.principal_id===expected.principalId&&value.specification.account.workspace_id===expected.workspaceId&&value.specification.account.codex_profile===home&&value.specification.entitlement_version===expected.entitlementVersion&&/^[a-f0-9]{64}$/.test(value.confirmation_sha256),'Enrollment preview account mismatch');
  }
  if(command==='automation-native-home-recovery-preview'){
    const account=value.expected?.account;
    check(value.kind==='SharedSkillsNativeHomeRecoveryPreview'&&account?.principal_id===expected.principalId&&account.workspace_id===expected.workspaceId&&account.codex_profile===home&&account.service==='https://app.agentupskill.ai','Native home recovery preview account mismatch');
  }
  if(command==='automation-native-home-recovery-retire-preview'){
    check(value.kind==='SharedSkillsNativeHomeRecoveryRetirement'&&value.codex_home===home,'Native home recovery retirement preview home mismatch');
    check(flags.includes('--native-root')&&flags.includes('--recovery-directory')&&value.native_root===flags[flags.indexOf('--native-root')+1]&&value.directory===flags[flags.indexOf('--recovery-directory')+1],'Native home recovery retirement preview request mismatch');
  }
  if(['automation-preview','automation-remove-enrollment-preview','automation-native-home-recovery-preview','automation-native-home-recovery-retire-preview'].includes(command)){
    check(/^[a-f0-9]{64}$/.test(value.confirmation_sha256),'Helper preview has no exact confirmation digest');
    makePrivate(path.dirname(storage),trust);makePrivate(storage,trust);
    const dir=path.join(storage,'previews');makePrivate(dir,trust);
    // Preserve the helper's canonical bytes exactly. Its confirmation commands
    // intentionally reject pretty-printed or reordered preview files.
    const file=path.join(dir,value.confirmation_sha256+'.json'),bytes=Buffer.from(exactOutput);
    if(exists(file)){const s=fs.lstatSync(file);check(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.uid===process.getuid()&&!(s.mode&0o077)&&fs.readFileSync(file).equals(bytes),'Prior preview differs; preserve it for inspection');}
    else fs.writeFileSync(file,bytes,{flag:'wx',mode:0o600});
    return report({preview_file:file,preview:value});
  }
  return report(value);
}

export async function main(args){
  const [action,...rest]=args;
  if(['prepare','repair','inspect'].includes(action)){
    check(rest.length===2&&rest[0]==='--codex-home'&&rest[1],'Supply --codex-home with the real existing home');
    return action==='inspect'?inspectDelivery({home:rest[1],allowExpired:true}):prepareDelivery({home:rest[1],repair:action==='repair'});
  }
  if(['retire-helper-preview','retire-helper'].includes(action)){
    check(rest[0]==='--codex-home'&&rest[1]&&(action==='retire-helper-preview'?rest.length===2:rest.length===4&&rest[2]==='--confirmation-sha256'&&/^[a-f0-9]{64}$/.test(rest[3])),'Supply the real home and exact retirement confirmation');
    return retireHelper({home:rest[1],confirmation:action==='retire-helper'?rest[3]:undefined});
  }
  check(action==='run'&&rest.length>0,'Usage: delivery.mjs prepare|repair|inspect|retire-helper-preview|retire-helper|run COMMAND --codex-home HOME [expected-account flags] [helper options]');
  const command=rest.shift(),options={expected:{},flags:[]},keys={'--codex-home':'home','--expected-principal':'principalId','--expected-workspace':'workspaceId','--expected-entitlement':'entitlementVersion'},seen=new Set();
  for(let i=0;i<rest.length;i++){
    const key=rest[i];
    if(Object.hasOwn(keys,key)){check(!seen.has(key)&&rest[i+1]&&!rest[i+1].startsWith('--'),'Missing or duplicate setup argument');seen.add(key);const value=rest[++i];if(key==='--codex-home')options.home=value;else options.expected[keys[key]]=value;}
    else options.flags.push(key);
  }
  return runDelivery(command,options);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(fs.realpathSync(process.argv[1])).href){
  try{console.log(JSON.stringify(await main(process.argv.slice(2))));}catch(error){console.error(error.message);process.exitCode=1;}
}
