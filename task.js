import {profile,el,status} from './panel.js';
import {sections,single} from './schema.js';
import {match} from './match.js';
import {scanPage,applyPage} from './page.js';
export const task=document.getElementById('task');
export let current;
export async function run(func,args){
  const [{result}]=await chrome.scripting.executeScript({target:{tabId:current.tabId,documentIds:[current.documentId]},func,args});
  return result;
}
const fill=el('button','一键填写当前页'); fill.className='primary';
const resultBox=el('div');task.append(el('h2','当前网申页'),fill,resultBox);
export const ruleKey=(field)=>JSON.stringify([current.origin,locationGroup(field),field.label]);
function locationGroup(field){return field.section||''}
export const rules=(await chrome.storage.local.get('rules')).rules||{};
export function lookup(field){return rules[ruleKey(field)]||match(field.label,field.section,profile)}
function titleOf(record,i){return (i+1)+'. '+(record['公司名称']||record['项目名称']||record['学校名称']||record['姓名']||Object.values(record).find(v=>typeof v==='string'&&v)||'空记录')}
export function pickRow(section,host){
  const select=el('select'); select.add(new Option('选择对应记录',''));
  (profile[section]||[]).forEach((record,i)=>select.add(new Option(titleOf(record,i),i)));
  if(select.options.length===2)select.value='0';
  host.append(select);return select;
}
fill.onclick=async()=>{
  fill.disabled=true;resultBox.replaceChildren();current=null;task.dispatchEvent(new Event('resetpage'));
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    const [entry]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:scanPage,args:[Object.keys(sections)]});
    current={...entry.result,tabId:tab.id,documentId:entry.documentId};
    const pickers=new Map(), matched=current.fields.map(f=>lookup(f));
    for(const [i,field] of current.fields.entries()){
      const mapping=matched[i];if(!mapping)continue;
      const group=mapping.section, key=group+'|'+field.block;
      const blocks=new Set(current.fields.filter((f,j)=>matched[j]?.section===group).map(f=>f.block));
      if(!single.has(group)&&((profile[group]?.length||0)>1||blocks.size>1)&&!pickers.has(key)){
        const label=el('label',group+' · 网页区块 '+(field.block+1));resultBox.append(label);const picker=pickRow(group,label);if(blocks.size>1)picker.value='';pickers.set(key,picker);
      }
    }
    const report=el('div'); const session=current;
    const write=async()=>{
      if(session!==current)return;
      const plan=[], notes=new Map(), occurrences=new Map();
      for(const [i,field] of current.fields.entries()){
        const m=matched[i];if(!m){notes.set(field.id,'待识别');continue}
        const scope=m.section+'|'+field.block;
        const identity=scope+'|'+m.key;
        occurrences.set(identity,(occurrences.get(identity)||0)+1);
        const row=pickers.get(scope)?.value??'0';
        const value=profile[m.section]?.[row]?.[m.key];
        if(row==='')notes.set(field.id,'请选择对应记录');
        else if(value===undefined||value==='')notes.set(field.id,'资料为空');
        else plan.push({id:field.id,value,identity});
      }
      const usable=plan.filter(p=>{if(occurrences.get(p.identity)===1)return true;notes.set(p.id,'同组有重复字段，请手动填写');return false});
      for(const {id,reason} of await run(applyPage,[current.token,usable]))notes.set(id,reason);
      const done=[...notes.values()].filter(v=>v==='已填写').length;
      report.replaceChildren(el('p','已填写 '+done+' 项，共识别 '+current.fields.length+' 个字段。'));
      const details=el('details');details.append(el('summary','查看各字段结果'));
      for(const field of current.fields)details.append(el('div',field.label+' · '+notes.get(field.id)));
      report.append(details);
    };
    if(pickers.size){
      const confirm=el('button','使用所选记录填写');confirm.onclick=()=>write().catch(()=>status('页面已变化，请重新扫描'));resultBox.append(confirm);
    }
    resultBox.append(report);await write();task.dispatchEvent(new Event('scanned'));
  }catch{status('请在网申标签页点击工具栏的填好啦图标，再填写当前页。')}
  finally{fill.disabled=false}
};
