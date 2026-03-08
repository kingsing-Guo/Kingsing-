const mysql = require('mysql2/promise');

// 数据库类型检测
const DB_TYPE = process.env.DB_TYPE || 'memory';

// --- 内存模式初始数据 ---
let memoryStore = {
    projectInfo: { id: 1, name: '未命名项目', intro: '暂无项目简介说明。' },
    modules: [],
    weeklyReports: [],
    parsedTree: null,
    users: [
        { id: 1, username: 'admin', realName: '系统管理员', role: 'team', password: '123456' },
        { id: 2, username: 'jiafang', realName: '甲方负责人', role: 'partyA', password: '123456' }
    ]
};

// --- MySQL 连结池 ---
let pool = null;
if (DB_TYPE === 'mysql') {
    pool = mysql.createPool({
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
}

const db = {
    // ================= Parsed Tree =================
    getParsedTree: async () => {
        if (DB_TYPE === 'mysql') {
            const [rows] = await pool.query('SELECT treeData FROM parsed_tree WHERE id = 1');
            return rows[0] ? rows[0].treeData : null;
        }
        return memoryStore.parsedTree;
    },
    saveParsedTree: async (tree) => {
        if (DB_TYPE === 'mysql') {
            await pool.query('UPDATE parsed_tree SET treeData = ? WHERE id = 1', [JSON.stringify(tree)]);
        } else {
            memoryStore.parsedTree = tree;
        }
    },

    // ================= Project Info =================
    getProjectInfo: async () => {
        if (DB_TYPE === 'mysql') {
            const [rows] = await pool.query('SELECT * FROM project_info WHERE id = 1');
            return rows[0] || null;
        }
        return memoryStore.projectInfo;
    },
    updateProjectInfo: async (data) => {
        if (DB_TYPE === 'mysql') {
            const fields = [];
            const values = [];
            for (const [key, value] of Object.entries(data)) {
                if (key === 'id') continue;
                fields.push(`${key} = ?`);
                values.push(typeof value === 'object' ? JSON.stringify(value) : value);
            }
            if (fields.length > 0) {
                values.push(1); // ID = 1
                await pool.query(`UPDATE project_info SET ${fields.join(', ')} WHERE id = ?`, values);
            }
        } else {
            memoryStore.projectInfo = { ...memoryStore.projectInfo, ...data };
        }
    },

    // ================= Modules =================
    getModules: async () => {
        if (DB_TYPE === 'mysql') {
            const [rows] = await pool.query('SELECT * FROM modules ORDER BY displayOrder ASC');
            return rows.map(r => ({
                ...r,
                issues: typeof r.issues === 'string' ? JSON.parse(r.issues) : (r.issues || []),
                feedbackGroups: typeof r.feedbackGroups === 'string' ? JSON.parse(r.feedbackGroups) : (r.feedbackGroups || []),
                docs: typeof r.docs === 'string' ? JSON.parse(r.docs) : (r.docs || []),
                history: typeof r.history === 'string' ? JSON.parse(r.history) : (r.history || []),
                functionalStructure: typeof r.functionalStructure === 'string' ? JSON.parse(r.functionalStructure) : (r.functionalStructure || [])
            }));
        }
        return [...memoryStore.modules].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    },
    addModule: async (item) => {
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
            functionalStructure: item.functionalStructure || [],
            updateTime: item.updateTime || ''
        };

        if (DB_TYPE === 'mysql') {
            const sql = 'INSERT INTO modules SET ?';
            const flat = {
                ...newModule,
                issues: JSON.stringify(newModule.issues),
                feedbackGroups: JSON.stringify(newModule.feedbackGroups),
                docs: JSON.stringify(newModule.docs),
                history: JSON.stringify(newModule.history),
                functionalStructure: JSON.stringify(newModule.functionalStructure)
            };
            await pool.query(sql, flat);
        } else {
            memoryStore.modules.push(newModule);
        }
        return id;
    },
    updateModule: async (id, data) => {
        if (DB_TYPE === 'mysql') {
            const fields = [];
            const values = [];
            const allowed = ['name', 'subsystem', 'chapter', 'strategyType', 'progress', 'deadline', 'tender', 'strategy', 'modifiedModules', 'link', 'status', 'displayOrder', 'issues', 'feedbackGroups', 'docs', 'history', 'functionalStructure', 'updateTime'];

            for (let [key, value] of Object.entries(data)) {
                if (key === 'order') key = 'displayOrder';
                if (!allowed.includes(key)) continue;
                fields.push(`${key} = ?`);
                values.push(typeof value === 'object' ? JSON.stringify(value) : value);
            }
            if (fields.length > 0) {
                values.push(id);
                await pool.query(`UPDATE modules SET ${fields.join(', ')} WHERE id = ?`, values);
            }
        } else {
            const index = memoryStore.modules.findIndex(m => m.id === id);
            if (index !== -1) {
                const updateData = { ...data };
                if ('order' in updateData) updateData.displayOrder = updateData.order;
                memoryStore.modules[index] = { ...memoryStore.modules[index], ...updateData };
            }
        }
    },
    batchUpdateOrder: async (items) => {
        if (DB_TYPE === 'mysql') {
            for (const item of items) {
                await pool.query('UPDATE modules SET displayOrder = ?, subsystem = ? WHERE id = ?', [item.order, item.subsystem, item.id]);
            }
        } else {
            for (let item of items) {
                const doc = memoryStore.modules.find(m => m.id === item.id);
                if (doc) {
                    doc.displayOrder = item.order;
                    doc.subsystem = item.subsystem;
                }
            }
        }
    },
    deleteModule: async (id) => {
        if (DB_TYPE === 'mysql') {
            await pool.query('DELETE FROM modules WHERE id = ?', [id]);
        } else {
            memoryStore.modules = memoryStore.modules.filter(m => m.id !== id);
        }
    },
    deleteAllModules: async () => {
        if (DB_TYPE === 'mysql') {
            await pool.query('DELETE FROM modules');
        } else {
            memoryStore.modules = [];
        }
    },

    // ================= Weekly Reports =================
    getWeeklyReports: async () => {
        if (DB_TYPE === 'mysql') {
            const [rows] = await pool.query('SELECT * FROM weekly_reports ORDER BY weekNum DESC');
            return rows;
        }
        return [...memoryStore.weeklyReports].sort((a, b) => {
            const dateA = new Date(a.uploadTime).getTime() || 0;
            const dateB = new Date(b.uploadTime).getTime() || 0;
            return dateB - dateA;
        });
    },
    addWeeklyReport: async (item) => {
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const report = {
            id,
            weekNum: item.weekNum,
            name: item.name,
            uploadTime: item.uploadTime,
            url: item.url,
            fileName: item.fileName
        };
        if (DB_TYPE === 'mysql') {
            await pool.query('INSERT INTO weekly_reports SET ?', report);
        } else {
            memoryStore.weeklyReports.push(report);
        }
        return id;
    },

    // ================= Users =================
    getUsers: async () => {
        if (DB_TYPE === 'mysql') {
            const [rows] = await pool.query('SELECT id, username, realName, role FROM users');
            return rows;
        }
        return memoryStore.users.map(({ password, ...u }) => ({ id: u.id || u._id, ...u }));
    },
    addUser: async (u) => {
        if (DB_TYPE === 'mysql') {
            const [res] = await pool.query('INSERT INTO users SET ?', u);
            return res.insertId;
        }
        const id = Date.now();
        memoryStore.users.push({ id, ...u });
        return id;
    },
    deleteUser: async (id) => {
        if (DB_TYPE === 'mysql') {
            await pool.query('DELETE FROM users WHERE id = ?', [id]);
        } else {
            memoryStore.users = memoryStore.users.filter(u => u.id != id);
        }
    },
    login: async (username, password) => {
        if (DB_TYPE === 'mysql') {
            const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
            return rows[0] ? { id: rows[0].id, username: rows[0].username, realName: rows[0].realName, role: rows[0].role } : null;
        }
        const user = memoryStore.users.find(u => u.username === username && u.password === password);
        return user ? { id: user.id || user._id, username: user.username, realName: user.realName, role: user.role } : null;
    },
    resetUserPassword: async (id, newPassword) => {
        if (DB_TYPE === 'mysql') {
            await pool.query('UPDATE users SET password = ? WHERE id = ?', [newPassword, id]);
        } else {
            const index = memoryStore.users.findIndex(u => u.id == id);
            if (index !== -1) {
                memoryStore.users[index].password = newPassword;
            }
        }
    }
};

module.exports = db;
