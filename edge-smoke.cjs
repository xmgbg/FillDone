// Run with a local Playwright installation. The loopback grant exists only in the test copy.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'filldone-smoke-')), ext=path.join(root,'extension');
  fs.mkdirSync(ext);
  fs.cpSync(path.join(__dirname,'icons'),path.join(ext,'icons'),{recursive:true});
  for(const name of ['panel.html','panel.css','schema.js','panel.js','background.js','task.js','page.js','match.js','learn.js'])fs.copyFileSync(path.join(__dirname,name),path.join(ext,name));
  const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
  manifest.host_permissions=['http://127.0.0.1/*'];
  fs.writeFileSync(path.join(ext,'manifest.json'),JSON.stringify(manifest));
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<h2>基本信息</h2><label>姓名<input id="name"></label><label>户口所在地<input id="place"></label><label>手机号<input value="原值" id="phone"></label><label>是否持有驾照<input id="extra"></label><fieldset><legend>性别</legend><label><input type="radio" name="gender" value="m">男</label><label><input id="female" type="radio" name="gender" value="f">女</label></fieldset><h2>家庭成员</h2><label>姓名<input id="member"></label>')});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let context;
  try{
    context=await chromium.launchPersistentContext(path.join(root,'user'),{executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,ignoreDefaultArgs:['--disable-extensions'],args:['--disable-extensions-except='+ext,'--load-extension='+ext,'--no-first-run']});
    const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:15000});
    const panel=await context.newPage();await panel.goto(worker.url().replace(/background\.js$/,'panel.html'));
    const errors=[];panel.on('pageerror',e=>errors.push(String(e)));
    for(const [key,val] of Object.entries({姓名:'测试本人',性别:'女',户籍所在地:'测试城市',手机号码:'测试手机'})){
      const input=panel.getByLabel(key,{exact:true});await input.fill(val);await input.press('Tab');
    }
    await panel.selectOption('#category','家庭成员');
    await panel.getByLabel('姓名',{exact:true}).fill('成员甲');await panel.getByLabel('姓名',{exact:true}).press('Tab');
    await panel.click('#add');await panel.getByLabel('姓名',{exact:true}).last().fill('成员乙');await panel.getByLabel('姓名',{exact:true}).last().press('Tab');
    await panel.reload();await panel.waitForFunction(()=>document.querySelector('#records input')?.value==='测试本人');
    const page=await context.newPage();await page.goto('http://127.0.0.1:'+server.address().port);await page.bringToFront();
    async function press(name){await panel.getByRole('button',{name,exact:true}).evaluate(e=>e.click())}
    await press('一键填写当前页');
    await page.waitForFunction(()=>document.querySelector('#place').value==='测试城市');
    assert.equal(await page.isChecked('#female'),true);assert.equal(await page.inputValue('#name'),'测试本人');assert.equal(await page.inputValue('#phone'),'原值');assert.equal(await page.inputValue('#member'),'');
    await panel.getByLabel(/家庭成员 · 网页区块/).selectOption('1');await press('使用所选记录填写');
    await page.waitForFunction(()=>document.querySelector('#member').value==='成员乙');
    await panel.getByRole('heading',{name:'记住新字段'}).waitFor();
    await page.locator('#extra').pressSequentially('yes');await page.locator('#extra').press('Tab');
    await panel.getByLabel('批量保存此项').check();await press('保存已勾选项');
    if(await panel.locator('#status').textContent()==='网页内容已更新，请核对后保存')await press('保存此项');
    await panel.waitForFunction(()=>document.querySelector('#status').textContent.includes('下次可匹配'));
    await page.reload();await press('一键填写当前页');await page.waitForFunction(()=>document.querySelector('#extra').value==='yes');
    assert.deepEqual(errors,[]);console.log('PASS: persistence, aliases, existing values, multiple records, manual capture and reuse');
  }finally{await context?.close();server.close();fs.rmSync(root,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
