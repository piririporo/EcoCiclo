import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
const allowedOrigins=['https://ecociclo-tech.gustavokingbs.chatgpt.site','http://localhost:3000'];
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')??'';
 const cors={'Access-Control-Allow-Origin':allowedOrigins.includes(origin)?origin:allowedOrigins[0],'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Vary':'Origin'};
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method!=='POST')return json({error:'Método não permitido.'},405);
 if(!req.headers.get('authorization'))return json({error:'Entre na sua conta.'},401);
 const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('authorization')!}}});
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)return json({error:'Sessão inválida.'},401);
 let deviceId:string;try{const body=await req.json();deviceId=body.device_id;if(typeof deviceId!=='string'||!/^[0-9a-f-]{36}$/i.test(deviceId))throw Error();}catch{return json({error:'Informe um equipamento válido.'},400);}
 const {data:device}=await supabase.from('devices').select('id,owner_id').eq('id',deviceId).eq('owner_id',user.id).maybeSingle();
 if(!device)return json({error:'Equipamento não encontrado.'},404);
 // Provider adapter intentionally starts disabled. No image leaves private storage without configuration.
 return json({status:'unavailable',code:'AI_PROVIDER_NOT_CONFIGURED',message:'A análise automatizada está indisponível. Seu equipamento pode seguir para avaliação técnica.'},503);
});
