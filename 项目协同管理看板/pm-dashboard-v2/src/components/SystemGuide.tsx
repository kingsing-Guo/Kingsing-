import React from 'react';
import { Modal, Typography, Collapse, Divider } from 'antd';
import { QuestionCircleOutlined, BookOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface SystemGuideProps {
    open: boolean;
    onClose: () => void;
}

const SystemGuide: React.FC<SystemGuideProps> = ({ open, onClose }) => {
    return (
        <Modal
            title={<div className="flex items-center gap-2"><BookOutlined className="text-blue-600" /> 系统操作指南</div>}
            open={open}
            onCancel={onClose}
            footer={null}
            width={800}
            destroyOnClose
            className="guide-modal"
        >
            <div className="max-h-[60vh] overflow-y-auto pr-2 mt-4 custom-scrollbar">
                <Typography>
                    <Title level={4}><QuestionCircleOutlined className="mr-2 text-slate-500" />关键概念释义</Title>
                    <Paragraph>
                        <ul>
                            <li><Text strong>功能架构 / 模块 (Module):</Text> 项目的最基本交付单元。系统支持将庞大的项目按“子系统”分类，并在其下拆分具体的二级/三级模块。</li>
                            <li><Text strong>响应策略 (Strategy):</Text> 定义团队如何实现该模块的字典值。默认包含如“产品改造”、“定制开发”等。这决定了研发成本和难度的基调。</li>
                            <li><Text strong>干系人角色 (Role):</Text> 系统内置四大视角角色：<Text code>系统管理员(admin)</Text>可以控制一切;<Text code>项目组专家(team)</Text>负责推进项目并上报进度；<Text code>甲方负责人(partyA)</Text>通常用于查阅进度和进行意见反馈；<Text code>监理(supervisor)</Text>享有和甲方类似的查阅与反馈权限。</li>
                        </ul>
                    </Paragraph>

                    <Divider />

                    <Title level={4}><BookOutlined className="mr-2 text-slate-500" />核心使用操作步骤</Title>
                    <div className="bg-slate-50 rounded-lg p-5 mb-6 border border-slate-100">
                        <ol className="pl-5 m-0 text-slate-600 space-y-3">
                            <li><Text strong>第一步：</Text>先在看板页批量导入或手工创建项目的子系统和一级功能模块，并且维护每个一级模块合同要求、响应策略、计划完成时间等基础信息；</li>
                            <li><Text strong>第二步：</Text>在架构页面（“功能架构维护”）上传并导入PDF格式的项目完整功能模块架构，包括各级模块的响应策略；</li>
                            <li><Text strong>第三步：</Text>功能架构导入成功后，通过“一键同步至看板”功能，将新架构同步推送到看板页，完成看板页的完整功能架构补全；</li>
                            <li><Text strong>第四步：</Text>日常更新维护各级模块进度、进展记录、响应事项、以及上传和关联相关项目文档等。</li>
                        </ol>
                    </div>

                    <Divider />

                    <Title level={4}><SafetyCertificateOutlined className="mr-2 text-slate-500" />系统注意事项</Title>
                    <Paragraph className="text-slate-600 bg-orange-50 p-4 rounded-lg border border-orange-100">
                        <ul className="m-0 pl-4 space-y-2">
                            <li><Text strong>关于架构同步规则的说明：</Text>
                                <ul className="mt-1 mb-2 ml-4 list-disc text-slate-500 text-sm">
                                    <li>只有在看版中已经存在的一级模块（名称完全匹配），它的下级子节点才会被同步接入。如果看版未维护该节点，同步将会被跳过。</li>
                                    <li>系统会自动增量补充原本看版中没有的二/三级模块，如果同名已存在则仅更新最新信息，保护您原先已有的进展和纪要数据不被覆盖覆盖。</li>
                                </ul>
                            </li>
                            <li><Text strong type="danger">不可逆操作：</Text>如删除模块、清空看版数据、删除账号等具有破坏性，请务必在操作前确认无误。</li>
                            <li><Text strong>密码安全：</Text>初次获取系统账号登入后，建议尽快点击右上角“修改密码”重置为私人密码。若遗忘，联系 admin 进行管理后台重置。</li>
                        </ul>
                    </Paragraph>
                </Typography>
            </div>
        </Modal>
    );
};

export default SystemGuide;
