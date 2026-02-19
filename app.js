const dashboardData = {
  district: {
    label: "九龙坡区",
    options: ["九龙坡区"],
    overview: {
      target: 925000,
      completed: 856420,
      gap: 68580,
      progress: 92.58,
      stockGrowth: "存量巩固 96.1% · 增量拓展 81.3%",
      yoy: "+2.6%",
      mom: "+0.9%"
    },
    regionRanking: [
      ["谢家湾街道", 95.2, 1220],
      ["石桥铺街道", 93.8, 1476],
      ["杨家坪街道", 92.1, 1643],
      ["中梁山街道", 88.5, 2014]
    ],
    population: {
      employee: [
        ["随单位参保占比", "67.3%"],
        ["灵活就业参保占比", "22.8%"],
        ["退休参保占比", "9.9%"],
        ["16-30岁参保率", "71.6%"],
        ["31-45岁参保率", "84.9%"],
        ["46-60岁参保率", "89.2%"],
        ["60岁以上参保率", "97.4%"]
      ],
      resident: [
        ["新生儿/未成年参保率", "96.1%"],
        ["大学生参保率", "91.7%"],
        ["成年人参保率", "88.3%"],
        ["老年人参保率", "98.2%"],
        ["男性参保率", "90.1%"],
        ["女性参保率", "92.4%"]
      ]
    },
    residence: [
      ["本辖区户籍+本辖区居住", "58.4%"],
      ["本辖区户籍+非本辖区居住", "11.8%"],
      ["非本辖区户籍+本辖区居住", "24.2%"],
      ["非户籍人口参保占比", "5.6%"]
    ],
    risk: {
      summary: [
        ["正常参保", "812,006"],
        ["暂停参保", "26,103"],
        ["断缴/缓缴", "18,311"],
        ["异常预警", "5,942"]
      ],
      high: [
        "企业欠费/断缴超3个月：138家",
        "企业参保差异率≥20%：79家",
        "缴费基数做实率<80%：66家"
      ],
      medium: [
        "已登记未缴费/未全员参保：236家",
        "企业欠费/断缴3个月内：191家",
        "企业参保差异率10%-20%：144家",
        "灵活就业近30天未缴费：322人"
      ]
    },
    suspendFlow: [
      ["转居民医保人数", "8,219"],
      ["主动申请暂停人数", "5,662"],
      ["跨统筹区转出本区人数", "6,129"],
      ["其他原因暂停占比", "23.8%"]
    ],
    grassroots: [
      ["职工参保人数增减", "+1,240"],
      ["居民参保人数增减", "+2,966"],
      ["缴费人数增减", "+1,711"],
      ["断缴人数增减", "-632"]
    ],
    todos: [
      ["高风险企业-重庆某机电有限公司", "欠费4个月，需48小时内对接"],
      ["中风险居民-石桥铺街道杨某", "灵活就业断缴29天，建议本周回访"],
      ["高风险企业-某建筑劳务公司", "参保差异率22%，需核验在岗名单"]
    ],
    targets: {
      resident: [
        { name: "杨某", id: "***4821", town: "石桥铺街道", village: "白鹤社区", age: 41, risk: "medium", days: 29, reason: "灵活就业未及时续缴" },
        { name: "周某", id: "***7734", town: "杨家坪街道", village: "兴胜路社区", age: 63, risk: "low", days: 7, reason: "跨区就医后待恢复" },
        { name: "刘某", id: "***9012", town: "中梁山街道", village: "华岩新村", age: 34, risk: "high", days: 96, reason: "断缴超过3个月" }
      ],
      enterprise: [
        { name: "重庆某机电有限公司", code: "9150***9876", town: "谢家湾街道", village: "黄杨路社区", emp: 217, risk: "high", days: 128, reason: "欠费超3个月" },
        { name: "某建筑劳务公司", code: "9150***3321", town: "石桥铺街道", village: "科园一路社区", emp: 86, risk: "high", days: 64, reason: "参保差异率22%" },
        { name: "九龙坡某商贸有限公司", code: "9150***1452", town: "华岩镇", village: "华福家园社区", emp: 43, risk: "medium", days: 26, reason: "缴费基数做实率88%" }
      ]
    }
  },
  town: {
    label: "石桥铺街道",
    options: ["谢家湾街道", "石桥铺街道", "杨家坪街道", "中梁山街道", "华岩镇"],
    overview: { target: 118000, completed: 106660, gap: 11340, progress: 90.39, stockGrowth: "存量巩固 94.3% · 增量拓展 78.2%", yoy: "+2.1%", mom: "+0.5%" },
    regionRanking: [["白鹤社区", 93.6, 321], ["科园一路社区", 91.4, 417], ["朝阳路社区", 89.8, 502], ["高庙村", 86.3, 699]],
    population: {
      employee: [["随单位参保占比", "65.8%"], ["灵活就业参保占比", "24.6%"], ["退休参保占比", "9.6%"], ["31-45岁参保率", "83.1%"]],
      resident: [["未成年参保率", "95.2%"], ["大学生参保率", "90.8%"], ["成年人参保率", "85.6%"], ["老年人参保率", "97.9%"]]
    },
    residence: [["本辖区户籍+本辖区居住", "54.1%"], ["非本辖区户籍+本辖区居住", "28.5%"], ["非户籍人口参保占比", "7.2%"]],
    risk: {
      summary: [["正常参保", "100,214"], ["暂停参保", "3,869"], ["断缴/缓缴", "2,577"], ["异常预警", "911"]],
      high: ["企业欠费/断缴超3个月：17家", "企业参保差异率≥20%：12家"],
      medium: ["未全员参保企业：36家", "灵活就业近30天未缴费：71人"]
    },
    suspendFlow: [["转居民医保人数", "1,202"], ["主动申请暂停人数", "784"], ["跨统筹区转出本区人数", "931"]],
    grassroots: [["职工参保人数增减", "+112"], ["居民参保人数增减", "+378"], ["缴费人数增减", "+164"], ["断缴人数增减", "-71"]],
    todos: [["白鹤社区企业清单", "2家高风险企业待入企核查"], ["科园一路社区居民清单", "6名断缴超60天居民待走访"]],
    targets: {
      resident: [
        { name: "陈某", id: "***7721", town: "石桥铺街道", village: "白鹤社区", age: 52, risk: "high", days: 74, reason: "断缴超60天" },
        { name: "唐某", id: "***1820", town: "石桥铺街道", village: "科园一路社区", age: 28, risk: "medium", days: 22, reason: "灵活就业缴费逾期" }
      ],
      enterprise: [
        { name: "石桥铺某科技公司", code: "9150***9011", town: "石桥铺街道", village: "朝阳路社区", emp: 51, risk: "high", days: 92, reason: "欠费超3个月" },
        { name: "某餐饮管理公司", code: "9150***2910", town: "石桥铺街道", village: "白鹤社区", emp: 33, risk: "medium", days: 19, reason: "基数做实率85%" }
      ]
    }
  },
  village: {
    label: "白鹤社区",
    options: ["白鹤社区", "科园一路社区", "朝阳路社区", "华福家园社区", "高庙村"],
    overview: { target: 18600, completed: 17104, gap: 1496, progress: 91.96, stockGrowth: "存量巩固 95.8% · 增量拓展 80.4%", yoy: "+1.4%", mom: "+0.3%" },
    regionRanking: [["网格一", 94.8, 38], ["网格二", 93.1, 47], ["网格三", 90.5, 62], ["网格四", 88.2, 75]],
    population: {
      employee: [["随单位参保占比", "62.4%"], ["灵活就业参保占比", "28.1%"], ["退休参保占比", "9.5%"]],
      resident: [["未成年参保率", "96.7%"], ["成年人参保率", "86.2%"], ["老年人参保率", "98.5%"]]
    },
    residence: [["本辖区户籍+本辖区居住", "49.3%"], ["非本辖区户籍+本辖区居住", "35.9%"], ["非户籍人口参保占比", "8.4%"]],
    risk: {
      summary: [["正常参保", "16,145"], ["暂停参保", "532"], ["断缴/缓缴", "427"], ["异常预警", "109"]],
      high: ["重点企业高风险：2家", "断缴超90天居民：11人"],
      medium: ["断缴30-90天居民：38人", "未全员参保企业：4家"]
    },
    suspendFlow: [["转居民医保人数", "172"], ["主动申请暂停人数", "99"], ["跨统筹区转出本区人数", "126"]],
    grassroots: [["职工参保人数增减", "+21"], ["居民参保人数增减", "+63"], ["缴费人数增减", "+39"], ["断缴人数增减", "-15"]],
    todos: [["网格二居民名单", "3名高风险对象需今日上门"], ["网格四企业名单", "1家企业基数异常待核验"]],
    targets: {
      resident: [
        { name: "胡某", id: "***5561", town: "石桥铺街道", village: "白鹤社区", age: 37, risk: "high", days: 101, reason: "断缴超过3个月" },
        { name: "曾某", id: "***2208", town: "石桥铺街道", village: "白鹤社区", age: 26, risk: "medium", days: 31, reason: "灵活就业未续缴" }
      ],
      enterprise: [
        { name: "白鹤社区某物业公司", code: "9150***6501", town: "石桥铺街道", village: "白鹤社区", emp: 29, risk: "high", days: 67, reason: "欠费+减员未办理" },
        { name: "白鹤社区某商行", code: "9150***7189", town: "石桥铺街道", village: "白鹤社区", emp: 12, risk: "medium", days: 21, reason: "在岗参保差异率11%" }
      ]
    }
  }
};

