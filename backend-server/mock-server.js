const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3468;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
const storage = {
  adminUsers: [
    {
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      role: 'super_admin',
      access_level: 'master',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  sessions: [],
  projects: [],
  apiKeys: []
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth endpoints
app.post('/krapi/k1/auth/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    const sessionToken = `session_${uuidv4()}`;
    const session = {
      id: uuidv4(),
      token: sessionToken,
      user_id: '1',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    storage.sessions.push(session);
    
    res.json({
      success: true,
      data: {
        user: storage.adminUsers[0],
        token: sessionToken,
        session_token: sessionToken,
        expires_at: session.expires_at,
        scopes: ['projects:read', 'projects:write', 'projects:delete']
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

app.get('/krapi/k1/auth/admin/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = storage.sessions.find(s => s.token === token);
    
    if (session) {
      res.json({
        success: true,
        data: storage.adminUsers[0]
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid session'
      });
    }
  } else {
    res.status(401).json({
      success: false,
      error: 'No authorization header'
    });
  }
});

// Projects endpoints
app.get('/krapi/k1/projects', (req, res) => {
  res.json({
    success: true,
    data: storage.projects,
    pagination: {
      page: 1,
      limit: 50,
      total: storage.projects.length,
      pages: 1
    }
  });
});

app.post('/krapi/k1/projects', (req, res) => {
  const { name, description, settings } = req.body;
  
  const newProject = {
    id: uuidv4(),
    name,
    description: description || null,
    api_key: `krapi_${uuidv4().replace(/-/g, '')}`,
    active: true,
    created_by: '1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    storage_used: 0,
    api_calls_count: 0,
    last_api_call: null,
    settings: settings || {}
  };
  
  storage.projects.push(newProject);
  
  res.json({
    success: true,
    data: newProject
  });
});

app.get('/krapi/k1/projects/:id', (req, res) => {
  const project = storage.projects.find(p => p.id === req.params.id);
  
  if (project) {
    res.json({
      success: true,
      data: project
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }
});

app.put('/krapi/k1/projects/:id', (req, res) => {
  const projectIndex = storage.projects.findIndex(p => p.id === req.params.id);
  
  if (projectIndex !== -1) {
    storage.projects[projectIndex] = {
      ...storage.projects[projectIndex],
      ...req.body,
      updated_at: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: storage.projects[projectIndex]
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }
});

app.delete('/krapi/k1/projects/:id', (req, res) => {
  const projectIndex = storage.projects.findIndex(p => p.id === req.params.id);
  
  if (projectIndex !== -1) {
    storage.projects.splice(projectIndex, 1);
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }
});

// Project stats endpoint
app.get('/krapi/k1/projects/:id/stats', (req, res) => {
  const project = storage.projects.find(p => p.id === req.params.id);
  
  if (project) {
    res.json({
      success: true,
      data: {
        collections_count: 0,
        documents_count: 0,
        storage_used: 0,
        api_calls_today: 0,
        api_calls_this_month: 0,
        api_calls_total: 0,
        users_count: 0,
        last_activity: project.updated_at
      }
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Project not found'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Mock KRAPI server running on http://localhost:${PORT}`);
  console.log('Login with: username=admin, password=admin123');
});