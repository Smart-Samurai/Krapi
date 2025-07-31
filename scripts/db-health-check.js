#!/usr/bin/env node

const { Pool } = require("pg");

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "krapi",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  connectionTimeoutMillis: 5000,
  query_timeout: 5000,
};

async function checkDatabaseHealth() {
  console.log("🔍 Checking PostgreSQL database health...");
  console.log(`📍 Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`🗄️  Database: ${dbConfig.database}`);
  console.log(`👤 User: ${dbConfig.user}`);
  console.log("");

  const pool = new Pool(dbConfig);

  try {
    // Test basic connection
    console.log("📡 Testing database connection...");
    const client = await pool.connect();
    console.log("✅ Database connection successful!");

    // Test basic query
    console.log("🔍 Testing basic query...");
    const result = await client.query("SELECT version()");
    console.log("✅ Basic query successful!");
    console.log(
      `📋 PostgreSQL version: ${result.rows[0].version.split(" ")[1]}`
    );

    // Check if krapi database exists and has tables
    console.log("🔍 Checking database schema...");
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('admin_users', 'projects', 'project_users', 'collections', 'documents')
      ORDER BY table_name
    `);

    const expectedTables = [
      "admin_users",
      "projects",
      "project_users",
      "collections",
      "documents",
    ];
    const foundTables = tablesResult.rows.map((row) => row.table_name);

    console.log(
      `📊 Found ${foundTables.length}/${expectedTables.length} expected tables:`
    );
    expectedTables.forEach((table) => {
      const status = foundTables.includes(table) ? "✅" : "❌";
      console.log(`   ${status} ${table}`);
    });

    // Check admin user
    console.log("🔍 Checking admin user...");
    const adminResult = await client.query(
      "SELECT COUNT(*) as count FROM admin_users"
    );
    const adminCount = parseInt(adminResult.rows[0].count);
    console.log(`👤 Admin users: ${adminCount}`);

    if (adminCount === 0) {
      console.log("⚠️  No admin users found. You may need to create one.");
    }

    // Check projects
    console.log("🔍 Checking projects...");
    const projectsResult = await client.query(
      "SELECT COUNT(*) as count FROM projects"
    );
    const projectCount = parseInt(projectsResult.rows[0].count);
    console.log(`📁 Projects: ${projectCount}`);

    client.release();

    console.log("");
    console.log("🎉 Database health check completed successfully!");
    console.log("✅ PostgreSQL is ready for Krapi CMS");

    return {
      status: "healthy",
      connection: true,
      tables: foundTables.length,
      adminUsers: adminCount,
      projects: projectCount,
    };
  } catch (error) {
    console.log("");
    console.log("❌ Database health check failed!");
    console.log(`🔍 Error: ${error.message}`);
    console.log("");

    if (error.code === "ECONNREFUSED") {
      console.log("💡 Suggestions:");
      console.log("   - Make sure PostgreSQL is running");
      console.log("   - Check if the port 5432 is accessible");
      console.log("   - Verify Docker container is running (if using Docker)");
      console.log("   - Run: docker-compose up -d postgres");
    } else if (error.code === "28P01") {
      console.log("💡 Suggestions:");
      console.log("   - Check username and password");
      console.log("   - Verify database credentials");
    } else if (error.code === "3D000") {
      console.log("💡 Suggestions:");
      console.log('   - Database "krapi" does not exist');
      console.log("   - Run the application to create the database schema");
    }

    return {
      status: "unhealthy",
      connection: false,
      error: error.message,
      code: error.code,
    };
  } finally {
    await pool.end();
  }
}

// Run the health check
if (require.main === module) {
  checkDatabaseHealth()
    .then((result) => {
      process.exit(result.status === "healthy" ? 0 : 1);
    })
    .catch((error) => {
      console.error("Unexpected error:", error);
      process.exit(1);
    });
}

module.exports = { checkDatabaseHealth };
