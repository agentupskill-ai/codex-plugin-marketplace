#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {readFileSync,readdirSync,realpathSync,lstatSync,statSync,constants,openSync,closeSync,readSync,fstatSync} from 'node:fs';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';

const source='https://github.com/agentupskill-ai/codex-plugin-marketplace';
const name='agentupskill-setup';
const pluginId='up@'+name;
export const version='0.8.13';
const predecessorVersions=['0.6.0','0.7.0','0.8.0','0.8.1','0.8.2','0.8.3','0.8.4','0.8.5','0.8.6','0.8.7','0.8.8','0.8.9','0.8.10','0.8.11','0.8.12'];
export const expected={
  '.agents/plugins/marketplace.json':{name,interface:{displayName:'Agent Upskill Setup'},plugins:[{name:'up',source:{source:'local',path:'./plugins/agentupskill'},policy:{installation:'AVAILABLE',authentication:'ON_USE'},category:'Productivity'}]},
  'plugins/agentupskill/.codex-plugin/plugin.json':{name:'up',version,description:'Connect Agent Upskill and carry useful context between Codex conversations.',skills:'./skills/',mcpServers:'./.mcp.json',extensions:{'com.openai':{onboardingSkill:'./skills/setup/SKILL.md'}}},
  'plugins/agentupskill/.mcp.json':{mcpServers:{'agentupskill-bundled-connect':{type:'http',url:'https://app.agentupskill.ai/mcp'}}}
};

