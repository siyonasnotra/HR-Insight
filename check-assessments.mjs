import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: orgs, error: orgError } = await supabase.from('organizations').select('id, name');
  if (orgError) {
    console.error("Org error:", orgError);
    return;
  }
  
  for (const org of orgs) {
    const { data: assessments, error: asError } = await supabase
      .from('assessments')
      .select('id, title, status')
      .eq('organization_id', org.id);
      
    if (asError) console.error("Assessment error for org", org.name, asError);
    console.log(`Org: ${org.name} has ${assessments?.length || 0} assessments.`);
  }
}

check();
