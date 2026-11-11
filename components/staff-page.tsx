'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { ShieldCheck,ClipboardCheck,Plus,ArrowRight,ArrowUpRight,Recycle,Flag,Users,Package,FileText,CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/supabase';
import { usePlatform } from './platform-provider';
import { AccountInvites } from './account-invites';
import { AccountRequired,labelFor } from './dashboard';
import { Button } from './ui/button';
import { Modal } from './ui/dialog';
import { date,errorMessage } from '@/lib/utils';
import { categories } from '@/lib/domain.mjs';
import type { Device } from '@/lib/types';
type StaffRecord={id:string;[key:string]:unknown};
const initialComponent=()=>({name:'',category:'Memórias RAM',brand:'',model:'',condition:'Bom',result:'approved',procedure:'',notes:'',mass_grams:'',specificationsText:''});
export function StaffPage({admin=false}:{admin?:boolean}){const p=usePlatform();const allowed=admin?p.roles.includes('admin'):p.roles.some(x=>['admin','technician'].includes(x));const [loadError,setLoadError]=useState('');const [devices,setDevices]=useState<Device[]>([]),[profiles,setProfiles]=useState<StaffRecord[]>([]),[roles,setRoles]=useState<{user_id:string;role:string}[]>([]),[reports,setReports]=useState<StaffRecord[]>([]),[logs,setLogs]=useState<StaffRecord[]>([]),[partners,setPartners]=useState<StaffRecord[]>([]),[requests,setRequests]=useState<StaffRecord[]>([]),[listings,setListings]=useState<StaffRecord[]>([]),[selected,setSelected]=useState<Device|null>(null),[photos,setPhotos]=useState<string[]>([]),[items,setItems]=useState([initialComponent()]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(signal?: AbortSignal) {
  if (!allowed || !db) return;
  setLoadError('');
  const devicesQuery = db.from('devices').select('*').neq('status', 'draft').order('created_at');
  const result = await (signal ? devicesQuery.abortSignal(signal) : devicesQuery);
  if (signal?.aborted) return;
  if (result.error) {
   setLoadError('Não foi possível carregar as avaliações.');
  } else {
   setDevices(result.data ?? []);
  }
  if (!admin) return;
  const abortSignal = signal ?? new AbortController().signal;
  const [users, permissions, reports, audit, partners, requests, listings] = await Promise.all([
   db.from('profiles').select('id,display_name').order('created_at', { ascending: false }).limit(100).abortSignal(abortSignal),
   db.from('user_roles').select('user_id,role').abortSignal(abortSignal),
   db.from('reports').select('*').order('created_at', { ascending: false }).limit(100).abortSignal(abortSignal),
   db.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50).abortSignal(abortSignal),
   db.from('recycling_partners').select('*').abortSignal(abortSignal),
   db.from('recycling_requests').select('*').order('created_at', { ascending: false }).abortSignal(abortSignal),
   db.from('product_listings').select('*').order('created_at', { ascending: false }).limit(100).abortSignal(abortSignal),
  ]);
  if (signal?.aborted) return;
  if ([users, permissions, reports, audit, partners, requests, listings].some(result => result.error)) {
   setLoadError('Parte dos dados administrativos não pôde ser carregada.');
  }
  setProfiles(users.data ?? []);
  setRoles(permissions.data ?? []);
  setReports(reports.data ?? []);
  setLogs(audit.data ?? []);
  setPartners(partners.data ?? []);
  setRequests(requests.data ?? []);
  setListings(listings.data ?? []);
 }

 useEffect(() => {
  if (!allowed) return;
  const controller = new AbortController();
  void load(controller.signal);
  return () => controller.abort();
 }, [allowed, admin, p.user?.id]);

 if (p.loading) return <main id="main" className="container page-main"><div className="skeleton-card" role="status" aria-label="Carregando permissões" /></main>;
 if (!p.user) return <AccountRequired title="Entre para acessar o espaço de profissionais." />;
 if (!p.rolesReady) return <main id="main" className="container page-main"><h1>Não foi possível verificar suas permissões.</h1><Button onClick={() => void p.refresh()}>Tentar novamente</Button></main>;
 if (!allowed) return (
  <main id="main" className="container page-main">
   <div className="account-required">
    <span className="round-symbol"><ShieldCheck size={36} /></span>
    <h1>{admin ? 'Acesso exclusivo da administração.' : 'Acesso restrito à equipe técnica.'}</h1>
    <Button asChild className="mt-4"><Link href="/painel/">Voltar ao meu painel <ArrowRight size={16} /></Link></Button>
   </div>
  </main>
 );
 async function open(d:Device){setSelected(d);setItems([initialComponent()]);setError('');setPhotos([]);const {data,error}=await db!.from('device_images').select('storage_path').eq('device_id',d.id);if(error){setError(errorMessage(error));return;}const signed=await db!.storage.from('device-images').createSignedUrls((data??[]).map(x=>x.storage_path),600);setPhotos((signed.data??[]).filter(x=>!x.error&&x.signedUrl).map(x=>x.signedUrl!));}
 async function evaluate(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!selected)return;setBusy(true);setError('');try{const evaluated=items.map(x=>{const specs:Record<string,string>={};for(const line of x.specificationsText.split('\n').filter(Boolean)){const at=line.indexOf(':');if(at<1)throw Error('Use uma especificação por linha no formato Campo: valor.');specs[line.slice(0,at).trim()]=line.slice(at+1).trim();}return {...x,mass_grams:Number(x.mass_grams)||0,specifications:specs};});const {error}=await db!.rpc('record_evaluation',{device_uuid:selected.id,evaluation_components:evaluated});if(error)throw error;await load();await p.refresh();setSelected(null);p.notify('Avaliação e componentes registrados.');}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 async function action(work: PromiseLike<{ error: unknown }>, message: string) {
  setBusy(true);
  try {
   const { error } = await work;
   if (error) throw error;
   await Promise.all([load(), p.refresh()]);
   p.notify(message);
   return true;
  } catch (error) {
   p.notify(errorMessage(error));
   return false;
  } finally {
   setBusy(false);
  }
 }
 async function addPartner(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;const f=new FormData(form);const saved=await action(db!.from('recycling_partners').insert({name:f.get('name'),city:f.get('city'),description:f.get('description'),user_id:f.get('user_id')||null}),'Parceiro cadastrado.');if(saved)form.reset();}
 async function recordRecycling(e:React.FormEvent<HTMLFormElement>,r:StaffRecord){e.preventDefault();const f=new FormData(e.currentTarget);const next=r.status==='awaiting'?'requested':r.status==='requested'?'received':'confirmed';let proof:string|null=null;if(next==='confirmed'){const file=f.get('proof') as File;if(!file?.size||file.size>5*1024*1024||!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)){p.notify('Envie um comprovante PDF ou imagem de até 5 MB.');return;}proof=`${p.user!.id}/${r.id}/${crypto.randomUUID()}.${file.type.split('/')[1]}`;const {error}=await db!.storage.from('recycling-proofs').upload(proof,file,{contentType:file.type});if(error){p.notify(errorMessage(error));return;}}await action(db!.rpc('advance_recycling',{request_uuid:r.id,new_status:next,mass:next==='confirmed'?Number(f.get('mass')):null,proof}),'Encaminhamento atualizado.');}
 const pending=devices.filter(x=>['awaiting_technical','in_review'].includes(x.status));
 return <main id="main" className="container page-main"><div className="dashboard-heading"><div><span className="section-kicker">{admin?'Gestão responsável':'Profissionais que confirmam possibilidades'}</span><h1>{admin?'Administração.':'Painel técnico.'}</h1><p>{admin?'Pessoas, avaliações e destinos em um só lugar.':'Registre testes reais e mantenha cada decisão rastreável.'}</p></div><Button asChild variant="outline"><Link href="/painel/">Meu painel <ArrowUpRight size={16}/></Link></Button></div>{loadError&&<div className="notice-box" role="alert">{loadError} <Button variant="outline" onClick={()=>void load()}>Tentar novamente</Button></div>}<div className="staff-kpis"><div className="panel"><ClipboardCheck size={22}/><strong>{pending.length}</strong><span>Avaliações pendentes</span></div><div className="panel"><Package size={22}/><strong>{p.metrics.recovered}</strong><span>Componentes aprovados</span></div>{admin&&<div className="panel"><Users size={22}/><strong>{profiles.length}</strong><span>Perfis recentes</span></div>}<div className="panel"><Recycle size={22}/><strong>{p.metrics.recycled_kg} kg</strong><span>Destinação confirmada</span></div></div><section className="staff-section"><h2>Avaliações aguardando seu olhar</h2>{pending.length?<div className="device-list">{pending.map(d=><div className="device-row" key={d.id}><ClipboardCheck size={25}/><div><strong>{d.brand} {d.model||d.type}</strong><span>{d.defect}</span></div><span className="badge">{labelFor(d.status)}</span><Button size="sm" variant="outline" onClick={()=>void open(d)}>Avaliar <ArrowRight size={14}/></Button></div>)}</div>:<div className="empty"><CheckCircle2 size={33}/><h3>Nenhuma avaliação pendente.</h3><p>Novos equipamentos enviados para avaliação aparecerão aqui.</p></div>}</section>{admin&&<><AccountInvites/><div className="staff-grid"><section className="panel staff-section"><h2>Pessoas e permissões</h2><p className="muted tiny">O administrador principal gerencia o acesso de outros administradores. Alterações de permissões ficam registradas na auditoria.</p><div className="staff-list">{profiles.map(u=><div className="staff-item" key={u.id}><div><strong>{String(u.display_name)}</strong><small>{roles.some(r=>r.user_id===u.id&&r.role==='primary_admin')?'Administrador principal':u.id.slice(0,8)}</small></div>{['technician','admin','recycler'].map(role=><label key={role} className="checkbox-label"><input type="checkbox" disabled={busy||(role==='admin'&&(!p.roles.includes('primary_admin')||u.id===p.user?.id))} checked={roles.some(r=>r.user_id===u.id&&r.role===role)} onChange={e=>{if(role==='admin'&&!confirm('Confirmar alteração de acesso administrativo?'))return;void action(db!.rpc('grant_role',{target_user:u.id,new_role:role,enabled:e.target.checked}),'Permissões atualizadas.');}}/><span>{role==='technician'?'Técnico':role==='admin'?'Administração':'Parceiro'}</span></label>)}</div>)}</div>{!profiles.length&&<p className="muted">Sem perfis cadastrados.</p>}</section><section className="panel staff-section"><h2>Denúncias de anúncios</h2>{reports.length?reports.map(r=><div className="staff-item" key={r.id}><Flag size={18}/><div><strong>{String(r.reason)}</strong><small>{String(r.status)} · {date(String(r.created_at))}</small></div>{r.status==='pending'&&<Button size="sm" variant="outline" onClick={()=>void action(db!.from('reports').update({status:'reviewed'}).eq('id',r.id),'Denúncia revisada.')}>Revisado</Button>}</div>):<div className="empty compact"><ShieldCheck size={28}/><p>Nenhuma denúncia recebida.</p></div>}</section><section className="panel staff-section"><h2>Parceiros de reciclagem</h2><form className="auth-form" onSubmit={addPartner}><label>Nome do parceiro<input name="name" required minLength={2} maxLength={180}/></label><label>Cidade / UF<input name="city" required minLength={2} maxLength={100}/></label><label>Conta responsável (UUID, opcional)<input name="user_id" pattern="[0-9a-fA-F-]{36}" placeholder="Identificador da conta verificada…"/></label><label>Informações de recebimento<textarea name="description" rows={2} maxLength={1000}/></label><Button type="submit" disabled={busy}><Plus size={16}/>Cadastrar parceiro</Button></form><div className="staff-list">{partners.map(x=><div className="staff-item" key={x.id}><Recycle size={20}/><div><strong>{String(x.name)}</strong><p>{String(x.city)}</p></div><span className="badge">{x.active?'Ativo':'Inativo'}</span></div>)}</div></section><section className="panel staff-section"><h2>Catálogo e moderação</h2>{listings.length?listings.map(l=><div className="staff-item" key={l.id}><Package size={20}/><div><strong>{String(l.title)}</strong><small>{String(l.status)} · {String(l.quantity)} unidade(s)</small></div><Button size="sm" variant="outline" onClick={()=>void action(db!.from('product_listings').update({status:l.status==='published'?'paused':'published'}).eq('id',l.id),'Anúncio atualizado.')}>{l.status==='published'?'Pausar':'Publicar'}</Button></div>):<p className="muted tiny">Nenhum anúncio publicado ainda.</p>}</section></div><section className="staff-section"><h2>Encaminhamentos e comprovantes</h2>{requests.length?requests.map(r=><article key={r.id} className="panel mt-4"><div className="row-between"><strong>Solicitação #{r.id.slice(0,8)}</strong><span className="badge">{labelFor(String(r.status))}</span></div>{!r.partner_id?<form className="form-grid mt-4" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void action(db!.rpc('assign_recycling',{request_uuid:r.id,partner_uuid:f.get('partner')}),'Parceiro vinculado.');}}><label>Parceiro<select name="partner" required><option value="">Selecione…</option>{partners.filter(p=>p.active).map(x=><option key={x.id} value={x.id}>{String(x.name)}</option>)}</select></label><Button type="submit" disabled={busy}>Vincular parceiro</Button></form>:r.status!=='confirmed'&&<form className="form-grid mt-4" onSubmit={e=>void recordRecycling(e,r)}>{r.status==='received'&&<><label>Massa recebida (g)<input name="mass" type="number" step="0.001" min="0.001" required/></label><label>Comprovante<input name="proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required/></label></>}<Button type="submit" disabled={busy}>{r.status==='awaiting'?'Confirmar encaminhamento':r.status==='requested'?'Confirmar recebimento':'Confirmar destinação documentada'}<ArrowRight size={16}/></Button></form>}</article>):<div className="empty compact"><Recycle size={28}/><p>Nenhum encaminhamento registrado.</p></div>}</section><section className="panel staff-section"><h2>Histórico de auditoria</h2><div className="staff-list">{logs.map(l=><div className="staff-item" key={String(l.id)}><FileText size={18}/><div><strong>{String(l.table_name)} · {String(l.action)}</strong><small>Responsável: {l.actor_id?String(l.actor_id).slice(0,8):'Sistema'} · Registro: {String(l.record_id??'').slice(0,8)} · {date(String(l.created_at))}</small></div></div>)}</div></section></>}<Modal open={!!selected} onOpenChange={o=>!o&&setSelected(null)} title="Registrar avaliação técnica" description="Confirme as condições de cada componente com testes reais." wide>{selected&&<><div className="notice-box"><ShieldCheck size={20}/><span>{selected.brand} {selected.model||selected.type} · Relato: {selected.defect}</span></div><div className="photo-preview-grid">{photos.map(src=><a href={src} target="_blank" rel="noreferrer" key={src}><img src={src} width="180" height="135" alt="Fotografia do equipamento para avaliação"/></a>)}</div><form className="auth-form" onSubmit={evaluate}>{items.map((item,index)=><div className="panel form-grid" key={index}><h3 className="span-2">Componente {index+1}</h3>{[{field:'name',label:'Nome do componente',required:true},{field:'brand',label:'Marca'},{field:'model',label:'Modelo'}].map(x=><label key={x.field}>{x.label}<input required={x.required} minLength={x.required?2:undefined} maxLength={160} value={item[x.field as keyof typeof item]} onChange={e=>setItems(old=>old.map((v,i)=>i===index?{...v,[x.field]:e.target.value}:v))}/></label>)}<label>Categoria<select value={item.category} onChange={e=>setItems(old=>old.map((v,i)=>i===index?{...v,category:e.target.value}:v))}>{[...categories.slice(1),'Outros'].map((c:string)=><option key={c}>{c}</option>)}</select></label><label>Estado<select value={item.condition} onChange={e=>setItems(old=>old.map((v,i)=>i===index?{...v,condition:e.target.value}:v))}><option>Excelente</option><option>Bom</option><option>Marcas de uso</option></select></label><label>Resultado<select value={item.result} onChange={e=>setItems(old=>old.map((v,i)=>i===index?{...v,result:e.target.value}:v))}><option value="approved">Aprovado para reutilização</option><option value="rejected">Reprovado</option></select></label><label>Massa medida (g)<input type="number" min="0" step="0.001" value={item.mass_grams} onChange={e=>setItems(old=>old.map((v,i)=>i===index?{...v,mass_grams:e.target.value}:v))}/></label><label className="span-2">Procedimento e resultado dos testes<textarea required minLength={10} maxLength={4000} rows={3} value={item.procedure} onChange={e=>setItems(old=>old.map((v,i)=>i===index?{...v,procedure:e.target.value}:v))}/></label><label className="span-2">Especificações verificadas (Campo: valor, uma por linha)<textarea rows={3} placeholder={'Tipo: DDR4\nCapacidade: 8 GB\nFormato: SODIMM'} value={item.specificationsText} onChange={e=>setItems(old=>old.map((v,i)=>i===index?{...v,specificationsText:e.target.value}:v))}/></label><label className="span-2">Observações<textarea rows={2} maxLength={4000} value={item.notes} onChange={e=>setItems(old=>old.map((v,i)=>i===index?{...v,notes:e.target.value}:v))}/></label>{items.length>1&&<Button variant="ghost" type="button" onClick={()=>setItems(old=>old.filter((_,i)=>i!==index))}>Remover este componente</Button>}</div>)}{items.length<20&&<Button variant="outline" type="button" onClick={()=>setItems(old=>[...old,initialComponent()])}><Plus size={16}/>Adicionar componente avaliado</Button>}{error&&<div className="form-error" role="alert">{error}</div>}<label className="checkbox-label"><input type="checkbox" required/><span>Confirmo que realizei os testes registrados e que as informações refletem a avaliação real.</span></label><Button disabled={busy} type="submit">{busy?'Registrando…':'Concluir avaliação documentada'}<ClipboardCheck size={16}/></Button><Button variant="ghost" type="button" onClick={()=>void action(db!.rpc('request_retest',{device_uuid:selected.id}),'Avaliação marcada como em andamento.')}>Solicitar novos testes antes de concluir</Button></form></>}</Modal></main>;
}
