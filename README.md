<p align="center"><img src="icons/logo.svg" width="96" height="96" alt="小回车，填好啦的蓝色键帽标志"></p>

# 填好啦 · FillDone

填好啦是一款 Microsoft Edge 秋招网申扩展。把教育、实习、项目等资料录入一次，打开下一家公司的申请表时，就能在侧边栏填写当前页。所有字段都可以留空，正填到哪一项，就从哪一项开始。

<p align="center">
  <img alt="Microsoft Edge · Manifest V3" src="https://img.shields.io/badge/Edge-Manifest_V3-2563EB?style=flat-square">
  <img alt="JavaScript · ES Modules" src="https://img.shields.io/badge/JavaScript-ES_Modules-916300?style=flat-square">
  <img alt="HTML · 5" src="https://img.shields.io/badge/HTML-5-C2410C?style=flat-square">
  <img alt="CSS · 原生" src="https://img.shields.io/badge/CSS-%E5%8E%9F%E7%94%9F-7C3AED?style=flat-square">
  <img alt="Playwright · E2E" src="https://img.shields.io/badge/Playwright-E2E-15803D?style=flat-square">
</p>

扩展直接从源码加载，无需安装运行依赖或构建。

## 安装到 Edge

1. 在本仓库选择 **Code → Download ZIP**，解压到一个固定目录。也可以运行 `git clone https://github.com/xmgbg/FillDone.git`。
2. 在 Edge 地址栏打开 `edge://extensions`，开启「开发人员模式」，点击「加载解压缩的扩展」。
3. 选择包含 `manifest.json` 的目录。打开「扩展」菜单，把蓝色的「小回车」图标固定到工具栏。

更新本地代码后，在扩展管理页点击「重新加载」。

## 第一次填写

1. **录入资料。** 点击工具栏图标，在小主页选择「修改资料」，然后在侧边栏选择分类。编辑文字后点击其他位置即可保存。教育、实习、项目或家庭成员等分类可以添加多条记录。
2. **填写当前页。** 打开网申页面，点击工具栏图标后选择「填写当前页」。插件会根据字段名称和所属分组匹配答案。例如，「户口所在地」可以匹配「户籍所在地」，「入学前户籍所在地」则使用单独保存的值。已有内容会保留。
3. **核对结果。** 展开「查看全部字段」。同类经历有多条时，为页面上的区块选好对应记录，再点击「使用所选记录填写」。核对后由你在招聘网站上继续或提交。

## 记住手动补填的答案

先点击「一键填写当前页」，再到网页上补填未匹配的字段。侧边栏的「记住新字段」会显示候选项，你可以单项保存，也可以勾选后批量保存。

| 遇到的问题 | 保存方式 |
| --- | --- |
| 新网站把已有字段换了个叫法 | 选择「关联已有字段」，下次在该网站复用这条匹配规则 |
| 新增「是否持有驾照」等通用问题 | 选择「新增通用字段」，供其他网申页按名称和分组匹配 |
| 「为什么选择本公司」等专属问题 | 选择「仅此网站使用」，保存前核对答案和适用范围 |

## 本地资料与兼容性

资料、附件和学习到的规则保存在当前 Edge 配置的扩展本地存储中。卸载扩展会清除这些资料。执行填写时，当前招聘网页可以读取已填入表单的内容。

已使用本地模拟网申页在 Edge 中验证字段别名、多段记录、原生单选、已有值保护和新答案复用。学校搜索框、地区联动等自定义控件可能需要手动选择。跳转到另一个招聘域名后，若侧边栏提示授权，请在新页面再次点击工具栏图标。

## 许可证

[Apache License 2.0](LICENSE)
