import React, { useState } from 'react';
import { Form, Input, Button, Radio } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Role, ProjectInfo } from '../types';

interface LoginProps {
    onLogin: (role: Role) => void;
    projectInfo: Partial<ProjectInfo>;
}

export const Login: React.FC<LoginProps> = ({ onLogin, projectInfo }) => {
    const [role, setRole] = useState<Role>('team');
    const [loading, setLoading] = useState(false);

    const handleSubmit = () => {
        setLoading(true);
        setTimeout(() => { setLoading(false); onLogin(role); }, 600);
    };

    return (
        <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center bg-[url('https://gw.alipayobjects.com/zos/rmsportal/TVirNRn97huYpToB.svg')] bg-no-repeat bg-center bg-cover">
            <div className="flex w-[1000px] h-[600px] bg-white rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.08)] fade-in">
                <div className="flex-1 bg-gradient-to-br from-blue-900 to-blue-500 p-16 flex flex-col justify-center text-white">
                    <div className="mb-12">
                        <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                            <SafetyOutlined className="text-white text-3xl" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">项目建设情况进展看板</h1>
                        <h2 className="text-xl text-white/80 font-medium italic uppercase tracking-wider">{projectInfo?.name || '项目尚未命名'}</h2>
                    </div>
                    <div className="space-y-6 text-blue-50">
                        <div className="flex items-center gap-4"><CheckCircleOutlined /><span>多方实时对齐 需求闭环追踪</span></div>
                        <div className="flex items-center gap-4"><CheckCircleOutlined /><span>研发动态透明 标书指标覆盖</span></div>
                    </div>
                    <div className="mt-auto pt-10 border-t border-white/10 text-white/50 text-xs">
                        © 2026 {projectInfo?.clientUnit || '项目管理单位'}
                    </div>
                </div>
                <div className="w-[450px] p-16 bg-white flex flex-col justify-center">
                    <div className="mb-10 text-center">
                        <h3 className="text-2xl font-bold text-slate-800 m-0">安全登录入口</h3>
                        <div className="w-12 h-1 bg-blue-600 mx-auto mt-3 rounded-full"></div>
                    </div>
                    <Form layout="vertical" onFinish={handleSubmit}>
                        <Form.Item label="登录身份" className="mb-6">
                            <Radio.Group value={role} onChange={e => setRole(e.target.value)} buttonStyle="solid" className="w-full flex">
                                <Radio.Button value="partyA" className="flex-1 text-center">甲方负责人</Radio.Button>
                                <Radio.Button value="team" className="flex-1 text-center">项目组专家</Radio.Button>
                            </Radio.Group>
                        </Form.Item>
                        <Form.Item name="username" initialValue="admin"><Input prefix={<UserOutlined />} placeholder="请输入账号" size="large" /></Form.Item>
                        <Form.Item name="password" initialValue="123456"><Input.Password prefix={<LockOutlined />} placeholder="请输入密码" size="large" /></Form.Item>
                        <Button type="primary" htmlType="submit" size="large" block loading={loading} className="h-12 bg-blue-600 font-bold">同步进入看板</Button>
                    </Form>
                </div>
            </div>
        </div>
    );
};
