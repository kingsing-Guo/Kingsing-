import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, message, Popconfirm, Upload, Progress, Card, Row, Col, Statistic, ConfigProvider } from 'antd';
import type { TableProps } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, UploadOutlined, FileExcelOutlined, DeleteFilled, PaperClipOutlined, DownloadOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { DocumentRecord, Attachment } from './types';
import { DOC_TYPES } from './types';
import { getRecords, addRecord, updateRecord, deleteRecord, deleteAllRecords, renumberRecords, generateId, saveRecords, updateAttachment, deleteAttachment } from './store';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import moment from 'moment';
import * as XLSX from 'xlsx';

dayjs.locale('zh-cn');

const { Option } = Select;
const { TextArea } = Input;

const DOC_TYPE_COLORS: Record<string, { color: string; bgColor: string; icon?: string }> = {
  '项目立项': { color: '#1890ff', bgColor: '#e6f7ff', icon: '📋' },
  '项目批复': { color: '#52c41a', bgColor: '#f6ffed', icon: '✅' },
  '项目招投标': { color: '#fa8c16', bgColor: '#fff7e6', icon: '📢' },
  '合同签订': { color: '#eb2f96', bgColor: '#fff0f6', icon: '📝' },
  '实施管理': { color: '#722ed1', bgColor: '#f9f0ff', icon: '⚙️' },
  '需求调研': { color: '#13c2c2', bgColor: '#e6fffb', icon: '🔍' },
  '系统设计': { color: '#2f54eb', bgColor: '#f0f5ff', icon: '🎨' },
  '操作手册': { color: '#faad14', bgColor: '#fffbe6', icon: '📖' },
  '内部测试': { color: '#f5222d', bgColor: '#fff1f0', icon: '🧪' },
  '执行管理': { color: '#108ee9', bgColor: '#e6f7ff', icon: '📊' },
  '培训文档': { color: '#8c52ff', bgColor: '#f4f1ff', icon: '🎓' },
  '项目初验': { color: '#00a854', bgColor: '#f6ffed', icon: '✨' },
};

const getDocTypeStyle = (docType: string) => {
  const style = DOC_TYPE_COLORS[docType] || { color: '#666', bgColor: '#f5f5f5', icon: '📄' };
  return {
    backgroundColor: style.bgColor,
    color: style.color,
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold' as const,
    display: 'inline-block',
    minWidth: '80px',
    textAlign: 'center' as const,
  };
};

interface ImportRow {
  docType?: string;
  docName?: string;
  docDescription?: string;
  planCompleteDate?: string | null;
  actualCompleteDate?: string | null;
  responsiblePerson?: string;
  remarks?: string;
}

