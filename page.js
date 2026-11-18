// Runs in the extension's isolated world for the selected document.
export function scanPage(sectionNames) {
  const names=new Map(sectionNames.map(n=>[n,n]));
  for(const [label,section] of Object.entries({'个人信息':'基本信息','个人资料':'基本信息','个人基本信息':'基本信息','实习经历':'工作/实习经历','工作经历':'工作/实习经历','项目经历':'项目经验','教育背景':'教育经历','家庭信息':'家庭成员'}))names.set(label,section);
  const sectionFor=text=>names.get((text||'').trim().replace(/／/g,'/').replace(/\s*[（(]?\d+[)）]?$/,'').trim());
  const headers=[...document.querySelectorAll('h1,h2,h3,h4,h5,legend,[role=heading],.section-title')].filter(h=>sectionFor(h.textContent));
  const elements=new Map(), descriptors=[], blocks=new Map(), radioGroups=new Map();
  const visible=e=>e.getClientRects().length && getComputedStyle(e).visibility==='visible' && !e.closest('[inert],[aria-hidden=true]');
  const labelText=e=>{
    if(!e)return '';
    const copy=e.cloneNode(true);
    copy.querySelectorAll('input,textarea,select,button,small').forEach(n=>n.remove());
    return copy.textContent.trim();
  };
  for(const node of document.querySelectorAll('input,textarea,select,[role=combobox]')){
    if(!visible(node)||node.disabled||node.readOnly||['hidden','password','submit','button','image','reset','search','color','range'].includes(node.type))continue;
    const groupItem=node.closest('.ant-form-item,.el-form-item,.form-group,.form-item');
    const aria=(node.getAttribute('aria-labelledby')||'').split(/\s+/).map(id=>labelText(document.getElementById(id))).join(' ').trim();
    let label=node.getAttribute('aria-label')||aria||labelText(node.labels?.[0])||labelText(groupItem?.querySelector('label,.el-form-item__label'))||labelText(node.previousElementSibling?.matches('label,.label,.form-label')?node.previousElementSibling:null)||node.placeholder||node.name;
    label=(label||'').replace(/^请(输入|填写|选择)(您的|你的)?/,'').trim();
    if(!label||/验证码|密码|口令|otp|password|one-time-code/i.test([label,node.autocomplete,node.name].join(' ')))continue;
    const container=node.closest('fieldset,section,[data-section]');
    const heading=headers.findLast(h=>h.compareDocumentPosition(node)&Node.DOCUMENT_POSITION_FOLLOWING);
    const section=sectionFor(container?.getAttribute('data-section'))||sectionFor(container?.querySelector(':scope > legend,:scope > h2,:scope > h3')?.textContent)||sectionFor(heading?.textContent)||'';
    const block=node.closest('[data-record],fieldset')||heading||container||document.body;
    if(!blocks.has(block))blocks.set(block,blocks.size);
    let options;
    if(node.type==='radio'){
      const owner=node.closest('[role=radiogroup],fieldset,.form-group,.ant-form-item,.el-form-item');
      const caption=owner?.getAttribute('aria-label')||labelText(owner?.querySelector('legend,.form-label,.ant-form-item-label,.el-form-item__label'));
      if(!caption||!node.name)continue;
      options=[...document.getElementsByName(node.name)].filter(n=>n.type==='radio'&&n.form===node.form&&owner.contains(n));
      if(options[0]!==node)continue;
      label=caption;
    }
    const id=descriptors.length;
    if(options)radioGroups.set(id,options);
    elements.set(id,node);
    descriptors.push({id,label,section,block:blocks.get(block)});
  }
  globalThis.fillDoneSession?.stop?.();
  globalThis.fillDoneSession={elements,descriptors,radioGroups,token:crypto.randomUUID()};
  return {fields:descriptors,token:globalThis.fillDoneSession.token,origin:location.origin};
}
export async function applyPage(token,plan) {
  const session=globalThis.fillDoneSession;
  if(session?.token!==token)throw Error('页面已变化，请重新填写');
  const results=[];
  for(const {id,value} of plan){
    const node=session.elements.get(id);
    const report=reason=>results.push({id,reason});
    if(!node?.isConnected||!node.getClientRects().length||node.disabled||node.readOnly){report('页面字段已变化');continue}
    if(node.type==='radio'){
      const options=session.radioGroups.get(id)||[];
      if(options.some(n=>n.checked)){report('保留已有值');continue}
      const matches=options.filter(n=>!n.disabled&&[n.getAttribute('aria-label'),n.labels?.[0]?.textContent.trim(),n.value].includes(value));
      if(matches.length===1){matches[0].click();report(matches[0].checked?'已填写':'请核对')}
      else report('选项需要确认');
      continue;
    }
    if(node.getAttribute('role')==='combobox'&&node.tagName!=='SELECT'||node.hasAttribute('list')){report('请在网页选择');continue}
    if(node.type==='checkbox'){
      if(node.checked){report('保留已有值');continue}
      if(['是','true','至今'].includes(value)){node.click();report(node.checked?'已填写':'请核对')}
      else report('请核对勾选状态');
      continue;
    }
    if(node.type==='select-multiple'?node.selectedOptions.length:node.value){report('保留已有值');continue}
    let expected=value;
    if(node.type==='file'){
      if(!value?.data){report('请手动选择文件');continue}
      const bytes=Uint8Array.from(atob(value.data.split(',')[1]),c=>c.charCodeAt(0));
      const transfer=new DataTransfer();transfer.items.add(new File([bytes],value.name,{type:value.type}));node.files=transfer.files;
    }else if(typeof value!=='string'){report('字段格式不同');continue}
    else if(node.tagName==='SELECT'){
      const wanted=node.multiple?value.split(/[、,，]/).map(v=>v.trim()):[value];
      const matches=wanted.map(v=>[...node.options].filter(o=>!o.disabled && o.text.trim()===v));
      if(matches.some(opts=>opts.length!==1)){report('选项需要确认');continue}
      for(const opts of matches)opts[0].selected=true;
      expected=node.value;
    }else{
      if((node.type==='date'&&value.length!==10)||(node.type==='month'&&value.length!==7)){report('日期精度不同');continue}
      const proto=node.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto,'value').set.call(node,value);
    }
    for(const event of ['input','change'])node.dispatchEvent(new Event(event,{bubbles:true}));
    await Promise.resolve();
    report(node.isConnected && (node.type==='file'?node.files[0]?.name===value.name:node.value===expected)&&node.validity?.valid!==false?'已填写':'请核对');
  }
  return results;
}
