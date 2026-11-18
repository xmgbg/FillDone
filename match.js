import {sections, fields} from './schema.js';
export function norm(text='') {
  return text.normalize('NFKC').toLowerCase().replace(/[\s*:：]/g,'').replace(/\((必填|选填)\)$/,'');
}
const synonyms={
  '基本信息':{姓名:['真实姓名','中文姓名','姓名全称'],手机号码:['手机号','手机','联系电话','移动电话'],电子邮箱:['邮箱','电子邮件','email','e-mail'],户籍所在地:['户口所在地','户籍地'],入学前户口所在地:['入学前户籍所在地'],现居住城市:['现居城市','目前居住城市'],出生日期:['生日','出生年月日'],通信地址:['通讯地址']},
  '求职意向':{期望工作城市:['意向城市','期望工作地点'],'期望从事职业（岗位）':['期望岗位','意向岗位']},
  '教育经历':{学校名称:['学校','院校名称','毕业院校'],专业:['专业名称','所学专业'],院系:['学院','院系名称'],开始时间:['入学时间'],结束时间:['毕业时间','预计毕业时间']},
  '工作/实习经历':{公司名称:['实习单位','公司','单位名称'],职务:['岗位','职位','实习岗位'],工作描述:['工作内容','实习内容']},
  '项目经验':{项目中职责:['个人职责','项目职责','个人贡献'],职务:['项目角色']},
  '家庭成员':{姓名:['成员姓名'],联系电话:['手机号','手机号码'],关系:['与本人关系']}
};
export function match(label,group,profile){
  const wanted=norm(label);
  if(!wanted)return null;
  const groups=group?[group]:Object.keys(sections);
  const hits=[];
  for(const section of groups){
    const keys=new Set(fields(section,{}));
    for(const row of profile[section]||[])for(const key of Object.keys(row))keys.add(key);
    for(const key of keys){
      if([key,...(synonyms[section]?.[key]||[])].some(alias=>norm(alias)===wanted))hits.push({section,key});
    }
  }
  return hits.length===1?hits[0]:null;
}
