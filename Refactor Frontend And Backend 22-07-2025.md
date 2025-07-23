This is a list of tasks for refactoring the app to fit the new project / database oriented functionality.

Frontend is now completely full of bugs and errors. Going to the dashboard spawns 17 errors. the following is the full copyt paste of sopme of the errors in the console log -
"
RGET
http://localhost:3470/api/admin/content/get?
[HTTP/1.1 404 Not Found 6ms]

🚨 API INTERCEPTOR ERROR:
Object { message: "Request failed with status code 404", status: 404, statusText: "Not Found", url: "/admin/content/get?", method: "get", context: {…}, timestamp: "2025-07-22T08:20:19.985Z" }
<anonymous code>:1:147461
🔍 404 NOT FOUND ERROR: <anonymous code>:1:147461
• Endpoint not found: /admin/content/get? <anonymous code>:1:147461
• Check if API route exists on backend <anonymous code>:1:147461
• Verify API version compatibility <anonymous code>:1:147461
• Review API documentation <anonymous code>:1:147461

🚨 FRONTEND ERROR DETECTED: Request failed with status code 404 <anonymous code>:1:147461

🔍 ERROR DETAILS:
📍 Location: DashboardPage -> loadDashboardData
⏰ Timestamp: 2025-07-22T08:20:19.994Z
🎯 Error Type: API
🔗 Endpoint: GET /admin/content/get
📊 Status Code: 404
📥 Response Data: {
"success": false,
"error": "Route not found"
}
🌐 Current URL: http://localhost:3469/dashboard
<anonymous code>:1:147461

💡 SUGGESTED SOLUTIONS:
• Verify the endpoint URL is correct: /admin/content/get
• Check if the API route exists on the backend
• Ensure the API version is compatible
• Review API documentation for correct endpoints
"
The entire frontend needs to be cleared and everything needs to be rewritten. We need to delete the existing pages and create them from scratch, also creating the connections to the API.

Also, on the Projects page, the projects are placeholders, do not allow entrance, and nothing works really.

Seeing the amount of those issues, we need to completely revamp the frontend and just... make a completely new one, cleaner this time, with more safety, better erroy logging, etc.

The new frontend should only contain functionalkities that are connected properly to the backend API database. The structure should be clean, and the entire app needs to operate on the basis of one main layout, that displays the menus (header, sidebar) and pages displayed inside, with loading bars when moving between them, while the sidebars and header stays on screen. Also, make sure to not break the MCP functionality. We need a completely new revamped page for it, but still, the code works now.
