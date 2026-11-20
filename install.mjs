#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {readFileSync,readdirSync,realpathSync,lstatSync,statSync,constants,openSync,closeSync,readSync,fstatSync} from 'node:fs';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
import {resolve,dirname,isAbsolute,normalize,parse,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';

const source='https://github.com/agentupskill-ai/codex-plugin-marketplace';
const name='agentupskill-setup';
const pluginId='up@'+name;
export const version='0.8.22';
const retirementHoldFlag='--acknowledge-retained-helper-retirement-hold';
const retirementHoldNotice=pin=>`The retained ${pin.slice(0,8)} helper will lose automation-native-home-recovery-retire-preview and automation-native-home-recovery-retire after this ${version} plugin upgrade because its payload differs from the current signed helper. Other supported local controls remain available. If archive retirement is needed, stop before upgrading and ask your setup operator to verify the archive-retirement controls for this exact helper. Acknowledgment covers only these two retirement holds, not helper renewal, enrollment, recovery or changed state.`;
// Predecessors whose delivery release is identical to this one: their retained
// helpers already hold the two retirement commands, so upgrading changes nothing.
const retirementHeldBy=['0.8.20'];
const retirementUnchangedNotice=(pin,from)=>`The retained ${pin.slice(0,8)} helper already holds automation-native-home-recovery-retire-preview and automation-native-home-recovery-retire under ${from}; they stay held after this ${version} plugin upgrade, so no acknowledgment is needed. Other supported local controls remain available.`;
const predecessorVersions=['0.6.0','0.7.0','0.8.0','0.8.1','0.8.2','0.8.3','0.8.4','0.8.5','0.8.6','0.8.7','0.8.8','0.8.9','0.8.10','0.8.11','0.8.12','0.8.13','0.8.14','0.8.15','0.8.16','0.8.18','0.8.19','0.8.20'];
export const expected={
  '.agents/plugins/marketplace.json':{name,interface:{displayName:'Agent Upskill Setup'},plugins:[{name:'up',source:{source:'local',path:'./plugins/agentupskill'},policy:{installation:'AVAILABLE',authentication:'ON_USE'},category:'Productivity'}]},
  'plugins/agentupskill/.codex-plugin/plugin.json':{name:'up',version,description:'Connect Agent Upskill and carry useful context between Codex conversations.',skills:'./skills/',mcpServers:'./.mcp.json',extensions:{'com.openai':{onboardingSkill:'./skills/setup/SKILL.md'}}},
  'plugins/agentupskill/.mcp.json':{mcpServers:{'agentupskill-bundled-connect':{type:'http',url:'https://app.agentupskill.ai/mcp'}}}
};

// Keep in sync with delivery-release.json; the archive contains no executable
// helper import here. A dropped pin must retain its old controls before upgrade.
const acceptedHelperPins=['8e10ae982ee629720d048793bf2660d4ec28e96b94fbd92a8faa219f1e551318','10096e84c9282973a1186b733b40a55e56a003837bcb77ab19a9d15a9b9e11fc','7f8772a746ab5c1488736160fd2dc1afbfb71bc75b4458005f7f4d998bfde2ea'];
const denyACL=/^\s*\d+:\s+(?:(?:user|group):\S+|[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12})\s+(?:inherited\s+)?deny\s+[a-z][a-z_,]*(?:\s+inherited)?\s*$/;
function helperLocation(root,forbiddenRoots=[]){
  if(typeof root!=='string'||!isAbsolute(root)||normalize(root)!==root||root.length>4096||/[\u0000-\u001f\u007f]/.test(root)||/\/(?:plugins\/cache|\.tmp)(?:\/|$)/i.test(root))throw new Error('Invalid durable helper location');
  if(forbiddenRoots.some(parent=>root===parent||root.startsWith(parent+sep)))throw new Error('Helper location is inside a marketplace checkout');
}
function protectedHelperLocation(root){
  let leaf;try{leaf=lstatSync(root);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(leaf&&(!leaf.isDirectory()||leaf.isSymbolicLink()||leaf.uid!==process.getuid()||(leaf.mode&0o077)))throw new Error('Unsafe helper location');
  // A missing stored helper may be repaired only at that exact path. As in the
  // released repair flow, its existing parent must be protected and canonical.
  const directory=leaf?root:dirname(root);let current=parse(directory).root;
  for(const part of [null,...directory.slice(current.length).split(sep).filter(Boolean)]){
    if(part!==null)current=resolve(current,part);
    const st=lstatSync(current);
    if(!st.isDirectory()||st.isSymbolicLink()||(st.uid!==0&&st.uid!==process.getuid())||(st.mode&0o022)||realpathSync(current)!==current)throw new Error('Unsafe helper location ancestor');
    const acl=spawnSync('/bin/ls',['-lde',current],{encoding:'utf8',shell:false,timeout:10000,maxBuffer:8192,env:{LC_ALL:'C'}});
    if(acl.error||acl.status!==0||acl.signal||typeof acl.stdout!=='string')throw new Error('Could not verify helper location ACL');
    const lines=acl.stdout.trimEnd().split('\n');
    if(!lines[0]||lines.length>64||!lines.slice(1).every(line=>denyACL.test(line))||(lines[0].slice(0,11).includes('+')&&lines.length===1))throw new Error('Unsafe helper location ACL');
  }
}
function preserveDeliveryControls(forbiddenRoots=[]){
  let home;
  try{home=realpathSync(resolve(process.env.CODEX_HOME??resolve(homedir(),'.codex')));}
  catch(error){if(error.code==='ENOENT')return;throw error;}
  const s=statSync(home),identity=JSON.stringify([home,s.dev,s.ino,s.uid]);
  const locator=resolve(homedir(),'Library','Application Support','AgentUpskill Shared Skills','delivery','helper-'+createHash('sha256').update(identity).digest('hex')+'.json');
  let enrolled=false,previousPin=false,retainedPin=null,retainedRoot=null;const references=[];
  for(const [file,enrollment] of [[resolve(home,'shared-skills-automation','enrollment.json'),true],[locator,false]]){
    let st;
    try{st=lstatSync(file);}catch(error){if(error.code==='ENOENT')continue;throw error;}
    const hold='Delivery state needs review before this plugin upgrade. Keep the installed plugin and use its delivery skill to inspect, pause, detach through the exact removal preview, settle migration recovery and retire its helper reference before retrying. If no delivery skill is installed, stop and ask your setup operator to review the original standalone helper controls or the published 0.8.1 recovery route. Do not delete state, reset credentials or stop a live operation manually.';
    if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.uid!==process.getuid()||(st.mode&0o077)||st.size>(enrollment?2*1024*1024:4096))throw new Error(hold);
    let value,bytes;try{bytes=readFileSync(file);value=JSON.parse(bytes.toString('utf8'));}catch{throw new Error(hold);}
    const pin=enrollment?value?.preview?.helper_sha256:value?.helper_sha256;
    if(!acceptedHelperPins.includes(pin)||retainedPin!==null&&retainedPin!==pin)throw new Error(hold);
    const root=enrollment?value?.preview?.specification?.helper_root:value?.helper_root;
    try{helperLocation(root,forbiddenRoots);}catch{throw new Error(hold);}
    if(retainedRoot!==null&&retainedRoot!==root)throw new Error(hold);retainedRoot=root;
    retainedPin=pin;references.push({file,sha256:createHash('sha256').update(bytes).digest('hex')});
    enrolled=true;previousPin||=pin!==acceptedHelperPins[0];
  }
  if(enrolled)try{protectedHelperLocation(retainedRoot);}catch{throw new Error('Delivery state needs review before this plugin upgrade. Its stored helper location is not a protected canonical directory or an exact missing-helper repair location. Preserve both records and all bytes; ask the setup operator for reviewed compatible repair or reconciliation.');}
  return enrolled?{enrolled,previousPin,retainedPin,identity,references}:undefined;
}

function command(binary,args) {
  const result=spawnSync(binary,args,{encoding:'utf8',shell:false,timeout:120_000,maxBuffer:4*1024*1024});
  // Native output can contain local configuration or credentials. Do not echo it.
  if(result.error || result.status!==0){
    const stage=binary==='git'?'Git checkout inspection':`codex ${args.slice(0,3).join(' ')}`;
    const reason=result.error?.code??`exit ${result.status}`;
    throw new Error(`${stage} failed (${reason}). Check that Codex and Git are installed and network access is available. Completed steps are preserved; inspect this native command’s error in your setup chat, resolve it and retry.`);
  }
  return result.stdout;
}
function json(args) {
  try{return JSON.parse(command('codex',args));}
  catch(error){if(error instanceof SyntaxError)throw new Error('Codex returned an unsupported response. Update Codex and retry.');throw error;}
}
function nativeInstallRecord(root,ref){
  const file=resolve(root,'.codex-marketplace-install.json');let before;
  try{before=lstatSync(file);}catch(error){if(error.code==='ENOENT')return false;throw error;}
  const hold='Codex installation metadata could not be verified. Review its stable file identity, readable contents and five-field pinned Git schema with no sparse paths. Preserve the record and its permissions; ask your setup operator for a reviewed compatible installer.';
  const safe=st=>st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&st.uid===process.getuid()&&!(st.mode&0o022)&&st.size<=4096;
  const sameFile=st=>safe(st)&&['dev','ino','size','uid','mode','mtimeMs','ctimeMs'].every(key=>st[key]===before[key]);
  if(!safe(before))throw new Error('Codex installation metadata could not be verified: its file type, ownership, link count, size or permissions are unsafe. Preserve the record and its permissions; ask your setup operator to review it before retrying.');
  try{
    const fd=openSync(file,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);let bytes;
    try{
      if(!sameFile(fstatSync(fd)))throw new Error();
      const buffer=Buffer.alloc(4097);let size=0;
      while(size<buffer.length){const n=readSync(fd,buffer,size,buffer.length-size,null);if(!n)break;size+=n;}
      if(size!==before.size||!sameFile(fstatSync(fd))||!sameFile(lstatSync(file)))throw new Error();
      bytes=buffer.subarray(0,size);
    }finally{closeSync(fd);}
    const value=JSON.parse(bytes.toString('utf8'));
    const normalized=typeof value?.source==='string'?value.source.replace(/\/$/,'').replace(/\.git$/,''):null;
    if(normalized!==source||!isDeepStrictEqual(value,{source_type:'git',source:value.source,ref_name:ref,revision:ref,sparse_paths:[]}))throw new Error();
  }catch{throw new Error(hold);}
  // Preserve the safe Git diagnostic if inspection itself fails.
  // This exception is for native, untracked metadata only, never package content.
  if(command('git',['-C',root,'ls-files','-z','--','.codex-marketplace-install.json']))throw new Error(hold);
  return true;
}
function marketplace(ref,values=expected) {
  const result=json(['plugin','marketplace','list','--json']);
  if(!Array.isArray(result.marketplaces))throw new Error('Unsupported Codex marketplace response. Update Codex and retry.');
  const matches=result.marketplaces.filter(entry=>entry.name===name);
  if(matches.length>1)throw new Error('Conflicting Agent Upskill marketplaces. Review them in Codex before retrying.');
  const entry=matches[0];
  if(!entry)return null;
  const registeredSource=entry.marketplaceSource?.source;
  const normalizedSource=typeof registeredSource==='string'?registeredSource.replace(/\/$/,'').replace(/\.git$/,''):null;
  if(entry.marketplaceSource?.sourceType!=='git' || normalizedSource!==source || typeof entry.root!=='string')throw new Error('The Agent Upskill marketplace source does not match the reviewed HTTPS URL. Review it in Codex.');
  if(command('git',['-C',entry.root,'rev-parse','HEAD']).trim()!==ref)throw new Error('The Agent Upskill marketplace has a different commit. Use Codex’s native update controls after reviewing the new version.');
  const nativeRecord=nativeInstallRecord(entry.root,ref);
  const changes=command('git',['-C',entry.root,'status','--porcelain','--untracked-files=all']).trim();
  if(changes&&!(nativeRecord&&changes==='?? .codex-marketplace-install.json'))throw new Error('The marketplace checkout has local changes. Review those changes before retrying.');
  for(const [path,value] of Object.entries(values)){
    let actual;
    try{actual=JSON.parse(readFileSync(resolve(entry.root,path),'utf8'));}catch{throw new Error('The existing marketplace could not be verified.');}
    if(!isDeepStrictEqual(actual,value))throw new Error('The existing marketplace differs from the reviewed package.');
  }
  return entry;
}
function installed({allowOlder=false}={}) {
  const result=json(['plugin','list','--marketplace',name,'--json']);
  if(!Array.isArray(result.installed))throw new Error('Unsupported Codex plugin response. Update Codex and retry.');
  if(result.installed.some(entry=>entry.pluginId==='agentupskill@'+name && entry.installed===true))throw new Error('The legacy agentupskill plugin is installed. Review a native rename migration to up before retrying; nothing was replaced or duplicated. Preserve the existing connector and credentials.');
  if(result.installed.some(entry=>entry.installed===true&&entry.pluginId!==pluginId))throw new Error('Unexpected installed plugin in the Agent Upskill marketplace. Preserve it and review before updating this marketplace.');
  const matches=result.installed.filter(entry=>entry.pluginId===pluginId);
  if(matches.length>1)throw new Error('Conflicting Agent Upskill installations. Review them in Codex.');
  const entry=matches[0];
  if(entry && ((entry.version!==version&&!(allowOlder&&predecessorVersions.includes(entry.version))) || entry.enabled!==true || entry.installed!==true))throw new Error('Agent Upskill is disabled or has a different version. Review it with Codex’s native plugin controls; nothing was replaced.');
  return entry;
}

function installedCache(entry,root,{allowMissing=false}={}){
  const home=realpathSync(resolve(process.env.CODEX_HOME??resolve(homedir(),'.codex')));
  const cache=resolve(home,'plugins','cache',name,'up',entry.version);
  const hold='The installed Agent Upskill cache does not exactly match the reviewed package. Preserve the cache and credentials; ask your setup operator for a reviewed native repair before retrying.';
  let contentMismatch=false,reason='The cache contents or stable file identity could not be inspected safely.';
  const unsafe='The cache has an unsafe file type, ownership, link count or permissions.';
  const compare=(reviewed,installed)=>{
    const a=lstatSync(reviewed),b=lstatSync(installed);
    if(a.isSymbolicLink()||b.isSymbolicLink()||b.uid!==process.getuid()||(b.mode&0o022)){reason=unsafe;throw new Error();}
    if(a.isDirectory()&&b.isDirectory()){
      const files=readdirSync(reviewed).sort(),actual=readdirSync(installed).sort();
      if(actual.some(file=>!files.includes(file))){reason='The cache contains unexpected files requiring operator review.';throw new Error();}
      if(files.length!==actual.length)contentMismatch=true;
      for(const file of actual)compare(resolve(reviewed,file),resolve(installed,file));
    }else if(a.isFile()&&b.isFile()&&b.nlink===1){
      if(a.size!==b.size||(a.mode&0o111)!==(b.mode&0o111))contentMismatch=true;
      const same=st=>['dev','ino','size','uid','mode','nlink','mtimeMs','ctimeMs'].every(key=>st[key]===b[key]);
      const fd=openSync(installed,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
      try{
        if(!same(fstatSync(fd)))throw new Error();
        const bytes=Buffer.alloc(a.size+1);let size=0;
        while(size<bytes.length){const n=readSync(fd,bytes,size,bytes.length-size,null);if(!n)break;size+=n;}
        if(!same(fstatSync(fd))||!same(lstatSync(installed)))throw new Error();
        if(size!==a.size||!readFileSync(reviewed).equals(bytes.subarray(0,size)))contentMismatch=true;
      }finally{closeSync(fd);}
    }else{reason=unsafe;throw new Error();}
  };
  try{
    // Check every existing ancestor even when an interrupted copy left no cache.
    let directory=home,missing=false;
    for(const part of ['.','plugins','cache',name,'up',entry.version]){
      directory=resolve(directory,part);let st;
      try{st=lstatSync(directory);}catch(error){if(error.code!=='ENOENT')throw error;missing=true;break;}
      if(!st.isDirectory()||st.isSymbolicLink()||st.uid!==process.getuid()||(st.mode&0o022)||realpathSync(directory)!==directory){reason='A cache ancestor has an unsafe directory type, ownership, permissions or noncanonical path.';throw new Error();}
    }
    if(missing){if(allowMissing)return;contentMismatch=true;}
    else compare(resolve(root,'plugins','agentupskill'),cache);
  }catch{throw new Error(hold+' '+reason);}
  // Only a complete safe inventory can permit native recopy of changed content.
  if(contentMismatch){const error=new Error(hold);error.canRecopy=true;throw error;}
}

async function publicMetadata(ref,allowOlder=false){
  const values={};
  for(const path of Object.keys(expected)){
    const response=await fetch(`${source.replace('https://github.com/','https://raw.githubusercontent.com/')}/${ref}/${path}`,{redirect:'error',signal:AbortSignal.timeout(15_000)});
    if(!response.ok)throw new Error('The reviewed public package is unavailable. Nothing was installed.');
    values[path]=await response.json();
  }
  let wanted=expected;
  if(allowOlder){
    const manifest=values['plugins/agentupskill/.codex-plugin/plugin.json'];
    if(!predecessorVersions.includes(manifest?.version))throw new Error(`Only reviewed up ${predecessorVersions.join('/')} predecessors can use this native update.`);
    const {extensions,...prior}=expected['plugins/agentupskill/.codex-plugin/plugin.json'];
    wanted={...expected,'plugins/agentupskill/.codex-plugin/plugin.json':{...(predecessorVersions.filter(v=>v.startsWith('0.8.')).includes(manifest.version)?expected['plugins/agentupskill/.codex-plugin/plugin.json']:prior),version:manifest.version}};
  }
  if(!isDeepStrictEqual(values,wanted))throw new Error('The reviewed public package has unexpected metadata. Nothing was installed.');
  return values;
}
export async function install(ref,{upgradeFrom,acknowledgeRetainedHelperRetirementHold=false}={}) {
  if(process.platform!=='darwin'||typeof process.getuid!=='function')throw new Error('This installer is supported on macOS only. No registration or installation was attempted; ask your setup operator for a reviewed installer for this platform.');
  if(typeof ref!=='string' || !/^[a-f0-9]{40}$/.test(ref))throw new Error('Supply the reviewed 40-character commit from your Agent Upskill setup page with --ref. Moving branches are not accepted.');
  if(upgradeFrom!==undefined&&(!/^[a-f0-9]{40}$/.test(upgradeFrom)||upgradeFrom===ref))throw new Error('Use the exact different reviewed predecessor commit with --upgrade-from.');
  if(typeof acknowledgeRetainedHelperRetirementHold!=='boolean')throw new Error('Use '+retirementHoldFlag+' only as an explicit acknowledgment.');
  await publicMetadata(ref);
  const prior=upgradeFrom?await publicMetadata(upgradeFrom,true):null;
  const delivery=preserveDeliveryControls()??{}, {enrolled,previousPin,retainedPin}=delivery;
  const priorVersion=prior?.['plugins/agentupskill/.codex-plugin/plugin.json'].version;
  const retirementUnchanged=previousPin&&retirementHeldBy.includes(priorVersion);
  let predecessorRemoved=false,targetRegistered=false,retirementNoticePrinted=false;const marketplaceRoots=[];
  const reviewHold=message=>{
    const partial=predecessorRemoved||targetRegistered?(predecessorRemoved?' This invocation removed the predecessor marketplace. ':(upgradeFrom?' This retry':' This invocation')+' started without a registered marketplace; it did not remove the predecessor marketplace. ')+(targetRegistered?'It registered the reviewed target marketplace, but the plugin update has not run.':'The target marketplace has not been registered and the plugin update has not run.')+' Preserve the remaining cached plugin/helper bytes, delivery references, recovery evidence and credentials in place. The installer will not reset or delete them. Do not rely on a delivery skill hidden by the missing marketplace or use direct native registration commands to bypass this hold. Ask the setup operator to reconcile the references through reviewed compatible controls. After that review, retry this installer with --ref '+ref+(upgradeFrom?' --upgrade-from '+upgradeFrom:'')+'; include '+retirementHoldFlag+' only if its specific capability loss is required and approved. Unknown, dropped or inconsistent references must be resolved through supported reconciliation, not overridden.':'';
    return Object.assign(new Error(message+partial),{deliveryReviewHold:true});
  };
  const mutate=args=>{
    let fresh;try{fresh=preserveDeliveryControls(marketplaceRoots)??{};}catch(error){throw reviewHold(predecessorRemoved||targetRegistered?'Delivery references could not be validated before the next native mutation; acknowledgment does not override this hold.':error.message);}
    if(!isDeepStrictEqual(fresh,delivery))throw reviewHold('Delivery references changed before native mutation. Preserve the current state and review a fresh upgrade; acknowledgment does not override changed state.');
    if(previousPin&&!retirementUnchanged&&!acknowledgeRetainedHelperRetirementHold)throw reviewHold(retirementHoldNotice(retainedPin)+' Review this capability loss and explicitly acknowledge it with '+retirementHoldFlag+' before retrying. No native mutation was attempted by this invocation.');
    if(previousPin&&!retirementNoticePrinted){console.error('The enrolled delivery helper uses a previous pin. Account delivery and rollback require renewal with a new preview and consent before a helper update. '+(retirementUnchanged?retirementUnchangedNotice(retainedPin,priorVersion):retirementHoldNotice(retainedPin))+' This plugin upgrade preserves enrollment and credentials.');retirementNoticePrinted=true;}
    return command('codex',args);
  };
  const restoration='If its registration is absent or interrupted, preserve the current state and retry this reviewed installer after any required capability-loss acknowledgment and reference review. Do not use direct native registration commands; ask the setup operator for reviewed compatible reconciliation if the guarded installer cannot proceed.';
  const recovery=(prior?`Reviewed predecessor: ${upgradeFrom}. `:'')+`Reviewed target: ${ref}. ${restoration} Otherwise preserve the registered checkout and ask your setup operator for a reviewed compatible installer. Then retry --ref ${ref}${prior?` --upgrade-from ${upgradeFrom}`:''}${acknowledgeRetainedHelperRetirementHold?` ${retirementHoldFlag}`:''}. Preserve the plugin and credentials; do not remove the plugin or reset login.`;
  const targetMarketplace=(registeredNow=false)=>{
    try{return marketplace(ref);}
    catch(error){
      const stage=registeredNow?`${predecessorRemoved?'The predecessor marketplace was removed. ':''}The target marketplace was registered.`:'The target marketplace is already registered.';
      throw new Error(`${stage} Checkout verification stopped before installation could be verified. ${error.message} ${recovery}`);
    }
  };
  const listing=json(['plugin','marketplace','list','--json']);
  if(!Array.isArray(listing.marketplaces))throw new Error('Unsupported Codex marketplace response.');
  const candidates=listing.marketplaces.filter(entry=>entry.name===name);
  for(const entry of candidates)if(typeof entry.root==='string')try{marketplaceRoots.push(realpathSync(entry.root));}catch{/* Existing target validation still holds unreadable checkouts. */}
  if(candidates.length>1)throw new Error('Conflicting Agent Upskill marketplaces. Nothing was replaced.');
  let existing=null,predecessor=false;
  if(candidates.length){
    const entry=candidates[0];
    if(typeof entry.root!=='string')throw new Error('Unsupported marketplace root. Nothing was replaced.');
    let actual;
    try{actual=command('git',['-C',entry.root,'rev-parse','HEAD']).trim();}
    catch(error){throw new Error('The registered marketplace checkout is incomplete or unavailable. '+error.message+' '+recovery);}
    if(actual===ref)existing=targetMarketplace();
    else if(prior&&actual===upgradeFrom){existing=marketplace(upgradeFrom,prior);predecessor=true;}
    else throw new Error('The marketplace has a different commit. Review the exact predecessor and use --upgrade-from; nothing was replaced.');
  }
  let current;
  try{current=installed({allowOlder:Boolean(prior)});}
  catch(error){throw new Error(error.message+' '+recovery);}
  if(current&&!existing&&!prior)throw new Error('An existing plugin has no verified marketplace. Nothing was replaced. '+recovery);
  if(current&&current.version!==version&&current.version!==priorVersion)throw new Error('Installed version does not match the reviewed predecessor. Nothing was replaced.');
  if(current&&predecessor)installedCache(current,existing.root);
  if(enrolled&&!previousPin&&prior&&(predecessor||!existing||current?.version!==version))console.error('This plugin upgrade preserves delivery enrollment and credentials. Delivery controls remain bound to their enrolled helper pin; inspect delivery after upgrading before using controls from the new plugin.');
  if(predecessor){
    if(current&&current.version!==prior['plugins/agentupskill/.codex-plugin/plugin.json'].version)throw new Error('Installed version does not match the reviewed predecessor. Nothing was replaced.');
    // The native CLI rejects a changed pinned ref for an existing source. Its
    // scoped marketplace removal retains plugin settings/cached credentials.
    // Re-add retargets only this marketplace. Never invoke plugin remove.
    mutate(['plugin','marketplace','remove',name]);existing=null;predecessorRemoved=true;
  }
  if(!existing){
    // Native listing can hide a disabled installation until its marketplace is restored.
    try{mutate(['plugin','marketplace','add',source,'--ref',ref,'--json']);targetRegistered=true;}
    catch(error){if(error.deliveryReviewHold)throw error;throw new Error(error.message+' '+recovery);}
    existing=targetMarketplace(true);
    if(existing)marketplaceRoots.push(realpathSync(existing.root));
    if(!existing)throw new Error('Codex did not register the reviewed marketplace. Retry after checking Codex. '+recovery);
  }
  // Reinspect after registration; a disabled cache can be hidden while its
  // marketplace is missing. Retry must never reenable that installation.
  const afterRegistration=installed({allowOlder:Boolean(prior)});
  if(afterRegistration&&afterRegistration.version!==version&&afterRegistration.version!==priorVersion)throw new Error('Installed version does not match the reviewed predecessor. Preserve the registered target marketplace, plugin and credentials; review the exact predecessor before retrying.');
  const failureState=error=>{
    let state='The installed plugin and cache state could not be verified.',targetRetry=false;
    try{
      const observed=json(['plugin','list','--marketplace',name,'--json']);
      const matches=observed.installed.filter(entry=>entry.pluginId===pluginId&&entry.installed===true);
      if(matches.length===1&&typeof matches[0].enabled==='boolean'){
        const entry=matches[0];let verified=false;
        if(entry.version===version)try{installedCache(entry,existing.root);verified=true;targetRetry=entry.enabled;}catch(cacheError){targetRetry=entry.enabled&&cacheError.canRecopy===true;}
        const observedVersion=entry.version===version?`${version} (target)`:predecessorVersions.includes(entry.version)?`${entry.version} (predecessor)`:'unrecognized';
        state=`Codex reports the plugin ${entry.enabled?'enabled':'disabled'}; the reviewed target cache is ${verified?'verified':'unverified'}. Installed version: ${observedVersion}.`;
      }else if(matches.length===0)state='Codex reports no installed plugin; the target cache is unverified.';
    }catch{}
    const action=targetRetry?'This already enabled target can retry this installer; ordinary changed content permits one native recopy from the verified checkout.':'This state requires setup-operator repair before retrying. Do not use native recopy to bypass unsafe ownership, links, permissions, ancestors or unexpected files, or to activate a stale target over a predecessor.';
    return new Error(error.message+' '+state+' If content is unverified or state is unknown, stop using the plugin and use Codex’s native plugin controls to disable and inspect it with your setup operator. Preserve the cache and credentials. '+action+' '+recovery);
  };
  let needsAdd=!afterRegistration||afterRegistration.version!==version;
  if(!needsAdd){
    try{installedCache(afterRegistration,existing.root);}
    catch(error){if(!error.canRecopy)throw failureState(error);needsAdd=true;}
  }else{
    // Never activate stale target bytes left by a previous interrupted copy.
    try{installedCache({version},existing.root,{allowMissing:true});}catch(error){throw failureState(error);}
  }
  if(needsAdd){
    try{mutate(['plugin','add',pluginId]);}
    catch(error){if(error.deliveryReviewHold)throw error;throw failureState(error);}
  }
  let confirmed;
  try{confirmed=installed();}catch(error){throw failureState(error);}
  if(!confirmed)throw failureState(new Error('Codex did not report an enabled installation. Check its plugin controls and retry.'));
  try{installedCache(confirmed,existing.root);}catch(error){throw failureState(error);}
  return `Agent Upskill ${version} is installed. Return to your setup chat for browser sign-in and verification. Installation alone does not confirm connection or memory access.`;
}

if(process.argv[1] && import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href){
  const args=process.argv.slice(2),ackIndex=args.indexOf(retirementHoldFlag),acknowledged=ackIndex>=0;
  const validAck=!acknowledged||ackIndex===args.length-1&&args.lastIndexOf(retirementHoldFlag)===ackIndex;
  if(acknowledged&&validAck)args.pop();
  const usage='Usage: agentupskill-install --ref <reviewed commit> [--upgrade-from <reviewed predecessor>] ['+retirementHoldFlag+']';
  if(args.length===1&&args[0]==='--help'&&!acknowledged)console.log(usage+'\nRegisters and installs the reviewed plugin using Codex. Does not sign in, change MCP settings or save memory. The acknowledgment accepts only the two retained-helper archive retirement holds.');
  else if(!validAck||![2,4].includes(args.length)||args[0]!=='--ref'||(args.length===4&&args[2]!=='--upgrade-from')){console.error(usage);process.exitCode=1;}
  else try{console.log(await install(args[1],{upgradeFrom:args[3],acknowledgeRetainedHelperRetirementHold:acknowledged}));}catch(error){console.error(error instanceof Error?error.message:'Installation failed.');process.exitCode=1;}
}
