# Notification System Troubleshooting

## ✅ Fixed Issues:

1. **Wrong Port** - NotificationBell was using port 5000, backend runs on port 3000
   - ✅ Fixed: Now uses `api` service which points to `http://localhost:3000`

2. **Wrong Token Name** - Was using `token`, should use `accessToken`
   - ✅ Fixed: The `api` service automatically handles `accessToken` from localStorage

3. **Direct fetch() calls** - Bypassed auth interceptors
   - ✅ Fixed: Now uses `api.get()`, `api.put()`, `api.delete()`

## Testing Steps:

### 1. Verify Database Setup

```sql
-- Check if message_queue table exists
SHOW TABLES LIKE 'message_queue';

-- Check if triggers exist
SHOW TRIGGERS WHERE `Table` = 'Gift_Shop_Items';
-- Should see: before_giftshop_insert, before_giftshop_update, after_giftshop_stock_notification
```

### 2. Test Triggers Manually

```sql
-- Create a test notification
UPDATE Gift_Shop_Items SET stock_quantity = 0 WHERE item_id = 1;

-- Check if notification was created
SELECT * FROM message_queue WHERE item_id = 1;

-- Restock and auto-resolve
UPDATE Gift_Shop_Items SET stock_quantity = 10 WHERE item_id = 1;

-- Verify it was resolved
SELECT * FROM message_queue WHERE item_id = 1 AND resolved = TRUE;
```

### 3. Test Backend API

```bash
# Get your token first (login as admin/employee)
TOKEN="your_access_token_here"

# Test GET unresolved notifications
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/notifications/unresolved

# Should return JSON array of notifications
```

### 4. Test Frontend

1. **Login as Admin or Employee**
   - Open browser console (F12)
   - Check localStorage: `localStorage.getItem('accessToken')`
   - Should see a token value

2. **Check Network Requests**
   - Click the bell icon 🔔
   - Open Network tab in DevTools
   - Look for request to: `http://localhost:3000/api/notifications/unresolved`
   - Check status: Should be **200 OK**

3. **Check Console for Errors**
   - Look for any red errors in console
   - Common errors:
     - `401 Unauthorized` → Not logged in or token expired
     - `403 Forbidden` → Wrong role (must be admin or employee)
     - `404 Not Found` → Backend route not registered

### 5. Common Issues & Fixes

#### Issue: "401 Unauthorized"
**Cause:** Not logged in or token expired
**Fix:**
- Logout and login again
- Check if `accessToken` exists in localStorage
- Verify backend is running

#### Issue: "403 Forbidden"
**Cause:** User role is not admin or employee
**Fix:**
- Login with an admin or employee account
- Check user role in JWT token

#### Issue: "404 Not Found on /api/notifications"
**Cause:** Backend route not registered
**Fix:**
- Restart backend server: `cd backend && npm run dev`
- Check [app.js](backend/app.js:100) has: `app.use('/api/notifications', notificationRoutes)`

#### Issue: "Network Error" or "ERR_CONNECTION_REFUSED"
**Cause:** Backend server not running
**Fix:**
```bash
cd backend
npm run dev
```

#### Issue: Notifications not appearing when stock goes to 0
**Cause:** Trigger not installed
**Fix:**
```bash
mysql -u root -p your_database < backend/scripts/install_notifications.sql
```

#### Issue: Bell icon shows but dropdown is empty
**Cause:** No notifications in database
**Fix:**
- Manually create a test notification by setting item stock to 0
- Or wait for actual stock to deplete

## Debug Commands

### Check Backend Logs
```bash
cd backend
npm run dev
# Watch for errors in terminal
```

### Check Browser Console
```javascript
// Check if api is loaded
console.log(api)

// Manually test notification fetch
api.get('/api/notifications/unresolved')
  .then(res => console.log('Notifications:', res.data))
  .catch(err => console.error('Error:', err))

// Check token
console.log('Token:', localStorage.getItem('accessToken'))
```

### Check Database State
```sql
-- Count unresolved notifications
SELECT COUNT(*) FROM message_queue WHERE resolved = FALSE;

-- See all notifications
SELECT
  mq.*,
  gsi.stock_quantity,
  gsi.is_available
FROM message_queue mq
LEFT JOIN Gift_Shop_Items gsi ON mq.item_id = gsi.item_id
ORDER BY mq.created_at DESC;
```

## Still Having Issues?

1. Check all files were updated correctly:
   - [NotificationBell.jsx](src/components/employee/NotificationBell.jsx) - Uses `api` service
   - [notifications.js](backend/routes/notifications.js) - Route handlers
   - [app.js](backend/app.js) - Route registration

2. Verify backend server is running on correct port:
   ```bash
   # Should show: Museum API server running on port 3000
   ```

3. Check browser DevTools Network tab for exact error message

4. Try logging out and back in to refresh token

## Success Checklist

- ✅ Backend running on port 3000
- ✅ message_queue table exists
- ✅ 3 triggers on Gift_Shop_Items table
- ✅ Logged in as admin or employee
- ✅ accessToken in localStorage
- ✅ Bell icon visible in Admin Portal header
- ✅ Clicking bell shows dropdown (even if empty)
- ✅ Can manually create notification by updating stock to 0
