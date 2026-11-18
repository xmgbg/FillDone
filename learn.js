import {profile,el,render,status} from './panel.js';
import {sections,fields,rows,single} from './schema.js';
import {task,current,rules,ruleKey,lookup,run,pickRow} from './task.js';

export function watchManual(token,ids){
  const session=globalThis.fillDoneSession;
  if(session?.token!==token)return;
  const allowed=new Map(ids.map(id=>[session.elements.get(id),id]));
  const values=new Map();session.values=values;
  const collect=event=>{
    const node=event.target;
    if(!event.isTrusted||!allowed.has(node)||node.type==='file'||node.type==='radio')return;
    const value=node.type==='checkbox'?(node.checked?'是':'否'):node.tagName==='SELECT'?[...node.selectedOptions].map(o=>o.text.trim()).join('、'):node.value;
    if(typeof value==='string')values.set(allowed.get(node),value.trim());
  };
  document.addEventListener('change',collect,true);
  document.addEventListener('input',collect,true);
  session.stop=()=>{document.removeEventListener('change',collect,true);document.removeEventListener('input',collect,true)};
}
function readManual(token){
  const s=globalThis.fillDoneSession;
  return s?.token===token?[...(s.values||[])]:[];
}
const box=el('section');task.after(box);
let timer,seen=new Set();
function reset(){clearInterval(timer);seen.clear();box.replaceChildren()}
task.addEventListener('resetpage',reset);
window.addEventListener('pagehide',reset);
task.addEventListener('scanned',async()=>{
  const session=current;
  const ids=session.fields.filter(f=>!lookup(f)).map(f=>f.id);
  if(!ids.length)return;
  try{await run(watchManual,[session.token,ids])}catch{return}
  if(session!==current)return;
  const heading=el('h2','记住新字段'), hint=el('small','在网页上补填后，可以在这里保存。'), list=el('div');
  box.append(heading,hint,list);
  timer=setInterval(async()=>{
    let changes;
    try{changes=await run(readManual,[session.token])}catch{if(current===session)reset();return}
    if(current!==session)return;
    for(const [id,value] of changes){
      if(seen.has(id)||!value)continue;
      seen.add(id);candidate(list,session,session.fields[id],value);
    }
  },900);
});
function candidate(list,session,field,initial){
  const item=el('fieldset');item.append(el('legend',field.label));
  const preview=el('small',initial);item.append(preview);
  const addSelect=(label)=>{const wrap=el('label',label), select=el('select');wrap.append(select);item.append(wrap);return select};
  const section=addSelect('所属资料分类');
  section.add(new Option('请选择分类',''));
  for(const name of Object.keys(sections))section.add(new Option(name,name));
  section.value=field.section;
  const target=addSelect('保存方式');
  const rowHost=el('label','对应记录');item.append(rowHost);
  let recordSelect;
  function update(){
    target.replaceChildren(new Option('新增通用字段','new'),new Option('仅此网站使用','site'));
    rowHost.replaceChildren('对应记录'); recordSelect=null;
    if(!section.value)return;
    const records=rows(profile,section.value);
    const keys=new Set(records.flatMap(r=>fields(section.value,r)));
    for(const key of keys)if(!key.includes('〔本站 ')&&!['证件照','作品集'].includes(key))target.add(new Option('关联已有字段 · '+key,'alias:'+key));
    rowHost.hidden=single.has(section.value);
    if(!rowHost.hidden)recordSelect=pickRow(section.value,rowHost);
  }
  section.onchange=update;update();
  const apply=el('button','保存此项'),skip=el('button','跳过');
  skip.onclick=()=>item.remove();
  apply.onclick=async()=>{
    if(current!==session||!section.value||recordSelect?.value===''){status('请先选择资料分类和对应记录');return}
    const key=target.value.startsWith('alias:')?target.value.slice(6):field.label+(target.value==='site'?'〔本站 '+session.origin+'〕':'');
    if(Object.hasOwn(Object.prototype,key)||key==='prototype'){status('请关联到其他字段名');return}
    apply.disabled=true;
    try{
      const latest=new Map(await run(readManual,[session.token])).get(field.id);
      if(!latest){status('字段已清空或网页已变化');return}
      if(latest!==preview.textContent){preview.textContent=latest;status('网页内容已更新，请核对后保存');return}
      const record=rows(profile,section.value)[recordSelect?.value||0];
      if(record[key]&&record[key]!==latest&&!confirm('用网页上的新值更新「'+key+'」？'))return;
      const mapping={section:section.value,key};
      record[key]=latest;
      rules[ruleKey(field)]=mapping;
      await chrome.storage.local.set({profile,rules});
      render();item.remove();status('已保存，下次可匹配「'+field.label+'」');
    }catch{status('保存失败，请重新扫描网页后重试')}finally{apply.disabled=false}
  };
  item.append(apply,skip);list.append(item);
}
