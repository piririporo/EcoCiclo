import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

const url = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const admin = url && serviceKey ? createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
}) : null;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};

function reply(status: number, message: string) {
  return Response.json({ message }, { status, headers });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply(405, 'Método não permitido.');
  if (!admin) return reply(503, 'Ativação temporariamente indisponível.');

  let input: { token?: unknown; password?: unknown } | null;
  try {
    input = await request.json();
  } catch {
    return reply(400, 'Dados de ativação inválidos.');
  }

  const { token, password } = input ?? {};
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return reply(400, 'Convite inválido, expirado ou já utilizado.');
  }
  if (typeof password !== 'string' || password.length < 12 || new TextEncoder().encode(password).length > 72) {
    return reply(400, 'Use uma senha com pelo menos 12 caracteres e até 72 bytes.');
  }

  const { data, error } = await admin.rpc('find_account_invite', { invite_token: token }).maybeSingle<{
    id: string;
    email: string;
    display_name: string;
  }>();
  if (error) return reply(503, 'Não foi possível verificar o convite. Tente novamente.');
  if (!data) return reply(400, 'Convite inválido, expirado ou já utilizado.');

  const created = await admin.auth.admin.createUser({
    email: data.email,
    password,
    email_confirm: true,
    app_metadata: { ecociclo_invite_id: data.id },
    user_metadata: { display_name: data.display_name },
  });
  if (created.error) {
    return reply(409, 'Não foi possível ativar a conta. Se já definiu a senha, tente entrar.');
  }

  return reply(201, 'Conta ativada.');
});