const state = {
  level: "district",
  group: "employee",
  risk: "high",
  target: "resident",
  query: "",
  sort: "risk"
};

const dom = {
  levelTabs: document.getElementById("levelTabs"),
  currentLevelLabel: document.getElementById("currentLevelLabel"),
  regionSelect: document.getElementById("regionSelect"),
  overviewMetrics: document.getElementById("overviewMetrics"),
  regionRanking: document.getElementById("regionRanking"),
  populationTabs: document.getElementById("populationTabs"),
  populationFeature: document.getElementById("populationFeature"),
  residenceAnalysis: document.getElementById("residenceAnalysis"),
  riskSummary: document.getElementById("riskSummary"),
  riskTabs: document.getElementById("riskTabs"),
  riskList: document.getElementById("riskList"),
  suspendFlow: document.getElementById("suspendFlow"),
  grassrootsMetrics: document.getElementById("grassrootsMetrics"),
  todoList: document.getElementById("todoList"),
  targetTabs: document.getElementById("targetTabs"),
  searchInput: document.getElementById("searchInput"),
  sortSelect: document.getElementById("sortSelect"),
  targetList: document.getElementById("targetList")
};

function riskWeight(risk) {
  if (risk === "high") return 3;
  if (risk === "medium") return 2;
  return 1;
}

