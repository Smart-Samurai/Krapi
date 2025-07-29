const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3470;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new Database(path.join(__dirname, 'data', 'krapi-full.db'));

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    access_level TEXT DEFAULT 'full',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    domain TEXT,
    settings TEXT DEFAULT '{}',
    email_config TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS project_schemas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    schema TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, table_name),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS project_documents (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS project_files (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mimetype TEXT,
    size INTEGER,
    path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS project_users (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    password TEXT,
    data TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, email),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
`);

// Create default admin user if not exists
const adminExists = db.prepare('SELECT * FROM admin_users WHERE username = ?').get('admin');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO admin_users (username, email, password, role, access_level)
    VALUES (?, ?, ?, ?, ?)
  `).run('admin', 'admin@krapi.local', hashedPassword, 'master_admin', 'full');
  console.log('✅ Created default admin user (username: admin, password: admin123)');
}

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectId = req.params.projectId || req.body.projectId;
    const uploadPath = path.join(__dirname, 'uploads', projectId);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Session management
const sessions = new Map();

// Helper functions
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

function generateId() {
  return uuidv4();
}

// Health check
app.get('/krapi/v1/health', (req, res) => {
  res.json({
    success: true,
    message: 'Krapi API is healthy',
    timestamp: new Date().toISOString(),
    data: {
      api: { status: 'ok', uptime: '100%', responseTime: '10ms' },
      database: { status: 'ok', uptime: '100%', responseTime: '5ms' },
      storage: { status: 'ok', uptime: '100%', responseTime: '15ms' }
    }
  });
});

// Auth endpoints
app.post('/krapi/v1/auth', (req, res) => {
  const { method, username, password } = req.body;

  if (method === 'login') {
    const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    
    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      sessions.set(token, user);
      
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
  } else if (method === 'verify') {
    verifyToken(req, res, () => {
      res.json({
        success: true,
        user: req.user
      });
    });
  }
});

