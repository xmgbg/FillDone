// Run with a local Playwright installation. The loopback grant exists only in the test copy.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'filldone-smoke-')), ext=path.join(root,'extension');
  fs.mkdirSync(ext);
  fs.cpSync(path.join(__dirname,'icons'),path.join(ext,'icons'),{recursive:true});
  for(const name of ['popup.html','popup.js','panel.html','panel-nav.js','panel.css','schema.js','panel.js','background.js','task.js','page.js','match.js','learn.js'])fs.copyFileSync(path.join(__dirname,name),path.join(ext,name));
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
    const popupUrl = worker.url().replace(/background\.js$/, manifest.action.default_popup);
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:'+server.address().port);
    const popup=await context.newPage();
    await popup.setViewportSize({width:270,height:240});
    // Exercise the popup and one sidebar tab without opening a second native sidebar.
    await popup.addInitScript(() => { chrome.sidePanel.open = async () => {}; });
    await popup.goto(popupUrl);
    await popup.getByRole('button',{name:'修改资料',exact:true}).waitFor();
    assert.deepEqual(await popup.locator('button').allTextContents().then(labels=>labels.map(label=>label.trim())), ['填写当前页','修改资料']);
    const homeHeight = await popup.locator('main').evaluate(main => main.getBoundingClientRect().bottom);
    assert.ok(homeHeight < 185, 'toolbar launcher fits within 185 CSS pixels');
    const capture = process.env.FILLDONE_UI_SCREENSHOTS;
    if (capture) await popup.screenshot({path:path.join(capture,'home.png'),clip:{x:0,y:0,width:270,height:Math.ceil(homeHeight)}});
    await popup.getByRole('button',{name:'修改资料',exact:true}).click();
    await panel.getByRole('heading',{name:'我的资料',exact:true}).waitFor();
    assert.equal(await panel.locator('#fill-view').isVisible(), false);
    await panel.setViewportSize({width:350,height:660});
    for(const [key,val] of Object.entries({姓名:'测试本人',性别:'女',户籍所在地:'测试城市',手机号码:'测试手机'})){
      const input=panel.getByLabel(key,{exact:true});await input.fill(val);await input.press('Tab');
    }
    await panel.selectOption('#category','家庭成员');
    await panel.getByLabel('姓名',{exact:true}).fill('成员甲');await panel.getByLabel('姓名',{exact:true}).press('Tab');
    await panel.click('#add');await panel.getByLabel('姓名',{exact:true}).last().fill('成员乙');await panel.getByLabel('姓名',{exact:true}).last().press('Tab');
    await panel.reload();await panel.waitForFunction(()=>document.querySelector('#records input')?.value==='测试本人');
    assert.equal(await panel.locator('#profile-view').isVisible(), true);
    if (capture) {
      await panel.locator('#category').scrollIntoViewIfNeeded();
      await panel.evaluate(() => window.scrollTo(0, 0));
      await panel.screenshot({path:path.join(capture,'profile.png')});
    }
    await page.bringToFront();
    const targetTab = await worker.evaluate(async url => (await chrome.tabs.query({url}))[0], page.url());
    assert.ok(targetTab?.id);
    const fillPopup=await context.newPage();
    // A real toolbar popup is not a tab. Supply the selected tab for this test page.
    await fillPopup.addInitScript(tab => {
      chrome.tabs.query = async () => [tab];
      chrome.sidePanel.open = async () => {};
    }, targetTab);
    await fillPopup.goto(popupUrl);
    const fillButton=fillPopup.getByRole('button',{name:'填写当前页',exact:true});
    await fillButton.waitFor();
    await page.bringToFront();
    // Trigger the click as a user gesture without making the test popup a browser tab.
    const client = await context.newCDPSession(fillPopup);
    await client.send('Runtime.evaluate',{expression:"document.querySelector('[data-view=fill]').click()",userGesture:true});
    await panel.getByRole('heading',{name:'填写结果',exact:true}).waitFor({timeout:7000}).catch(async error=>{
      console.error('Sidebar feedback:', await panel.locator('#status').textContent());
      throw error;
    });
    assert.equal(await panel.locator('#profile-view').isVisible(), false);
    async function press(name){await panel.getByRole('button',{name,exact:true}).evaluate(e=>e.click())}
    await page.waitForFunction(()=>document.querySelector('#place').value==='测试城市');
    assert.equal(await page.isChecked('#female'),true);assert.equal(await page.inputValue('#name'),'测试本人');assert.equal(await page.inputValue('#phone'),'原值');assert.equal(await page.inputValue('#member'),'');
    await panel.getByLabel(/家庭成员 · 网页区块/).selectOption('1');await press('使用所选记录填写');
    await page.waitForFunction(()=>document.querySelector('#member').value==='成员乙');
    assert.deepEqual(await panel.locator('.totals dd').allTextContents(), ['1','1','4']);
    if (capture) await panel.screenshot({path:path.join(capture,'results.png')});
    await page.locator('#extra').pressSequentially('yes');await page.locator('#extra').press('Tab');
    await panel.getByRole('heading',{name:'记住新字段'}).waitFor();
    await panel.getByLabel('批量保存此项').check();await press('保存已勾选项');
    if(await panel.locator('#status').textContent()==='网页内容已更新，请核对后保存')await press('保存此项');
    await panel.waitForFunction(()=>document.querySelector('#status').textContent.includes('下次可匹配'));
    await page.reload();await press('一键填写当前页');await page.waitForFunction(()=>document.querySelector('#extra').value==='yes');
    await panel.setViewportSize({width:285,height:620});
    assert.equal(await panel.evaluate(()=>document.documentElement.scrollWidth > innerWidth),false);
    assert.deepEqual(errors,[]);
    await panel.close();
    const nativePopup = await context.newPage();
    await nativePopup.goto(popupUrl);
    await nativePopup.getByRole('button',{name:'修改资料',exact:true}).click();
    const deadline = Date.now() + 4000;
    let sidePanelOpened = false;
    while (Date.now() < deadline && !sidePanelOpened) {
      sidePanelOpened = (await worker.evaluate(() => chrome.runtime.getContexts({contextTypes:['SIDE_PANEL']}))).length > 0;
      if (!sidePanelOpened) await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert.ok(sidePanelOpened, 'The native sidebar opens from an extension page gesture');
    console.log('PASS: persistence, aliases, existing values, multiple records, manual capture and reuse');
  }finally{await context?.close();server.close();fs.rmSync(root,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
