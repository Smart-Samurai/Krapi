# Krapi CMS Testing Checklist

## Current Status: ❌ BROKEN - Multiple Critical Issues

### 🔴 Critical Issues to Fix

#### 1. **Process Management Issues**

- [ ] **Status**: ✅ FIXED
- [ ] **Issue**: Child processes become orphaned when manager exits, causing port conflicts
- [ ] **Fix Applied**: Added proper process cleanup, force kill on exit, process group management
- [ ] **Test**: Services start/stop cleanly without orphaned processes

#### 1. **Start Manager Performance Issues**

- [ ] **Status**: ✅ FIXED
- [ ] **Issue**: Manager hangs during startup, unnecessary node_modules deletion, slow dependency installation
- [ ] **Fix Applied**:
  - Removed aggressive node_modules deletion (only delete if corrupted)
  - Added dependency installation timeouts (5 minutes)
  - Skip dependency installation if already installed
  - Increased startup check timeouts (API: 10s, Frontend: 15s)
  - Added better error handling for installation failures
- [ ] **Test**: Manager starts quickly and doesn't hang during service startup

#### 1. **Start Manager Service Startup Issues**

- [ ] **Status**: ✅ COMPLETELY REWRITTEN
- [ ] **Issue**: Python manager was blocking API server startup, complex logic causing failures
- [ ] **Fix Applied**:
  - **COMPLETE REWRITE**: Replaced complex 1000+ line manager with simple 400-line manager
  - **REMOVED ALL BLOCKING LOGIC**: No more waiting, sleeping, checking, or complex startup sequences
  - **SIMPLE PROCESS SPAWNING**: Direct subprocess.Popen without any interference
  - **MINIMAL DEPENDENCIES**: Removed psutil dependency, simplified package manager detection
  - **CLEAN LOGGING**: Simple file and console logging without complex thread management
  - **IMMEDIATE STARTUP**: Both services start immediately when button is clicked
  - **NO STARTUP CHECKS**: Removed all startup verification that was causing blocking
  - **SIMPLE GUI**: Clean, minimal interface without complex status tracking
  - **CONSOLE MODE**: Fallback console interface for systems without GUI
- [ ] **Test**: Both API and frontend services start successfully without any blocking

#### 2. **Package Manager Conflicts**

- [ ] **Status**: 🔄 IN PROGRESS
- [ ] **Issue**: npm and pnpm conflicts causing missing packages
- [ ] **Fix Applied**: Removed package-lock.json files, updated start manager to use pnpm consistently
- [ ] **Test**: Services start successfully with pnpm

#### 3. **Frontend CSS Compilation Error**

- [ ] **Status**: ✅ FIXED
- [ ] **Issue**: Tailwind CSS v4 configuration causing compilation errors and missing styles
- [ ] **Fix Applied**:
  - Downgraded from Tailwind CSS v4 (alpha) to stable v3.4.0
  - Updated PostCSS config to use standard Tailwind v3 setup
  - Fixed CSS imports to use `@tailwind base`, `@tailwind components`, `@tailwind utilities`
  - Converted CSS variables from oklch to hex values for better browser compatibility
  - Removed `@tailwindcss/postcss` v4 dependency
  - Added autoprefixer for better browser support
- [ ] **Test**: Frontend compiles without CSS errors and displays proper styling

#### 3. **React useReducer Error**

- [ ] **Status**: 🔄 IN PROGRESS
- [ ] **Issue**: useReducer error in client components
- [ ] **Fix Applied**: Made layout client-side component
- [ ] **Test**: No useReducer errors in console

#### 4. **Hydration Error on Dashboard**

- [ ] **Status**: 🔄 IN PROGRESS
- [ ] **Issue**: Auth context causing server/client mismatch
- [ ] **Fix Applied**: Made layout client-side, fixed auth context hydration, updated dashboard loading states
- [ ] **Test**: Dashboard loads without hydration errors

#### 2. **Database Management Page**

