import assert from 'node:assert/strict';
import {match} from './match.js';
assert.equal(match(' * 户口所在地：','基本信息',{}).key,'户籍所在地');
assert.equal(match('入学前户籍所在地','基本信息',{}).key,'入学前户口所在地');
assert.equal(match('联系电话','家庭成员',{}).key,'联系电话');
assert.equal(match('姓名','',{}),null);
assert.equal(match('紧急联系人手机号码','基本信息',{}),null);
assert.equal(match('持有驾照','基本信息',{'基本信息':[{'持有驾照':'是'}]}).key,'持有驾照');
