import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 创建上传目录（如果不存在）
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 根据文档类型创建子目录
    const docType = req.query.docType || 'other';
    const typeDir = path.join(uploadDir, docType);
    
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }
    
    cb(null, typeDir);
  },
  filename: (req, file, cb) => {
    // 使用原始文件名，避免重复则在前面加时间戳
    // 先进行中文编码转换
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf-8');
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    // 检查文件是否已存在，如果存在则添加时间戳
    const typeDir = path.join(uploadDir, req.query.docType || 'other');
    let finalName = originalName;
    let counter = 1;
    
    while (fs.existsSync(path.join(typeDir, finalName))) {
      finalName = `${baseName}_${Date.now()}${ext}`;
      counter++;
      if (counter > 1) break; // 只检查一次
    }
    
    console.log('保存文件名:', finalName);
    cb(null, finalName);
  }
});

// 文件过滤
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 限制 50MB
  }
});

// 上传接口
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有文件上传' });
    }

    const docType = req.query.docType || 'other';
    const filePath = path.join('uploads', docType, req.file.filename);
    
    // 处理中文文件名编码问题 - 使用 Buffer 转换
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf-8');
    
    console.log('原始文件名:', req.file.originalname);
    console.log('解码后文件名:', originalName);
    
    res.json({
      success: true,
      data: {
        name: originalName,
        size: req.file.size,
        path: filePath,
        // 对 URL 进行编码，确保中文路径可以正常访问
        url: `http://localhost:${PORT}/${encodeURIComponent(filePath)}`,
        uploadDate: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 下载接口
app.get('/api/download/:docType/:filename', (req, res) => {
  const { docType, filename } = req.params;
  const filePath = path.join(uploadDir, docType, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在' });
  }
  
  res.download(filePath);
});

// 删除接口
app.delete('/api/file/:docType/:filename', (req, res) => {
  const { docType, filename } = req.params;
  const filePath = path.join(uploadDir, docType, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在' });
  }
  
  fs.unlinkSync(filePath);
  res.json({ success: true });
});

// 静态文件服务
app.use('/uploads', express.static(uploadDir));

// 启动服务器
app.listen(PORT, () => {
  console.log(`文件上传服务运行在 http://localhost:${PORT}`);
  console.log(`上传目录：${uploadDir}`);
});
