
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initializeDB() {
    console.log('🚀 Initializing Supabase Database...');

    const schemaSql = fs.readFileSync(path.resolve(process.cwd(), 'supabase_schema.sql'), 'utf8');

    // Note: Standard Supabase client doesn't support running arbitrary SQL for security reasons via REST.
    // We usually use the SQL Editor. However, we can try to create tables via RPC or check if they exist.
    // Since I don't have direct SQL access via REST Client without a dedicated API,
    // I will check the connection and guide the user.

    try {
        const { data, error } = await supabase.from('records').select('*').limit(1);

        if (error && error.code === 'PGRST205') {
            console.error('❌ Table "records" not found.');
            console.log('\n--- ACTION REQUIRED ---');
            console.log('Please go to your Supabase SQL Editor and run the contents of "supabase_schema.sql".');
            console.log('Link: https://app.supabase.com/project/ovvbatorquhewhqxbewv/sql');
            console.log('------------------------\n');
        } else if (error) {
            console.error('❌ Supabase Error:', error.message);
        } else {
            console.log('✅ Connection successful and schema detected!');
        }
    } catch (err) {
        console.error('❌ Unexpected Error:', err);
    }
}

initializeDB();
