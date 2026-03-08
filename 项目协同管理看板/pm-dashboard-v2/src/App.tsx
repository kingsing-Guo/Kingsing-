
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, Progress, Tag, Row, Col, Badge, Button, List, Avatar, Input, ConfigProvider, Space, Divider, Modal, Form, InputNumber, Select, message, Timeline, Upload, DatePicker, Radio, Empty, Popconfirm, Checkbox, Tooltip, Table, Descriptions } from 'antd';
import * as Icons from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import ModuleParser from './components/ModuleParser';
import SystemGuide from './components/SystemGuide';

const API_BASE = 'http://localhost:3000/api';

const {
    SearchOutlined, FileTextOutlined, MessageOutlined, ClockCircleOutlined,
    LeftOutlined, PlusOutlined, ThunderboltOutlined, TeamOutlined,
    EditOutlined, ToolOutlined, DeleteOutlined, DownloadOutlined,
    ImportOutlined, FolderOpenOutlined, SafetyOutlined, RedoOutlined,
    CheckCircleOutlined, UserOutlined, ExportOutlined, LockOutlined,
    UploadOutlined, MenuUnfoldOutlined, MenuFoldOutlined,
    ClearOutlined, DragOutlined, AlertOutlined,
    InfoCircleOutlined, AuditOutlined, SettingOutlined, KeyOutlined, QuestionCircleOutlined
} = Icons;


const DEFAULT_STRATEGY_OPTIONS = [
    { label: '产品改造', value: 'customization', color: 'purple' },
    { label: '定制开发', value: 'development', color: 'blue' },
    { label: '高保真DEMO', value: 'demo', color: 'orange' },
    { label: '情况说明', value: 'text_description', color: 'green' }
];
const DOC_TYPES = ['会议纪要', '需求文档', '设计文档', '操作手册', '测试报告'];
const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.zip', '.rar'];

// --- 子组件 ---
const LoginView = ({ onLogin, projectInfo }: any) => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });
            const data = await res.json();
            if (data.ok) {
                onLogin(data.user);
            } else {
                message.error(data.message || '登录失败');
            }
        } catch (err) {
            message.error('连接服务器失败');
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
            <div className="bg-white/10 backdrop-blur-md w-full max-w-5xl rounded-2xl shadow-2xl flex overflow-hidden border border-white/20 fade-in">
                <div className="flex-1 p-12 bg-gradient-to-br from-blue-600 to-indigo-800 flex flex-col justify-center relative overflow-hidden hidden md:flex">
                    <div className="mb-12">
                        <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6"><SafetyOutlined className="text-white text-3xl" /></div>
                        <h1 className="text-3xl font-bold text-white mb-3">项目建设情况进展看板</h1>
                        <h2 className="text-lg text-white/90 font-medium italic uppercase tracking-wider leading-relaxed">{projectInfo?.name || '项目尚未命名'}</h2>
                    </div>
                    <div className="space-y-6 text-blue-50">
                        <div className="flex items-center gap-4"><CheckCircleOutlined /><span>多方实时对齐 需求闭环追踪</span></div>
                        <div className="flex items-center gap-4"><CheckCircleOutlined /><span>研发动态透明 标书指标覆盖</span></div>
                    </div>
                    <div className="mt-auto pt-10 border-t border-white/10 text-white/50 text-xs">© 2026 {projectInfo?.clientUnit || '项目管理单位'}</div>
                </div>
                <div className="flex-1 bg-white p-12 flex flex-col justify-center">
                    <div className="mb-10 text-center"><h3 className="text-2xl font-bold text-slate-800 m-0">安全登录入口</h3><div className="w-12 h-1 bg-blue-600 mx-auto mt-3 rounded-full"></div></div>
                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                        <Form.Item name="username" rules={[{ required: true, message: '请输入账号' }]} initialValue="admin">
                            <Input prefix={<UserOutlined />} placeholder="账号 (admin)" size="large" />
                        </Form.Item>
                        <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]} initialValue="123456">
                            <Input.Password prefix={<LockOutlined />} placeholder="密码 (123456)" size="large" />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" size="large" block loading={loading} className="h-12 bg-blue-600 font-bold mt-4 shadow-lg shadow-blue-100">立即登录</Button>
                        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                            <span className="text-slate-400 text-xs">演示说明：系统已开启 MySQL/Memory 真实账户验证</span>
                        </div>
                    </Form>
                </div>
            </div>
        </div>
    );
};

