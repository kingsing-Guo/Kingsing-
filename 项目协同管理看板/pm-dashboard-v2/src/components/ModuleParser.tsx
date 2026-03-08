import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { message, Tag } from 'antd';
import * as XLSX from 'xlsx';

const API_BASE = 'http://localhost:3000/api';
import {
    Plus, Trash2, Edit3, FileText, ChevronDown, CheckCircle2,
    Code2, Layout, RefreshCcw, Layers, Upload, Download,
    Maximize2, Minimize2, PieChart, TrendingUp, Share2, FileType, AlertCircle, Search
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';
import { Button } from 'antd';

// 设置 PDF.js Worker 为项目本地路径或者 CDN 路径，避免本地 worker 被 Vite 错误拦截导致假死
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// --- 样式配置：解决 Tailwind 动态类名无法识别的问题 ---
const THEMES = {
    project: 'border-indigo-300 bg-indigo-50 text-indigo-900 shadow-md ring-2 ring-indigo-100',
    demo: 'border-amber-200 bg-amber-50 text-amber-950 shadow-sm',
    custom: 'border-rose-200 bg-rose-50 text-rose-950 shadow-sm',
    existing: 'border-slate-100 bg-white text-slate-700 hover:border-slate-300 shadow-sm',
    badge: {
        demo: 'bg-amber-100 text-amber-700 border-amber-200',
        custom: 'bg-rose-100 text-rose-700 border-rose-200',
        existing: 'bg-emerald-50 text-emerald-700 border-emerald-100'
    },
    progress: {
        demo: 'bg-orange-500',
        development: 'bg-blue-500',
        customization: 'bg-purple-500',
        text_description: 'bg-emerald-500'
    }
};

// --- 工具函数 ---
const cleanName = (name: string) => {
    if (!name) return '';

    // 康熙部首 (Radicals) 到标准汉字 (Ideographs) 的映射表
    // 解决 PDF 解析时由于字体原因导致的编码错位问题
    const RADICAL_MAP: any = {
        '\u2F65': '用', '\u2F26': '子', '\u2F6B': '目', '\u2F08': '人',
        '\u2F00': '一', '\u2F11': '入', '\u2F31': '口', '\u2F33': '土',
        '\u2F3C': '大', '\u2F3D': '女', '\u2F40': '子', '\u2F4D': '山',
        '\u2F5A': '心', '\u2F61': '手', '\u2F6D': '日', '\u2F6F': '月',
        '\u2F70': '木', '\u2F78': '水', '\u2F79': '火', '\u2F66': '文',
        '\u2F69': '方', '\u2F8F': '至', '\u2FA5': '言', '\u2FAD': '足'
    };

    return name
        .normalize('NFKC') // 第一步：标准 NFKC 归一化
        .replace(/[\u2F00-\u2FDF]/g, m => RADICAL_MAP[m] || m) // 第二步：修复康熙部首
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // 第三步：剔除不可见字符
        .replace(/[\(\（][^\)\）]*[\)\）]/g, '') // 剔除状态后缀
        .replace(/(子系统|系统|支撑系统|平台|网站|改版|移动端)$/gi, '') // 剔除常见名词后缀
        .replace(/\s+/g, '') // 第四步：剔除所有空格（包括汉字间的细微空格）
        .trim();
};

