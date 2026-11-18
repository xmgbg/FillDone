export const sections = {
  基本信息: '姓名 性别 出生日期 手机号码 电子邮箱 证件类型 证件号码 现居住城市 入学前户口所在地 民族 最高学历 健康状况 婚姻状况 政治面貌 通信地址 受教育类型 工作经验 所在地 最近公司 体重(kg) 身高(cm) 挂科情况 奖学金情况 户籍所在地',
  求职意向: '期望工作城市 期望从事职业（岗位） 期望行业 期望月薪下限 期望月薪上限 当前薪资 期望工作性质 求职状态 现从事职业',
  教育经历: '学校名称 开始时间 结束时间 学历 专业 学位 专业课程 受教育类型 是否专升本 院系 年级排名 是否有海外学习经历',
  '工作/实习经历': '公司名称 开始时间 结束时间 至今 职务 工作描述 工作类型 职位月薪 工作地点 部门 是否有证明人',
  项目经验: '项目名称 开始时间 结束时间 至今 职务 项目中职责 项目描述 所属公司',
  语言能力: '语言类型（语种） 获得证书 等级/分数 成绩单编号 考试时间 听说能力 读写能力 掌握程度',
  专业技能: '技能类型 技能掌握程度', 奖励荣誉: '', 附件: '证件照 作品集', 其他信息: '自我评价 个人爱好',
  '学生会/社团活动': '干部级别 担任职务 组织/团体名称 开始时间 结束时间 职责和成就',
  科研经历: '', 家庭成员: '姓名 关系 工作单位 现住址 现状 职位 联系电话'
};
export const single = new Set(['基本信息','求职意向','附件','其他信息']);
export function fields(section, record) {
  return [...new Set([...sections[section].split(' ').filter(Boolean), ...Object.keys(record)])];
}
export function rows(profile, section) {
  return profile[section] ||= [{}];
}
export function inputType(key) {
  if (['出生日期','考试时间'].includes(key)) return 'date';
  if (['开始时间','结束时间'].includes(key)) return 'month';
  if (['证件照','作品集'].includes(key)) return 'file';
  if (['工作描述','项目中职责','项目描述','职责和成就','自我评价','个人爱好','专业课程'].includes(key)) return 'textarea';
  return 'text';
}
