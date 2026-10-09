#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {readFileSync,realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';

const source='https://github.com/agentupskill-ai/codex-plugin-marketplace';
const name='agentupskill-setup';
const pluginId='up@'+name;
export const version='0.6.0';
export const expected={
  '.agents/plugins/marketplace.json':{name,interface:{displayName:'Agent Upskill Setup'},plugins:[{name:'up',source:{source:'local',path:'./plugins/agentupskill'},policy:{installation:'AVAILABLE',authentication:'ON_USE'},category:'Productivity'}]},
  'plugins/agentupskill/.codex-plugin/plugin.json':{name:'up',version,description:'Connect Agent Upskill and carry useful context between Codex conversations.',skills:'./skills/',mcpServers:'./.mcp.json'},
  'plugins/agentupskill/.mcp.json':{mcpServers:{'agentupskill-bundled-connect':{type:'http',url:'https://app.agentupskill.ai/mcp'}}}
};

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
function marketplace(ref) {
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
  for(const [path,value] of Object.entries(expected)){
    let actual;
    try{actual=JSON.parse(readFileSync(resolve(entry.root,path),'utf8'));}catch{throw new Error('The existing marketplace could not be verified. Nothing was replaced.');}
    if(!isDeepStrictEqual(actual,value))throw new Error('The existing marketplace differs from the reviewed package. Nothing was replaced.');
  }
  return entry;
}
function installed() {
  const result=json(['plugin','list','--marketplace',name,'--json']);
  if(!Array.isArray(result.installed))throw new Error('Unsupported Codex plugin response. Update Codex and retry.');
  if(result.installed.some(entry=>entry.pluginId==='agentupskill@'+name && entry.installed===true))throw new Error('The legacy agentupskill plugin is installed. Review a native rename migration to up before retrying; nothing was replaced or duplicated. Preserve the existing connector and credentials.');
  const matches=result.installed.filter(entry=>entry.pluginId===pluginId);
  if(matches.length>1)throw new Error('Conflicting Agent Upskill installations. Review them in Codex.');
  const entry=matches[0];
  if(entry && (entry.version!==version || entry.enabled!==true || entry.installed!==true))throw new Error('Agent Upskill is disabled or has a different version. Review it with Codex’s native plugin controls; nothing was replaced.');
  return entry;
}

export async function install(ref) {
  if(typeof ref!=='string' || !/^[a-f0-9]{40}$/.test(ref))throw new Error('Supply the reviewed 40-character commit from your Agent Upskill setup page with --ref. Moving branches are not accepted.');
  // The package and the native marketplace must both use the reviewed commit.
  for(const [path,value] of Object.entries(expected)){
    const response=await fetch(`${source.replace('https://github.com/','https://raw.githubusercontent.com/')}/${ref}/${path}`,{redirect:'error',signal:AbortSignal.timeout(15_000)});
    if(!response.ok)throw new Error('The reviewed public package is unavailable. Nothing was installed.');
    if(!isDeepStrictEqual(await response.json(),value))throw new Error('The reviewed public package has unexpected metadata. Nothing was installed.');
  }
  const existing=marketplace(ref);
  const current=installed();
  if(current&&!existing)throw new Error('An existing plugin has no verified marketplace. Nothing was replaced.');
  if(!existing){command('codex',['plugin','marketplace','add',source,'--ref',ref,'--json']);if(!marketplace(ref))throw new Error('Codex did not register the reviewed marketplace. Retry after checking Codex.');}
  if(!current)command('codex',['plugin','add',pluginId]);
  if(!installed())throw new Error('Codex did not report an enabled installation. Check its plugin controls and retry.');
  return `Agent Upskill ${version} is installed. Return to your setup chat for browser sign-in and verification. Installation alone does not confirm connection or memory access.`;
}

if(process.argv[1] && import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href){
  if(process.argv.length===3&&process.argv[2]==='--help')console.log('Usage: agentupskill-install --ref <reviewed commit>\nRegisters and installs the reviewed plugin using Codex. Does not sign in, change MCP settings or save memory.');
  else if(process.argv.length!==4||process.argv[2]!=='--ref'){console.error('Usage: agentupskill-install --ref <reviewed commit>');process.exitCode=1;}
  else try{console.log(await install(process.argv[3]));}catch(error){console.error(error instanceof Error?error.message:'Installation failed.');process.exitCode=1;}
}
