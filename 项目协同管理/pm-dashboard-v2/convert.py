import re

html_file = '../项目协同管理V2.0.html'

with open(html_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract script text
match = re.search(r'<script type="text/babel">(.*?)</script>', content, re.DOTALL)
if not match:
    print('Failed to match script')
    exit(1)

script_content = match.group(1)

# Modify script
script_content = re.sub(r'const \{.*?\} = React;', '', script_content)
script_content = re.sub(r'const \{.*?\} = window\.antd;', '', script_content, flags=re.DOTALL)
script_content = re.sub(r'const \{.*?\} = window\.icons;', '', script_content, flags=re.DOTALL)
script_content = re.sub(r'window\.FirebaseSDK\.', '', script_content)
script_content = re.sub(r'const root = ReactDOM.*?root\.render.*?<App \/>\);', 'export default App;', script_content, flags=re.DOTALL)

imports = """
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Layout, Card, Progress, Tag, Row, Col, Badge, Steps, Button, List, Avatar, Input, ConfigProvider, Space, Divider, Typography, Modal, Form, InputNumber, Select, message, Timeline, Collapse, Upload, DatePicker, Radio, Spin, Result, Empty, Popconfirm, Checkbox, Tooltip, Table, Descriptions } from 'antd';
import * as Icons from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, auth, appId, initialToken } from './firebase';

const { 
 SearchOutlined, FileTextOutlined, MessageOutlined, ClockCircleOutlined, 
 LeftOutlined, PlusOutlined, ThunderboltOutlined, TeamOutlined, SendOutlined, 
 EditOutlined, ToolOutlined, DeleteOutlined, PaperClipOutlined, DownloadOutlined, 
 ImportOutlined, FolderOpenOutlined, SafetyOutlined, RedoOutlined, InboxOutlined, 
 CheckCircleOutlined, UserOutlined, ExportOutlined, LockOutlined, MobileOutlined, 
 VerifiedOutlined, LoginOutlined, CloudUploadOutlined, UploadOutlined, 
 AppstoreOutlined, DownOutlined, RightOutlined, MenuUnfoldOutlined, MenuFoldOutlined,
 ClearOutlined, DragOutlined, TableOutlined, AppstoreAddOutlined, AlertOutlined, FilterOutlined,
 BellOutlined, InfoCircleOutlined, AuditOutlined, SettingOutlined
} = Icons;
"""

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(imports + script_content)

print("Conversion complete")
