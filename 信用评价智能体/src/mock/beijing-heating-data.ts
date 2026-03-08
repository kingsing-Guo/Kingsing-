import type { CreditEvalModel, ReferenceCase } from '../types/model';

export interface HeatingEnterprise {
  creditCode: string;
  name: string;
}

export const BEIJING_HEATING_DOC_TITLE = '北京市供热企业信用评价管理办法（试行）';

export const BEIJING_HEATING_REFERENCE_CASES: ReferenceCase[] = [
  {
    id: 'ref-heating-jilin',
    title: '《吉林省城市供热企业信用评价管理办法（征求意见稿）》',
    source: '互联网检索（模拟）',
    summary:
      '采用 100 分制与 A/B/C/D 四级评价，强调年度评价、投诉率与停热事件扣分、重大情形直接降为 D 级。',
    originalText: `【原文节选｜吉林省城市供热企业信用评价管理办法（征求意见稿）】
第一条 为加强城市供热管理，规范供热市场秩序，确保供热安全稳定运行，提高供热质量，促进供热行业健康、平稳、可持续发展，制定本办法。
第六条 供热企业信用评价每年度评价一次，评价周期为每年6月至次年5月。
第九条 供热企业评价总分值为100分，评价结论分为四个等级：
A 级：总分≥90；B 级：总分≥75；C 级：总分≥60；D 级：总分<60。
第十三条 因供热企业原因造成大面积停热的，停热时间超过48小时且停热在网面积达到总在网面积10%以上的，按公式扣分。
第十四条 政府受理一个采暖期供热投诉率超过基准点（1%）的，按比例扣分。
第十五条 供热企业有下列情形之一的，年度评价列入D级企业名单：
（一）擅自转让、出租供热经营项目；
（二）擅自停业、歇业、弃管；
（三）供热设施不符合环保、节能、安全技术规范；
（四）在评价过程中提供材料弄虚作假。`,
  },
  {
    id: 'ref-heating-xinjiang',
    title: '《新疆维吾尔自治区城镇供热企业信用评价管理办法（试行）》',
    source: '互联网检索（模拟）',
    summary:
      '采用“基本分+良好信息+不良信息”机制，包含 AAA-AA-A-B-C 五级，强调严重失信直接降级与联合惩戒。',
    originalText: `【原文节选｜新疆维吾尔自治区城镇供热企业信用评价管理办法（试行）】
第二条 信用评价是对城镇供热企业经营管理、供热质量、运行维护、安全管理、供热服务、投诉办理、智能化建设等方面的综合评估。
第七条 城镇供热企业信用信息由基本信用信息、良好信用信息和不良信用信息构成。
第十九条 城镇供热企业信用评价实行量化评分制：
信用得分 = 基本信用分（70分） + 良好信用分 - 不良信用分。
第二十条 信用等级分为 AAA、AA、A、B、C 五个等级。
第二十一条 企业有以下情形之一的，视为严重失信行为，信用评价为C级：
（一）利用虚假材料骗取许可或补贴；
（二）故意隐瞒情况、提供虚假资料影响评价；
（三）发生重大及以上安全生产事故，或一年内累计发生2次及以上较大安全事故；
（四）被司法机关纳入失信被执行人名单。
第二十三条 评价按照一个供暖季为周期，每年6月底前完成上一供暖季企业信用评价。`,
  },
  {
    id: 'ref-heating-heilongjiang',
    title: '《黑龙江省城镇供热企业信用评价管理办法（2021）》',
    source: '互联网检索（模拟）',
    summary:
      '突出供热质量与运行安全，设置红黄黑名单管理，年度评定并与监管频次、政策支持挂钩。',
    originalText: `【原文节选｜黑龙江省城镇供热企业信用评价管理办法（2021）】
第六条 供热企业信用评价每年度评价一次，评价周期为每年7月至次年6月，建立“红黄黑”榜。
第八条 供热企业评价指标包括经营管理、供热质量、运行维护、安全管理、供热服务、投诉办理、智能化建设、加分项目等。
第九条 供热企业评价总分值为240分（基础分230分、附加分10分）：
红榜：≥210分；黄榜：160~210分；黑榜：<160分。
第十二条 因供热企业原因造成大面积停热的，根据停热面积与恢复时间进行扣分或直接列入黄榜/黑榜。
第十三条 供暖期室温达标率低于90%、擅自停业弃管、推迟供热或提前停热等情形，年度评价列入黑榜企业名单。
第十八条 对黑榜企业实施重点监管，责令限期整改并调减供热区域；连续2年黑榜的，依法依规撤销供热许可证。`,
  },
];