function renderKeyValue(list, target) {
  target.innerHTML = list
    .map(
      ([k, v]) => `<div class="kv-item"><div class="metric-label">${k}</div><div class="metric-value">${v}</div></div>`
    )
    .join("");
}

function render() {
  const data = dashboardData[state.level];
  dom.currentLevelLabel.textContent = { district: "区级", town: "镇街", village: "村居" }[state.level];

  dom.regionSelect.innerHTML = data.options.map((name) => `<option>${name}</option>`).join("");
  dom.regionSelect.value = data.label;

  const o = data.overview;
  dom.overviewMetrics.innerHTML = [
    ["参保目标", `${o.target.toLocaleString()} 人`, `同比 ${o.yoy}`],
    ["已完成/当前已参保", `${o.completed.toLocaleString()} 人`, `环比 ${o.mom}`],
    ["目标差距", `${o.gap.toLocaleString()} 人`, "需持续动员"],
    ["完成进度", `${o.progress}%`, o.stockGrowth]
  ]
    .map(
      ([k, v, x]) => `<div class="metric"><div class="metric-label">${k}</div><div class="metric-value">${v}</div><div class="metric-extra">${x}</div></div>`
    )
    .join("");

  dom.regionRanking.innerHTML = data.regionRanking
    .map(
      ([name, rate, un]) =>
        `<div class="list-item"><div class="list-title">${name}</div><div class="list-sub">参保率 ${rate}% · 未参保 ${un} 人</div></div>`
    )
    .join("");

  renderKeyValue(data.population[state.group], dom.populationFeature);
  renderKeyValue(data.residence, dom.residenceAnalysis);

  dom.riskSummary.innerHTML = data.risk.summary
    .map(([k, v]) => `<div class="metric"><div class="metric-label">${k}</div><div class="metric-value">${v}</div></div>`)
    .join("");

  dom.riskList.innerHTML = data.risk[state.risk]
    .map((text) => `<div class="list-item"><div class="list-title">${text}</div><span class="badge ${state.risk}">${state.risk === "high" ? "高风险" : "中风险"}</span></div>`)
    .join("");

  renderKeyValue(data.suspendFlow, dom.suspendFlow);
  renderKeyValue(data.grassroots, dom.grassrootsMetrics);

  dom.todoList.innerHTML = data.todos
    .map(([title, sub]) => `<div class="list-item"><div class="list-title">${title}</div><div class="list-sub">${sub}</div></div>`)
    .join("");

  let items = [...data.targets[state.target]];
  if (state.query.trim()) {
    const q = state.query.trim().toLowerCase();
    items = items.filter((i) => Object.values(i).join(" ").toLowerCase().includes(q));
  }

  items.sort((a, b) => {
    if (state.sort === "days") return b.days - a.days;
    if (state.sort === "age") return (b.age || 0) - (a.age || 0);
    return riskWeight(b.risk) - riskWeight(a.risk);
  });

  dom.targetList.innerHTML = items
    .map((i) => {
      const title = state.target === "resident" ? `${i.name}（${i.id}）` : `${i.name}（${i.code}）`;
      const extra = state.target === "resident" ? `年龄 ${i.age} 岁` : `在册职工 ${i.emp} 人`;
      const riskText = i.risk === "high" ? "高风险" : i.risk === "medium" ? "中风险" : "低风险";
      return `<div class="list-item">
        <div class="list-title">${title}</div>
        <div class="list-sub">${i.town} · ${i.village} · ${extra}</div>
        <div class="list-sub">断缴时长 ${i.days} 天 · 原因：${i.reason}</div>
        <span class="badge ${i.risk}">${riskText}</span>
      </div>`;
    })
    .join("");
}

function bindTabs(container, key) {
  container.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    [...container.querySelectorAll("button")].forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    state[key] = button.dataset[key] || button.dataset.level || button.dataset.group || button.dataset.risk || button.dataset.target;
    render();
  });
}

bindTabs(dom.levelTabs, "level");
bindTabs(dom.populationTabs, "group");
bindTabs(dom.riskTabs, "risk");
bindTabs(dom.targetTabs, "target");

dom.searchInput.addEventListener("input", (e) => {
  state.query = e.target.value;
  render();
});

dom.sortSelect.addEventListener("change", (e) => {
  state.sort = e.target.value;
  render();
});

render();
