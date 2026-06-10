const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tbphsksvkglnftxpfjyz.supabase.co'; // Reemplaza con tu URL
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicGhza3N2a2dsbmZ0eHBmanl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY4NzYyMywiZXhwIjoyMDg2MjYzNjIzfQ.6uizpcw1aIGWD3htNqhnXj8S2SE7XuihPGNx26khwPs'; // Reemplaza con tu service_role key

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function resetPassword() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    'bcf15c70-e3da-42d2-95a5-dc60554a423b',
    { password: 'Safety656' }
  );

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Contraseña actualizada correctamente:', data);
  }
}

resetPassword();