const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.warn('Supabase URL or Key not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY in your environment.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
	autoRefreshToken: true,
	persistSession: false,
	headers: { 'X-Client-Info': 'pmo-dashboard-backend' }
});

async function testConnection() {
	try {
		const { error } = await supabase
			.from('projects')
			.select('id', { count: 'exact', head: true })
			.limit(1);
		return !error;
	} catch (err) {
		return false;
	}
}

module.exports = { supabase, testConnection };