export const BEIJING_HEATING_POLICY_FILE_LIBRARY: Array<{
  match: RegExp;
  summary: string;
  originalText: string;
}> = [
  {
    match: /吉林省城市供热企业信用评价管理办法/i,
    summary:
      '文件重点：100 分制、A/B/C/D 四级、年度评价；对重大安全事故、弃管停热等情形设置直接降级或否决条款。',
    originalText: `【吉林省供热办法原文节选】
第一章 总则：评价遵循公平、公正、公开原则，实行政府主导、统一标准、综合评价。
第六条：每年度评价一次，评价周期为每年6月至次年5月。
第九条：总分100分，A/B/C/D四级。
第十三条：大面积停热按停热面积与时长扣分。
第十四条：投诉率超过1%基准点按比例扣分。
第十五条：擅自停业、歇业、弃管、弄虚作假等情形可直接列入D级。`,
  },
  {
    match: /新疆维吾尔自治区城镇供热企业信用评价管理办法/i,
    summary:
      '文件重点：以“基本分+良好信息+不良信息”构成综合分，强调严重失信行为直接降级与跨部门联合惩戒。',
    originalText: `【新疆办法原文节选】
第七条：信用信息由基本信用、良好信用、不良信用三部分构成。
第十九条：信用得分 = 基本信用分（70分）+ 良好信用分 - 不良信用分。
第二十条：等级为AAA、AA、A、B、C。
第二十一条：重大安全事故、虚假申报、失信被执行人等情形，信用评价直接认定为C级。
第二十九条至第三十条：信用结果用于市场准入、特许经营、动态监管与差异化管理。`,
  },
  {
    match: /黑龙江省城镇供热企业信用评价管理办法/i,
    summary:
      '文件重点：围绕供热质量、安全生产和服务能力形成年度评价，配套红黄黑名单与差异化监管机制。',
    originalText: `【黑龙江办法原文节选】
第八条：指标覆盖经营管理、供热质量、运行维护、安全管理、供热服务、投诉办理、智能化建设、加分项目。
第九条：总分240分，评价结果分红榜、黄榜、黑榜。
第十二条：大面积停热按面积和时长扣分或直接降档。
第十三条：室温达标率低于90%、擅自停业弃管等行为直接列入黑榜。
第十八条：黑榜企业实施重点监管并调减供热区域，连续2年黑榜依法清退。`,
  },
  {
    match: /北京市热力公司/i,
    summary:
      '文件为北京市供热企业基础名单，共 95 家主体，包含统一社会信用代码与企业名称，可直接用于模型验算样本。',
    originalText:
      '【北京市供热企业样本清单】\n字段：序号、统一社会信用代码、公司名称。\n用途：作为验算环节本地导入样本，模拟年度信用评价跑批。',
  },
];