// Keep in sync with delivery-release.json; the archive contains no executable
// helper import here. A dropped pin must retain its old controls before upgrade.
const acceptedHelperPins=['c02791d54e5a6a24ca7314180f960ed159a031964c5ae701754f02af21196ce3','18369021e0dc5122460195589c02ee85385d0bd30f420876bf3f9773cb0977f9'];
function preserveDeliveryControls(){
  let home;
  try{home=realpathSync(resolve(process.env.CODEX_HOME??resolve(homedir(),'.codex')));}
  catch(error){if(error.code==='ENOENT')return;throw error;}
  const s=statSync(home),identity=JSON.stringify([home,s.dev,s.ino,s.uid]);
  const locator=resolve(homedir(),'Library','Application Support','AgentUpskill Shared Skills','delivery','helper-'+createHash('sha256').update(identity).digest('hex')+'.json');
  let enrolled=false,previousPin=false;
  for(const [file,enrollment] of [[resolve(home,'shared-skills-automation','enrollment.json'),true],[locator,false]]){
    let st;
    try{st=lstatSync(file);}catch(error){if(error.code==='ENOENT')continue;throw error;}
    const hold='Delivery state needs review before this plugin upgrade. Keep the installed plugin and use its delivery skill to inspect, pause, detach through the exact removal preview, settle migration recovery and retire its helper reference before retrying. If no delivery skill is installed, stop and ask your setup operator to review the original standalone helper controls or the published 0.8.1 recovery route. Do not delete state, reset credentials or stop a live operation manually.';
    if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.uid!==process.getuid()||(st.mode&0o077)||st.size>(enrollment?2*1024*1024:4096))throw new Error(hold);
    let value;try{value=JSON.parse(readFileSync(file,'utf8'));}catch{throw new Error(hold);}
    const pin=enrollment?value?.preview?.helper_sha256:value?.helper_sha256;
    if(!acceptedHelperPins.includes(pin))throw new Error(hold);
    enrolled=true;previousPin||=pin!==acceptedHelperPins[0];
  }
  return {enrolled,previousPin};
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
export async function install(ref,{upgradeFrom}={}) {
  if(process.platform!=='darwin'||typeof process.getuid!=='function')throw new Error('This installer is supported on macOS only. No registration or installation was attempted; ask your setup operator for a reviewed installer for this platform.');
  if(typeof ref!=='string' || !/^[a-f0-9]{40}$/.test(ref))throw new Error('Supply the reviewed 40-character commit from your Agent Upskill setup page with --ref. Moving branches are not accepted.');
  if(upgradeFrom!==undefined&&(!/^[a-f0-9]{40}$/.test(upgradeFrom)||upgradeFrom===ref))throw new Error('Use the exact different reviewed predecessor commit with --upgrade-from.');
  await publicMetadata(ref);
  const prior=upgradeFrom?await publicMetadata(upgradeFrom,true):null;
  const {enrolled,previousPin}=preserveDeliveryControls()??{};
  const recovery=(prior?`Reviewed predecessor: ${upgradeFrom}. `:'')+`Reviewed target: ${ref}. If its registration is absent, restore only the reviewed target marketplace with codex plugin marketplace add ${source} --ref ${ref} --json. Otherwise preserve the registered checkout and ask your setup operator for a reviewed compatible installer. Then retry --ref ${ref}${prior?` --upgrade-from ${upgradeFrom}`:''}. Preserve the plugin and credentials; do not remove the plugin or reset login.`;
  let predecessorRemoved=false;
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
  const priorVersion=prior?.['plugins/agentupskill/.codex-plugin/plugin.json'].version;
  if(current&&current.version!==version&&current.version!==priorVersion)throw new Error('Installed version does not match the reviewed predecessor. Nothing was replaced.');
  if(current&&predecessor)installedCache(current,existing.root);
  if(enrolled&&prior&&(predecessor||!existing||current?.version!==version))console.error(previousPin?'The enrolled delivery helper uses a previous pin. Account delivery and rollback require renewal with a new preview and consent before a helper update. This plugin upgrade preserves enrollment and credentials.':'This plugin upgrade preserves delivery enrollment and credentials. Delivery controls remain bound to their enrolled helper pin; inspect delivery after upgrading before using controls from the new plugin.');
  if(predecessor){
    if(current&&current.version!==prior['plugins/agentupskill/.codex-plugin/plugin.json'].version)throw new Error('Installed version does not match the reviewed predecessor. Nothing was replaced.');
    // The native CLI rejects a changed pinned ref for an existing source. Its
    // scoped marketplace removal retains plugin settings/cached credentials.
    // Re-add retargets only this marketplace. Never invoke plugin remove.
    command('codex',['plugin','marketplace','remove',name]);existing=null;predecessorRemoved=true;
  }
  if(!existing){
    // Native listing can hide a disabled installation until its marketplace is restored.
    try{command('codex',['plugin','marketplace','add',source,'--ref',ref,'--json']);}
    catch(error){throw new Error(error.message+' '+recovery);}
    existing=targetMarketplace(true);
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
    try{command('codex',['plugin','add',pluginId]);}
    catch(error){throw failureState(error);}
  }
  let confirmed;
  try{confirmed=installed();}catch(error){throw failureState(error);}
  if(!confirmed)throw failureState(new Error('Codex did not report an enabled installation. Check its plugin controls and retry.'));
  try{installedCache(confirmed,existing.root);}catch(error){throw failureState(error);}
  return `Agent Upskill ${version} is installed. Return to your setup chat for browser sign-in and verification. Installation alone does not confirm connection or memory access.`;
}

if(process.argv[1] && import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href){
  if(process.argv.length===3&&process.argv[2]==='--help')console.log('Usage: agentupskill-install --ref <reviewed commit> [--upgrade-from <reviewed predecessor>]\nRegisters and installs the reviewed plugin using Codex. Does not sign in, change MCP settings or save memory.');
  else if(![4,6].includes(process.argv.length)||process.argv[2]!=='--ref'||(process.argv.length===6&&process.argv[4]!=='--upgrade-from')){console.error('Usage: agentupskill-install --ref <reviewed commit>');process.exitCode=1;}
  else try{console.log(await install(process.argv[3],{upgradeFrom:process.argv[5]}));}catch(error){console.error(error instanceof Error?error.message:'Installation failed.');process.exitCode=1;}
}