// --- 子组件：树节点 ---
const TreeNode = ({ node, depth = 0, defaultExpanded, expandAllKey, onToggleStatus, onEdit, onDelete, onAdd, onReorder, isTeam, strategyOptions = [], searchKeyword = '' }: any) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const hasChildren = node.children && node.children.length > 0;
    const isProjectNode = !!node.isProject;
    const subCount = (node.children || []).length;

    // 响应全局展开/收起
    useEffect(() => { setIsExpanded(defaultExpanded); }, [expandAllKey, defaultExpanded]);

    // 搜索时自动展开匹配路径
    useEffect(() => { if (searchKeyword.trim()) setIsExpanded(true); }, [searchKeyword]);

    const [isDragOver, setIsDragOver] = useState(false);

    const getStyleClass = () => {
        if (isProjectNode) return THEMES.project;
        const type = node.strategyType || (node.status === 'existing' ? 'customization' : (node.method === 'demo' ? 'demo' : 'development'));
        if (type === 'demo') return THEMES.demo;
        if (type === 'development') return THEMES.custom;
        return THEMES.existing;
    };

    return (
        <div className="flex flex-col">
            <div
                className={`group flex items-center p-3.5 my-1 rounded-2xl border transition-all duration-300 ${getStyleClass()} ${isDragOver ? 'border-dashed border-indigo-500 bg-indigo-50/50 scale-[1.02]' : ''}`}
                style={{ marginLeft: `${depth * 28}px` }}
                draggable={isTeam && !isProjectNode}
                onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData('nodeId', node.id); }}
                onDragOver={(e) => { if (isTeam && !isProjectNode) { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); } }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                    if (isTeam && !isProjectNode) {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragOver(false);
                        const draggedId = e.dataTransfer.getData('nodeId');
                        if (draggedId && draggedId !== node.id) onReorder(draggedId, node.id);
                    }
                }}
            >
                <button onClick={() => setIsExpanded(!isExpanded)} className={`mr-2.5 p-1 rounded-lg hover:bg-black/5 text-slate-400 transition-transform ${!hasChildren && 'invisible'} ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                    <ChevronDown size={16} />
                </button>
                <div className="flex-1 flex items-center justify-between gap-6 min-w-0">
                    <div className="flex items-center gap-4 min-w-0">
                        <span
                            className={`text-[15px] font-bold truncate cursor-pointer hover:underline underline-offset-4 decoration-2 ${isProjectNode ? 'text-indigo-700 italic underline decoration-indigo-400' : (node.status === 'new' ? 'text-rose-700' : 'text-slate-800')}`}
                            onClick={() => !isProjectNode && isTeam && onToggleStatus(node.id)}
                        >
                            {!searchKeyword.trim() ? node.text : (
                                node.text.split(new RegExp(`(${searchKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')).map((part: string, i: number) =>
                                    part.toLowerCase() === searchKeyword.toLowerCase()
                                        ? <span key={i} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">{part}</span>
                                        : part
                                )
                            )}
                        </span>
                        {!isProjectNode && (
                            <div className="flex shrink-0 gap-2">
                                {(() => {
                                    const type = node.strategyType || (node.status === 'existing' ? 'customization' : (node.method === 'demo' ? 'demo' : 'development'));
                                    const opt = (strategyOptions as any).find((o: any) => o.value === type);
                                    if (!opt) return <Tag className="m-0 rounded-full text-[10px] font-bold px-3 py-0">未定义</Tag>;
                                    return <Tag color={opt.color} className="border-none m-0 rounded-full text-[10px] font-bold px-3 py-0">{opt.label}</Tag>;
                                })()}
                            </div>
                        )}
                        {isProjectNode && <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-indigo-600 text-white font-black uppercase tracking-widest">项目根节点</span>}
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                        {subCount > 0 && <div className="flex items-center gap-1 text-[11px] font-bold bg-slate-100 px-2 py-0.5 rounded-lg text-slate-500 border border-slate-200"><Layers size={12} /> {isProjectNode ? '子系统' : '下级'}: {subCount}</div>}
                        {isTeam && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-all">
                                {depth >= 2 && (
                                    <button onClick={() => onAdd(node.id)} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:text-emerald-600 shadow-sm" title="添加下级模块"><Plus size={14} /></button>
                                )}
                                {(depth >= 3) && (
                                    <button onClick={() => onEdit(node)} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:text-indigo-600 shadow-sm" title="编辑"><Edit3 size={14} /></button>
                                )}
                                {depth >= 3 && <button onClick={() => onDelete(node.id)} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:text-rose-600 shadow-sm" title="删除"><Trash2 size={14} /></button>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {isExpanded && hasChildren && (
                <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-[1.5px] bg-slate-100" style={{ marginLeft: `${depth * 28 + 14}px` }}></div>
                    {node.children.map((child: any) => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            defaultExpanded={defaultExpanded}
                            expandAllKey={expandAllKey}
                            onToggleStatus={onToggleStatus}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onAdd={onAdd}
                            onReorder={onReorder}
                            isTeam={isTeam}
                            strategyOptions={strategyOptions}
                            searchKeyword={searchKeyword}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// --- 主组件 ---
const ModuleParser = ({ onBack, onSync, modules = [], userRole = 'team', strategyOptions = [] }: any) => {
    const isTeam = userRole === 'team';
    const [treeData, setTreeData] = useState<any[]>([]);
    const [fileName, setFileName] = useState('');
    const [viewMode, setViewMode] = useState('import');
    const [editingNode, setEditingNode] = useState<any>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [expandAllKey, setExpandAllKey] = useState(0);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [defaultExpanded, setDefaultExpanded] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const fileInputRef = useRef<any>(null);

    // 初始化获取持久化数据
    useEffect(() => {
        fetch(`${API_BASE}/parsed-tree`)
            .then(res => res.json())
            .then(res => {
                if (res.ok && res.data) {
                    setTreeData(res.data);
                    setViewMode('tree');
                }
            })
            .catch(() => console.error('获取历史架构失败'));
    }, []);

    // 数据持久化同步
    const persistTree = useCallback(async (data: any[]) => {
        try {
            await fetch(`${API_BASE}/parsed-tree`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tree: data })
            });
        } catch (e) {
            console.error('备份架构失败', e);
        }
    }, []);

    // 过滤树数据
    const filteredTreeData = useMemo(() => {
        if (!searchKeyword.trim()) return treeData;
        const kw = searchKeyword.toLowerCase();
        const filter = (nodes: any[]): any[] => {
            return nodes.reduce((acc: any[], node) => {
                const isMatch = node.text.toLowerCase().includes(kw);
                const filteredChildren = node.children ? filter(node.children) : [];
                if (isMatch || filteredChildren.length > 0) {
                    acc.push({ ...node, children: filteredChildren });
                }
                return acc;
            }, []);
        };
        return filter(treeData);
    }, [treeData, searchKeyword]);



    // 统计逻辑
    const statistics = useMemo(() => {
        const stats: any = { leafTotal: 0, subsystems: 0, levels: {}, leafLevels: {}, types: {} };
        if (treeData.length === 0) return stats;
        const collectStats = (nodes: any[], depth: number) => {
            nodes.forEach(node => {
                const dKey = depth.toString();
                stats.levels[dKey] = (stats.levels[dKey] || 0) + 1;
                if (depth === 0) stats.subsystems++;

                const isLeaf = !node.children || node.children.length === 0;
                if (isLeaf) {
                    stats.leafTotal++;
                    stats.leafLevels[dKey] = (stats.leafLevels[dKey] || 0) + 1;

                    const type = node.strategyType || (node.status === 'existing' ? 'customization' : (node.method === 'demo' ? 'demo' : 'development'));
                    stats.types[type] = (stats.types[type] || 0) + 1;
                }

                if (node.children?.length > 0) collectStats(node.children, depth + 1);
            });
        };
        treeData.forEach(root => root.children?.length > 0 && collectStats(root.children, 0));
        return stats;
    }, [treeData]);

    // PDF 解析
    const parsePDF = async (file: any) => {
        setIsParsing(true);
        setErrorMsg(null);
        setFileName(file.name);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullLines: any[] = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent: any = await page.getTextContent();
                const items = textContent.items.map((item: any) => ({ str: item.str, x: item.transform[4], y: item.transform[5] }));
                let lines: any[] = [];
                items.forEach((item: any) => {
                    let line = lines.find(l => Math.abs(l.y - item.y) < 5);
                    if (line) line.parts.push(item);
                    else lines.push({ y: item.y, parts: [item] });
                });
                lines.forEach(line => {
                    line.parts.sort((a: any, b: any) => a.x - b.x);
                    const text = line.parts.map((p: any) => p.str).join('').trim();
                    if (text) fullLines.push({ text, indent: line.parts[0].x });
                });
            }
            if (!fullLines.length) throw new Error("无法提取文字层");

            const projectNode: any = { id: `root-${Date.now()}`, text: fullLines[0].text, strategyType: 'customization', indent: -999, children: [], isProject: true };
            const stack = [projectNode];
            fullLines.slice(1).forEach(line => {
                const dR = /[\(\（]demo[\)\）]/i;
                const pR = /[\(\（]待开发[\)\）]/i;
                let strategyType = 'customization';
                if (pR.test(line.text)) { strategyType = 'development'; }
                else if (dR.test(line.text)) { strategyType = 'demo'; }
                const node: any = { id: Math.random().toString(36).substr(2, 9), text: line.text.replace(dR, '').replace(pR, '').trim(), strategyType, indent: line.indent, children: [] };
                // 优化缩进判定：降低阈值至 8，提高对深层解析的敏感度
                while (stack.length > 1 && stack[stack.length - 1].indent >= line.indent - 8) stack.pop();
                stack[stack.length - 1].children.push(node);
                stack.push(node);
            });
            setTreeData([projectNode]);
            persistTree([projectNode]);
            setViewMode('tree');
        } catch (e: any) { setErrorMsg(e.message); } finally { setIsParsing(false); }
    };

    // 数据更新
    const updateNode = useCallback((id: string, updates: any) => {
        setTreeData(prev => {
            const mapper = (list: any[]): any[] => list.map(item => {
                if (item.id === id) return { ...item, ...updates };
                if (item.children) return { ...item, children: mapper(item.children) };
                return item;
            });
            const newData = mapper(prev);
            persistTree(newData);
            return newData;
        });
    }, [persistTree]);

    const deleteNode = useCallback((id: string) => {
        setTreeData(prev => {
            const deleter = (list: any[]): any[] => list.filter(item => item.id !== id).map(item => item.children ? { ...item, children: deleter(item.children) } : item);
            const newData = deleter(prev);
            persistTree(newData);
            return newData;
        });
    }, [persistTree]);

    const addNode = useCallback((parentId: string) => {
        setTreeData(prev => {
            const newNode = {
                id: Math.random().toString(36).substr(2, 9),
                text: '新功能模块',
                strategyType: 'customization',
                indent: 0,
                children: []
            };
            const adder = (list: any[]): any[] => list.map(item => {
                if (item.id === parentId) return { ...item, children: [...(item.children || []), newNode] };
                if (item.children) return { ...item, children: adder(item.children) };
                return item;
            });
            const newData = adder(prev);
            persistTree(newData);
            return newData;
        });
        message.success('已添加新模块，请点击编辑图标修改名称。');
    }, [persistTree]);

    const reorderNodes = useCallback((draggedId: string, targetId: string) => {
        setTreeData(prev => {
            let parentList: any[] | null = null;
            let dIdx = -1;
            let tIdx = -1;

            const findAndReorder = (list: any[]): any[] => {
                const newList = [...list];
                const d = newList.findIndex(item => item.id === draggedId);
                const t = newList.findIndex(item => item.id === targetId);

                if (d !== -1 && t !== -1) {
                    const [removed] = newList.splice(d, 1);
                    newList.splice(t, 0, removed);
                    return newList;
                }

                return newList.map(item => ({
                    ...item,
                    children: item.children ? findAndReorder(item.children) : []
                }));
            };

            const newData = findAndReorder(prev);
            persistTree(newData);
            return newData;
        });
    }, [persistTree]);

    const toggleStatus = useCallback((id: string) => {
        setTreeData(prev => {
            const toggler = (list: any[]): any[] => list.map(item => {
                if (item.id === id && !item.isProject) {
                    const currentType = item.strategyType || (item.status === 'existing' ? 'customization' : (item.method === 'demo' ? 'demo' : 'development'));
                    const currentIndex = strategyOptions.findIndex((o: any) => o.value === currentType);
                    const nextIndex = (currentIndex + 1) % strategyOptions.length;
                    return { ...item, strategyType: strategyOptions[nextIndex].value };
                }
                if (item.children) return { ...item, children: toggler(item.children) };
                return item;
            });
            const newData = toggler(prev);
            persistTree(newData);
            return newData;
        });
    }, [persistTree]);

    const handleSync = async () => {
        if (!treeData.length) return;
        const projectRoot = treeData[0];
        const subsystems = projectRoot.children || [];
        const internalClean = (n: string) => cleanName(n).toLowerCase();

        // 1. 结构比对：仅针对看板中已存在的一级模块（L2）进行功能架构推送
        const updates: any[] = [];
        let matchedCount = 0;

        // 递归处理功能架构，确保 strategyType 始终存在（解决响应类型意外跳变问题）
        const sanitizeStructure = (nodes: any[]): any[] => {
            return nodes.map(node => {
                const type = node.strategyType || (node.status === 'existing' ? 'customization' : (node.method === 'demo' ? 'demo' : 'development'));
                return {
                    id: node.id,
                    text: node.text,
                    strategyType: type,
                    children: node.children ? sanitizeStructure(node.children) : []
                };
            });
        };

        subsystems.forEach(ssNode => {
            const ssName = ssNode.text;
            const ssOriginalModules = ssNode.children || [];

            ssOriginalModules.forEach(mNode => {
                const ssClean = internalClean(ssName);
                const mClean = internalClean(mNode.text);

                // 查找看板中对应的存量模块
                const target = modules.find(m => {
                    const bssClean = internalClean(m.subsystem);
                    const bmClean = internalClean(m.name);
                    // 精确匹配：子系统名包含或被包含，且模块名一致
                    return (bmClean === mClean) && (bssClean.includes(ssClean) || ssClean.includes(bssClean));
                });

                if (target) {
                    updates.push({
                        id: target.id,
                        // 深度同步：确保所有子节点（L3, L4...）都包含在内，且清理了多余状态
                        functionalStructure: sanitizeStructure(mNode.children || [])
                    });
                    matchedCount++;
                }
            });
        });

        if (updates.length === 0) {
            message.warning('看板中未找到匹配的一级模块，请先在看板中创建对应模块。');
            return;
        }

        const syncMessageKey = 'sync-module-progress';
        message.loading({ content: `正在同步 L3 及以下功能结构 (共 ${matchedCount} 个模块)...`, key: syncMessageKey, duration: 0 });

        try {
            // 仅 PATCH 更新 functionalStructure，不改变 name、subsystem 及 displayOrder (排序)
            await Promise.all(updates.map(u =>
                fetch(`${API_BASE}/modules/${u.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        functionalStructure: u.functionalStructure
                    })
                })
            ));

            message.success({ content: `架构同步完成！已成功补齐 ${matchedCount} 个一级模块的最新内部功能。`, key: syncMessageKey, duration: 3 });
            if (onSync) onSync();
        } catch (e) {
            console.error('[Sync Error]', e);
            message.error({ content: '同步失败，请检查网络连接', key: syncMessageKey, duration: 3 });
        }
    };
    const handleExportExcel = () => {
        if (!treeData.length) return;
        const rows: any[] = [];
        const flatten = (nodes: any[], depth: number, parentNames: string[]) => {
            nodes.forEach(node => {
                const currentOriginal = node.text;
                const currentCleaned = cleanName(currentOriginal);
                const levelPrefix = depth === 0 ? 'L1 子系统' : (depth === 1 ? 'L2 一级模块' : (depth === 2 ? 'L3 二级模块' : `L${depth + 1} 模块`));

                rows.push({
                    '层级': levelPrefix,
                    '清理后名称 (用于匹配)': currentCleaned,
                    '原始名称': currentOriginal,
                    '上级路径': parentNames.join(' > '),
                    '响应策略': node.isProject ? '-' : (() => {
                        const type = node.strategyType || (node.status === 'existing' ? 'customization' : (node.method === 'demo' ? 'demo' : 'development'));
                        return strategyOptions.find((o: any) => o.value === type)?.label || '未知';
                    })()
                });

                if (node.children?.length) {
                    flatten(node.children, depth + 1, [...parentNames, currentCleaned]);
                }
            });
        };

        if (treeData[0].children) {
            flatten(treeData[0].children, 0, []);
        }

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "架构明细对比");
        XLSX.writeFile(wb, `项目功能架构明细_${new Date().getTime()}.xlsx`);
        message.success('导出成功，请查看清理后的名称是否与看板一致。');
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            <div className="max-w-6xl mx-auto bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100">
                <header className="p-8 border-b border-slate-50 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors mr-2"
                                title="返回看板"
                            >
                                <ChevronDown size={24} className="rotate-90" />
                            </button>
                        )}
                        <div className="bg-indigo-600 p-3 rounded-2xl text-white"><FileType size={24} /></div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">项目功能模块架构组成管理</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Automated Architecture Analysis v4.2 {!isTeam && '(只读模式)'}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleExportExcel} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl transition-all shadow-sm"><Download size={16} />导出明细对比</button>
                        {isTeam && viewMode === 'tree' && (
                            <>
                                <button onClick={handleSync} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-all shadow-lg shadow-indigo-200"><RefreshCcw size={16} />同步到看板</button>
                                <button onClick={() => setViewMode('import')} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"><Plus size={16} />重新解析</button>
                            </>
                        )}
                    </div>
                </header>

                <main className="p-8">
                    {viewMode === 'import' ? (
                        <div className="max-w-2xl mx-auto py-20 text-center">
                            <div className="mb-12">
                                <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">{isTeam ? '上传幕布 PDF 文件' : '功能架构未初始化'}</h2>
                                <p className="text-slate-500 text-lg">{isTeam ? '系统将分析 PDF 文字层，自动构建子系统及功能树。' : '请切换到项目组专家账号上传项目功能架构 PDF。'}</p>
                            </div>
                            <div onClick={() => isTeam && !isParsing && fileInputRef.current?.click()} className={`border-3 border-dashed rounded-[40px] p-24 flex flex-col items-center justify-center transition-all ${isTeam ? 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer' : 'border-slate-100 bg-slate-50/50 cursor-not-allowed text-slate-300'}`}>
                                <input type="file" ref={fileInputRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) parsePDF(file); }} accept=".pdf" className="hidden" />
                                {isParsing ? <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mb-6"></div> : <Upload size={64} className="mb-6 opacity-40" />}
                                <p className="text-xl font-bold text-slate-800">{isTeam ? (fileName || "点击选择 PDF") : "暂无架构数据"}</p>
                                {errorMsg && <p className="text-rose-500 mt-4 font-bold flex items-center gap-2"><AlertCircle size={18} />{errorMsg}</p>}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><TrendingUp size={14} /> 层级统计</h3>
                                    <div className="space-y-3">
                                        {Object.entries(statistics.levels).map(([lvl, count]: any) => {
                                            const levelNames = ['子系统', '一级功能模块', '二级功能模块', '三级功能模块'];
                                            const name = levelNames[parseInt(lvl)] || `L${parseInt(lvl) + 1} 级`;
                                            return (
                                                <div key={lvl} className="flex justify-between items-center text-sm font-bold">
                                                    <span className="text-slate-500">{name}总数</span>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-slate-900">{count as number}</span>
                                                        <span className="text-[10px] text-slate-400 font-normal">其中末端: {statistics.leafLevels[lvl] || 0}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><PieChart size={14} /> 策略分布</h3>
                                    <div className="space-y-4">
                                        {strategyOptions.map((opt: any) => {
                                            const count = statistics.types[opt.value] || 0;
                                            if (count === 0) return null;
                                            const pct = statistics.leafTotal ? (count / statistics.leafTotal * 100).toFixed(1) : 0;
                                            return (
                                                <div key={opt.value}>
                                                    <div className="flex justify-between text-[11px] font-bold mb-1.5"><span className="text-slate-500 uppercase">{opt.label}</span><span>{count} ({pct}%)</span></div>
                                                    <div className="h-2 bg-white rounded-full overflow-hidden border border-slate-100">
                                                        <div className={`h-full transition-all duration-1000`} style={{ width: `${pct}%`, backgroundColor: opt.color || '#3b82f6' }}></div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden">
                                <div className="p-6 bg-slate-50/50 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-6 flex-1 w-full">
                                        <h2 className="font-black text-slate-800 flex items-center gap-2 whitespace-nowrap"><Layers size={18} className="text-indigo-600" /> 功能模块架构图</h2>
                                        <div className="relative flex-1 max-w-md hidden sm:block">
                                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="模糊搜索模块名称..."
                                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 focus:shadow-sm transition-all"
                                                value={searchKeyword}
                                                onChange={e => setSearchKeyword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 text-[12px]">
                                        <Button size="small" icon={<MenuUnfoldOutlined />} onClick={() => { setDefaultExpanded(true); setExpandAllKey(k => k + 1); }} className="text-xs">全部展开</Button>
                                        <Button size="small" icon={<MenuFoldOutlined />} onClick={() => { setDefaultExpanded(false); setExpandAllKey(k => k + 1); }} className="text-xs">全部收起</Button>
                                    </div>
                                </div>
                                <div className="p-8">
                                    {filteredTreeData.map(node => (
                                        <TreeNode key={node.id} node={node} defaultExpanded={defaultExpanded} expandAllKey={expandAllKey} onToggleStatus={toggleStatus} onEdit={setEditingNode} onDelete={deleteNode} onAdd={addNode} onReorder={reorderNodes} isTeam={isTeam} strategyOptions={strategyOptions} searchKeyword={searchKeyword} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {editingNode && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-black text-2xl text-slate-900">节点属性维护</h3>
                            <button onClick={() => setEditingNode(null)} className="text-slate-400 hover:text-slate-900 text-2xl">&times;</button>
                        </div>
                        <div className="p-10 space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">功能名称</label>
                                <input type="text" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-lg text-slate-800 focus:bg-white focus:border-indigo-400 transition-all shadow-inner" value={editingNode.text} onChange={e => { updateNode(editingNode.id, { text: e.target.value }); setEditingNode((prev: any) => ({ ...prev, text: e.target.value })); }} />
                            </div>
                            {!editingNode.isProject && (
                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">策略配置</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {strategyOptions.map((opt: any) => {
                                            const currentType = editingNode.strategyType || (editingNode.status === 'existing' ? 'customization' : (editingNode.method === 'demo' ? 'demo' : 'development'));
                                            const isSelected = currentType === opt.value;
                                            return (
                                                <button key={opt.value} onClick={() => { updateNode(editingNode.id, { strategyType: opt.value }); setEditingNode((prev: any) => ({ ...prev, strategyType: opt.value })); }} className={`p-4 text-left rounded-3xl border-2 transition-all flex items-center justify-between group ${isSelected ? `border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm` : 'border-slate-100 text-slate-500 bg-white hover:border-slate-200'}`}>
                                                    <span className="font-bold">{opt.label}</span>
                                                    <div className={`w-3 h-3 rounded-full transition-all`} style={{ backgroundColor: isSelected ? (opt.color || '#4f46e5') : '#e2e8f0' }} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-10 bg-slate-50 text-center">
                            <button onClick={() => setEditingNode(null)} className="px-12 py-5 bg-slate-900 text-white font-black text-lg rounded-[24px] shadow-2xl hover:bg-black transition-all">应用更改</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModuleParser;