export const BEIJING_HEATING_MODEL: CreditEvalModel = {
  modelName: '北京市供热企业信用评价模型',
  totalScoreMode: 100,
  publicCreditWeight: 15,
  gradeLevels: [
    { id: 'g1', name: 'A', minScore: 85, color: '#10b981' },
    { id: 'g2', name: 'B', minScore: 70, color: '#3b82f6' },
    { id: 'g3', name: 'C', minScore: 60, color: '#f59e0b' },
    { id: 'g4', name: 'D', minScore: 0, color: '#ef4444' },
  ],
  vetoRules: [
    {
      id: 'v1',
      name: '发生重大及以上安全生产事故',
      description: '当年发生重大及以上安全责任事故，信用评级直接归为 D 级。',
    },
    {
      id: 'v2',
      name: '被司法机关纳入失信被执行人名单',
      description: '认定为严重失信行为，评价结果直接归最低等级。',
    },
    {
      id: 'v3',
      name: '擅自停业、弃管或造成大范围停热',
      description: '存在弃管停热、提前停热或长时间中断供热等情形，触发一票否决。',
    },
  ],
  bonusRules: [
    { id: 'b1', name: '获得国家级/省部级供热科技奖项', score: 8 },
    { id: 'b2', name: '供热系统智能化项目获市级以上试点或示范', score: 5 },
    { id: 'b3', name: '连续三年用户满意度位于行业前列', score: 7 },
  ],
  indicators: [
    {
      id: 'ind-1',
      name: '公共信用综合评价',
      level: 1,
      weight: 15,
      score: 15,
      direction: 'positive',
      description: '直接引用主体公共信用综合评价结果，按权重折算计入总分。',
      dataSource: '主体公共信用综合评价 (CP_SUBJECT_PUBLIC_CREDIT_SCORE)',
      ruleType: 'formula',
    },
    {
      id: 'ind-2',
      name: '供热质量与用户满意度',
      level: 1,
      weight: 30,
      score: 30,
      direction: 'positive',
      description: '重点衡量供热效果与用户服务体验。',
      children: [
        {
          id: 'ind-2-1',
          name: '室温达标率',
          level: 2,
          weight: 40,
          direction: 'positive',
          description: '采暖期室温达标情况，达标率越高得分越高。',
          ruleType: 'ratio',
          dataSource: '采暖期室温达标率 (CP_TEMP_COMPLIANCE_RATE)',
        },
        {
          id: 'ind-2-2',
          name: '用户投诉率',
          level: 2,
          weight: 30,
          direction: 'negative',
          description: '按千户有效投诉率统计，投诉越少得分越高。',
          ruleType: 'interval',
          dataSource: '千户有效投诉率 (CP_COMPLAINT_RATE_PER_1K)',
        },
        {
          id: 'ind-2-3',
          name: '热态试运行与稳定性',
          level: 2,
          weight: 30,
          direction: 'positive',
          description: '采暖季初期热态试运行和稳定供热情况。',
          ruleType: 'linear',
          dataSource: '热态试运行稳定性评分 (CP_HOT_RUN_STABILITY)',
        },
      ],
    },
    {
      id: 'ind-3',
      name: '安全运行与应急管理',
      level: 1,
      weight: 35,
      score: 35,
      direction: 'positive',
      description: '聚焦安全生产制度、事故记录和应急处置能力。',
      children: [
        {
          id: 'ind-3-1',
          name: '安全生产制度与执行',
          level: 2,
          weight: 40,
          direction: 'positive',
          description: '责任制度、应急预案、值班制度等建设与执行情况。',
          ruleType: 'threshold',
          dataSource: '安全生产制度执行达标 (CP_SAFETY_SYSTEM_COMPLIANCE)',
        },
        {
          id: 'ind-3-2',
          name: '安全事故记录',
          level: 2,
          weight: 35,
          direction: 'negative',
          description: '统计评价周期内安全事故次数及严重程度。',
          ruleType: 'cumulative',
          dataSource: '安全事故次数 (CP_SAFETY_INCIDENT_COUNT)',
        },
        {
          id: 'ind-3-3',
          name: '应急演练与处置实效',
          level: 2,
          weight: 25,
          direction: 'positive',
          description: '应急演练达标率和突发事件处置时效综合评分。',
          ruleType: 'ratio',
          dataSource: '应急演练达标率 (CP_EMERGENCY_DRILL_SCORE)',
        },
      ],
    },
    {
      id: 'ind-4',
      name: '合规经营与绿色发展',
      level: 1,
      weight: 20,
      score: 20,
      direction: 'positive',
      description: '关注能效、环保与绿色低碳发展水平。',
      children: [
        {
          id: 'ind-4-1',
          name: '单位供热能耗强度',
          level: 2,
          weight: 35,
          direction: 'negative',
          description: '单位供热面积综合能耗强度，强度越低得分越高。',
          ruleType: 'linear',
          dataSource: '单位供热面积能耗 (CP_ENERGY_INTENSITY)',
        },
        {
          id: 'ind-4-2',
          name: '清洁能源供热占比',
          level: 2,
          weight: 35,
          direction: 'positive',
          description: '清洁能源在供热结构中的占比水平。',
          ruleType: 'ratio',
          dataSource: '清洁能源供热占比 (CP_CLEAN_HEAT_RATE)',
        },
        {
          id: 'ind-4-3',
          name: '碳排放合规与减排任务完成度',
          level: 2,
          weight: 30,
          direction: 'positive',
          description: '碳排放合规情况及年度减排任务完成程度。',
          ruleType: 'threshold',
          dataSource: '碳排放合规评分 (CP_CARBON_COMPLIANCE_SCORE)',
        },
      ],
    },
  ],
};

