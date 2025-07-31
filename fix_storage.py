#!/usr/bin/env python3
import re

# Read the storage controller file
with open('/workspace/backend-server/src/controllers/storage.controller.ts', 'r') as f:
    content = f.read()

# Fix the fileFilter function - remove the project check
content = re.sub(
    r'fileFilter: \(req, file, cb\) => \{[\s\S]*?cb\(null, true\);\s*\}',
    '''fileFilter: (req, file, cb) => {
        // For now, accept all file types
        // TODO: Implement project-specific file type restrictions
        cb(null, true);
      }''',
    content
)

# Fix api_key references
content = content.replace('authReq.session?.api_key', 'authReq.session?.user_id')

# Fix uploaded_by field
content = content.replace(
    'uploaded_by: authReq.user?.id || authReq.session?.user_id,',
    'uploaded_by: authReq.user?.id || authReq.session?.user_id || \'system\','
)

# Write the fixed content back
with open('/workspace/backend-server/src/controllers/storage.controller.ts', 'w') as f:
    f.write(content)

print("Fixed storage controller!")
