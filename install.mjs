#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {readFileSync,realpathSync,lstatSync,statSync} from 'node:fs';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';

const source='https://github.com/agentupskill-ai/codex-plugin-marketplace';
const name='agentupskill-setup';
const pluginId='up@'+name;
export const version='0.8.4';
const predecessorVersions=['0.6.0','0.7.0','0.8.0','0.8.1','0.8.2','0.8.3'];
export const expected={
  '.agents/plugins/marketplace.json':{name,interface:{displayName:'Agent Upskill Setup'},plugins:[{name:'up',source:{source:'local',path:'./plugins/agentupskill'},policy:{installation:'AVAILABLE',authentication:'ON_USE'},category:'Productivity'}]},
  'plugins/agentupskill/.codex-plugin/plugin.json':{name:'up',version,description:'Connect Agent Upskill and carry useful context between Codex conversations.',skills:'./skills/',mcpServers:'./.mcp.json',extensions:{'com.openai':{onboardingSkill:'./skills/setup/SKILL.md'}}},
  'plugins/agentupskill/.mcp.json':{mcpServers:{'agentupskill-bundled-connect':{type:'http',url:'https://app.agentupskill.ai/mcp'}}}
};

// Keep in sync with delivery-release.json; the archive contains no executable
// helper import here. A dropped pin must retain its old controls before upgrade.
const acceptedHelperPins=['7a01a5b4fdf11a16825330658458393ba96bf7e517b2190a4bf98b3998f77196','0d07e4ad8c19abe590527662ba6a9fe811096ddba34c8863d005cf008e3158d8'];
function preserveDeliveryControls(){
  let home;
  try{home=realpathSync(resolve(process.env.CODEX_HOME??resolve(homedir(),'.codex')));}
  catch(error){if(error.code==='ENOENT')return;throw error;}
  const s=statSync(home),identity=JSON.stringify([home,s.dev,s.ino,s.uid]);
  const locator=resolve(homedir(),'Library','Application Support','AgentUpskill Shared Skills','delivery','helper-'+createHash('sha256').update(identity).digest('hex')+'.json');
  for(const [file,enrollment] of [[resolve(home,'shared-skills-automation','enrollment.json'),true],[locator,false]]){
    let st;
    try{st=lstatSync(file);}catch(error){if(error.code==='ENOENT')continue;throw error;}
    const hold='Delivery state needs review before this plugin upgrade. Keep the installed plugin and use its delivery skill to inspect, pause, detach through the exact removal preview, settle migration recovery and retire its helper reference before retrying. If no delivery skill is installed, stop and ask your setup operator to review the original standalone helper controls or the published 0.8.1 recovery route. Do not delete state, reset credentials or stop a live operation manually.';
    if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.uid!==process.getuid()||(st.mode&0o077)||st.size>(enrollment?2*1024*1024:4096))throw new Error(hold);
    let value;try{value=JSON.parse(readFileSync(file,'utf8'));}catch{throw new Error(hold);}
    if(!acceptedHelperPins.includes(enrollment?value?.preview?.helper_sha256:value?.helper_sha256))throw new Error(hold);
  }
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
function marketplace(ref,values=expected) {
  const result=json(['plugin','marketplace','list','--json']);
  if(!Array.isArray(result.marketplaces))throw new Error('Unsupported Codex marketplace response. Update Codex and retry.');
  const matches=result.marketplaces.filter(entry=>entry.name===name);
  if(matches.length>1)throw new Error('Conflicting Agent Upskill marketplaces. Review them in Codex before retrying.');
  const entry=matches[0];
  if(!entry)return null;
  const registeredSource=entry.marketplaceSource?.source;
  const normalizedSource=typeof registeredSource==='string'?registeredSource.replace(/\/$/,'').replace(/\.git$/,''):null;
  if(entry.marketplaceSource?.sourceType!=='git' || normalizedSource!==source || typeof entry.root!=='string')throw new Error('The Agent Upskill marketplace source does not match the reviewed HTTPS URL. Nothing was replaced; review it in Codex.');
  if(command('git',['-C',entry.root,'rev-parse','HEAD']).trim()!==ref)throw new Error('The Agent Upskill marketplace has a different commit. Nothing was replaced; use Codex’s native update controls after reviewing the new version.');
  if(command('git',['-C',entry.root,'status','--porcelain','--untracked-files=normal']).trim())throw new Error('The marketplace checkout has local changes. Nothing was replaced; review those changes before retrying.');
  for(const [path,value] of Object.entries(values)){
    let actual;
    try{actual=JSON.parse(readFileSync(resolve(entry.root,path),'utf8'));}catch{throw new Error('The existing marketplace could not be verified. Nothing was replaced.');}
    if(!isDeepStrictEqual(actual,value))throw new Error('The existing marketplace differs from the reviewed package. Nothing was replaced.');
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
    if(!predecessorVersions.includes(manifest?.version))throw new Error('Only reviewed up 0.6.0/0.7.0/0.8.0/0.8.1/0.8.2/0.8.3 predecessors can use this native update.');
    const {extensions,...prior}=expected['plugins/agentupskill/.codex-plugin/plugin.json'];
    wanted={...expected,'plugins/agentupskill/.codex-plugin/plugin.json':{...(['0.8.0','0.8.1','0.8.2','0.8.3'].includes(manifest.version)?expected['plugins/agentupskill/.codex-plugin/plugin.json']:prior),version:manifest.version}};
  }
  if(!isDeepStrictEqual(values,wanted))throw new Error('The reviewed public package has unexpected metadata. Nothing was installed.');
  return values;
}
export async function install(ref,{upgradeFrom}={}) {
  if(typeof ref!=='string' || !/^[a-f0-9]{40}$/.test(ref))throw new Error('Supply the reviewed 40-character commit from your Agent Upskill setup page with --ref. Moving branches are not accepted.');
  if(upgradeFrom!==undefined&&(!/^[a-f0-9]{40}$/.test(upgradeFrom)||upgradeFrom===ref))throw new Error('Use the exact different reviewed predecessor commit with --upgrade-from.');
  await publicMetadata(ref);
  const prior=upgradeFrom?await publicMetadata(upgradeFrom,true):null;
  preserveDeliveryControls();
  const listing=json(['plugin','marketplace','list','--json']);
  if(!Array.isArray(listing.marketplaces))throw new Error('Unsupported Codex marketplace response.');
  const candidates=listing.marketplaces.filter(entry=>entry.name===name);
  if(candidates.length>1)throw new Error('Conflicting Agent Upskill marketplaces. Nothing was replaced.');
  let existing=null;
  if(candidates.length){
    const entry=candidates[0];
    if(typeof entry.root!=='string')throw new Error('Unsupported marketplace root. Nothing was replaced.');
    const actual=command('git',['-C',entry.root,'rev-parse','HEAD']).trim();
    if(actual===ref)existing=marketplace(ref);
    else if(prior&&actual===upgradeFrom)existing=marketplace(upgradeFrom,prior);
    else throw new Error('The marketplace has a different commit. Review the exact predecessor and use --upgrade-from; nothing was replaced.');
  }
  const current=installed({allowOlder:Boolean(prior)});
  const recovery=prior?`Reviewed predecessor: ${upgradeFrom}. Restore only the reviewed target marketplace with codex plugin marketplace add ${source} --ref ${ref} --json, then retry --ref ${ref} --upgrade-from ${upgradeFrom}. Preserve the plugin and credentials; do not remove the plugin or reset login.`:'';
  if(current&&!existing)throw new Error('An existing plugin has no verified marketplace. Nothing was replaced. '+recovery);
  const priorVersion=prior?.['plugins/agentupskill/.codex-plugin/plugin.json'].version;
  if(current&&current.version!==version&&current.version!==priorVersion)throw new Error('Installed version does not match the reviewed predecessor. Nothing was replaced.');
  if(existing&&prior&&command('git',['-C',existing.root,'rev-parse','HEAD']).trim()===upgradeFrom){
    if(current&&current.version!==prior['plugins/agentupskill/.codex-plugin/plugin.json'].version)throw new Error('Installed version does not match the reviewed predecessor. Nothing was replaced.');
    // The native CLI rejects a changed pinned ref for an existing source. Its
    // scoped marketplace removal retains plugin settings/cached credentials.
    // Re-add retargets only this marketplace. Never invoke plugin remove.
    command('codex',['plugin','marketplace','remove',name]);existing=null;
  }
  if(!existing){
    try{command('codex',['plugin','marketplace','add',source,'--ref',ref,'--json']);}
    catch(error){throw new Error(error.message+' '+recovery);}
    if(!marketplace(ref))throw new Error('Codex did not register the reviewed marketplace. Retry after checking Codex. '+recovery);
  }
  // Reinspect after registration; a disabled cache can be hidden while its
  // marketplace is missing. Retry must never reenable that installation.
  const afterRegistration=installed({allowOlder:Boolean(prior)});
  if(!afterRegistration||afterRegistration.version!==version)command('codex',['plugin','add',pluginId]);
  if(!installed())throw new Error('Codex did not report an enabled installation. Check its plugin controls and retry.');
  return `Agent Upskill ${version} is installed. Return to your setup chat for browser sign-in and verification. Installation alone does not confirm connection or memory access.`;
}

if(process.argv[1] && import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href){
  if(process.argv.length===3&&process.argv[2]==='--help')console.log('Usage: agentupskill-install --ref <reviewed commit> [--upgrade-from <reviewed predecessor>]\nRegisters and installs the reviewed plugin using Codex. Does not sign in, change MCP settings or save memory.');
  else if(![4,6].includes(process.argv.length)||process.argv[2]!=='--ref'||(process.argv.length===6&&process.argv[4]!=='--upgrade-from')){console.error('Usage: agentupskill-install --ref <reviewed commit>');process.exitCode=1;}
  else try{console.log(await install(process.argv[3],{upgradeFrom:process.argv[5]}));}catch(error){console.error(error instanceof Error?error.message:'Installation failed.');process.exitCode=1;}
}