const ListView = ({ modules, stats, filterMode, onFilterChange, onSelect, onAdd, onImport, onExport, onDelete, onDeleteAll, onReorderModules, onReorderSubsystems, searchText, onSearchChange, user, userRole, onLogout, onChangePassword, onOpenProjectInfo, onOpenWeeklyReports, onOpenAllDocs, onOpenParser, onOpenGuide, projectInfo, weeklyReportCount, strategyOptions }: any) => {
    const [displayMode, setDisplayMode] = useState('card');
    const [draggedSubsystem, setDraggedSubsystem] = useState<string | null>(null);

    const hasNewFeedback = (item: any) => {
        if (!item.feedbackGroups) return false;
        return userRole === 'team'
            ? item.feedbackGroups.some((g: any) => (g.replies || []).length === 0)
            : item.feedbackGroups.some((g: any) => (g.replies || []).length > 0);
    };

    // 补回表格列定义
    const tableColumns = [
        {
            title: '模块名称',
            dataIndex: 'name',
            key: 'name',
            fixed: 'left',
            width: 250,
            render: (text: any, record: any) => (
                <Badge dot={hasNewFeedback(record)} offset={[5, 0]}>
                    <Button type="link" onClick={() => onSelect(record.id)} className="p-0 font-bold text-slate-800 hover:text-blue-600 text-left">{text}</Button>
                </Badge>
            )
        },
        { title: '所属子系统', dataIndex: 'subsystem', key: 'subsystem', width: 180, render: (text: any) => <Tag className="border-none bg-slate-100">{text}</Tag> },
        { title: '响应策略', dataIndex: 'strategyType', key: 'strategyType', width: 150, render: (val: any) => { const opt = strategyOptions.find((o: any) => o.value === val); return opt ? <Tag color={opt.color} className="border-none">{opt.label}</Tag> : '-'; } },
        { title: '进度', dataIndex: 'progress', key: 'progress', width: 180, sorter: (a: any, b: any) => (a.progress || 0) - (b.progress || 0), render: (val: any) => <Progress percent={val || 0} size="small" strokeColor="#3b82f6" /> },
        { title: '预计完成时间', dataIndex: 'deadline', key: 'deadline', width: 150, sorter: (a: any, b: any) => dayjs(a.deadline).unix() - dayjs(b.deadline).unix(), render: (text: any) => <span className="font-mono text-slate-500">{text || '-'}</span> },
        {
            title: '状态',
            key: 'delayed',
            width: 120,
            render: (_: any, record: any) => {
                const isDelayed = dayjs().isAfter(dayjs(record.deadline)) && (record.progress || 0) < 100;
                return isDelayed ? <Tag color="error" icon={<AlertOutlined />} className="font-bold">已延误</Tag> : <Tag color="success" className="font-bold">正常</Tag>;
            }
        },
        {
            title: '操作',
            key: 'action',
            fixed: 'right',
            width: 100,
            render: (_: any, record: any) => (
                <Space>
                    <Tooltip title="详情"><Button type="text" size="small" icon={<SearchOutlined />} onClick={() => onSelect(record.id)} /></Tooltip>
                    {userRole === 'team' && (
                        <Popconfirm title="确定删除？" onConfirm={() => onDelete(record.id)} okButtonProps={{ danger: true }}>
                            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            )
        }
    ];

    const finalFilteredModules = useMemo(() => {
        let list = [...modules].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        const search = searchText.toLowerCase();
        list = list.filter((m: any) => (m.name || '').toLowerCase().includes(search) || (m.chapter || '').toLowerCase().includes(search));
        if (filterMode === 'completed') list = list.filter((m: any) => (m.progress || 0) === 100);
        else if (filterMode === 'pendingIssues') list = list.filter((m: any) => m.issues?.some((i: any) => i.status === 'pending'));
        else if (filterMode === 'pendingFeedback') list = list.filter((m: any) => m.feedbackGroups?.some((g: any) => (g.replies || []).length === 0));
        else if (filterMode === 'delayed') list = list.filter((m: any) => dayjs().isAfter(dayjs(m.deadline)) && (m.progress || 0) < 100);
        else if (strategyOptions.map((o: any) => o.value).includes(filterMode)) list = list.filter((m: any) => (m.strategyType || 'development') === filterMode);
        return list;
    }, [modules, searchText, filterMode]);

    const groupedModules = useMemo(() => {
        const groups = {};
        finalFilteredModules.forEach(item => {
            const ss = item.subsystem || '基础支撑子系统';
            if (!groups[ss]) groups[ss] = [];
            groups[ss].push(item);
        });
        return groups;
    }, [finalFilteredModules]);

    const subsystemNames = useMemo(() => Object.keys(groupedModules), [groupedModules]);
    const [collapsedKeys, setCollapsedKeys] = useState<string[]>([]);
    const toggleCollapse = (name: string) => setCollapsedKeys(prev => prev.includes(name) ? prev.filter(k => k !== name) : [...prev, name]);

    const [draggedModule, setDraggedModule] = useState<any>(null);
    const [dragOverSubsystem, setDragOverSubsystem] = useState<string | null>(null);
    const [dragOverModuleId, setDragOverModuleId] = useState<string | number | null>(null);

    const handleModuleDragStart = (e: any, item: any) => { if (userRole !== 'team') return e.preventDefault(); setDraggedModule(item); e.dataTransfer.setData("type", "module"); };
    const handleModuleDrop = (e: any, targetItem: any) => { e.preventDefault(); e.stopPropagation(); if (draggedModule && (draggedModule as any).id !== targetItem.id) onReorderModules((draggedModule as any).id, targetItem.id, targetItem.subsystem); setDraggedModule(null); setDragOverModuleId(null); };
    const handleSubsystemDragStart = (e: any, ssName: any) => { if (userRole !== 'team') return e.preventDefault(); setDraggedSubsystem(ssName); e.dataTransfer.setData("type", "subsystem"); e.dataTransfer.setData("ssName", ssName); };
    const handleSubsystemDrop = (e: any, targetSS: any) => { e.preventDefault(); const type = e.dataTransfer.getData("type"); if (type === "subsystem") { const from = e.dataTransfer.getData("ssName"); if (from !== targetSS) onReorderSubsystems(from, targetSS); } else if (type === "module" && draggedModule) onReorderModules((draggedModule as any).id, null, targetSS); setDragOverSubsystem(null); };

    return (
        <div className="max-w-7xl mx-auto p-6 fade-in">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg text-white font-bold text-xl flex items-center justify-center w-10 h-10 shadow-lg shadow-blue-200"><ThunderboltOutlined /></div>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold text-slate-800 m-0 leading-tight">项目建设情况进展看板</h1>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium tracking-wide uppercase italic">{projectInfo?.name || '项目尚未命名'}</div>
                    </div>
                    <Space className="ml-4">
                        <Button icon={<InfoCircleOutlined />} onClick={onOpenProjectInfo} className="rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 font-medium">项目基本情况</Button>
                        <Badge count={weeklyReportCount} offset={[-4, 4]} size="small">
                            <Button icon={<AuditOutlined />} onClick={onOpenWeeklyReports} className="rounded-full border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium h-8">项目周报</Button>
                        </Badge>
                        <Button icon={<FileTextOutlined />} onClick={onOpenParser} className="rounded-full border-orange-200 text-orange-600 hover:bg-orange-50 font-medium h-8">
                            {userRole === 'team' ? '功能架构维护' : '查看功能架构'}
                        </Button>
                    </Space>
                </div>
                <div className="flex gap-4 items-center">
                    <Button type="link" onClick={onOpenGuide} icon={<QuestionCircleOutlined />} className="text-slate-500 hover:text-blue-600 font-bold border-none shadow-none hidden sm:inline-flex text-xs">系统操作指南</Button>
                    <div className="flex items-center gap-3 px-4 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm ml-2">
                        <Avatar size="small" icon={<UserOutlined />} className="bg-blue-600" />
                        <div className="text-left leading-tight">
                            <div className="text-xs font-bold text-slate-700">{user?.realName || '已登录用户'}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{userRole === 'team' ? '项目组/专家' : (userRole === 'supervisor' ? '监理' : '甲方负责人')}</div>
                        </div>
                        <Divider type="vertical" />
                        <Button type="link" size="small" onClick={() => onChangePassword(user)} className="p-0 text-xs text-blue-500 font-bold">修改密码</Button>
                        <Divider type="vertical" />
                        <Button type="link" size="small" danger onClick={onLogout} className="p-0 text-xs font-medium border-none shadow-none">退出</Button>
                    </div>
                </div>
            </div>

            <Row gutter={12} className="mb-8" wrap={false}>
                <Col flex="0 0 calc(100% / 8)">
                    <Card size="small" className={`h-36 flex flex-col justify-center clickable-card ${filterMode === 'all' ? 'stat-card-active' : ''}`} onClick={() => onFilterChange('all')}>
                        <div className="text-slate-500 text-xs mb-3 font-bold">总体进度</div>
                        <div className="text-center"><span className="text-blue-600 text-2xl font-bold">{stats.totalProgress}%</span></div>
                        <Progress percent={stats.totalProgress} showInfo={false} strokeWidth={10} />
                        <div className="text-slate-400 text-[10px] mt-3">共 <span className="text-slate-800 font-bold">{stats.total}</span> 模块</div>
                    </Card>
                </Col>
                <Col flex="0 0 calc(100% * 1.5 / 8)">
                    <Card size="small" className="h-36">
                        <div className="text-slate-500 text-xs mb-2 font-bold">响应策略</div>
                        <div className="grid grid-cols-2 gap-1">
                            {strategyOptions.map((opt: any) => {
                                const count = stats.strategyCounts[opt.value] || 0;
                                return (
                                    <div key={opt.value} className={`flex flex-col px-1.5 py-1 rounded cursor-pointer hover:bg-slate-50 border border-transparent ${filterMode === opt.value ? 'bg-blue-50 border-blue-100' : ''}`} onClick={() => onFilterChange(opt.value)}>
                                        <span className={`text-xl font-bold text-${opt.color}-600 leading-tight`}>{count}</span>
                                        <span className="text-[9px] text-slate-400 leading-tight truncate">{opt.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </Col>
                <Col flex="1 1 0">
                    <Card size="small" className={`h-36 clickable-card ${filterMode === 'completed' ? 'stat-card-active' : ''}`} onClick={() => onFilterChange('completed')}>
                        <div className="text-slate-500 text-xs mb-1 font-bold">研发进展</div>
                        <div className="text-2xl font-bold text-slate-800 mb-1">{stats.completed} <span className="text-xs font-normal text-slate-400">/ {stats.total}</span></div>
                        <div className="text-blue-600 text-[10px] font-bold mb-2">{stats.completedSubsystems} <span className="font-normal text-slate-400">/ {stats.subsystemCount} 完成</span></div>
                        <div className="inline-flex items-center px-2 py-0.5 bg-green-50 text-green-600 rounded-full border border-green-100 text-[9px] font-bold"><SafetyOutlined className="mr-1" /> 已完成</div>
                    </Card>
                </Col>
                <Col flex="1 1 0">
                    <Card size="small" className={`h-36 clickable-card ${filterMode === 'delayed' ? 'stat-card-active' : ''}`} onClick={() => onFilterChange('delayed')}>
                        <div className="text-slate-500 text-xs mb-1 font-bold">进度延误</div>
                        <div className="text-4xl font-bold text-red-500 mb-2">{stats.delayedCount} <span className="text-xs font-normal text-slate-400">项</span></div>
                        <div className="inline-flex items-center px-2 py-0.5 bg-red-50 text-red-600 rounded-full border border-red-100 text-[9px] font-bold"><AlertOutlined className="mr-1" /> 风险预警</div>
                    </Card>
                </Col>
                <Col flex="1 1 0">
                    <Card size="small" className={`h-36 clickable-card ${filterMode === 'pendingIssues' ? 'stat-card-active' : ''}`} onClick={() => onFilterChange('pendingIssues')}>
                        <div className="text-slate-500 text-xs mb-1 font-bold">协调事项</div>
                        <div className="text-4xl font-bold text-slate-800 mb-2">{stats.pendingIssues} <span className="text-xs font-normal text-slate-400">项</span></div>
                        <div className="inline-flex items-center px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full border border-orange-100 text-[9px] font-bold"><ClockCircleOutlined className="mr-1" /> 需配合</div>
                    </Card>
                </Col>
                <Col flex="1 1 0">
                    <Card size="small" className={`h-36 clickable-card ${filterMode === 'pendingFeedback' ? 'stat-card-active' : ''}`} onClick={() => onFilterChange('pendingFeedback')}>
                        <div className="text-slate-500 text-xs mb-1 font-bold">用户反馈</div>
                        <div className="text-4xl font-bold text-slate-800 mb-2">{stats.totalFeedback} <span className="text-xs font-normal text-slate-400">条</span></div>
                        <div className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100 text-[9px] font-bold"><MessageOutlined className="mr-1" /> 待处理</div>
                    </Card>
                </Col>
                <Col flex="1 1 0">
                    <Card size="small" className="h-36 clickable-card" onClick={onOpenAllDocs}>
                        <div className="text-slate-500 text-xs mb-1 font-bold">项目文档</div>
                        <div className="text-4xl font-bold text-green-600 mb-2">{stats.totalDocs} <span className="text-xs font-normal text-slate-400">份</span></div>
                        <div className="inline-flex items-center px-2 py-0.5 bg-green-50 text-green-600 rounded-full border border-green-100 text-[9px] font-bold"><FolderOpenOutlined className="mr-1" /> 点击浏览</div>
                    </Card>
                </Col>
            </Row>

            {filterMode !== 'all' && (
                <div className="mb-6 flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100 transition-all fade-in shadow-sm">
                    <span className="text-blue-700 text-sm font-bold flex items-center gap-2"><ThunderboltOutlined /> 当前过滤：{
                        strategyOptions.find((o: any) => o.value === filterMode)?.label ||
                        (filterMode === 'completed' ? '已完成模块' : filterMode === 'pendingIssues' ? '待处理协调事项' : filterMode === 'delayed' ? '已延误模块' : '待回复反馈记录')
                    }</span>
                    <Button type="primary" size="small" icon={<RedoOutlined />} onClick={() => onFilterChange('all')} className="bg-blue-600 border-none font-bold">重置</Button>
                </div>
            )}

            <div className="flex justify-between items-center gap-3 mb-4 p-3 bg-white shadow-sm rounded-xl">
                <Space size="large">
                    <Input prefix={<SearchOutlined />} placeholder="搜索模块..." className="w-64 rounded-full bg-slate-50 border border-slate-200" value={searchText} onChange={e => onSearchChange(e.target.value)} allowClear />
                    <Radio.Group value={displayMode} onChange={e => setDisplayMode(e.target.value)} buttonStyle="solid">
                        <Radio.Button value="card">卡片视图</Radio.Button>
                        <Radio.Button value="table">表格视图</Radio.Button>
                    </Radio.Group>
                    {displayMode === 'card' && (
                        <Space>
                            <Button size="small" icon={<MenuFoldOutlined />} onClick={() => setCollapsedKeys(subsystemNames)} className="text-xs">全部收起</Button>
                            <Button size="small" icon={<MenuUnfoldOutlined />} onClick={() => setCollapsedKeys([])} className="text-xs">全部展开</Button>
                        </Space>
                    )}
                </Space>
                <Space>
                    <Button size="small" icon={<ExportOutlined />} onClick={onExport} className="text-xs">导出模块</Button>
                    {userRole === 'team' && (
                        <>
                            <Divider type="vertical" />
                            <Button size="small" icon={<ImportOutlined />} onClick={onImport} className="text-xs">批量导入</Button>
                            <Popconfirm title="确定清空所有模块数据？" onConfirm={onDeleteAll} okButtonProps={{ danger: true }}>
                                <Button size="small" icon={<ClearOutlined />} danger className="text-xs">全部删除</Button>
                            </Popconfirm>
                            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={onAdd} className="text-xs font-bold bg-slate-900 border-none">新增模块</Button>
                        </>
                    )}
                </Space>
            </div>

            {displayMode === 'table' ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-50 overflow-hidden fade-in">
                    <Table columns={tableColumns as any} dataSource={finalFilteredModules} rowKey="id" pagination={{ pageSize: 15, hideOnSinglePage: true }} scroll={{ x: 1100 }} size="middle" />
                </div>
            ) : (
                <div className="space-y-8 pb-10">
                    {subsystemNames.map((ssName) => {
                        const subModules = groupedModules[ssName];
                        const isCollapsed = collapsedKeys.includes(ssName);
                        return (
                            <div key={ssName} onDragOver={(e) => { e.preventDefault(); setDragOverSubsystem(ssName); }} onDragLeave={() => setDragOverSubsystem(null)} onDrop={(e) => handleSubsystemDrop(e, ssName)} className={`fade-in p-2 rounded-xl transition-all ${dragOverSubsystem === ssName ? 'subsystem-drag-over' : ''}`}>
                                <div className="flex items-center gap-3 py-3 border-b border-slate-100 cursor-pointer group" onClick={() => toggleCollapse(ssName)}>
                                    <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                                    <span className="text-lg font-bold text-slate-800 flex items-baseline gap-2">
                                        {ssName}
                                        {(() => {
                                            const L2Count = subModules.length;
                                            let L3Count = 0;
                                            let L4Count = 0;
                                            subModules.forEach((m: any) => {
                                                if (m.functionalStructure) {
                                                    L3Count += m.functionalStructure.length;
                                                    m.functionalStructure.forEach((l3: any) => {
                                                        if (l3.children) L4Count += l3.children.length;
                                                    });
                                                }
                                            });
                                            return <span className="text-slate-400 text-xs font-normal ml-2 tracking-tight">(共{L2Count}个一级模块、{L3Count}个二级模块、{L4Count}个三级模块)</span>;
                                        })()}
                                    </span>
                                    <div className="ml-auto text-slate-400 mr-2 group-hover:text-blue-500 transition-colors">
                                        {isCollapsed ? <Icons.DownOutlined /> : <Icons.DownOutlined className="rotate-180 transition-all" />}
                                    </div>
                                </div>
                                {!isCollapsed && (
                                    <div className="space-y-6 fade-in">
                                        {subModules.map(item => (
                                            <div key={item.id} draggable={userRole === 'team'} onDragStart={(e: any) => handleModuleDragStart(e, item)} onDragOver={(e: any) => { e.preventDefault(); setDragOverModuleId(item.id); }} onDragLeave={() => setDragOverModuleId(null)} onDrop={(e: any) => handleModuleDrop(e, item)} className={`${dragOverModuleId === item.id ? 'drag-over' : ''} rounded-xl transition-all`}>
                                                <Card hoverable className="border border-blue-50 relative" onClick={() => onSelect(item.id)} extra={userRole === 'team' && (
                                                    <Space><DragOutlined className="text-slate-300 mr-2" /><Popconfirm title="确定删除吗？" onConfirm={(e) => { e.stopPropagation(); onDelete(item.id); }} onCancel={(e) => e.stopPropagation()} okButtonProps={{ danger: true }}><Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} className="opacity-20 hover:opacity-100" /></Popconfirm></Space>
                                                )}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <Badge dot={hasNewFeedback(item)} offset={[5, 0]}><span className="text-xl font-bold text-slate-800">{item.name}</span></Badge>
                                                            <Tag color="blue">{item.status}</Tag>
                                                            {dayjs().isAfter(dayjs(item.deadline)) && (item.progress || 0) < 100 && (<Tag color="error" className="font-bold">已延误</Tag>)}
                                                            {item.strategyType && <Tag color={strategyOptions.find((o: any) => o.value === item.strategyType)?.color}>{strategyOptions.find((o: any) => o.value === item.strategyType)?.label}</Tag>}
                                                            {item.progress === 100 && item.link && (<Button type="link" size="small" icon={<ExportOutlined />} onClick={(e) => { e.stopPropagation(); window.open(item.link, '_blank'); }} className="p-0 font-bold flex items-center">访问系统</Button>)}
                                                        </div>
                                                        <div className="text-slate-800 font-bold text-sm flex items-center gap-1"><ClockCircleOutlined /> {item.deadline}</div>
                                                    </div>
                                                    <div className="text-slate-400 text-sm mb-6">{item.chapter}</div>
                                                    <div className="mb-4">
                                                        <div className="flex justify-between text-sm mb-2 font-medium"><span>进度概览</span><span>{item.progress}%</span></div>
                                                        <Progress percent={item.progress} showInfo={false} strokeWidth={12} strokeColor="#3b82f6" />
                                                    </div>
                                                    <div className="flex justify-between items-center pt-4 border-t">
                                                        <Space split={<Divider type="vertical" />}>
                                                            <Badge count={item.issues?.filter(i => i.status === 'pending').length} offset={[5, -2]}><Tag color="error" className="rounded-lg px-3 py-1 font-bold text-xs cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { e.stopPropagation(); onSelect(item.id, 'issues-anchor'); }}>待协调</Tag></Badge>
                                                            <Badge count={(item.feedbackGroups || []).filter(g => (g.replies || []).length === 0).length} offset={[5, -2]}><Tag color="processing" className="rounded-lg px-3 py-1 font-bold text-xs cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { e.stopPropagation(); onSelect(item.id, 'feedback-anchor'); }}>反馈建议</Tag></Badge>
                                                        </Space>
                                                        {(() => {
                                                            if (!item.functionalStructure?.length) return <span className="text-slate-400 text-[11px] flex items-center gap-1"><FileTextOutlined className="opacity-40" /> 未同步架构</span>;
                                                            let leafCount = 0;
                                                            const typeCounts: Record<string, number> = {};
                                                            const traverse = (nodes: any[]) => nodes.forEach(n => {
                                                                if (!n.children?.length) {
                                                                    leafCount++;
                                                                    const t = n.strategyType || 'development';
                                                                    typeCounts[t] = (typeCounts[t] || 0) + 1;
                                                                } else traverse(n.children);
                                                            });
                                                            traverse(item.functionalStructure);
                                                            return (
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-slate-400 text-[11px] font-bold flex items-center gap-1.5"><Icons.ClusterOutlined className="opacity-50" /> 末端功能: <span className="text-slate-700">{leafCount}</span></span>
                                                                    <Space size={4}>
                                                                        {strategyOptions.map((opt: any) => {
                                                                            const count = typeCounts[opt.value] || 0;
                                                                            if (count === 0) return null;
                                                                            return (
                                                                                <Tag key={opt.value} color={opt.color} className="m-0 text-[11px] bg-white border border-slate-100 font-bold px-1.5 py-0.5">
                                                                                    {opt.label} {count}
                                                                                </Tag>
                                                                            );
                                                                        })}
                                                                    </Space>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </Card>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const DetailView = ({ current, onBack, onEdit, onToggleIssue, onAddIssue, onOpenDocModal, onDeleteDoc, onAddHistory, userRole, feedbackProps, targetAnchor, onOpenComposition, strategyOptions }: any) => {
    const [historyInput, setHistoryInput] = useState('');
    const [issueInput, setIssueInput] = useState('');
    const [feedbackInput, setFeedbackInput] = useState('');
    if (!current) return <div className="p-10"><Empty description="未找到模块" /></div>;
    const { onSubmitInteraction } = feedbackProps;
    useEffect(() => { if (targetAnchor) { const el = document.getElementById(targetAnchor); if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150); } }, [targetAnchor]);

    const combinedHistory = useMemo(() => {
        const list: any[] = [];
        (current.history || []).forEach(h => list.push({ ...h, color: 'blue', tag: '进展' }));
        return list.sort((a, b) => dayjs(b.time, "YYYY/M/D HH:mm").unix() - dayjs(a.time, "YYYY/M/D HH:mm").unix());
    }, [current]);

    const handleDownloadDoc = (docData) => {
        if (!docData.url) return message.warning('无法下载');
        const link = document.createElement('a'); link.href = docData.url; link.download = docData.name; link.click();
    };

    const sectionTitle = (icon: any, text: any, color: any) => (<div className="flex items-center gap-2 text-base font-bold">{React.cloneElement(icon, { className: color })}<span>{text}</span></div>);

    return (
        <div className="max-w-7xl mx-auto p-6 fade-in">
            <div className="mb-6 flex justify-between gap-3">
                <Button icon={<LeftOutlined />} onClick={onBack} className="font-bold rounded-lg h-10 px-6">返回看板</Button>
                <Space>
                    {current.functionalStructure && current.functionalStructure.length > 0 && (
                        <Button
                            icon={<Icons.ClusterOutlined />}
                            onClick={onOpenComposition}
                            className="font-bold rounded-lg h-10 px-5 bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 flex items-center gap-2"
                        >
                            模块功能组成
                        </Button>
                    )}
                    {userRole === 'team' && (
                        <Button
                            icon={<EditOutlined style={{ fontSize: '16px' }} />}
                            onClick={onEdit}
                            type="primary"
                            className="font-bold rounded-lg h-10 px-5 flex items-center gap-2 shadow-md shadow-blue-100"
                        >
                            更新信息
                        </Button>
                    )}
                </Space>
            </div>
            <div className="flex gap-6">
                <div className="flex-1 space-y-6">
                    <Card className="shadow-sm">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <h2 className="text-4xl font-extrabold text-slate-800 break-all flex-1 m-0 leading-tight">{current.name}</h2>
                                <Space wrap className="shrink-0 pt-1">
                                    <Tag color="blue" className="m-0 font-bold px-3 py-0.5">{current.status}</Tag>
                                    {dayjs().isAfter(dayjs(current.deadline)) && (current.progress || 0) < 100 && (<Tag color="error" className="m-0 font-bold px-3 py-0.5">已延误</Tag>)}
                                    <Tag className="m-0 bg-slate-100 border-slate-200">所属子系统：{current.subsystem}</Tag>
                                </Space>
                            </div>
                            <Divider className="my-2" />
                            <div className="flex flex-wrap items-center gap-y-2 gap-x-8 text-slate-500 text-sm">
                                <div className="flex items-center gap-2"><ClockCircleOutlined /> 计划截止: <span className="text-slate-800 font-bold">{current.deadline || '未设置'}</span></div>
                                <div className="flex items-center gap-2"><ToolOutlined /> 响应策略: <span className="text-slate-800 font-bold">{strategyOptions.find((o: any) => o.value === current.strategyType)?.label}</span></div>
                                {current.strategyType === 'customization' && current.modifiedModules && (<div className="flex items-center gap-2 text-blue-600 font-medium"><EditOutlined /> 涉及改造: <span>{current.modifiedModules}</span></div>)}
                            </div>
                        </div>
                    </Card>
                    <Card title={sectionTitle(<ThunderboltOutlined />, "实施策略与进度详情", "text-blue-500")} extra={<span className="text-3xl font-bold text-slate-800">{current.progress}%</span>}>
                        <div className="mb-8"><Progress percent={current.progress} showInfo={false} strokeWidth={12} strokeColor="#3b82f6" /></div>
                        <Row gutter={24}>
                            <Col span={12}><div className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-widest">标书原文指标</div><div className="bid-quote text-sm h-48 overflow-auto custom-scroll italic leading-relaxed">{current.tender || '无指标内容'}</div></Col>
                            <Col span={12}><div className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-widest">具体实施策略</div><div className="strategy-highlight text-sm h-48 overflow-auto custom-scroll leading-relaxed">{current.strategy || '无实施策略内容'}</div></Col>
                        </Row>
                    </Card>
                    <Card title={sectionTitle(<ClockCircleOutlined />, "研发动态历史追踪", "text-indigo-500")}>
                        {userRole === 'team' && <div className="mb-6"><Input.Search size="large" placeholder="新增进展记录..." enterButton="添加进展" value={historyInput} onChange={e => setHistoryInput(e.target.value)} onSearch={(v) => { if (v.trim()) { onAddHistory(v); setHistoryInput(''); } }} /></div>}
                        <div className="max-h-[500px] overflow-auto custom-scroll pr-2">
                            <Timeline items={combinedHistory.map((h, i) => ({
                                color: h.color,
                                children: (
                                    <div>
                                        <div className="text-sm font-medium">{h.tag && <Tag color={h.color} className="text-[10px] scale-90 -translate-x-1">{h.tag}</Tag>} {h.content}</div>
                                        <div className="text-[10px] text-slate-400 mt-1 italic">📅 {h.time}</div>
                                    </div>
                                )
                            }))} />
                        </div>
                    </Card>
                </div>
                <div className="w-[420px] space-y-6">
                    <Card id="docs-anchor" title={sectionTitle(<FolderOpenOutlined />, "相关文档库", "text-green-500")} extra={userRole === 'team' && <Button type="link" size="small" icon={<PlusOutlined />} onClick={onOpenDocModal}>归档</Button>}>
                        <div className="max-h-[300px] overflow-auto custom-scroll">
                            {current.docs?.length ? (
                                <List size="small" dataSource={current.docs} renderItem={(doc, i) => (
                                    <List.Item extra={
                                        <Space>
                                            <Tooltip title="点击下载此文件"><Button type="text" size="small" icon={<DownloadOutlined className="text-blue-500" />} onClick={() => handleDownloadDoc(doc)} /></Tooltip>
                                            {userRole === 'team' && <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onDeleteDoc(i)} />}
                                        </Space>
                                    }>
                                        <List.Item.Meta title={<span className="text-xs font-bold text-slate-700">{doc.name}</span>} description={
                                            <div className="flex flex-col">
                                                <div className="flex gap-2">
                                                    <Tag className="text-[10px] m-0">{doc.type}</Tag>
                                                    <span className="text-[10px] text-slate-400 font-sans">📅 {doc.date}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-300">{doc.size}</span>
                                            </div>
                                        } />
                                    </List.Item>
                                )} />
                            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                        </div>
                    </Card>
                    <Card id="feedback-anchor" title={sectionTitle(<MessageOutlined />, "用户反馈与意见", "text-blue-500")}>
                        <div className="mb-6"><Input.Search size="large" placeholder={(userRole === 'partyA' || userRole === 'supervisor') ? "提交建议..." : "针对最新反馈进行回复..."} enterButton={(userRole === 'partyA' || userRole === 'supervisor') ? '提交' : '回复'} value={feedbackInput} onChange={e => setFeedbackInput(e.target.value)} onSearch={(v) => { if (v.trim()) { onSubmitInteraction(v); setFeedbackInput(''); } }} disabled={userRole === 'team' && !current.feedbackGroups?.length} /></div>
                        <div className="max-h-[400px] overflow-auto custom-scroll pr-2">
                            <Timeline items={(current.feedbackGroups || []).map(g => ({ color: 'green', children: (<div className="interaction-thread"><div><div className="flex justify-between items-center mb-1"><Tag color="green" className="text-[10px]">甲方反馈</Tag><span className="text-[10px] text-slate-300 italic">{g.partyA.date}</span></div><div className="text-sm font-medium text-slate-700">{g.partyA.content}</div></div>{g.replies?.map((r, ri) => (<div key={ri} className="mt-3 pt-3 border-t border-slate-50"><div className="flex justify-between items-center mb-1"><Tag color="blue" className="text-[10px]">项目组回复</Tag><span className="text-[10px] text-slate-300 italic">{r.date}</span></div><div className="text-sm text-slate-500">{r.content}</div></div>))}</div>) }))} />
                        </div>
                    </Card>
                    <Card id="issues-anchor" title={sectionTitle(<TeamOutlined />, "协调事项追踪", "text-orange-500")}>
                        {userRole === 'team' && <div className="mb-6"><Input.Search size="large" placeholder="记录待甲方配合事项..." enterButton="新增" value={issueInput} onChange={e => setIssueInput(e.target.value)} onSearch={(v) => { if (v.trim()) { onAddIssue(v); setIssueInput(''); } }} /></div>}
                        <div className="space-y-4 max-h-[400px] overflow-auto custom-scroll pr-2">
                            {(current.issues || []).map(issue => (
                                <div key={issue.id} className={`p-3 rounded-lg border ${issue.status === 'done' ? 'bg-slate-50 border-slate-100' : 'bg-orange-50 border-orange-100'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1"><Tag color={issue.status === 'done' ? 'default' : 'orange'}>{issue.status === 'done' ? '已处理' : '需配合'}</Tag><div className={`text-sm mt-2 font-bold ${issue.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{issue.title}</div></div>
                                        {userRole === 'team' && <Button size="small" type="primary" className={issue.status === 'done' ? 'bg-slate-400 border-none' : 'bg-green-600 border-none'} onClick={() => onToggleIssue(issue.id)}>{issue.status === 'done' ? '激活' : '标记完成'}</Button>}
                                    </div>
                                    <div className="text-[9px] text-slate-400 mt-2 font-sans italic">📅 发起：{issue.date} {issue.status === 'done' && ` | ✔️ 解决：${issue.solvedDate}`}</div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const [view, setView] = useState('login');
    const [userRole, setUserRole] = useState('team');
    const [user, setUser] = useState<any>(null);
    const [userList, setUserList] = useState<any[]>([]);

    const [modules, setModules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [connError, setConnError] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [targetAnchor, setTargetAnchor] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [filterMode, setFilterMode] = useState('all');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isProjectInfoModalOpen, setIsProjectInfoModalOpen] = useState(false);
    const [isWeeklyReportModalOpen, setIsWeeklyReportModalOpen] = useState(false);
    const [isAllDocsModalOpen, setIsAllDocsModalOpen] = useState(false);
    const [allDocsSearch, setAllDocsSearch] = useState('');
    const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
    const [isEditingProjectInfo, setIsEditingProjectInfo] = useState(false);
    const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
    const [pwdTargetUser, setPwdTargetUser] = useState<any>(null);
    const [infoActiveMenu, setInfoActiveMenu] = useState('core');
    const [projectInfo, setProjectInfo] = useState<any>({});
    const [weeklyReports, setWeeklyReports] = useState<any[]>([]);
    const [importFileList, setImportFileList] = useState<any[]>([]);
    const [importLoading, setImportLoading] = useState(false);
    const [docFileList, setDocFileList] = useState<any[]>([]);
    const [selectedExportIds, setSelectedExportIds] = useState<any[]>([]);
    const isDeletingAll = useRef(false);
    const hasInitialized = useRef(false);
    const [form] = Form.useForm();
    const [docForm] = Form.useForm();
    const [infoForm] = Form.useForm();
    const [weeklyForm] = Form.useForm();
    const [pwdForm] = Form.useForm();
    const strategyTypeWatcher = Form.useWatch('strategyType', form);

    const current = useMemo(() => modules.find(m => m.id === selectedId) || null, [modules, selectedId]);

    const stats = useMemo(() => {
        const total = modules.length;
        const completed = modules.filter(m => (m.progress || 0) === 100).length;
        const totalProgress = total > 0 ? Math.round(modules.reduce((a, b) => a + (b.progress || 0), 0) / total) : 0;
        const pendingIssues = modules.reduce((a, b) => a + (b.issues?.filter(i => i.status === 'pending').length || 0), 0);
        const totalFeedback = modules.reduce((a, b) => a + (b.feedbackGroups || []).filter(g => (g.replies || []).length === 0).length, 0);
        const subsystemCount = new Set(modules.map((m: any) => m.subsystem)).size;
        const completedSubsystems = Object.values(modules.reduce((acc: any, m: any) => { acc[m.subsystem] = acc[m.subsystem] || []; acc[m.subsystem].push(m); return acc; }, {})).filter((g: any) => g.every((m: any) => m.progress === 100)).length;
        const delayedCount = modules.filter((m: any) => dayjs().isAfter(dayjs(m.deadline)) && (m.progress || 0) < 100).length;
        const strategyCounts = modules.reduce((acc: any, cur: any) => { const type = cur.strategyType || 'development'; acc[type] = (acc[type] || 0) + 1; return acc; }, {});
        const totalDocs = modules.reduce((a: any, b: any) => a + (b.docs?.length || 0), 0);
        return { total, completed, totalProgress, pendingIssues, totalFeedback, subsystemCount, completedSubsystems, strategyCounts, delayedCount, totalDocs };
    }, [modules]);

    const STRATEGY_OPTIONS = useMemo(() => projectInfo.strategies || DEFAULT_STRATEGY_OPTIONS, [projectInfo.strategies]);

    const onInfoValuesChange = (changedValues, allValues) => {
        if (changedValues.trialStart || changedValues.trialPeriod) {
            const start = allValues.trialStart;
            const period = allValues.trialPeriod;
            if (start && period) {
                const end = dayjs(start).add(period, 'month');
                infoForm.setFieldsValue({ trialEnd: end });
            }
        }
    };

    const SEED_DATA = [{ subsystem: '基础支撑子系统', name: '用户管理', chapter: '第一节', status: '进行中', progress: 35, deadline: '2026-03-12', order: 0, link: '', strategyType: 'customization' }];

    const [isCompositionModalOpen, setIsCompositionModalOpen] = useState(false);
    const [compExpandedKeys, setCompExpandedKeys] = useState<string[]>([]);

    useEffect(() => {
        const savedUser = sessionStorage.getItem('board_user');
        if (savedUser) {
            const u = JSON.parse(savedUser);
            setUser(u);
            setUserRole(u.role);
            setView('list');
        }
    }, []);

    const handleLogin = (u: any) => {
        setUser(u);
        setUserRole(u.role);
        sessionStorage.setItem('board_user', JSON.stringify(u));
        setView('list');
    };
    const handleLogout = () => { sessionStorage.clear(); setView('login'); setUser(null); };

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_BASE}/users`);
            const data = await res.json();
            if (data.ok) setUserList(data.data);
        } catch (err) { console.error('获取用户列表失败'); }
    };

    const handleAddUser = async (v: any) => {
        try {
            await fetch(`${API_BASE}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
            message.success('创建用户成功');
            fetchUsers();
        } catch (err) { message.error('创建用户异常'); }
    };

    const handleOpenPwdModal = (targetUser: any) => {
        setPwdTargetUser(targetUser);
        setIsPwdModalOpen(true);
        pwdForm.resetFields();
    };

    const handleChangePassword = async (values: any) => {
        if (!pwdTargetUser) return;
        try {
            const res = await fetch(`${API_BASE}/users/${pwdTargetUser.id}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: values.newPassword })
            });
            const data = await res.json();
            if (data.ok) {
                message.success('密码修改成功');
                setIsPwdModalOpen(false);
            } else {
                message.error(data.error || '修改失败');
            }
        } catch (e) {
            message.error('网络错误');
        }
    };

    const handleDeleteUser = async (uid: any) => {
        try {
            await fetch(`${API_BASE}/users/${uid}`, { method: 'DELETE' });
            message.success('已移除用户');
            fetchUsers();
        } catch (err) { message.error('操作失败'); }
    };

    const fetchData = async () => {
        try {
            const [modRes, infoRes, weekRes] = await Promise.all([
                fetch(`${API_BASE}/modules`).then(r => r.json()),
                fetch(`${API_BASE}/project-info`).then(r => r.json()),
                fetch(`${API_BASE}/weekly-reports`).then(r => r.json())
            ]);
            if (modRes.ok) {
                if (modRes.data.length === 0 && !hasInitialized.current) {
                    hasInitialized.current = true;
                    await Promise.all(SEED_DATA.map(item => fetch(`${API_BASE}/modules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })));
                    fetch(`${API_BASE}/modules`).then(r => r.json()).then(r2 => setModules(r2.data));
                } else {
                    setModules(modRes.data);
                }
            }
            if (infoRes.ok) setProjectInfo(infoRes.data || {});
            if (weekRes.ok) setWeeklyReports(weekRes.data.sort((a, b) => dayjs(b.uploadTime).unix() - dayjs(a.uploadTime).unix()));
            setLoading(false);
        } catch (e) { setConnError('数据获取失败'); }
    };

    useEffect(() => {
        if (!user) return;
        fetchData();
        fetchUsers();
        const timer = setInterval(() => {
            fetchData();
            fetchUsers();
        }, 3000);
        return () => clearInterval(timer);
    }, [user]);

    const updateSubItem = async (id: any, field: string, newData: any) => {
        try {
            const res = await fetch(`${API_BASE}/modules/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: newData })
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            fetchData();
        } catch (e: any) {
            console.error('Update sub-item failed:', e);
            message.error('同步失败: ' + (e.message || '网络连接异常'));
        }
    };

    const deleteModule = async (id) => {
        if (!user) return;
        try { await fetch(`${API_BASE}/modules/${id}`, { method: 'DELETE' }); message.success('已删除'); fetchData(); } catch (e) { message.error('失败'); }
    };

    const handleDeleteAll = async () => {
        if (!user || modules.length === 0) return;
        isDeletingAll.current = true;
        try {
            const hide = message.loading('清除中...', 0);
            await fetch(`${API_BASE}/modules/delete-all`, { method: 'POST' });
            hide(); message.success('数据已清空'); fetchData();
        } catch (e) { isDeletingAll.current = false; message.error('失败'); }
    };

    const saveModule = async (vals: any) => {
        const ssName = Array.isArray(vals.subsystem) ? vals.subsystem[0] : vals.subsystem;
        const d = vals.deadline ? vals.deadline.format('YYYY-MM-DD') : '';

        // 同名校验
        if (!selectedId) {
            const isDuplicate = modules.some((m: any) => m.name === vals.name && m.subsystem === (ssName || '未分类'));
            if (isDuplicate) {
                return message.error(`保存失败：在'${ssName || '未分类'}'子系统中已存在名为'${vals.name}'的模块`);
            }
        }
        const history = [...(current?.history || [])];
        if (current && vals.progress !== current.progress) {
            history.unshift({ time: dayjs().format('YYYY/M/D HH:mm'), content: `[系统审计] 进度从 ${current.progress}% 调整为 ${vals.progress}%` });
        }
        const payload = { ...vals, status: vals.progress === 100 ? '已完成' : '进行中', history, subsystem: ssName || '未分类', deadline: d, updateTime: dayjs().format('YYYY/M/D'), link: vals.link || '', tender: vals.tender || '', strategy: vals.strategy || '', chapter: vals.chapter || '', modifiedModules: vals.modifiedModules || '' };
        try {
            let res;
            if (selectedId) {
                res = await fetch(`${API_BASE}/modules/${selectedId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            } else {
                const maxOrder = modules.reduce((max: number, m: any) => Math.max(max, m.order || 0), -1);
                res = await fetch(`${API_BASE}/modules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, history: [], docs: [], issues: [], order: maxOrder + 1 }) });
            }
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            message.success(selectedId ? '更新成功' : '创建成功');
            setIsEditModalOpen(false);
            fetchData();
        } catch (e: any) {
            console.error('Save module failed:', e);
            message.error('保存失败: ' + (e.message || '服务端无响应'));
        }
    };

    const handleSaveProjectInfo = async (vals) => {

        const formatted = {};
        Object.keys(vals).forEach(k => {
            if (vals[k] && dayjs.isDayjs(vals[k])) formatted[k] = vals[k].format('YYYY-MM-DD');
            else formatted[k] = vals[k] || '';
        });
        try {
            await fetch(`${API_BASE}/project-info`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formatted) });
            message.success('项目信息已更新');
            setIsEditingProjectInfo(false);
            fetchData();
        } catch (e) { message.error('保存失败'); }
    };

    const handleUploadWeeklyReport = (vals) => {
        const file = vals.file.fileList[0]?.originFileObj;
        if (!file) return message.error('请选择文件');
        const reader = new FileReader();
        reader.onload = async (e) => {

            const weekNum = vals.weekNum;
            await fetch(`${API_BASE}/weekly-reports`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                    name: `第${weekNum}周项目周报`,
                    weekNum: weekNum,
                    uploadTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                    url: e.target.result,
                    fileName: file.name
                })
            });
            message.success('周报归档成功');
            setIsWeeklyReportModalOpen(false);
            weeklyForm.resetFields();
            fetchData();
        }; reader.readAsDataURL(file);
    };

    const handleDownloadReport = (r) => { const link = document.createElement('a'); link.href = r.url; link.download = r.name + r.fileName.substring(r.fileName.lastIndexOf('.')); link.click(); };

    const handleDownloadTemplate = () => {
        const data = [["子系统名称", "模块名称", "标书章节", "响应策略", "进度", "计划截止日期", "标书指标", "实施策略", "链接", "涉及改造模块"]];
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "模版"); XLSX.writeFile(wb, "看板导入模版.xlsx");
    };

    const handleImportConfirm = async () => {
        if (!importFileList.length) {
            message.warning('请先选择文件');
            return;
        }
        setImportLoading(true);
        const fileObj = (importFileList[0] as any).originFileObj || importFileList[0];
        const reader = new FileReader();
        reader.onload = async (e: any) => {
            try {
                if (!e.target?.result) throw new Error('解析文件失败：读取内容为空');
                const workbook = XLSX.read(e.target.result, { type: 'array', cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                if (!firstSheetName) throw new Error('Excel文件格式不正确（找不到工作表）');
                const json: any = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1 });
                const rows = json.slice(1);

                const maxOrder = modules.reduce((max: number, m: any) => Math.max(max, m.order || 0), -1);
                let nextOrder = maxOrder + 1;

                let successCount = 0;
                for (const row of rows) {
                    if (!row || !row[1]) continue;
                    const map: any = {
                        '现有产品改造': 'customization', '产品支持': 'customization', '产品改造': 'customization',
                        '重新定制开发': 'development', '定制开发': 'development',
                        '高保真DEMO': 'demo', 'DEMO实现': 'demo',
                        '文字说明响应': 'text_description', '情况说明': 'text_description'
                    };
                    let p = row[4];
                    let progressVal = (typeof p === 'string' && p.includes('%')) ? parseFloat(p) : (typeof p === 'number' && p <= 1 ? p * 100 : Number(p || 0));
                    if (isNaN(progressVal)) progressVal = 0;

                    let d = (row[5] instanceof Date) ? dayjs(row[5]).format('YYYY-MM-DD') : String(row[5] || '');

                    const res = await fetch(`${API_BASE}/modules`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            subsystem: row[0] || '未分组',
                            name: String(row[1]),
                            chapter: row[2] || '',
                            strategyType: map[row[3]] || 'development',
                            progress: progressVal,
                            deadline: d,
                            tender: row[6] || '',
                            strategy: row[7] || '',
                            link: row[8] || '',
                            modifiedModules: row[9] || '',
                            status: (progressVal === 100) ? '已完成' : '进行中',
                            order: nextOrder++,
                            issues: [],
                            feedbackGroups: [],
                            docs: [],
                            history: [],
                            updateTime: dayjs().format('YYYY/M/D')
                        })
                    });
                    if (res.ok) successCount++;
                }
                message.success(`导入完成，成功导入 ${successCount} 条数据`);
                setIsImportModalOpen(false);
                setImportFileList([]);
                fetchData();
            } catch (err: any) {
                console.error('Import error:', err);
                message.error('导入失败: ' + (err.message || '格式错误'));
            } finally {
                setImportLoading(false);
            }
        };
        reader.readAsArrayBuffer(fileObj);
    };

    const handleBatchExport = () => {
        if (!selectedExportIds.length) return message.error('未选');
        const data = modules.filter(m => selectedExportIds.includes(m.id)).sort((a, b) => (a.order || 0) - (b.order || 0));
        const map = { customization: '产品改造', development: '定制开发', demo: '高保真DEMO', text_description: '情况说明' };
        const wsData = [["子系统", "模块", "章节", "策略", "进度", "截止", "标书", "方案", "链接", "改造名"], ...data.map(m => [m.subsystem, m.name, m.chapter, map[m.strategyType], m.progress, m.deadline, m.tender, m.strategy, m.link, m.modifiedModules])];
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsData), "数据"); XLSX.writeFile(wb, `导出_${dayjs().format('MMDDHHmm')}.xlsx`); setIsExportModalOpen(false);
    };

    const handleFinishDoc = (v) => {
        if (!docFileList.length) return message.error('请选文件');
        const file = docFileList[0];
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'application/zip', 'application/x-rar-compressed'];
        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.rar')) return message.error('格式暂不支持');
        if (file.size > 700 * 1024) return message.error('单文件 700KB 限制');
        const reader = new FileReader();
        reader.onload = async (e) => {
            const sizeStr = file.size > 1024 * 1024 ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' : (file.size / 1024).toFixed(2) + ' KB';
            const newDoc = { name: file.name, type: v.type, date: dayjs().format('YYYY/MM/DD'), size: sizeStr, url: e.target.result };
            try { const hide = message.loading('同步中...', 0); await updateSubItem(selectedId, 'docs', [...(current.docs || []), newDoc]); hide(); message.success('归档成功'); setIsDocModalOpen(false); setDocFileList([]); docForm.resetFields(); } catch (err) { message.error('上传失败'); }
        }; reader.readAsDataURL(file);
    };

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#3b82f6', borderRadius: 12 } }}>
            {view === 'login' ? <LoginView onLogin={handleLogin} projectInfo={projectInfo} /> : (
                view === 'list' ? (
                    <ListView
                        modules={modules} stats={stats} filterMode={filterMode} onFilterChange={setFilterMode} searchText={searchText} onSearchChange={setSearchText} onSelect={(id: any, anchor: any) => { setSelectedId(id); setTargetAnchor(anchor || null); setView('detail'); }} onLogout={handleLogout} onChangePassword={handleOpenPwdModal} user={user} userRole={userRole} onOpenGuide={() => setIsGuideModalOpen(true)}
                        onAdd={() => { setSelectedId(null); setIsEditModalOpen(true); form.resetFields(); }}
                        onImport={() => setIsImportModalOpen(true)}
                        onExport={() => { setSelectedExportIds(modules.map(m => m.id)); setIsExportModalOpen(true); }}
                        onDelete={deleteModule} onDeleteAll={handleDeleteAll}
                        onReorderModules={async (did, tid, tss) => {
                            const sorted = [...modules].sort((a, b) => (a.order || 0) - (b.order || 0));
                            const dragged = sorted.find(m => m.id === did); if (!dragged) return;
                            const others = sorted.filter(m => m.id !== did);
                            let nidx = tid ? others.findIndex(m => m.id === tid) : others.length;
                            others.splice(nidx, 0, { ...dragged, subsystem: tss });
                            const items = others.map((m, idx) => ({ id: m.id, order: idx, subsystem: m.subsystem }));
                            await fetch(`${API_BASE}/modules/batch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
                            fetchData();
                        }}
                        onReorderSubsystems={async (dss, tss) => {
                            const ssOrder = [...new Set([...modules].sort((a, b) => (a.order || 0) - (b.order || 0)).map(m => m.subsystem))];
                            const fidx = ssOrder.indexOf(dss); const tidx = ssOrder.indexOf(tss); ssOrder.splice(fidx, 1); ssOrder.splice(tidx, 0, dss);
                            let gidx = 0; const grouped = modules.reduce((acc, m) => { acc[m.subsystem] = acc[m.subsystem] || []; acc[m.subsystem].push(m); return acc; }, {});
                            const items = [];
                            ssOrder.forEach(ss => { const mList = grouped[ss].sort((a, b) => (a.order || 0) - (b.order || 0)); mList.forEach(m => { items.push({ id: m.id, order: gidx++, subsystem: m.subsystem }); }); });
                            await fetch(`${API_BASE}/modules/batch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
                            fetchData();
                        }}
                        onOpenProjectInfo={() => { setIsEditingProjectInfo(false); setIsProjectInfoModalOpen(true); }}
                        onOpenWeeklyReports={() => setIsWeeklyReportModalOpen(true)}
                        onOpenAllDocs={() => { setAllDocsSearch(''); setIsAllDocsModalOpen(true); }}
                        onOpenParser={() => setView('parser')}
                        weeklyReportCount={weeklyReports.length}
                        projectInfo={projectInfo}
                        strategyOptions={STRATEGY_OPTIONS}
                    />
                ) : (
                    view === 'parser' ? (
                        <ModuleParser onBack={() => setView('list')} onSync={fetchData} modules={modules} userRole={userRole} strategyOptions={STRATEGY_OPTIONS} />
                    ) : (
                        <DetailView current={current} targetAnchor={targetAnchor} onBack={() => { setView('list'); setTargetAnchor(null); }} onEdit={() => { if (!current) return; form.setFieldsValue({ ...current, deadline: current.deadline ? dayjs(current.deadline) : null }); setIsEditModalOpen(true); }} onOpenComposition={() => setIsCompositionModalOpen(true)} onAddHistory={(v: any) => current && updateSubItem(selectedId, 'history', [{ time: dayjs().format('YYYY/M/D HH:mm'), content: `[${userRole === 'team' ? '项目组' : (userRole === 'supervisor' ? '监理' : '甲方')}] ${v}` }, ...(current.history || [])])} onAddIssue={(v: any) => current && updateSubItem(selectedId, 'issues', [{ id: Date.now(), title: v, status: 'pending', date: dayjs().format('YYYY/M/D') }, ...(current.issues || [])])} onToggleIssue={(iid: any) => current && updateSubItem(selectedId, 'issues', (current.issues || []).map(i => i.id === iid ? { ...i, status: i.status === 'done' ? 'pending' : 'done', solvedDate: i.status === 'done' ? '' : dayjs().format('YYYY/M/D') } : i))} onDeleteDoc={(idx: any) => current && updateSubItem(selectedId, 'docs', (current.docs || []).filter((_, i) => i !== idx))} onOpenDocModal={() => setIsDocModalOpen(true)} userRole={userRole} feedbackProps={{ onSubmitInteraction: (v: any) => { if (!current) return; const time = dayjs().format('YYYY/M/D HH:mm'); if (userRole === 'partyA' || userRole === 'supervisor') updateSubItem(selectedId, 'feedbackGroups', [{ partyA: { content: v, date: time }, replies: [] }, ...(current.feedbackGroups || [])]); else if (current.feedbackGroups?.length) { const groups = [...current.feedbackGroups]; groups[0].replies.push({ content: v, date: time }); updateSubItem(selectedId, 'feedbackGroups', groups); } } }} strategyOptions={STRATEGY_OPTIONS} />
                    )
                )
            )}

            <Modal
                title={(isEditingProjectInfo && user?.username === 'admin') ? "维护项目基本信息" : "项目基本情况"}
                open={isProjectInfoModalOpen}
                onCancel={() => { setIsProjectInfoModalOpen(false); setIsEditingProjectInfo(false); setInfoActiveMenu('core'); }}
                width={900}
                destroyOnClose
                footer={(isEditingProjectInfo && user?.username === 'admin') ? [
                    <Button key="back" onClick={() => { setIsEditingProjectInfo(false); setInfoActiveMenu('core'); }}>返回展示</Button>,
                    <Button key="submit" type="primary" onClick={() => infoForm.submit()}>保存修改</Button>
                ] : [<Button key="close" onClick={() => { setIsProjectInfoModalOpen(false); setInfoActiveMenu('core'); }}>关闭</Button>]}
            >
                {(!isEditingProjectInfo || user?.username !== 'admin') ? (
                    <div className="fade-in py-2">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex-1 pr-10">
                                <h2 className="text-2xl font-extrabold text-slate-800 m-0">{projectInfo.name || '未命名项目'}</h2>
                                <div className="mt-3 text-slate-500 text-sm leading-relaxed whitespace-pre-wrap">{projectInfo.intro || '暂无项目简介说明。'}</div>
                            </div>
                            {user?.username === 'admin' && (
                                <Button icon={<SettingOutlined />} type="primary" ghost onClick={() => {
                                    setIsEditingProjectInfo(true);
                                    setInfoActiveMenu('core');
                                    infoForm.setFieldsValue({
                                        ...projectInfo,
                                        contractDate: projectInfo.contractDate ? dayjs(projectInfo.contractDate) : null,
                                        startDate: projectInfo.startDate ? dayjs(projectInfo.startDate) : null,
                                        prePlanned: projectInfo.prePlanned ? dayjs(projectInfo.prePlanned) : null,
                                        preActual: projectInfo.preActual ? dayjs(projectInfo.preActual) : null,
                                        trialStart: projectInfo.trialStart ? dayjs(projectInfo.trialStart) : null,
                                        trialEnd: projectInfo.trialEnd ? dayjs(projectInfo.trialEnd) : null,
                                        finalPlanned: projectInfo.finalPlanned ? dayjs(projectInfo.finalPlanned) : null,
                                        finalActual: projectInfo.finalActual ? dayjs(projectInfo.finalActual) : null,
                                        strategies: projectInfo.strategies || DEFAULT_STRATEGY_OPTIONS
                                    });
                                }}>信息维护</Button>
                            )}
                        </div>
                        <Descriptions bordered column={2} size="small" className="mb-8" labelStyle={{ width: '160px', background: '#f8fafc', fontWeight: 'bold' }}>
                            <Descriptions.Item label="项目单位 (甲方)" span={1}>{projectInfo.clientUnit || '-'}</Descriptions.Item>
                            <Descriptions.Item label="承担单位 (乙方)" span={1}>{projectInfo.contractorUnit || '-'}</Descriptions.Item>
                            <Descriptions.Item label="监理单位" span={2}>{projectInfo.supervisionUnit || '-'}</Descriptions.Item>
                            <Descriptions.Item label="合同签订日期">{projectInfo.contractDate || '-'}</Descriptions.Item>
                            <Descriptions.Item label="项目开工日期">{projectInfo.startDate || '-'}</Descriptions.Item>
                        </Descriptions>
                        <Descriptions bordered column={2} size="small" className="mb-8" title={<Tag className="section-tag">验收阶段详情</Tag>} labelStyle={{ width: '160px', background: '#f8fafc', fontWeight: 'bold' }}>
                            <Descriptions.Item label="项目初验 (计划)">{projectInfo.prePlanned || '-'}</Descriptions.Item>
                            <Descriptions.Item label="项目初验 (实际)">{projectInfo.preActual || '-'}</Descriptions.Item>
                            <Descriptions.Item label="试运行时间" span={2}><span className="text-blue-600 font-bold">{projectInfo.trialPeriod || 0}个月</span> {(projectInfo.trialStart && projectInfo.trialEnd) ? <span className="ml-2 text-slate-400 font-normal"> (自 {projectInfo.trialStart} 至 {projectInfo.trialEnd})</span> : <span className="ml-2 text-slate-300 font-normal"> (未设置日期区间)</span>}</Descriptions.Item>
                            <Descriptions.Item label="项目终验 (计划)">{projectInfo.finalPlanned || '-'}</Descriptions.Item>
                            <Descriptions.Item label="项目终验 (实际)">{projectInfo.finalActual || '-'}</Descriptions.Item>
                            <Descriptions.Item label="全局响应策略" span={2}>
                                <Space wrap>
                                    {(projectInfo.strategies || DEFAULT_STRATEGY_OPTIONS).map((s: any) => (
                                        <Tag key={s.value} color={s.color} className="font-bold border-none">{s.label}</Tag>
                                    ))}
                                </Space>
                            </Descriptions.Item>
                        </Descriptions>
                    </div>
                ) : (
                    <div className="flex gap-6 h-[500px]">
                        <div className="w-48 shrink-0 border-r border-slate-100 flex flex-col gap-2 pr-4 pt-2">
                            <div onClick={() => setInfoActiveMenu('core')} className={`cursor-pointer px-4 py-3 rounded-xl transition ${infoActiveMenu === 'core' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-600'}`}>核心信息维护</div>
                            <div onClick={() => setInfoActiveMenu('milestone')} className={`cursor-pointer px-4 py-3 rounded-xl transition ${infoActiveMenu === 'milestone' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-600'}`}>里程碑与节点</div>
                            <div onClick={() => setInfoActiveMenu('strategy')} className={`cursor-pointer px-4 py-3 rounded-xl transition ${infoActiveMenu === 'strategy' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-600'}`}>响应策略字典</div>
                            <div onClick={() => setInfoActiveMenu('users')} className={`cursor-pointer px-4 py-3 rounded-xl transition tracking-tight ${infoActiveMenu === 'users' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-600'}`}>人员账号管理</div>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 pb-4 pt-1 custom-scroll">
                            <Form form={infoForm} layout="vertical" onFinish={handleSaveProjectInfo} onValuesChange={onInfoValuesChange} className={`fade-in ${infoActiveMenu === 'users' ? 'hidden' : 'block'}`}>
                                <div className={infoActiveMenu === 'core' ? 'block' : 'hidden'}>
                                    <Row gutter={24}>
                                        <Col span={24}><Tag className="section-tag mb-4">核心信息维护</Tag></Col>
                                        <Col span={12}><Form.Item name="name" label="项目名称"><Input placeholder="请输入项目全称" /></Form.Item></Col>
                                        <Col span={12}><Form.Item name="clientUnit" label="项目单位 (甲方)"><Input /></Form.Item></Col>
                                        <Col span={12}><Form.Item name="contractorUnit" label="承担单位 (乙方)"><Input /></Form.Item></Col>
                                        <Col span={12}><Form.Item name="supervisionUnit" label="监理单位"><Input /></Form.Item></Col>
                                        <Col span={24}><Form.Item name="intro" label="项目简介"><Input.TextArea rows={3} placeholder="描述建设目标及背景" /></Form.Item></Col>
                                        <Col span={12}><Form.Item name="contractDate" label="合同签订日期"><DatePicker className="w-full" /></Form.Item></Col>
                                        <Col span={12}><Form.Item name="startDate" label="项目开工日期" dependencies={['contractDate']} rules={[{ validator: async (_, value) => { const contract = infoForm.getFieldValue('contractDate'); if (value && contract && value.isBefore(contract, 'day')) { return Promise.reject(new Error('开工日期不应早于合同签订日期')); } } }]}><DatePicker className="w-full" /></Form.Item></Col>
                                    </Row>
                                </div>

                                <div className={infoActiveMenu === 'milestone' ? 'block' : 'hidden'}>
                                    <Row gutter={24}>
                                        <Col span={24}><Divider orientation={"left" as any} className="m-0 text-slate-400 text-xs">里程碑节点维护</Divider></Col>
                                        <Col span={12} className="mt-4"><Form.Item name="prePlanned" label="项目初验 (计划日期)" dependencies={['startDate']} rules={[{ validator: async (_, value) => { const start = infoForm.getFieldValue('startDate'); if (value && start && value.isBefore(start, 'day')) { return Promise.reject(new Error('初验日期不应早于开工日期')); } } }]}><DatePicker className="w-full" /></Form.Item></Col>
                                        <Col span={12} className="mt-4"><Form.Item name="preActual" label="项目初验 (实际日期)" dependencies={['startDate']} rules={[{ validator: async (_, value) => { const start = infoForm.getFieldValue('startDate'); if (value && start && value.isBefore(start, 'day')) { return Promise.reject(new Error('初验日期不应早于开工日期')); } } }]}><DatePicker className="w-full" /></Form.Item></Col>
                                        <Col span={24}><Divider orientation={"left" as any} className="m-0 text-slate-400 text-xs mt-4">试运行详情</Divider></Col>
                                        <Col span={24} className="mt-4"><Form.Item name="trialPeriod" label="试运行周期 (月)" initialValue={3}><InputNumber min={1} max={60} precision={0} style={{ width: '120px' }} /></Form.Item></Col>
                                        <Col span={8}><Form.Item name="trialStart" label="试运行开始日期" dependencies={['preActual', 'prePlanned']} rules={[{ validator: async (_, value) => { const pre = infoForm.getFieldValue('preActual') || infoForm.getFieldValue('prePlanned'); if (value && pre && value.isBefore(pre, 'day')) { return Promise.reject(new Error('试运行开始日期不能早于初验日期')); } } }]}><DatePicker className="w-full" /></Form.Item></Col>
                                        <Col span={8}><Form.Item name="trialEnd" label="试运行结束日期 (自动计算)"><DatePicker className="w-full" disabled /></Form.Item></Col>
                                        <Col span={8} className="flex items-center text-slate-400 text-[10px] italic pt-6">* 自动推算</Col>
                                        <Col span={24}><Divider orientation={"left" as any} className="m-0 text-slate-400 text-xs mt-4">终验维护</Divider></Col>
                                        <Col span={12} className="mt-4"><Form.Item name="finalPlanned" label="项目终验 (计划日期)" dependencies={['trialEnd']} rules={[{ validator: async (_: any, value: any) => { const end = infoForm.getFieldValue('trialEnd'); if (value && end && value.isBefore(end, 'day')) { return Promise.reject(new Error('终验日期不能早于试运行结束日期')); } } }]}><DatePicker className="w-full" /></Form.Item></Col>
                                        <Col span={12} className="mt-4"><Form.Item name="finalActual" label="项目终验 (实际日期)" dependencies={['trialEnd']} rules={[{ validator: async (_: any, value: any) => { const end = infoForm.getFieldValue('trialEnd'); if (value && end && value.isBefore(end, 'day')) { return Promise.reject(new Error('终验日期不能早于试运行结束日期')); } } }]}><DatePicker className="w-full" /></Form.Item></Col>
                                    </Row>
                                </div>

                                <div className={infoActiveMenu === 'strategy' ? 'block' : 'hidden'}>
                                    <Row gutter={24}>
                                        <Col span={24}><Divider orientation={"left" as any} className="m-0 text-slate-400 text-xs">响应策略字典管理</Divider></Col>
                                        <Col span={24} className="mt-4">
                                            <Form.List name="strategies">
                                                {(fields, { add, remove }) => (
                                                    <>
                                                        {fields.map(({ key, name, ...restField }) => (
                                                            <Row key={key} gutter={12} align="middle" className="mb-2">
                                                                <Col span={8}>
                                                                    <Form.Item {...restField} name={[name, 'label']} rules={[{ required: true, message: '请输入名称' }]}><Input placeholder="策略名称" /></Form.Item>
                                                                </Col>
                                                                <Col span={8}>
                                                                    <Form.Item {...restField} name={[name, 'value']} rules={[{ required: true, message: '请输入Key' }]}><Input placeholder="唯一Key" /></Form.Item>
                                                                </Col>
                                                                <Col span={6}>
                                                                    <Form.Item {...restField} name={[name, 'color']} initialValue="blue"><Select options={[{ label: '蓝色', value: 'blue' }, { label: '紫色', value: 'purple' }, { label: '橙色', value: 'orange' }, { label: '绿色', value: 'green' }, { label: '红色', value: 'red' }, { label: '红色(深)', value: 'volcano' }, { label: '青色', value: 'cyan' }]} /></Form.Item>
                                                                </Col>
                                                                <Col span={2}>
                                                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                                                                </Col>
                                                            </Row>
                                                        ))}
                                                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} className="mb-4">添加新的响应方式</Button>
                                                    </>
                                                )}
                                            </Form.List>
                                        </Col>
                                    </Row>
                                </div>
                            </Form>

                            {infoActiveMenu === 'users' && (
                                <div className="fade-in">
                                    <Divider orientation={"left" as any} className="m-0 mb-6 text-slate-500 font-bold">人员账号与赋权管理</Divider>
                                    <div className="mb-6 flex justify-between items-center bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-500 p-2 rounded-lg"><TeamOutlined className="text-white" /></div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">当前活跃账户</div>
                                                <div className="text-[10px] text-blue-600 font-medium tracking-tight uppercase">Security & Permission Matrix</div>
                                            </div>
                                        </div>
                                        <Badge status="processing" text="身份认证系统已锁定" className="text-[10px] bg-white px-3 py-1 rounded-full border border-blue-200" />
                                    </div>
                                    <Table
                                        size="middle"
                                        dataSource={userList}
                                        rowKey="id"
                                        columns={[
                                            { title: '登录账号', dataIndex: 'username', key: 'username', className: 'text-slate-600 font-medium' },
                                            { title: '真实姓名', dataIndex: 'realName', key: 'realName', className: 'font-bold' },
                                            { title: '系统权限', dataIndex: 'role', key: 'role', render: (v) => v === 'team' ? <Tag color="blue" className="rounded-full px-3">项目组专家</Tag> : (v === 'supervisor' ? <Tag color="purple" className="rounded-full px-3">监理</Tag> : <Tag color="green" className="rounded-full px-3">甲方负责人</Tag>) },
                                            {
                                                title: '操作', key: 'op', align: 'center',
                                                render: (_, record) => (
                                                    <Space size="small">
                                                        <Button type="text" icon={<KeyOutlined />} size="small" onClick={() => handleOpenPwdModal(record)} className="text-blue-500" title="修改/重置密码" />
                                                        {record.username !== 'admin' && (
                                                            <Popconfirm title="确认删除此账号？" onConfirm={() => handleDeleteUser(record.id)}>
                                                                <Button type="text" danger icon={<DeleteOutlined />} size="small" title="删除账号" />
                                                            </Popconfirm>
                                                        )}
                                                    </Space>
                                                )
                                            }
                                        ]}
                                        pagination={false}
                                        className="mb-8 modern-table border border-slate-100 rounded-xl overflow-hidden shadow-sm"
                                    />
                                    <div className="bg-slate-50/80 p-6 rounded-2xl border border-dashed border-slate-200">
                                        <div className="text-xs font-bold mb-4 text-slate-500 flex items-center gap-2"><PlusOutlined /> 快速录入新账户</div>
                                        <Form layout="inline" onFinish={handleAddUser} className="gap-3">
                                            <Form.Item name="username" rules={[{ required: true }]}><Input placeholder="账号" style={{ width: 140 }} className="rounded-lg" /></Form.Item>
                                            <Form.Item name="password" rules={[{ required: true }]} initialValue="123456"><Input.Password placeholder="密码" style={{ width: 140 }} className="rounded-lg" /></Form.Item>
                                            <Form.Item name="realName" rules={[{ required: true }]}><Input placeholder="姓名" style={{ width: 120 }} className="rounded-lg" /></Form.Item>
                                            <Form.Item name="role" rules={[{ required: true }]} initialValue="partyA"><Select options={[{ label: '专家', value: 'team' }, { label: '甲方', value: 'partyA' }, { label: '监理', value: 'supervisor' }]} style={{ width: 110 }} className="rounded-lg" /></Form.Item>
                                            <Form.Item className="mr-0"><Button type="primary" icon={<CheckCircleOutlined />} htmlType="submit" className="rounded-lg bg-blue-600 shadow-md">创建</Button></Form.Item>
                                        </Form>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                title={pwdTargetUser?.id === user?.id ? "修改我的密码" : `重置 ${pwdTargetUser?.realName || pwdTargetUser?.username} 的密码`}
                open={isPwdModalOpen}
                onCancel={() => setIsPwdModalOpen(false)}
                footer={null}
                width={400}
                destroyOnClose
            >
                <Form form={pwdForm} layout="vertical" onFinish={handleChangePassword} className="mt-4">
                    <Form.Item name="newPassword" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码不能少于6位' }]}>
                        <Input.Password placeholder="请输入新的登录密码" />
                    </Form.Item>
                    <Form.Item className="mb-0 text-right">
                        <Space>
                            <Button onClick={() => setIsPwdModalOpen(false)}>取消</Button>
                            <Button type="primary" htmlType="submit">保存修改</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={<span><FolderOpenOutlined className="text-green-500 mr-2" />项目全部文档</span>}
                open={isAllDocsModalOpen}
                onCancel={() => setIsAllDocsModalOpen(false)}
                footer={null}
                width={760}
                destroyOnClose
            >
                <Input
                    prefix={<SearchOutlined />}
                    placeholder="搜索文件名..."
                    value={allDocsSearch}
                    onChange={e => setAllDocsSearch(e.target.value)}
                    allowClear
                    className="mb-4"
                />
                {(() => {
                    const allDocs = modules.flatMap(m => (m.docs || []).map(d => ({ ...d, moduleName: m.name, moduleId: m.id })));
                    const filtered = allDocsSearch ? allDocs.filter(d => d.name.toLowerCase().includes(allDocsSearch.toLowerCase())) : allDocs;
                    if (filtered.length === 0) return <Empty description="暂无文档" />;
                    // 动态分组：先收集文档中实际出现的所有类型
                    const grouped: Record<string, typeof filtered> = {};
                    filtered.forEach(d => {
                        const t = d.type || '其他';
                        if (!grouped[t]) grouped[t] = [];
                        grouped[t].push(d);
                    });
                    // 按预设类型顺序排列，自定义类型跟在后面
                    const orderedGroups = [
                        ...DOC_TYPES.filter(t => grouped[t]),
                        ...Object.keys(grouped).filter(t => !DOC_TYPES.includes(t) && t !== '其他'),
                        ...(grouped['其他'] ? ['其他'] : []),
                    ];
                    return (
                        <div className="space-y-4 max-h-[520px] overflow-auto custom-scroll pr-1">
                            {orderedGroups.map(type => {
                                const docs = grouped[type]; return docs && docs.length > 0 ? (
                                    <div key={type}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Tag color="blue" className="font-bold">{type}</Tag>
                                            <span className="text-slate-400 text-xs">{docs.length} 份</span>
                                        </div>
                                        <List
                                            size="small"
                                            dataSource={docs}
                                            renderItem={(doc) => (
                                                <List.Item
                                                    extra={
                                                        <Space>
                                                            <Tooltip title={`所属模块: ${doc.moduleName}`}><Tag className="text-[10px] border-slate-200 text-slate-400 cursor-default">{doc.moduleName}</Tag></Tooltip>
                                                            <Button type="text" size="small" icon={<DownloadOutlined className="text-blue-500" />} onClick={() => { const a = document.createElement('a'); a.href = doc.url; a.download = doc.name; a.click(); }} />
                                                        </Space>
                                                    }
                                                >
                                                    <List.Item.Meta
                                                        avatar={<FileTextOutlined className="text-green-500 text-lg mt-1" />}
                                                        title={<span className="text-xs font-bold text-slate-700">{doc.name}</span>}
                                                        description={<span className="text-[10px] text-slate-400">📅 {doc.date} · {doc.size}</span>}
                                                    />
                                                </List.Item>
                                            )}
                                        />
                                    </div>
                                ) : null;
                            })}
                        </div>
                    );
                })()}
            </Modal>

            <Modal title="项目周报管理" open={isWeeklyReportModalOpen} onCancel={() => setIsWeeklyReportModalOpen(false)} footer={null} width={700}>
                {userRole === 'team' && (
                    <div className="bg-slate-50 p-4 rounded-xl mb-6">
                        <Form form={weeklyForm} layout="inline" onFinish={handleUploadWeeklyReport}>
                            <Form.Item name="weekNum" label="周次" rules={[{ required: true, message: '请输入周次' }]}><InputNumber placeholder="如: 12" min={1} /></Form.Item>
                            <Form.Item name="file" label="文件" rules={[{ required: true, message: '请选择文件' }]}><Upload beforeUpload={() => false} maxCount={1}><Button icon={<UploadOutlined />}>选择周报</Button></Upload></Form.Item>
                            <Form.Item><Button type="primary" htmlType="submit">上传归档</Button></Form.Item>
                        </Form>
                    </div>
                )}
                <List dataSource={weeklyReports} className="max-h-[400px] overflow-auto custom-scroll" renderItem={item => (<List.Item extra={<Button type="link" icon={<DownloadOutlined />} onClick={() => handleDownloadReport(item)}>下载</Button>}><List.Item.Meta avatar={<Avatar icon={<AuditOutlined />} className="bg-indigo-100 text-indigo-600" />} title={<span className="font-bold">{item.name}</span>} description={<span className="text-xs text-slate-400">上传时间：{item.uploadTime}</span>} /></List.Item>)} />
            </Modal>

            <Modal title="批量导出" open={isExportModalOpen} onCancel={() => setIsExportModalOpen(false)} onOk={handleBatchExport} width={600} cancelText="取消"><div className="flex justify-between items-center mb-4"><span className="text-xs">已选 {selectedExportIds.length} 项</span><Checkbox checked={selectedExportIds.length === modules.length} onChange={(e) => setSelectedExportIds(e.target.checked ? modules.map(m => m.id) : [])}>全选</Checkbox></div><div className="max-h-96 overflow-y-auto"><Checkbox.Group className="w-full" value={selectedExportIds} onChange={setSelectedExportIds}><Row gutter={[8, 8]}>{modules.map(m => <Col span={12} key={m.id}><div className="p-2 border rounded"><Checkbox value={m.id} className="text-xs">{m.name}</Checkbox></div></Col>)}</Row></Checkbox.Group></div></Modal>
            <Modal title="导入" open={isImportModalOpen} onCancel={() => setIsImportModalOpen(false)} onOk={handleImportConfirm} loading={importLoading} okText="确认导入" cancelText="取消"><Space direction="vertical" className="w-full py-4"><Button type="link" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>下载标准导入模版</Button><Upload.Dragger multiple={false} accept=".xlsx,.xls" fileList={importFileList} beforeUpload={(f) => { setImportFileList([f]); return false; }} onRemove={() => setImportFileList([])}><p className="ant-upload-text">点击或将文件拖拽到此处上传</p><p className="ant-upload-hint">支持 .xlsx, .xls 格式</p></Upload.Dragger></Space></Modal>
            <Modal title="归档模块文档" open={isDocModalOpen} onOk={() => docForm.submit()} onCancel={() => setIsDocModalOpen(false)} okText="确认归档" cancelText="取消"><Form form={docForm} layout="vertical" onFinish={handleFinishDoc}><Form.Item label="选择本地文件" required><Upload fileList={docFileList} beforeUpload={f => { setDocFileList([f]); return false }} onRemove={() => setDocFileList([])} accept={ALLOWED_EXTS.join(',')}><Button icon={<UploadOutlined />}>选择文件</Button></Upload><div className="text-[10px] text-slate-400 mt-1">单文件建议不超过 700KB</div></Form.Item><Form.Item name="type" label="文档类型" rules={[{ required: true }]} initialValue="需求文档"><Select mode="tags" maxCount={1} options={DOC_TYPES.map(t => ({ label: t, value: t }))} placeholder="选择或输入新类型" /></Form.Item></Form></Modal>

            <Modal
                title={
                    <div className="flex items-center justify-between w-[95%]">
                        <div className="flex items-center gap-4">
                            <span className="text-lg font-bold">{current?.name} - 功能架构组成</span>
                            {(() => {
                                if (!current?.functionalStructure) return null;
                                let leafCount = 0;
                                const types: Record<string, number> = {};
                                const traverse = (nodes: any[]) => {
                                    nodes.forEach(n => {
                                        if (!n.children?.length) {
                                            leafCount++;
                                            const t = n.strategyType || 'development';
                                            types[t] = (types[t] || 0) + 1;
                                        } else traverse(n.children);
                                    });
                                };
                                traverse(current.functionalStructure);
                                return (
                                    <Space size={4}>
                                        <Tag className="bg-slate-100 border-none m-0 text-slate-500 font-bold">末端模块: {leafCount}</Tag>
                                        {STRATEGY_OPTIONS.map((opt: any) => {
                                            const count = types[opt.value] || 0;
                                            if (count === 0) return null;
                                            return <Tag key={opt.value} color={opt.color} className="m-0 text-[10px] bg-white">{opt.label} {count}</Tag>;
                                        })}
                                    </Space>
                                );
                            })()}
                        </div>
                    </div>
                }
                open={isCompositionModalOpen}
                onCancel={() => setIsCompositionModalOpen(false)}
                footer={null}
                width={850}
                styles={{ body: { padding: '24px', backgroundColor: '#f8fafc' } }}
            >
                <div className="mb-4 flex gap-2">
                    <Button size="small" icon={<MenuUnfoldOutlined />} onClick={() => {
                        const keys: string[] = [];
                        const getAllKeys = (nodes: any[]) => nodes.forEach(n => { if (n.children?.length) { keys.push(n.id); getAllKeys(n.children); } });
                        getAllKeys(current?.functionalStructure || []);
                        setCompExpandedKeys(keys);
                    }} className="text-xs">全部展开</Button>
                    <Button size="small" icon={<MenuFoldOutlined />} onClick={() => setCompExpandedKeys([])} className="text-xs">全部收起</Button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scroll">
                    {current?.functionalStructure ? (
                        <div className="space-y-4">
                            {current.functionalStructure.map((node: any, idx: number) => {
                                const renderNode = (n: any, depth = 0) => {
                                    const hasChild = n.children && n.children.length > 0;
                                    const isExp = compExpandedKeys.includes(n.id);
                                    const leafInThis = (() => {
                                        let count = 0;
                                        const t = (nodes: any[]) => nodes.forEach(nn => { if (!nn.children?.length) count++; else t(nn.children); });
                                        if (hasChild) t(n.children);
                                        return count;
                                    })();

                                    return (
                                        <div key={n.id || idx + '-' + depth} className="mb-2">
                                            <div
                                                className={`p-3 rounded-xl border bg-white flex justify-between items-center shadow-sm cursor-pointer transition-all hover:border-blue-200`}
                                                style={{ marginLeft: depth * 20 }}
                                                onClick={() => {
                                                    if (hasChild) setCompExpandedKeys(prev => prev.includes(n.id) ? prev.filter(k => k !== n.id) : [...prev, n.id]);
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {hasChild && (isExp ? <Icons.CaretDownOutlined className="text-slate-300" /> : <Icons.CaretRightOutlined className="text-slate-300" />)}
                                                    <span className="text-slate-400 font-mono text-[10px]">{'L' + (depth + 3)}</span>
                                                    <span className="font-bold text-slate-700">{n.text}</span>
                                                    {hasChild && depth === 0 && <Tag className="m-0 text-[10px] bg-slate-50 border-none text-slate-400">含 {leafInThis} 个功能点</Tag>}
                                                </div>
                                                <Tag className="m-0 text-[10px] min-w-[65px] text-center px-0 border-none shadow-sm" color={STRATEGY_OPTIONS.find((o: any) => o.value === (n.strategyType || 'development'))?.color}>
                                                    {STRATEGY_OPTIONS.find((o: any) => o.value === (n.strategyType || 'development'))?.label || '定制开发'}
                                                </Tag>
                                            </div>
                                            {hasChild && isExp && (
                                                <div className="mt-2 border-l-2 border-slate-100 ml-4 pl-1">
                                                    {n.children.map((child: any) => renderNode(child, depth + 1))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                };
                                return renderNode(node);
                            })}
                        </div>
                    ) : <Empty />}
                </div>
            </Modal>
            <Modal title={selectedId ? "编辑" : "新增"} open={isEditModalOpen} onOk={() => form.submit()} onCancel={() => setIsEditModalOpen(false)} width={650} destroyOnClose okText="确认保存" cancelText="取消"><Form form={form} layout="vertical" onFinish={saveModule}><Row gutter={16}><Col span={12}><Form.Item name="subsystem" label="所属子系统" rules={[{ required: true }]}><Select mode="tags" options={[...new Set(modules.map(m => m.subsystem))].map(s => ({ label: s, value: s }))} /></Form.Item></Col><Col span={12}><Form.Item name="name" label="模块名称" rules={[{ required: true }]}><Input /></Form.Item></Col></Row><Form.Item name="strategyType" label="响应策略" rules={[{ required: true }]}><Select options={STRATEGY_OPTIONS} /></Form.Item>{strategyTypeWatcher === 'customization' && <Form.Item name="modifiedModules" label="涉及改造模块"><Input /></Form.Item>}<Form.Item name="link" label="访问链接"><Input /></Form.Item><Row gutter={16}><Col span={12}><Form.Item name="progress" label="进度" initialValue={0}><InputNumber min={0} max={100} className="w-full" /></Form.Item></Col><Col span={12}><Form.Item name="deadline" label="截止日期" rules={[{ required: true }]}><DatePicker className="w-full" /></Form.Item></Col></Row><Form.Item name="tender" label="标书原文"><Input.TextArea rows={2} /></Form.Item><Form.Item name="strategy" label="具体实施策略"><Input.TextArea rows={2} /></Form.Item></Form></Modal>
            <SystemGuide open={isGuideModalOpen} onClose={() => setIsGuideModalOpen(false)} />
        </ConfigProvider >
    );
};

export default App;
