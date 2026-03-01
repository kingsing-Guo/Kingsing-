require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 纯内存数据存储 (重启服务器后数据会重置)
let store = {
    projectInfo: {
        id: 1,
        name: '未命名项目',
        intro: '暂无项目简介说明。'
    },
    modules: [],
    weeklyReports: []
};

// ================= Project Info =================
app.get('/api/project-info', (req, res) => {
    res.json({ ok: true, data: store.projectInfo });
});

app.put('/api/project-info', (req, res) => {
    const data = req.body;
    // 过滤掉不可修改的字段
    const updateData = { ...data };
    delete updateData.id;

    store.projectInfo = { ...store.projectInfo, ...updateData };
    res.json({ ok: true });
});

// ================= Modules =================
app.get('/api/modules', (req, res) => {
    const sorted = [...store.modules].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    res.json({ ok: true, data: sorted });
});

app.post('/api/modules', (req, res) => {
    const item = req.body;
    const id = item.id || Date.now().toString(36) + Math.random().toString(36).substr(2);
    const newModule = {
        id,
        name: item.name || '',
        subsystem: item.subsystem || '',
        chapter: item.chapter || '',
        strategyType: item.strategyType || '',
        progress: item.progress || 0,
        deadline: item.deadline || '',
        tender: item.tender || '',
        strategy: item.strategy || '',
        modifiedModules: item.modifiedModules || '',
        link: item.link || '',
        status: item.status || '进行中',
        displayOrder: item.order || item.displayOrder || 0,
        issues: item.issues || [],
        feedbackGroups: item.feedbackGroups || [],
        docs: item.docs || [],
        history: item.history || [],
        updateTime: item.updateTime || ''
    };
    store.modules.push(newModule);
    res.json({ ok: true, id });
});

app.put('/api/modules/:id', (req, res) => {
    const id = req.params.id;
    const data = req.body;

    const index = store.modules.findIndex(m => m.id === id);
    if (index !== -1) {
        const updateData = { ...data };
        if ('order' in updateData) {
            updateData.displayOrder = updateData.order;
        }
        store.modules[index] = { ...store.modules[index], ...updateData };
    }

    res.json({ ok: true });
});

app.post('/api/modules/batch', (req, res) => {
    const items = req.body.items || [];
    for (let item of items) {
        const doc = store.modules.find(m => m.id === item.id);
        if (doc) {
            doc.displayOrder = item.order;
            doc.subsystem = item.subsystem;
        }
    }
    res.json({ ok: true });
});

app.delete('/api/modules/:id', (req, res) => {
    store.modules = store.modules.filter(m => m.id !== req.params.id);
    res.json({ ok: true });
});

app.post('/api/modules/delete-all', (req, res) => {
    store.modules = [];
    res.json({ ok: true });
});

// ================= Weekly Reports =================
app.get('/api/weekly-reports', (req, res) => {
    const sorted = [...store.weeklyReports].sort((a, b) => {
        const dateA = new Date(a.uploadTime).getTime() || 0;
        const dateB = new Date(b.uploadTime).getTime() || 0;
        return dateB - dateA;
    });
    res.json({ ok: true, data: sorted });
});

app.post('/api/weekly-reports', (req, res) => {
    const item = req.body;
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const report = {
        id,
        weekNum: item.weekNum,
        name: item.name,
        uploadTime: item.uploadTime,
        url: item.url,
        fileName: item.fileName
    };
    store.weeklyReports.push(report);
    res.json({ ok: true, id });
});

app.listen(port, () => {
    console.log(`PM Dashboard Backend API (Memory Mode) listening at http://localhost:${port}`);
});