// Unified API endpoint
app.post('/krapi/v1/api', verifyToken, (req, res) => {
  const { operation, resource, action, params } = req.body;

  try {
    // Admin operations
    if (operation === 'admin') {
      if (resource === 'users') {
        if (action === 'list') {
          const users = db.prepare('SELECT id, username, email, role, access_level, created_at FROM admin_users').all();
          res.json({ success: true, data: users });
        } else if (action === 'create') {
          const { username, email, password, role, access_level } = params;
          const hashedPassword = bcrypt.hashSync(password, 10);
          const id = generateId();
          
          db.prepare(`
            INSERT INTO admin_users (username, email, password, role, access_level)
            VALUES (?, ?, ?, ?, ?)
          `).run(username, email, hashedPassword, role || 'admin', access_level || 'limited');
          
          res.json({ success: true, data: { id, username, email, role, access_level } });
        } else if (action === 'update') {
          const { userId, ...updates } = params;
          const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
          const values = Object.values(updates);
          
          db.prepare(`UPDATE admin_users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .run(...values, userId);
          
          res.json({ success: true });
        } else if (action === 'delete') {
          const { userId } = params;
          db.prepare('DELETE FROM admin_users WHERE id = ?').run(userId);
          res.json({ success: true });
        }
      } else if (resource === 'projects') {
        if (action === 'list') {
          const projects = db.prepare('SELECT * FROM projects').all();
          res.json({ success: true, data: projects });
        } else if (action === 'create') {
          const { name, description, domain, settings } = params;
          const id = generateId();
          
          db.prepare(`
            INSERT INTO projects (id, name, description, domain, settings)
            VALUES (?, ?, ?, ?, ?)
          `).run(id, name, description, domain, JSON.stringify(settings || {}));
          
          res.json({ success: true, data: { id, name, description, domain } });
        } else if (action === 'update') {
          const { projectId, ...updates } = params;
          const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
          const values = Object.values(updates);
          
          db.prepare(`UPDATE projects SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .run(...values, projectId);
          
          res.json({ success: true });
        } else if (action === 'delete') {
          const { projectId } = params;
          db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
          res.json({ success: true });
        } else if (action === 'get') {
          const { projectId } = params;
          const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
          res.json({ success: true, data: project });
        }
      } else if (resource === 'database') {
        if (action === 'stats') {
          const collections = db.prepare('SELECT COUNT(DISTINCT table_name) as count FROM project_schemas').get();
          const documents = db.prepare('SELECT COUNT(*) as count FROM project_documents').get();
          
          res.json({
            success: true,
            data: {
              collections: collections.count,
              totalDocuments: documents.count,
              totalSize: 1024000 // Mock value
            }
          });
        }
      } else if (resource === 'activity') {
        if (action === 'list') {
          // Mock activity data
          res.json({
            success: true,
            data: [
              {
                action: 'Project Created',
                resource: 'New Project',
                timestamp: new Date().toISOString()
              }
            ]
          });
        }
      } else if (resource === 'api') {
        if (action === 'stats') {
          res.json({
            success: true,
            data: {
              activeUsers: 10,
              totalRequests: 1000,
              averageResponseTime: '50ms'
            }
          });
        }
      }
    }
    
    // Database operations
    else if (operation === 'database') {
      if (resource === 'schemas') {
        if (action === 'create') {
          const { projectId, tableName, schema } = params;
          
          db.prepare(`
            INSERT INTO project_schemas (project_id, table_name, schema)
            VALUES (?, ?, ?)
          `).run(projectId, tableName, JSON.stringify(schema));
          
          res.json({ success: true });
        } else if (action === 'update') {
          const { projectId, tableName, schema } = params;
          
          db.prepare(`
            UPDATE project_schemas 
            SET schema = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE project_id = ? AND table_name = ?
          `).run(JSON.stringify(schema), projectId, tableName);
          
          res.json({ success: true });
        } else if (action === 'get') {
          const { projectId, tableName } = params;
          
          const schema = db.prepare(`
            SELECT * FROM project_schemas 
            WHERE project_id = ? AND table_name = ?
          `).get(projectId, tableName);
          
          res.json({ success: true, data: schema });
        } else if (action === 'list') {
          const { projectId } = params;
          
          const schemas = db.prepare(`
            SELECT * FROM project_schemas WHERE project_id = ?
          `).all(projectId);
          
          res.json({ success: true, data: schemas });
        }
      } else if (resource === 'documents') {
        if (action === 'create') {
          const { projectId, tableName, data } = params;
          const id = generateId();
          
          db.prepare(`
            INSERT INTO project_documents (id, project_id, table_name, data)
            VALUES (?, ?, ?, ?)
          `).run(id, projectId, tableName, JSON.stringify(data));
          
          res.json({ success: true, data: { id } });
        } else if (action === 'update') {
          const { documentId, data } = params;
          
          db.prepare(`
            UPDATE project_documents 
            SET data = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).run(JSON.stringify(data), documentId);
          
          res.json({ success: true });
        } else if (action === 'get') {
          const { documentId } = params;
          
          const document = db.prepare(`
            SELECT * FROM project_documents WHERE id = ?
          `).get(documentId);
          
          if (document) {
            document.data = JSON.parse(document.data);
          }
          
          res.json({ success: true, data: document });
        } else if (action === 'list') {
          const { projectId, tableName, sort, filter, limit = 100, offset = 0 } = params;
          
          let query = 'SELECT * FROM project_documents WHERE project_id = ? AND table_name = ?';
          const queryParams = [projectId, tableName];
          
          // Add sorting if specified
          if (sort) {
            query += ` ORDER BY ${sort.field} ${sort.order || 'ASC'}`;
          }
          
          query += ` LIMIT ? OFFSET ?`;
          queryParams.push(limit, offset);
          
          const documents = db.prepare(query).all(...queryParams);
          
          // Parse JSON data
          documents.forEach(doc => {
            doc.data = JSON.parse(doc.data);
          });
          
          res.json({ success: true, data: documents });
        } else if (action === 'delete') {
          const { documentId } = params;
          
          db.prepare('DELETE FROM project_documents WHERE id = ?').run(documentId);
          res.json({ success: true });
        }
      }
    }
    
    // Project user operations
    else if (operation === 'users') {
      if (resource === 'project') {
        if (action === 'create') {
          const { projectId, email, name, phone, password, ...additionalData } = params;
          const id = generateId();
          const hashedPassword = password ? bcrypt.hashSync(password, 10) : null;
          
          db.prepare(`
            INSERT INTO project_users (id, project_id, email, name, phone, password, data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(id, projectId, email, name, phone, hashedPassword, JSON.stringify(additionalData));
          
          res.json({ success: true, data: { id, email, name, phone } });
        } else if (action === 'update') {
          const { userId, ...updates } = params;
          
          if (updates.password) {
            updates.password = bcrypt.hashSync(updates.password, 10);
          }
          
          const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
          const values = Object.values(updates);
          
          db.prepare(`UPDATE project_users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .run(...values, userId);
          
          res.json({ success: true });
        } else if (action === 'get') {
          const { userId } = params;
          
          const user = db.prepare('SELECT * FROM project_users WHERE id = ?').get(userId);
          if (user) {
            user.data = JSON.parse(user.data);
            delete user.password; // Don't send password
          }
          
          res.json({ success: true, data: user });
        } else if (action === 'list') {
          const { projectId } = params;
          
          const users = db.prepare('SELECT * FROM project_users WHERE project_id = ?').all(projectId);
          users.forEach(user => {
            user.data = JSON.parse(user.data);
            delete user.password; // Don't send passwords
          });
          
          res.json({ success: true, data: users });
        } else if (action === 'authenticate') {
          const { projectId, email, password } = params;
          
          const user = db.prepare('SELECT * FROM project_users WHERE project_id = ? AND email = ?')
            .get(projectId, email);
          
          if (user && bcrypt.compareSync(password, user.password)) {
            user.data = JSON.parse(user.data);
            delete user.password;
            res.json({ success: true, data: user });
          } else {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
          }
        }
      }
    }
    
    // Email operations
    else if (operation === 'email') {
      if (resource === 'config') {
        if (action === 'update') {
          const { projectId, host, port, user, pass, from } = params;
          
          const emailConfig = { host, port, user, pass, from };
          
          db.prepare(`
            UPDATE projects 
            SET email_config = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `).run(JSON.stringify(emailConfig), projectId);
          
          res.json({ success: true });
        } else if (action === 'get') {
          const { projectId } = params;
          
          const project = db.prepare('SELECT email_config FROM projects WHERE id = ?').get(projectId);
          const config = project ? JSON.parse(project.email_config) : {};
          
          res.json({ success: true, data: config });
        }
      } else if (resource === 'send') {
        if (action === 'email') {
          const { projectId, to, subject, html, text } = params;
          
          // Get project email config
          const project = db.prepare('SELECT email_config FROM projects WHERE id = ?').get(projectId);
          const emailConfig = project ? JSON.parse(project.email_config) : {};
          
          if (!emailConfig.host) {
            return res.status(400).json({ success: false, error: 'Email not configured for this project' });
          }
          
          // Create transporter
          const transporter = nodemailer.createTransport({
            host: emailConfig.host,
            port: emailConfig.port,
            secure: emailConfig.port === 465,
            auth: {
              user: emailConfig.user,
              pass: emailConfig.pass
            }
          });
          
          // Send email
          transporter.sendMail({
            from: emailConfig.from,
            to,
            subject,
            text,
            html
          }, (error, info) => {
            if (error) {
              res.status(500).json({ success: false, error: error.message });
            } else {
              res.json({ success: true, data: { messageId: info.messageId } });
            }
          });
        }
      }
    }
    
    // Default response
    else {
      res.json({ success: true, data: {} });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// File upload endpoint
app.post('/krapi/v1/files/upload/:projectId', verifyToken, upload.single('file'), (req, res) => {
  const { projectId } = req.params;
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  
  const fileId = generateId();
  
  db.prepare(`
    INSERT INTO project_files (id, project_id, filename, original_name, mimetype, size, path)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(fileId, projectId, file.filename, file.originalname, file.mimetype, file.size, file.path);
  
  res.json({
    success: true,
    data: {
      id: fileId,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    }
  });
});

// File download endpoint
app.get('/krapi/v1/files/download/:fileId', verifyToken, (req, res) => {
  const { fileId } = req.params;
  
  const file = db.prepare('SELECT * FROM project_files WHERE id = ?').get(fileId);
  
  if (!file) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }
  
  res.download(file.path, file.original_name);
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Full KRAPI backend server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/krapi/v1/health`);
  console.log(`🔐 Default login: admin / admin123`);
  console.log(`📁 Database: ${path.join(__dirname, 'data', 'krapi-full.db')}`);
});