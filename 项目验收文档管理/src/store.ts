import type { DocumentRecord, Attachment } from './types';

const STORAGE_KEY = 'doc_acceptance_records';

export const getRecords = (): DocumentRecord[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    return JSON.parse(data);
  }
  return [];
};

export const saveRecords = (records: DocumentRecord[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

const generateDocNo = (): string => {
  const records = getRecords();
  const maxNo = records.reduce((max, record) => {
    const num = parseInt(record.docNo.replace(/^\D+/g, ''), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return String(maxNo + 1).padStart(4, '0');
};

export const addRecord = (record: DocumentRecord): DocumentRecord[] => {
  const records = getRecords();
  const newRecord = {
    ...record,
    id: generateId(),
    docNo: generateDocNo(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  records.push(newRecord);
  saveRecords(records);
  return records;
};

export const updateRecord = (id: string, updates: Partial<DocumentRecord>): DocumentRecord[] => {
  const records = getRecords();
  const index = records.findIndex(r => r.id === id);
  if (index !== -1) {
    records[index] = {
      ...records[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveRecords(records);
  }
  return records;
};

export const deleteRecord = (id: string): DocumentRecord[] => {
  const records = getRecords();
  const filtered = records.filter(r => r.id !== id);
  saveRecords(filtered);
  return filtered;
};

export const deleteAllRecords = (): DocumentRecord[] => {
  saveRecords([]);
  return [];
};

export const renumberRecords = (records: DocumentRecord[]): DocumentRecord[] => {
  records.forEach((record, index) => {
    record.docNo = String(index + 1).padStart(4, '0');
    record.updatedAt = new Date().toISOString();
  });
  saveRecords(records);
  return records;
};

export const updateAttachment = (id: string, attachment: Attachment): DocumentRecord[] => {
  const records = getRecords();
  const index = records.findIndex(r => r.id === id);
  if (index !== -1) {
    if (!records[index].attachments) {
      records[index].attachments = [];
    }
    records[index].attachments.push(attachment);
    records[index].updatedAt = new Date().toISOString();
    saveRecords(records);
  }
  return records;
};

export const deleteAttachment = (id: string, attachmentIndex: number): DocumentRecord[] => {
  const records = getRecords();
  const index = records.findIndex(r => r.id === id);
  if (index !== -1 && records[index].attachments) {
    records[index].attachments.splice(attachmentIndex, 1);
    records[index].updatedAt = new Date().toISOString();
    saveRecords(records);
  }
  return records;
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export { generateId };
