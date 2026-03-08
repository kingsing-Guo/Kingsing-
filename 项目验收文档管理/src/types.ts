export interface Attachment {
  name: string;
  size: number;
  uploadDate: string;
  path: string;
  url: string;
}

export interface DocumentRecord {
  id: string;
  docNo: string;
  docType: string;
  docName: string;
  docDescription: string;
  planCompleteDate: string;
  actualCompleteDate: string;
  responsiblePerson: string;
  remarks: string;
  attachments?: Attachment[];
  createdAt?: string;
  updatedAt?: string;
}

export const DOC_TYPES = [
  '项目立项',
  '项目批复',
  '项目招投标',
  '合同签订',
  '实施管理',
  '需求调研',
  '系统设计',
  '操作手册',
  '内部测试',
  '执行管理',
  '培训文档',
  '项目初验',
] as const;

export type DocType = typeof DOC_TYPES[number];
