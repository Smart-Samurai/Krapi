const axios = require("axios");

async function testDocumentCreation() {
  try {
    // Login
    const loginResponse = await axios.post(
      "http://localhost:3469/api/auth/login",
      {
        username: "admin",
        password: "admin123",
      }
    );
    console.log("Login response:", loginResponse.data);

    const token = loginResponse.data.token;

    // Try to create a document
    const docResponse = await axios.post(
      "http://localhost:3469/api/projects/736b2c7c-9867-4072-a906-f7fb9d1360f2/collections/test_collection_uhb9grms/documents",
      { data: { test: "value" } },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("Document creation response:", docResponse.data);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

testDocumentCreation();
