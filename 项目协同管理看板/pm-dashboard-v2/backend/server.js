require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ================= Parsed Tree =================
app.get('/api/parsed-tree', async (req, res) => {
    try {
        const tree = await db.getParsedTree();
        res.json({ ok: true, data: tree });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.post('/api/parsed-tree', async (req, res) => {
    try {
        await db.saveParsedTree(req.body.tree);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ================= Project Info =================
app.get('/api/project-info', async (req, res) => {
    try {
        const info = await db.getProjectInfo();
        res.json({ ok: true, data: info });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.put('/api/project-info', async (req, res) => {
    try {
        await db.updateProjectInfo(req.body);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ================= Modules =================
app.get('/api/modules', async (req, res) => {
    try {
        const modules = await db.getModules();
        res.json({ ok: true, data: modules });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.post('/api/modules', async (req, res) => {
    try {
        const id = await db.addModule(req.body);
        res.json({ ok: true, id });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.put('/api/modules/:id', async (req, res) => {
    try {
        await db.updateModule(req.params.id, req.body);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.patch('/api/modules/:id', async (req, res) => {
    try {
        await db.updateModule(req.params.id, req.body);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.post('/api/modules/batch', async (req, res) => {
    try {
        await db.batchUpdateOrder(req.body.items || []);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.delete('/api/modules/:id', async (req, res) => {
    try {
        await db.deleteModule(req.params.id);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.post('/api/modules/delete-all', async (req, res) => {
    try {
        await db.deleteAllModules();
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ================= Weekly Reports =================
app.get('/api/weekly-reports', async (req, res) => {
    try {
        const reports = await db.getWeeklyReports();
        res.json({ ok: true, data: reports });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.post('/api/weekly-reports', async (req, res) => {
    try {
        const id = await db.addWeeklyReport(req.body);
        res.json({ ok: true, id });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ================= Users =================
app.get('/api/users', async (req, res) => {
    try {
        const list = await db.getUsers();
        res.json({ ok: true, data: list });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const id = await db.addUser(req.body);
        res.json({ ok: true, id });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await db.deleteUser(req.params.id);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.put('/api/users/:id/password', async (req, res) => {
    try {
        const { password } = req.body;
        await db.resetUserPassword(req.params.id, password);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await db.login(username, password);
        if (user) {
            res.json({ ok: true, user });
        } else {
            res.json({ ok: false, message: '账号或密码错误' });
        }
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.listen(port, () => {
    const mode = process.env.DB_TYPE === 'mysql' ? 'MySQL Mode' : 'Memory Mode';
    console.log(`PM Dashboard Backend API (${mode}) listening at http://localhost:${port}`);
});
