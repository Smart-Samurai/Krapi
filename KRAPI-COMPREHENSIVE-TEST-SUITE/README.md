# KRAPI Comprehensive Test Suite

A comprehensive testing framework for the KRAPI Backend-as-a-Service platform that ensures all functionality works correctly through end-to-end testing.

## 🎯 What This Test Suite Does

This test suite provides **comprehensive testing** of the entire KRAPI system by:

1. **Starting fresh services** - Backend and frontend in dev mode
2. **Resetting database** - Destroys and recreates PostgreSQL container with clean volumes
3. **Testing all functionality** - Every CRUD operation, API route, and feature
4. **End-to-end validation** - Tests go through frontend → backend → database flow
5. **Real data operations** - Creates, modifies, and deletes real data
6. **Comprehensive cleanup** - Removes all test data after testing

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** package manager
- **Docker** with Docker Compose
- **KRAPI project** running in the parent directory

### Running the Tests

#### Option 1: Automated Script (Recommended)

**Windows:**

```cmd
cd KRAPI-COMPREHENSIVE-TEST-SUITE
run-tests.bat
```

**Linux/Mac:**

```bash
cd KRAPI-COMPREHENSIVE-TEST-SUITE
./run-tests.sh
```

#### Option 2: Manual Execution

```bash
cd KRAPI-COMPREHENSIVE-TEST-SUITE

# Install dependencies
pnpm install

# Run comprehensive test suite
node run-comprehensive-tests.js
```

#### Option 3: Individual Test Suites

```bash
# Run specific test suites
node tests/auth.test.js
node tests/projects.test.js
node tests/collections.test.js
node tests/documents.test.js
node tests/storage.test.js
node tests/email.test.js
node tests/apikeys.test.js

# Run full system test
node full-system-test.js
```

## 🧪 Test Coverage

### Phase 1: Authentication & Session Management

- ✅ Admin login/logout
- ✅ Session validation and refresh
- ✅ Password change
- ✅ API key authentication
- ✅ Error handling for invalid credentials

### Phase 2: Project Management

- ✅ Project creation, reading, updating, deletion
- ✅ Project listing and search
- ✅ Project settings and configuration

### Phase 3: Collections & Schema Management

- ✅ Dynamic collection creation
- ✅ Schema validation and enforcement
- ✅ Collection CRUD operations
- ✅ Field type management

### Phase 4: Documents & Data Operations

- ✅ Document CRUD operations
- ✅ Bulk operations (create, update, delete)
- ✅ Data validation and type checking
- ✅ Query and filtering

### Phase 5: Storage & File Management

- ✅ File upload and download
- ✅ File metadata management
- ✅ File listing and search
- ✅ File deletion and cleanup

### Phase 6: Email & Communications

- ✅ Email sending (plain text and HTML)
- ✅ Email templates
- ✅ Bulk email operations
- ✅ Email validation and analytics

### Phase 7: API Keys Management

- ✅ API key creation and management
- ✅ Permission-based access control
- ✅ Key authentication testing
- ✅ Key lifecycle management

### Phase 8: Users & Permissions

- ✅ User management (if implemented)
- ✅ Permission system validation
- ✅ Role-based access control

### Phase 9: Health & System Diagnostics

- ✅ System health checks
- ✅ Database connectivity
- ✅ Service availability
- ✅ Performance metrics

## 🔄 Database Reset Process

The test suite ensures a **completely fresh database** for each run:

1. **Stop and remove** existing PostgreSQL container
2. **Delete all volumes** to remove all data
3. **Remove network** configuration
4. **Create fresh container** with clean PostgreSQL instance
5. **Wait for health checks** to ensure database is ready
6. **Initialize schema** with admin user and basic tables
7. **Run comprehensive tests** against clean database
8. **Clean up** all test data after completion

## 📊 Test Results

The test suite provides detailed reporting:

- **Individual test results** with pass/fail status
- **Test duration** and performance metrics
- **Error details** for failed tests
- **Resource cleanup** confirmation
- **Overall success rate** and summary

## 🛠️ Configuration

Test configuration is in `config.js`:

```javascript
export const CONFIG = {
  FRONTEND_URL: "http://localhost:3469",
  BACKEND_URL: "http://localhost:3469/krapi/k1",
  ADMIN_CREDENTIALS: {
    username: "admin",
    password: "admin123",
  },
  // ... more configuration options
};
```

## 🔧 Troubleshooting

### Common Issues

**Services won't start:**

- Ensure Docker is running
- Check if ports 3469 (frontend) and 3470 (backend) are available
- Verify pnpm and Node.js are properly installed

**Database connection fails:**

- Ensure Docker has enough resources (at least 2GB RAM)
- Check if PostgreSQL container is healthy: `docker ps`
- Verify database credentials in docker-compose.yml

**Tests fail with 404:**

- Services may still be starting up - wait longer
- Check service logs for compilation errors
- Ensure all dependencies are installed

**Permission denied errors:**

- Make sure you have Docker permissions
- Run `docker ps` to verify Docker access
- Check if ports are available

### Debug Mode

To see detailed service logs:

```bash
# In another terminal, monitor service logs
docker-compose logs -f

# Or check individual service logs
cd ..
pnpm run docker:logs
```

## 📁 File Structure

```
KRAPI-COMPREHENSIVE-TEST-SUITE/
├── README.md                    # This file
├── package.json                 # Dependencies and scripts
├── config.js                    # Test configuration
├── run-tests.sh                 # Linux/Mac test runner
├── run-tests.bat                # Windows test runner
├── run-comprehensive-tests.js   # Main test orchestrator
├── enhanced-test-runner.js      # Database reset and service management
├── full-system-test.js          # Complete test suite runner
├── index.js                     # Individual test suite runner
├── tests/                       # Test files
│   ├── auth.test.js            # Authentication tests
│   ├── projects.test.js        # Project management tests
│   ├── collections.test.js     # Collections and schema tests
│   ├── documents.test.js       # Document CRUD tests
│   ├── storage.test.js         # File storage tests
│   ├── email.test.js           # Email functionality tests
│   └── apikeys.test.js         # API key management tests
└── utils/                       # Test utilities
    ├── test-framework.js        # Testing framework
    └── database-helper.js       # Database utilities
```

## 🎯 Best Practices

1. **Always run from clean state** - The test suite handles this automatically
2. **Monitor service logs** - Watch for compilation errors during startup
3. **Allow sufficient time** - Services need time to compile and start in dev mode
4. **Check prerequisites** - Ensure Docker, Node.js, and pnpm are available
5. **Review test results** - Pay attention to failed tests and error messages

## 🚨 Important Notes

- **This test suite modifies real data** - It creates and deletes actual database records
- **Database is completely reset** - All existing data will be lost during testing
- **Services run in dev mode** - This allows for hot reloading and debugging
- **Tests go through frontend** - All requests route through frontend API endpoints
- **Comprehensive cleanup** - Test data is automatically removed after testing

## 🤝 Contributing

To add new tests:

1. Create test file in `tests/` directory
2. Extend the `TestFramework` class
3. Implement `runAll()` method with test cases
4. Add test suite to `full-system-test.js`
5. Update cleanup logic if needed
6. Test thoroughly before committing

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review service logs for error messages
3. Verify all prerequisites are met
4. Ensure Docker has sufficient resources
5. Check if ports are available and not blocked

---

**Happy Testing! 🧪✨**
