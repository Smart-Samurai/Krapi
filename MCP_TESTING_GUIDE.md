# MCP Testing Guide

## 🎯 **Simple Test Strategy**

We've created a **simple test tool** called `create_test_route` that's the easiest way to verify MCP functionality works.

## 🧪 **Testing Steps**

### **Step 1: Enable Debug Mode**

1. Go to the AI page in the frontend
2. Click the "Debug & Testing" tab
3. Enable "Debug Mode" and "Raw Responses"
4. Enable "MCP Tools"

### **Step 2: Test Simple Chat First**

1. Use the "Set Test Message" button (sets "Hello, can you help me?")
2. Send the message
3. Check browser console for detailed logs
4. Verify you get a response without errors

### **Step 3: Test MCP Tool**

1. Use the "Test Simple MCP Tool" button (sets "Create a new route called 'test'")
2. Send the message
3. Check browser console for:
   - Tool call logs
   - Response logs
   - Any error messages

### **Step 4: Verify Tool Execution**

1. Go to the "Routes" page in the dashboard
2. Look for a new route called "test" with path "/test/test"
3. If you see it, the MCP tool worked!

## 🔍 **What to Look For**

### **In Browser Console:**

```
🔍 Debug Mode - Chat Request: {
  messages: [...],
  model: "llama3.1:8b",
  tools: true,
  ...
}

🔧 MCP Tool Called: create_test_route { args: { route_name: "test" } }
✅ Test route created successfully: { id: 1, path: "/test/test", ... }
```

### **In AI Response:**

The AI should respond with something like:

> "I've created a new test route called 'test' for you. The route has been successfully added to the system with the path '/test/test'."

## 🚨 **Common Issues & Solutions**

### **Issue: 500 Error**

- **Cause**: MCP server not properly handling tool calls
- **Solution**: Check backend logs for detailed error messages

### **Issue: No Tool Called**

- **Cause**: Model not recognizing when to use tools
- **Solution**: Try different phrasing like "Please create a test route"

### **Issue: Tool Called But No Response**

- **Cause**: Tool execution failed
- **Solution**: Check database connection and tool implementation

## 📋 **Test Commands to Try**

### **Simple Commands:**

- "Create a new route called 'test'"
- "Make a test route named 'demo'"
- "Add a route called 'hello'"

### **Complex Commands:**

- "Show me all admin users"
- "Create a new content item"
- "Get system statistics"

## 🔧 **Backend Debugging**

### **Check MCP Server Logs:**

```bash
# In api-server directory
npm run dev
# Look for logs like:
# 🔧 MCP Tool Called: create_test_route
# ✅ Test route created successfully
```

### **Test MCP Endpoints Directly:**

```bash
# Test MCP info
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3470/api/mcp/info

# Test MCP tools
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3470/api/mcp/tools
```

## ✅ **Success Criteria**

1. **Simple chat works** without MCP tools
2. **MCP tools are listed** in the tools endpoint
3. **Tool calls are logged** in console
4. **Database changes occur** (new routes created)
5. **AI responds naturally** about what it did

## 🎯 **Next Steps**

Once the simple test tool works:

1. Test other tools one by one
2. Try complex multi-tool scenarios
3. Test error handling
4. Verify all tools work as expected

## 📞 **Getting Help**

If tests fail:

1. Check browser console for detailed logs
2. Check backend console for error messages
3. Verify database is accessible
4. Ensure Ollama is running with the correct model
