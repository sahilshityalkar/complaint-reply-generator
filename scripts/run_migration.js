const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local
const env = fs.readFileSync('.env.local', 'utf-8');
const vars = {};
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (match) vars[match[1]] = match[2];
});

const supabase = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('=== Testing Supabase Connection ===');

  // Try direct query on an existing table
  const { data: users, error: usersError } = await supabase.from('users').select('count').limit(1);
  if (usersError) {
    console.log('Table query error:', usersError.message);
  } else {
    console.log('Users table: accessible ✅');
  }

  // Extract project ref
  const projectRef = new URL(vars.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
  console.log('Project ref:', projectRef);

  // Try the management API SQL endpoint
  const https = require('https');
  
  const sql = fs.readFileSync('src/lib/db/001_brand_profiles.sql', 'utf-8');
  
  const body = JSON.stringify({ query: sql });
  
  console.log('Attempting to run migration via Supabase Management API...');
  console.log('SQL length:', sql.length, 'chars');

  const options = {
    hostname: 'api.supabase.com',
    path: '/v1/projects/' + projectRef + '/database/query',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + vars.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('Migration success ✅');
      } else {
        console.log('Response:', data.substring(0, 500));
      }
    });
  });
  req.on('error', (e) => console.error('Request error:', e.message));
  req.write(body);
  req.end();
}

run().catch(console.error);