export const BEIJING_HEATING_VALIDATION_DATASET = {
  id: 'beijing_heating_95',
  fileName: '北京市热力公司(95).xlsx',
  description: '北京市供热企业样本名单（95家）',
  enterprises: [
    { creditCode: '91110302101182835B', name: '北京博大开拓热力有限公司' },
    { creditCode: '91110115802846331Q', name: '北京首兴永安供热有限公司' },
    { creditCode: '91110105700223037E', name: '北京兴邦物业管理有限责任公司' },
    { creditCode: '91110101663125461B', name: '北京森燃供暖科技发展有限公司' },
    { creditCode: '911101018012236189', name: '北京房修一供暖有限公司' },
    { creditCode: '91110105580877414N', name: '北京春风供热服务有限公司' },
    { creditCode: '91110116721485343E', name: '北京鹏跃供暖有限责任公司' },
    { creditCode: '911101057467011536', name: '北京兆佳物业管理有限责任公司华威联建供热厂' },
    { creditCode: '91110101633097949A', name: '北京银达物业管理有限责任公司' },
    { creditCode: '91110112576864071N', name: '北京天地同创能源科技发展有限公司' },
    { creditCode: '911101125877383612', name: '北京燃气能源发展有限公司' },
    { creditCode: '91110106774079453D', name: '北京融合供暖服务有限责任公司' },
    { creditCode: '91110105801784079W', name: '瑞航(北京)物业管理有限公司' },
    { creditCode: '91110102693251485B', name: '北京中商和旭物业管理有限公司' },
    { creditCode: '91110106802207951L', name: '北京海园物业管理有限公司' },
    { creditCode: '91110106700109373Y', name: '北京融乐物业管理有限公司' },
    { creditCode: '91110105633009929T', name: '北京竭诚物业管理有限公司' },
    { creditCode: '91110106794056486Q', name: '北京萨密特科技有限公司' },
    { creditCode: '12110106E00828555D', name: '北京市丰台区房屋经营管理中心供暖设备服务所' },
    { creditCode: '911101067447373712', name: '北京泰和熹供热有限公司' },
    { creditCode: '91110108721467858P', name: '北京今日今典物业管理有限责任公司' },
    { creditCode: '911101170627752159', name: '北京今日玉林热能投资管理有限公司' },
    { creditCode: '91110106102167338J', name: '北京丰台城建物业管理有限公司' },
    { creditCode: '911101145825614991', name: '北京永安热力有限公司' },
    { creditCode: '91110114746134750D', name: '北京天阳供暖有限公司' },
    { creditCode: '9111011169957789X6', name: '中嘉能源管理(北京)有限公司' },
    { creditCode: '121100004006885458', name: '首都医科大学附属北京安贞医院' },
    { creditCode: '12110112400953820M', name: '北京市通州区住宅锅炉供暖中心' },
    { creditCode: '911101067848280592', name: '北京永诚恒通设备安装有限公司' },
    { creditCode: '911101146787842675', name: '北京东盛巨鑫环保供热科技开发有限公司' },
    { creditCode: '91110108064895608M', name: '北京蓝天格瑞能源管理有限公司' },
    { creditCode: '91110304MA00GD085C', name: '北京源森热能技术有限公司' },
    { creditCode: '91110102101797899Y', name: '北京市首创吉润物业管理有限公司' },
    { creditCode: '91110108MA009EYW2J', name: '北京海房供热有限公司' },
    { creditCode: '12110102400795578B', name: '北京市西城区房屋土地经营管理中心供暖管理所' },
    { creditCode: '91110101101436460D', name: '北京国联同利物业管理中心' },
    { creditCode: '91110101770434622Q', name: '北京宣胜大安机械设备维修有限公司' },
    { creditCode: '91110112397740903D', name: '北京信达至诚新能源投资有限公司' },
    { creditCode: '91110105675080133D', name: '北京华奥元方能源科技有限公司' },
    { creditCode: '91110117789974602J', name: '北京四海安信物业管理有限公司' },
    { creditCode: '9111010767505690X9', name: '北京安华兴业热能科技有限公司' },
    { creditCode: '911101147934046614', name: '北京宏翔鸿物业管理有限公司供热服务中心' },
    { creditCode: '91110114786171708J', name: '北京卓越华盛供热投资管理有限公司' },
    { creditCode: '91110116102598779Q', name: '北京富杨供暖有限公司' },
    { creditCode: '91110116MA00BJBA0W', name: '北京大地宏宇供热有限责任公司' },
    { creditCode: '91110106754667493N', name: '北京匠心置业有限公司' },
    { creditCode: '91110106560437489E', name: '北京南宫恒业供暖服务有限公司' },
    { creditCode: '91110116748827171R', name: '北京铭月豪物业管理有限责任公司' },
    { creditCode: '91110112742640218P', name: '北京园景时尚物业管理有限公司' },
    { creditCode: '91110108318359128W', name: '北京亿城西山物业管理有限公司' },
    { creditCode: '91110115MA002NW20X', name: '北京北燃热力有限公司' },
    { creditCode: '91110105697733270F', name: '北京嘉恒同心供热服务有限公司' },
    { creditCode: '121100004006396715', name: '北京市水务局房屋管理中心' },
    { creditCode: '911101110673279483', name: '北京华征太合热力科技有限公司' },
    { creditCode: '9111011206957933X6', name: '北京华征元烁热力科技有限公司' },
    { creditCode: '911101115568073870', name: '北京华征力通热力科技有限公司' },
    { creditCode: '91110113742607493X', name: '北京牛栏山物业管理中心' },
    { creditCode: '91110115758225844D', name: '北京翔仁物业管理有限公司' },
    { creditCode: '91110116MA004AJQXW', name: '北京福祥昌顺能源科技有限公司' },
    { creditCode: '91110111MA006K151A', name: '北京长阳众城热力供应有限公司' },
    { creditCode: '911101115531354905', name: '北京鑫泽通达供热有限公司' },
    { creditCode: '9111011166219203X2', name: '北京鸿达开拓供热有限公司' },
    { creditCode: '91110108344407146K', name: '中房城市能源科技有限公司' },
    { creditCode: '911101167552859992', name: '北京东环供暖中心' },
    { creditCode: '91110106690820590T', name: '北京通达晟热力科技发展有限公司' },
    { creditCode: '911101167447076317', name: '北京晟通供热有限责任公司' },
    { creditCode: '911101161025967497', name: '北京天联热力有限公司' },
    { creditCode: '12110000400689417W', name: '北京市体育服务事业管理中心' },
    { creditCode: '91110114335541060D', name: '北京敏庆万佳供暖有限公司' },
    { creditCode: '911102281030017863', name: '北京正圆嘉和物业管理有限责任公司' },
    { creditCode: '9111022967283231XY', name: '北京环宇新星供暖有限公司' },
    { creditCode: '91110106661553796X', name: '北京华源里热力服务有限公司' },
    { creditCode: '911101018012346755', name: '北京首华物业管理有限公司' },
    { creditCode: '911101053183122829', name: '北京通商汇才物业管理有限公司林奥嘉园分公司' },
    { creditCode: '91110228556811941H', name: '北京再博节能环保技术有限公司' },
    { creditCode: '911101088020734203', name: '北京蓝天瑞德环保技术股份有限公司' },
    { creditCode: '91110105792145821J', name: '北京世奥物业管理有限公司' },
    { creditCode: '9111010810118841XL', name: '北京城承物业管理有限责任公司' },
    { creditCode: '9111011774811477XH', name: '北京裕发弘瑞物业管理有限公司' },
    { creditCode: '9111011330668779XG', name: '北京纵横顺欣热力科技有限公司' },
    { creditCode: '91110106673830578P', name: '北京德易达节能科技有限公司' },
    { creditCode: '91110102733456363M', name: '北京天恒热力有限公司' },
    { creditCode: '91110114MA0088J97W', name: '北京金汇利通能源科技有限公司' },
    { creditCode: '91110112MA004MQY27', name: '北京北燃通州供热有限公司' },
    { creditCode: '91110115781721678C', name: '北京亦庄鹿海园供热有限公司' },
    { creditCode: '91110114688391934A', name: '北京德诺达能源投资管理有限公司' },
    { creditCode: '911101115712098443', name: '北京森瑞景投资管理有限公司' },
    { creditCode: '91110111691659700D', name: '北京纵横臣仕供暖服务有限公司' },
    { creditCode: '91110111553140310T', name: '北京环春宇投资管理有限公司' },
    { creditCode: '911101017861909179', name: '北京纵横三北热力科技有限公司' },
    { creditCode: '91110109MA01776X3D', name: '北京纵横城市供暖服务有限公司' },
    { creditCode: '911101157662796829', name: '北京华盈天润能源科技有限公司' },
    { creditCode: '121101014007822830', name: '北京市东城区供暖一中心' },
    { creditCode: '91110109723988294U', name: '北京国信恒望热力有限公司' },
    { creditCode: '91110000783204578F', name: '北京首都机场动力能源有限公司' },
  ],
} as const;

export const BEIJING_HEATING_ENTERPRISES: HeatingEnterprise[] = [...BEIJING_HEATING_VALIDATION_DATASET.enterprises];