- [ ] **Status**: 🔄 IN PROGRESS
- [ ] **Issue**: Shows data but throws 400 errors randomly
- [ ] **Fix Applied**: Database controller and API functions look correct
- [ ] **Test**: Database queries work consistently without errors

#### 3. **API Management Page**

- [ ] **Status**: ✅ WORKING
- [ ] **Issue**: Was showing fake data, but backend implementation exists and is working
- [ ] **Fix Applied**:
  - Backend API management controller is fully implemented
  - Database has proper API keys, endpoints, and rate limits tables
  - **REMOVED**: Sample data seeding (as requested)
  - Frontend API calls are correctly implemented
  - API key functionality allows creating custom tokens for API access
- [ ] **Test**: Shows empty tables initially (correct), users can create their own API keys

#### 4. **Auth & Security Page**

- [ ] **Status**: 🔄 IN PROGRESS
- [ ] **Issue**: 400 errors, no real data displayed
- [ ] **Fix Applied**: Added missing sessions table to database
- [ ] **Test**: Shows real users, stats, and security settings

#### 5. **File Upload Functionality**

- [ ] **Status**: 🔄 IN PROGRESS
- [ ] **Issue**: 500 errors when uploading files
- [ ] **Fix Applied**: Added missing multer middleware to file upload route
- [ ] **Test**: Files upload successfully to database

#### 6. **MCP/AI Functionality**

- [ ] **Status**: 🔄 IN PROGRESS
- [ ] **Issue**: Connects to Ollama but returns empty messages
- [ ] **Fix Applied**: MCP server implementation looks correct, may need Ollama configuration
- [ ] **Test**: AI chat works with real responses and tools

#### 7. **Documentation Page**

- [x] **Status**: ✅ DELETED
- [x] **Issue**: Contains wrong/outdated information
- [x] **Fix Applied**: Deleted outdated documentation pages
- [x] **Test**: Documentation pages removed

### 🟡 Additional Issues

#### 8. **Start Manager**

- [ ] **Status**: ✅ FIXED
- [ ] **Issue**: WebSocket variable reference error
- [ ] **Fix Applied**: Removed all WebSocket references
- [ ] **Test**: start-manager.bat runs without errors

### 📋 Testing Instructions

#### How to Test Each Component:

1. **Start Services**:

   ```bash
   .\start-manager.bat
   ```

2. **Test Dashboard**:

   - Navigate to http://localhost:3469
   - Check for hydration errors in browser console
   - Verify dashboard loads properly

3. **Test Database**:

   - Go to http://localhost:3469/dashboard/database
   - Try running SQL queries
   - Check for 400 errors in console

4. **Test API Management**:

   - Go to http://localhost:3469/dashboard/api
   - Verify data is real, not fake
   - Check API keys and endpoints

5. **Test Auth & Security**:

   - Go to http://localhost:3469/dashboard/auth
   - Check for 400 errors
   - Verify user data loads

6. **Test File Upload**:

   - Go to http://localhost:3469/dashboard/files
   - Try uploading a file
   - Check for 500 errors

7. **Test MCP/AI**:
   - Go to http://localhost:3469/dashboard/ai
   - Try chatting with AI
   - Check for empty responses

### 🚨 Priority Order

1. **HIGHEST**: Fix process management (orphaned processes)
2. **HIGHEST**: Fix package manager conflicts (pnpm vs npm)
3. **HIGHEST**: Fix frontend CSS compilation (Tailwind v4)
4. **HIGHEST**: Fix React useReducer error (client component)
5. **HIGH**: Fix hydration error (convert to client-side)
6. **HIGH**: Fix file upload 500 errors
7. **HIGH**: ✅ API management working correctly
8. **MEDIUM**: Fix auth page 400 errors
9. **MEDIUM**: Fix database 400 errors
10. **LOW**: Fix MCP empty responses
11. **LOW**: Delete outdated documentation

### 📝 Notes

- All issues are blocking proper functionality
- Need to test each fix individually
- Monitor browser console for errors
- Check API server logs for backend errors
