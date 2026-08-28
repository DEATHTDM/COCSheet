<script setup lang="ts">
import {
  chaosiumUrl,
  fanMaterialNotice,
  fanMaterialPolicyCheckedOn,
  fanMaterialPolicyUrl,
} from "../app/legalContent";
import { repositoryUrl } from "../app/releaseLinks";

const licenseUrl = `${repositoryUrl}/blob/main/LICENSE`;
const noticeUrl = `${repositoryUrl}/blob/main/NOTICE.md`;
</script>

<template>
  <section class="narrow-page page-stack legal-page">
    <header>
      <p class="legal-kicker">非官方粉丝项目</p>
      <h1>法律与许可</h1>
      <p>
        COCSheet 是免费提供访问的非商业 Call of Cthulhu® 7版粉丝建卡工具，
        不是 Chaosium Inc. 发布、认可或特别批准的官方产品。
      </p>
    </header>

    <section class="panel legal-section" aria-labelledby="fan-material-heading">
      <h2 id="fan-material-heading">Fan Material Policy 声明</h2>
      <p class="fan-material-notice" lang="en">{{ fanMaterialNotice }}</p>
      <p class="muted">官方政策最近核对日期：{{ fanMaterialPolicyCheckedOn }}</p>
      <a :href="fanMaterialPolicyUrl" target="_blank" rel="noopener noreferrer">
        查看 Chaosium Fan Material Policy
      </a>
    </section>

    <section class="panel legal-section" aria-labelledby="trademark-heading">
      <h2 id="trademark-heading">商标与粉丝内容</h2>
      <p>
        Call of Cthulhu® 是 Chaosium Inc. 的注册商标。相关商标、游戏内容、规则资料、
        出版物衍生数据与来源引用的权利归各自权利人所有；它们不会因为出现在本站或源代码仓库中而获得 GPL 授权。
      </p>
      <p>
        本站不使用 Chaosium logo 或官方版式。当前公开站点免费访问、不收费、不销售人物数据，也不提供付费功能。
      </p>
    </section>

    <section class="panel legal-section" aria-labelledby="software-license-heading">
      <h2 id="software-license-heading">原创软件代码</h2>
      <p>
        COCSheet 作者拥有权利的原创软件代码，在适用范围内按 GPL-3.0-only 提供。
        这项授权不扩张至 Chaosium 或其他权利人的商标与粉丝游戏内容。
      </p>
      <p>
        重新分发者若希望商业使用，必须自行取得 Chaosium 相关内容所需的许可，
        或删除、替换不具备相应商业授权的 bundled fan material。
      </p>
      <ul class="legal-links">
        <li><a :href="repositoryUrl" target="_blank" rel="noopener noreferrer">项目源代码</a></li>
        <li><a :href="licenseUrl" target="_blank" rel="noopener noreferrer">GPL-3.0-only 正文</a></li>
        <li><a :href="noticeUrl" target="_blank" rel="noopener noreferrer">NOTICE 许可范围说明</a></li>
        <li><a :href="chaosiumUrl" target="_blank" rel="noopener noreferrer">Chaosium 官方网站</a></li>
      </ul>
    </section>

    <RouterLink class="button" to="/">返回首页</RouterLink>
  </section>
</template>