const App: React.FC = () => {
  const [records, setRecords] = useState<DocumentRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<DocumentRecord[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DocumentRecord | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [insertAfterSelected, setInsertAfterSelected] = useState(false);
  const [searchDocType, setSearchDocType] = useState<string>('');
  const [searchDocName, setSearchDocName] = useState<string>('');
  const [searchResponsiblePerson, setSearchResponsiblePerson] = useState<string>('');
  const [searchPlanDateEnd, setSearchPlanDateEnd] = useState<string>('');
  const [searchActualDateEnd, setSearchActualDateEnd] = useState<string>('');
  const [filterType, setFilterType] = useState<'completed' | 'incomplete' | 'overdue' | null>(null);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, searchDocType, searchDocName, filterType, searchResponsiblePerson, searchPlanDateEnd, searchActualDateEnd]);

  const loadRecords = () => {
    const data = getRecords();
    setRecords(data);
  };

  const filterRecords = () => {
    let filtered = [...records];
    if (searchDocType) {
      filtered = filtered.filter(r => r.docType === searchDocType);
    }
    if (searchDocName) {
      filtered = filtered.filter(r => r.docName.toLowerCase().includes(searchDocName.toLowerCase()));
    }
    if (searchResponsiblePerson) {
      filtered = filtered.filter(r => r.responsiblePerson.toLowerCase().includes(searchResponsiblePerson.toLowerCase()));
    }
    if (searchPlanDateEnd) {
      filtered = filtered.filter(r => r.planCompleteDate && r.planCompleteDate <= searchPlanDateEnd);
    }
    if (searchActualDateEnd) {
      filtered = filtered.filter(r => r.actualCompleteDate && r.actualCompleteDate <= searchActualDateEnd);
    }
    if (filterType === 'completed') {
      filtered = filtered.filter(r => r.actualCompleteDate);
    } else if (filterType === 'incomplete') {
      filtered = filtered.filter(r => !r.actualCompleteDate);
    } else if (filterType === 'overdue') {
      filtered = filtered.filter(r => isOverdue(r.planCompleteDate, r.actualCompleteDate));
    }
    setFilteredRecords(filtered);
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    if (selectedRowKeys.length > 0) {
      setInsertAfterSelected(true);
    } else {
      setInsertAfterSelected(false);
    }
    setIsModalVisible(true);
  };

  const handleEdit = (record: DocumentRecord) => {
    setEditingRecord(record);

    // 确保日期字符串合法，如果不合法或者是 "Invalid date" 字符串，则设为 null
    const parseDate = (dateStr: string | null | undefined) => {
      if (!dateStr || dateStr.trim() === '' || dateStr === 'Invalid date') return null;
      const m = moment(dateStr);
      return m.isValid() ? m : null;
    };

    form.setFieldsValue({
      ...record,
      planCompleteDate: parseDate(record.planCompleteDate),
      actualCompleteDate: parseDate(record.actualCompleteDate),
    });
    setIsModalVisible(true);
  };

  const handleDelete = (id: string) => {
    const newRecords = deleteRecord(id);
    setRecords(newRecords);
    message.success('删除成功');
  };

  const handleDeleteAll = () => {
    deleteAllRecords();
    setRecords([]);
    setFilterType(null);
    message.success('全部删除成功');
  };

  const handleFilterClick = (type: 'completed' | 'incomplete' | 'overdue' | null) => {
    setFilterType(type);
  };

  const clearFilter = () => {
    setFilterType(null);
    setSearchDocType('');
    setSearchDocName('');
    setSearchResponsiblePerson('');
    setSearchPlanDateEnd('');
    setSearchActualDateEnd('');
  };

  const handleUpload = async (file: File, record: DocumentRecord) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`http://localhost:3001/api/upload?docType=${encodeURIComponent(record.docType || 'other')}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '上传失败');
      }

      const result = await response.json();
      const attachment = {
        name: result.data.name,
        size: result.data.size,
        uploadDate: result.data.uploadDate,
        path: result.data.path,
        url: result.data.url,
      };

      const newRecords = updateAttachment(record.id, attachment);
      setRecords(newRecords);
      message.success('上传成功');
    } catch (error: any) {
      console.error('Upload error:', error);
      message.error(error.message || '上传失败');
    }

    return false;
  };

  const handleDeleteAttachment = async (record: DocumentRecord, attachmentIndex: number) => {
    try {
      const attachment = record.attachments?.[attachmentIndex];
      if (attachment && attachment.path) {
        // 从路径中提取 docType 和 filename
        const pathParts = attachment.path.split('/');
        const docType = pathParts[1];
        const filename = pathParts[2];

        const response = await fetch(`http://localhost:3001/api/file/${docType}/${filename}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('删除失败');
        }
      }

      const newRecords = deleteAttachment(record.id, attachmentIndex);
      setRecords(newRecords);
      message.success('删除成功');
    } catch (error: any) {
      console.error('Delete error:', error);
      message.error(error.message || '删除失败');
    }
  };

  const handleDownload = async (_record: DocumentRecord, attachment: Attachment) => {
    if (attachment && attachment.url) {
      try {
        const response = await fetch(attachment.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        // 使用原始文件名下载
        link.download = attachment.name;
        link.click();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download error:', error);
        message.error('下载失败');
      }
    }
  };

  const decodeFileName = (fileName: string): string => {
    try {
      return decodeURIComponent(fileName);
    } catch {
      return fileName;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 辅助函数：确保格式化日期，如果无效则返回空字符串
      const formatDate = (m: any) => {
        if (!m || !m.isValid()) return '';
        return m.format('YYYY-MM-DD');
      };

      const recordData = {
        ...values,
        planCompleteDate: formatDate(values.planCompleteDate),
        actualCompleteDate: formatDate(values.actualCompleteDate),
      };

      if (editingRecord) {
        const newRecords = updateRecord(editingRecord.id, recordData);
        setRecords(newRecords);
        message.success('修改成功');
      } else {
        let newRecords;
        if (insertAfterSelected && selectedRowKeys.length > 0) {
          // 在选定行后插入
          const selectedId = selectedRowKeys[0];
          const selectedIndex = records.findIndex(r => r.id === selectedId);
          if (selectedIndex !== -1) {
            newRecords = [...records];
            const newRecord = {
              ...recordData,
              id: generateId(),
              docNo: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as DocumentRecord;
            newRecords.splice(selectedIndex + 1, 0, newRecord);
            newRecords = renumberRecords(newRecords);
            saveRecords(newRecords);
            setRecords(newRecords);
          } else {
            newRecords = addRecord(recordData as DocumentRecord);
            setRecords(newRecords);
          }
        } else {
          newRecords = addRecord(recordData as DocumentRecord);
          setRecords(newRecords);
        }
        message.success('添加成功');
      }
      setIsModalVisible(false);
      form.resetFields();
      setSelectedRowKeys([]);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, {
          type: 'binary',
          cellDates: true, // 启用日期解析，将 Excel 日期转换为 JS Date 对象
          raw: false,
        });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: false,
          defval: '',
        });

        console.log('解析的原始数据 (前 3 行):', jsonData.slice(0, 3));

        // 使用第一行作为表头
        const headers = (jsonData[0] as string[]).map(h => String(h || '').trim());
        console.log('Excel 表头:', headers);

        // 将数据转换为对象数组
        const rows = jsonData.slice(1).map(row => {
          const obj: Record<string, any> = {};
          headers.forEach((header, index) => {
            obj[header] = (row as any)[index] || '';
          });
          return obj;
        });

        console.log('转换后的数据 (前 3 行):', rows.slice(0, 3));

        // 更智能的列名匹配，支持多种命名方式
        const headerMap: Record<string, string> = {
          '文档类型': headers.find(h => h.includes('类型') || h.includes('文档类型')) || '',
          '文档名称': headers.find(h => h.includes('名称') || h.includes('文档名称')) || '',
          '文档说明': headers.find(h => h.includes('说明') || h.includes('文档说明')) || '',
          '计划完成时间': headers.find(h => h.includes('计划') || h.includes('完成时间') || h.includes('计划完成')) || '',
          '实际完成时间': headers.find(h => h.includes('实际') || h.includes('完成日期') || h.includes('实际完成')) || '',
          '负责人': headers.find(h => h.includes('负责人') || h.includes('人') || h.includes('责任')) || '',
          '备注': headers.find(h => h.includes('备注') || h.includes('说明') || h.includes('注')) || '',
        };

        console.log('列映射:', headerMap);

        // 如果没有找到计划完成时间列，尝试从所有可能的列名中查找
        if (!headerMap['计划完成时间']) {
          const possiblePlanCols = headers.filter(h =>
            h.includes('计划') || h.includes('完成') || h.includes('时间') || h.includes('日期')
          );
          console.log('可能包含计划时间的列:', possiblePlanCols);
        }

        const jsonDataObj = rows;

        const parsedData: ImportRow[] = jsonDataObj.map((row: Record<string, any>, index: number) => {
          const planDateKey = headerMap['计划完成时间'];
          const actualDateKey = headerMap['实际完成时间'];

          const parseFieldValue = (cell: any): string | null => {
            if (cell === undefined || cell === null || cell === '' || cell === 'null') return null;

            // 如果已经是 Date 对象（cellDates: true）
            if (cell instanceof Date) {
              return dayjs(cell).format('YYYY-MM-DD');
            }

            // 如果是数字（Excel 序列日期）
            if (typeof cell === 'number') {
              try {
                // 处理 Excel 日期序列号
                const date = new Date((cell - 25569) * 86400 * 1000);
                if (!isNaN(date.getTime())) {
                  return dayjs(date).format('YYYY-MM-DD');
                }
              } catch (e) {
                console.error('Number date parse error:', e);
              }
            }

            // 如果是字符串，尝试多种解析
            if (typeof cell === 'string') {
              const str = cell.trim();
              if (str === '') return null;

              // 1. 尝试标准横杠格式 YYYY-MM-DD
              const standardMatch = str.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
              if (standardMatch) {
                return `${standardMatch[1]}-${standardMatch[2].padStart(2, '0')}-${standardMatch[3].padStart(2, '0')}`;
              }

              // 2. 尝试中文格式 2026年3月5日
              const chineseMatch = str.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
              if (chineseMatch) {
                return `${chineseMatch[1]}-${chineseMatch[2].padStart(2, '0')}-${chineseMatch[3].padStart(2, '0')}`;
              }

              // 3. 尝试使用 dayjs 直接解析
              const d = dayjs(str);
              if (d.isValid()) {
                return d.format('YYYY-MM-DD');
              }
            }

            return null;
          };

          const planDate = parseFieldValue(row[planDateKey]);
          const actualDate = parseFieldValue(row[actualDateKey]);

          console.log(`第${index + 1}行：计划完成时间="${planDate}", 实际完成时间="${actualDate}"`);

          return {
            docType: headerMap['文档类型'] ? String(row[headerMap['文档类型']] || '').trim() : undefined,
            docName: headerMap['文档名称'] ? String(row[headerMap['文档名称']] || '').trim() : undefined,
            docDescription: headerMap['文档说明'] ? String(row[headerMap['文档说明']] || '').trim() : undefined,
            planCompleteDate: planDate,
            actualCompleteDate: actualDate,
            responsiblePerson: headerMap['负责人'] ? String(row[headerMap['负责人']] || '').trim() : undefined,
            remarks: headerMap['备注'] ? String(row[headerMap['备注']] || '').trim() : undefined,
          };
        }).filter(row => row.docName);

        setImportData(parsedData);
        setIsImportModalVisible(true);
      } catch (error) {
        console.error('Parse error:', error);
        message.error('解析Excel文件失败');
      }
    };
    reader.readAsBinaryString(file);
    return false;
  };

  const handleImportConfirm = () => {
    if (importData.length === 0) {
      message.warning('没有可导入的数据');
      return;
    }

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    importData.forEach(row => {
      if (!row.docType || !row.docName) {
        errorCount++;
        return;
      }

      if (!DOC_TYPES.includes(row.docType as typeof DOC_TYPES[number])) {
        errorCount++;
        return;
      }

      addRecord({
        docType: row.docType,
        docName: row.docName,
        docDescription: row.docDescription || '',
        planCompleteDate: row.planCompleteDate || '',
        actualCompleteDate: row.actualCompleteDate || '',
        responsiblePerson: row.responsiblePerson || '',
        remarks: row.remarks || '',
      } as DocumentRecord);
      successCount++;
    });

    loadRecords();
    setUploading(false);
    setIsImportModalVisible(false);
    setImportData([]);

    if (successCount > 0) {
      message.success(`成功导入 ${successCount} 条数据`);
    }
    if (errorCount > 0) {
      message.warning(`有 ${errorCount} 条数据因格式不正确被跳过`);
    }
  };

  const handleImportCancel = () => {
    setIsImportModalVisible(false);
    setImportData([]);
  };

  const importColumns: TableProps<ImportRow>['columns'] = [
    {
      title: '文档类型',
      dataIndex: 'docType',
      key: 'docType',
      width: 140,
      render: (text: string) => {
        const docType = text?.trim() || '';
        const style = DOC_TYPE_COLORS[docType] || { color: '#666', bgColor: '#f5f5f5', icon: '📄' };
        const cardStyle = getDocTypeStyle(docType);
        return (
          <span style={cardStyle}>
            {style.icon} {docType}
          </span>
        );
      },
    },
    {
      title: '文档名称',
      dataIndex: 'docName',
      key: 'docName',
      width: 180,
    },
    {
      title: '文档说明',
      dataIndex: 'docDescription',
      key: 'docDescription',
      width: 200,
      ellipsis: true,
    },
    {
      title: '计划完成时间',
      dataIndex: 'planCompleteDate',
      key: 'planCompleteDate',
      width: 120,
    },
    {
      title: '实际完成时间',
      dataIndex: 'actualCompleteDate',
      key: 'actualCompleteDate',
      width: 120,
    },
    {
      title: '负责人',
      dataIndex: 'responsiblePerson',
      key: 'responsiblePerson',
      width: 100,
    },
    {
      title: '备注',
      dataIndex: 'remarks',
      key: 'remarks',
      width: 150,
      ellipsis: true,
    },
  ];

  const isOverdue = (planDate: string, actualDate: string): boolean => {
    // 如果已完成，不算延误
    if (actualDate) {
      return false;
    }
    // 如果没有计划时间，不算延误
    if (!planDate || planDate.trim() === '') {
      return false;
    }
    const today = moment().format('YYYY-MM-DD');
    return moment(today).isAfter(moment(planDate));
  };

  const getStatistics = () => {
    const total = records.length;
    const completed = records.filter(r => r.actualCompleteDate).length;
    const incomplete = total - completed;
    const overdue = records.filter(r => isOverdue(r.planCompleteDate, r.actualCompleteDate)).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, incomplete, overdue, progress };
  };

  const stats = getStatistics();

  const columns: TableProps<DocumentRecord>['columns'] = [
    {
      title: '编号',
      dataIndex: 'docNo',
      key: 'docNo',
      width: 80,
      fixed: 'left',
    },
    {
      title: '文档类型',
      dataIndex: 'docType',
      key: 'docType',
      width: 140,
      fixed: 'left',
      render: (text: string) => {
        const docType = text?.trim() || '';
        const style = DOC_TYPE_COLORS[docType] || { color: '#666', bgColor: '#f5f5f5', icon: '📄' };
        const cardStyle = getDocTypeStyle(docType);
        return (
          <span style={cardStyle}>
            {style.icon} {docType}
          </span>
        );
      },
    },
    {
      title: '文档名称',
      dataIndex: 'docName',
      key: 'docName',
      width: 180,
      fixed: 'left',
    },
    {
      title: '文档说明',
      dataIndex: 'docDescription',
      key: 'docDescription',
      width: 200,
      ellipsis: true,
    },
    {
      title: '计划完成时间',
      dataIndex: 'planCompleteDate',
      key: 'planCompleteDate',
      width: 120,
      render: (text: string, record: DocumentRecord) => {
        const overdue = isOverdue(text, record.actualCompleteDate);
        return (
          <span style={{ color: overdue ? '#ff4d4f' : 'inherit', fontWeight: overdue ? 'bold' : 'normal' }}>
            {text}
          </span>
        );
      },
    },
    {
      title: '实际完成时间',
      dataIndex: 'actualCompleteDate',
      key: 'actualCompleteDate',
      width: 120,
    },
    {
      title: '负责人',
      dataIndex: 'responsiblePerson',
      key: 'responsiblePerson',
      width: 80,
    },
    {
      title: '备注',
      dataIndex: 'remarks',
      key: 'remarks',
      width: 120,
      ellipsis: true,
      render: (text: string, record: DocumentRecord) => {
        const overdue = isOverdue(record.planCompleteDate, record.actualCompleteDate);
        return (
          <span>
            {text}
            {overdue && <span style={{ color: '#ff4d4f', marginLeft: '8px' }}>已延误</span>}
          </span>
        );
      },
    },
    {
      title: '附件',
      key: 'attachment',
      width: 300,
      render: (_: unknown, record: DocumentRecord) => {
        if (record.attachments && record.attachments.length > 0) {
          return (
            <Space size="small" direction="vertical" style={{ width: '100%' }}>
              {record.attachments?.map((attachment, index) => (
                <div key={index} style={{
                  border: '1px solid #e8e8e8',
                  borderRadius: '4px',
                  padding: '8px',
                  marginBottom: index < (record.attachments?.length || 0) - 1 ? '8px' : 0,
                  backgroundColor: '#fafafa'
                }}>
                  <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                    <PaperClipOutlined style={{ marginRight: '4px' }} />
                    <span style={{ fontWeight: 'bold' }}>{decodeFileName(attachment.name)}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                    {formatFileSize(attachment.size)} | {dayjs(attachment.uploadDate).format('YYYY-MM-DD HH:mm')}
                  </div>
                  <Space size="small">
                    <Button
                      type="link"
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(record, attachment)}
                    >
                      下载
                    </Button>
                    <Popconfirm
                      title="确定要删除此附件吗？"
                      onConfirm={() => handleDeleteAttachment(record, index)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button type="link" size="small" danger>
                        删除
                      </Button>
                    </Popconfirm>
                  </Space>
                </div>
              ))}
            </Space>
          );
        }
        return <span style={{ color: '#999', fontSize: '12px' }}>暂无附件</span>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_: unknown, record: DocumentRecord) => (
        <Space size="small" direction="vertical">
          <Space size="small">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定要删除这条记录吗？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
          <Upload
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            showUploadList={false}
            beforeUpload={(file) => handleUpload(file, record)}
          >
            <Button type="link" icon={<UploadOutlined />}>
              上传文档
            </Button>
          </Upload>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider>
      <div style={{ minHeight: '100vh', padding: '24px', backgroundColor: '#f0f2f5' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h1 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 'bold', textAlign: 'center' }}>
            项目验收文档管理
          </h1>

          <Card style={{ marginBottom: '24px' }}>
            <Row gutter={16}>
              <Col span={5}>
                <Statistic
                  title="文档总数"
                  value={stats.total}
                  prefix={<FileExcelOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={5}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleFilterClick(filterType === 'completed' ? null : 'completed')}
                  >
                    <Statistic
                      title={<span style={{ textDecoration: filterType === 'completed' ? 'underline' : 'none' }}>已完成数</span>}
                      value={stats.completed}
                      prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </div>
                  {filterType === 'completed' && (
                    <Button type="link" size="small" onClick={clearFilter} style={{ marginTop: '4px' }}>
                      清除筛选
                    </Button>
                  )}
                </div>
              </Col>
              <Col span={5}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleFilterClick(filterType === 'incomplete' ? null : 'incomplete')}
                  >
                    <Statistic
                      title={<span style={{ textDecoration: filterType === 'incomplete' ? 'underline' : 'none' }}>未完成数</span>}
                      value={stats.incomplete}
                      prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
                      valueStyle={{ color: '#fa8c16' }}
                    />
                  </div>
                  {filterType === 'incomplete' && (
                    <Button type="link" size="small" onClick={clearFilter} style={{ marginTop: '4px' }}>
                      清除筛选
                    </Button>
                  )}
                </div>
              </Col>
              <Col span={5}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleFilterClick(filterType === 'overdue' ? null : 'overdue')}
                  >
                    <Statistic
                      title={<span style={{ textDecoration: filterType === 'overdue' ? 'underline' : 'none' }}>延误数</span>}
                      value={stats.overdue}
                      prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </div>
                  {filterType === 'overdue' && (
                    <Button type="link" size="small" onClick={clearFilter} style={{ marginTop: '4px' }}>
                      清除筛选
                    </Button>
                  )}
                </div>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>总体进度</div>
                  <Progress
                    percent={stats.progress}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    status={stats.progress === 100 ? 'success' : 'active'}
                  />
                </div>
              </Col>
            </Row>
          </Card>

          <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Select
              placeholder="选择文档类型"
              allowClear
              style={{ width: 160 }}
              value={searchDocType || undefined}
              onChange={setSearchDocType}
            >
              {DOC_TYPES.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
            <Input
              placeholder="搜索文档名称"
              allowClear
              style={{ width: 200 }}
              prefix={<SearchOutlined />}
              value={searchDocName}
              onChange={e => setSearchDocName(e.target.value)}
            />
            <Input
              placeholder="搜索负责人"
              allowClear
              style={{ width: 150 }}
              prefix={<SearchOutlined />}
              value={searchResponsiblePerson}
              onChange={e => setSearchResponsiblePerson(e.target.value)}
            />
            <DatePicker
              placeholder="计划完成时间"
              style={{ width: 160 }}
              value={searchPlanDateEnd ? moment(searchPlanDateEnd) : null}
              onChange={(date) => setSearchPlanDateEnd(date ? date.format('YYYY-MM-DD') : '')}
            />
            <DatePicker
              placeholder="实际完成时间"
              style={{ width: 160 }}
              value={searchActualDateEnd ? moment(searchActualDateEnd) : null}
              onChange={(date) => setSearchActualDateEnd(date ? date.format('YYYY-MM-DD') : '')}
            />
            <Upload
              accept=".xlsx,.xls"
              showUploadList={false}
              beforeUpload={handleFileUpload}
            >
              <Button icon={<UploadOutlined />}>
                批量导入
              </Button>
            </Upload>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增文档
            </Button>
            <Popconfirm
              title="确定要删除所有记录吗？此操作不可恢复！"
              onConfirm={handleDeleteAll}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<DeleteFilled />}>
                全部删除
              </Button>
            </Popconfirm>
          </div>

          <Table
            columns={columns}
            dataSource={filteredRecords}
            rowKey="id"
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              type: 'radio',
            }}
            onRow={(record) => ({
              style: {
                backgroundColor: record.actualCompleteDate ? '#f6ffed' : '#fff',
                color: record.actualCompleteDate ? '#389e0d' : '#000',
              },
            })}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            scroll={{ x: 1600 }}
          />

          <Modal
            title={editingRecord ? '编辑文档' : '新增文档'}
            open={isModalVisible}
            onOk={handleSubmit}
            onCancel={handleCancel}
            width={600}
            okText="确定"
            cancelText="取消"
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                docType: undefined,
                docName: '',
                docDescription: '',
                planCompleteDate: null,
                actualCompleteDate: null,
                responsiblePerson: '',
                remarks: '',
              }}
            >
              <Form.Item
                name="docType"
                label="文档类型"
                rules={[{ required: true, message: '请选择文档类型' }]}
              >
                <Select placeholder="请选择文档类型">
                  {DOC_TYPES.map(type => (
                    <Option key={type} value={type}>{type}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="docName"
                label="文档名称"
                rules={[{ required: true, message: '请输入文档名称' }]}
              >
                <Input placeholder="请输入文档名称" />
              </Form.Item>

              <Form.Item
                name="docDescription"
                label="文档说明"
              >
                <TextArea rows={3} placeholder="请输入文档说明" />
              </Form.Item>

              <Form.Item
                name="planCompleteDate"
                label="计划完成时间"
              >
                <DatePicker style={{ width: '100%' }} placeholder="请选择计划完成时间" />
              </Form.Item>

              <Form.Item
                name="actualCompleteDate"
                label="实际完成时间"
              >
                <DatePicker style={{ width: '100%' }} placeholder="请选择实际完成时间" />
              </Form.Item>

              <Form.Item
                name="responsiblePerson"
                label="负责人"
              >
                <Input placeholder="请输入负责人" />
              </Form.Item>

              <Form.Item
                name="remarks"
                label="备注"
              >
                <TextArea rows={2} placeholder="请输入备注" />
              </Form.Item>
            </Form>
          </Modal>

          <Modal
            title="批量导入数据预览"
            open={isImportModalVisible}
            onOk={handleImportConfirm}
            onCancel={handleImportCancel}
            width={900}
            okText={`导入全部数据 (${importData.length} 条)`}
            cancelText="取消"
            okButtonProps={{ loading: uploading, disabled: importData.length === 0 }}
          >
            <div style={{ marginBottom: '16px', color: '#666' }}>
              <FileExcelOutlined style={{ marginRight: '8px' }} />
              共解析出 {importData.length} 条数据，支持的文档类型：{DOC_TYPES.join('、')}
            </div>
            <Table
              columns={importColumns}
              dataSource={importData.map((row, index) => ({ ...row, key: index }))}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1000 }}
              size="small"
            />
          </Modal>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default App;
