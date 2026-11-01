# Auth testing (Emergent Google Auth)
1. Create test user + session in mongo (db from backend/.env DB_NAME):
mongosh --eval "use('test_database'); var u='test-user-'+Date.now(); var t='test_session_'+Date.now(); db.users.insertOne({user_id:u,email:'test.user.'+Date.now()+'@example.com',name:'Test Vendor',picture:'',role:'vendor',business_name:'Sky Loooop Adventures',phone:'',gst_number:'',address:'',seeded:false,created_at:new Date().toISOString()}); db.user_sessions.insertOne({user_id:u,session_token:t,expires_at:new Date(Date.now()+7*86400000),created_at:new Date()}); print(t)"
2. API: curl -H "Authorization: Bearer <token>" $URL/api/auth/me  (first call seeds demo data)
3. Browser: add cookie session_token=<token> (domain = preview host, path /, secure, sameSite None), then open /.
