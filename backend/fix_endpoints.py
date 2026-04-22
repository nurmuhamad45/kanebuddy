#!/usr/bin/env python3
"""
Auto-fix script to update all API endpoints to use JWT authentication
This removes user_id from query parameters and adds authenticateToken middleware
"""

import re

def update_endpoints():
    with open("server.js", "r", encoding="utf-8") as f:
        content = f.read()
    
    # Pattern 1: Replace GET endpoints that extract user_id from query
    pattern1 = r'app\.get\("(/api/[^"]+)",\s*\(req,\s*res\)\s*=>\s*\{([^}]*?)const userId = req\.query\.user_id;'
    replacement1 = r'app.get("\1", authenticateToken, (req, res) => {\2const userId = req.user.id;'
    content = re.sub(pattern1, replacement1, content)
    
    # Pattern 2: Replace POST endpoints (non-auth)
    pattern2 = r'app\.post\("(/api/[^"]+)",\s*\(req,\s*res\)\s*=>\s*\{([^}]*?)const { user_id,'
    replacement2 = r'app.post("\1", authenticateToken, (req, res) => {\2const userId = req.user.id;\nconst {'
    content = re.sub(pattern2, replacement2, content)
    
    # Pattern 3: Replace DELETE endpoints
    pattern3 = r'app\.delete\("(/api/[^"]+)",\s*\(req,\s*res\)\s*=>\s*\{([^}]*?)const userId = req\.query\.user_id;'
    replacement3 = r'app.delete("\1", authenticateToken, (req, res) => {\2const userId = req.user.id;'
    content = re.sub(pattern3, replacement3, content)
    
    # Pattern 4: Replace PUT endpoints
    pattern4 = r'app\.put\("(/api/[^"]+)",\s*\(req,\s*res\)\s*=>\s*\{([^}]*?)const { ([^}]*)user_id([^}]*)} = req\.body;'
    replacement4 = r'app.put("\1", authenticateToken, (req, res) => {\2const userId = req.user.id;\nconst { \3\4} = req.body;'
    content = re.sub(pattern4, replacement4, content)
    
    with open("server.js", "w", encoding="utf-8") as f:
        f.write(content)
    
    print("✅ All API endpoints updated to use JWT authentication!")

if __name__ == "__main__":
    update_endpoints()
