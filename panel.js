import {sections, single, fields, rows, inputType} from './schema.js';
const $ = id => document.getElementById(id);
export const profile = (await chrome.storage.local.get('profile')).profile || {};
export function status(text) { $('status').textContent=text; }
let writes=Promise.resolve();
export function save() {
  const snapshot=structuredClone(profile);
  writes=writes.catch(()=>{}).then(()=>chrome.storage.local.set({profile:snapshot}));
  return writes.then(()=>{},()=>status('保存失败，请检查扩展存储空间后重试'));
}
export function el(tag,text) {const node=document.createElement(tag); if(text)node.textContent=text; return node;}
const category=$('category');
for(const name of Object.keys(sections))category.add(new Option(name,name));
export function render() {
  const section=category.value, list=rows(profile,section);
  $('records').replaceChildren(); $('add').hidden=single.has(section);
  list.forEach((record,index)=>{
    const box=el('fieldset'); box.append(el('legend',single.has(section)?section:section+' · '+(index+1)));
    for(const key of fields(section,record)){
      const type=inputType(key), label=el('label',key), input=el(type==='textarea'?'textarea':'input');
      if(type!=='textarea')input.type=type;
      if(type==='file'){
        label.append(el('small',record[key]?.name?'　'+record[key].name:''));
        input.onchange=async()=>{
          const f=input.files[0]; if(!f)return;
          const reader=new FileReader(); reader.onload=()=>{record[key]={name:f.name,type:f.type,data:reader.result};save();render()};reader.readAsDataURL(f);
        };
      }else{
        input.value=record[key]??'';
        if(key==='至今')input.placeholder='是 / 否';
        if(['期望工作城市','期望从事职业（岗位）'].includes(key))input.placeholder='多项用顿号分隔';
        input.onchange=()=>{record[key]=input.value.trim();save()};
      }
      label.append(input);box.append(label);
    }
    if(!single.has(section)){const remove=el('button','删除这条记录');remove.onclick=()=>{if(confirm('删除这条'+section+'？')){list.splice(index,1);save();render()}};box.append(remove)}
    $('records').append(box);
  });
}
category.onchange=render;
$('add').onclick=()=>{rows(profile,category.value).push({});save();render()};
render();
