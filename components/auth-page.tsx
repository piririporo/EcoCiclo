'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FunctionsHttpError, isAuthError } from '@supabase/supabase-js';
import { ArrowRight, Camera, Eye, EyeOff, LogOut, Mail, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import { usePlatform } from './platform-provider';
import { db } from '@/lib/supabase';
import { errorMessage } from '@/lib/utils';
import { validatePhotos } from '@/lib/domain.mjs';

type Mode = 'login' | 'invite' | 'forgot';
const minimumPasswordLength = 12;
const copy = {
  login: ['Entre no EcoCiclo', 'Acesse sua conta para acompanhar equipamentos e encontrar componentes.', 'Entrar'],
  invite: ['Ative sua conta', 'Defina a senha da conta criada por convite da administração.', 'Ativar conta'],
  forgot: ['Recupere seu acesso', 'Enviaremos um link para redefinir sua senha.', 'Enviar link'],
  reset: ['Escolha uma nova senha', 'Use pelo menos 12 caracteres para proteger sua conta.', 'Salvar nova senha'],
};

function authErrorMessage(error: unknown, mode: Mode | 'reset') {
  if (isAuthError(error)) {
    if (error.status === 429) return 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.';
    if (error.code === 'weak_password') return 'Escolha uma senha mais forte com pelo menos 12 caracteres.';
    if (mode === 'login' && ['invalid_credentials', 'email_not_confirmed', 'user_banned'].includes(error.code ?? '')) {
      return 'Não foi possível entrar. Confira seu e-mail e sua senha e verifique se sua conta já foi ativada.';
    }
  }
  return mode === 'reset'
    ? 'Não foi possível concluir a redefinição. Tente novamente ou solicite outro link.'
    : 'Não foi possível concluir o pedido. Verifique sua conexão e tente novamente.';
}

export function AuthPage({ account = false }: { account?: boolean }) {
  const { session, user } = usePlatform();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [inviteToken, setInviteToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);
  const submitting = useRef(false);
  const activeMode = session.recovering ? 'reset' : mode;
  const newPassword = activeMode === 'reset' || activeMode === 'invite';
  const [title, description, action] = copy[activeMode];
  const ready = Boolean(db) && session.status !== 'checking' && session.status !== 'unavailable'
    && (!session.recovering || Boolean(session.user)) && (activeMode !== 'invite' || Boolean(inviteToken));

  useEffect(() => {
    if (!account) return;
    function readInvite() {
      const token = new URLSearchParams(window.location.hash.slice(1)).get('convite');
      if (token === null) return;
      setMode('invite');
      setSuccess('');
      if (/^[a-f0-9]{64}$/.test(token)) {
        setInviteToken(token);
        setError('');
      } else {
        setInviteToken('');
        setError('Este link de convite é inválido. Solicite um novo convite à administração.');
      }
    }
    readInvite();
    window.addEventListener('hashchange', readInvite);
    return () => window.removeEventListener('hashchange', readInvite);
  }, [account]);

  useEffect(() => {
    if (!account || session.status === 'checking') return;
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    if (url.searchParams.has('code') || url.searchParams.has('error') || hash.has('error')) {
      setError('O link expirou ou foi aberto em outro navegador. Solicite um novo link e abra-o neste navegador.');
      url.searchParams.delete('code');
      url.searchParams.delete('error');
      url.searchParams.delete('error_code');
      url.searchParams.delete('error_description');
      url.searchParams.delete('flow_id');
      url.hash = '';
      window.history.replaceState(window.history.state, '', url);
    }
  }, [account, session.status]);

  function changeMode(next: Mode) {
    if (mode === 'invite') {
      setInviteToken('');
      const url = new URL(window.location.href);
      url.hash = '';
      window.history.replaceState(window.history.state, '', url);
    }
    setMode(next);
    setShowPassword(false);
    setError('');
    setSuccess('');
  }

  async function finishRecovery(allDevices: boolean) {
    if (!db) return;
    const { error } = await db.auth.signOut({ scope: allDevices ? 'global' : 'local' });
    if (error) throw error;
    changeMode('login');
    setPasswordChanged(false);
    if (allDevices) setSuccess('Sua senha foi alterada. Entre novamente com a nova senha.');
  }

  async function cancelRecovery() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await finishRecovery(passwordChanged);
    } catch {
      setError('Não foi possível encerrar a sessão. Tente novamente.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !ready || submitting.current) return;
    setError('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const callback = new URL('/conta/', window.location.origin).href;

    if (newPassword && password.length < minimumPasswordLength) {
      setError('Use pelo menos 12 caracteres na nova senha.');
      return;
    }
    if (newPassword && new TextEncoder().encode(password).length > 72) {
      setError('A senha ficou longa demais. Tente reduzir o tamanho.');
      return;
    }
    if (newPassword && password !== form.get('confirmation')) {
      setError('As senhas precisam ser iguais.');
      return;
    }

    submitting.current = true;
    setBusy(true);
    try {
      switch (activeMode) {
        case 'login': {
          const { error } = await db.auth.signInWithPassword({ email, password });
          if (error) throw error;
          if (account) router.replace('/painel/');
          break;
        }
        case 'invite': {
          const { error } = await db.functions.invoke('activate-account', {
            body: { token: inviteToken, password },
          });
          if (error) throw error;
          changeMode('login');
          setSuccess('Conta ativada. Você já pode entrar com seu e-mail e sua senha.');
          break;
        }
        case 'forgot': {
          const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: callback });
          if (error && error.code !== 'user_not_found') throw error;
          setSuccess('Se houver uma conta para este endereço, você receberá um e-mail. Abra o link neste mesmo navegador.');
          break;
        }
        case 'reset': {
          if (!session.recovering || !session.user) return;
          const { error } = await db.auth.updateUser({ password });
          if (error) throw error;
          setPasswordChanged(true);
          await finishRecovery(true);
          break;
        }
      }
    } catch (error) {
      if (activeMode === 'invite' && error instanceof FunctionsHttpError) {
        const result = await error.context.json().catch(() => null);
        if (typeof result?.message === 'string') {
          setError(result.message);
          return;
        }
      }
      setError(authErrorMessage(error, activeMode));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (user && account && mode === 'login' && !success) return <ProfilePage key={user.id} onRecover={() => changeMode('forgot')} />;

  return (
    <main id="main" className="container auth-main">
      <aside className="auth-visual" aria-hidden="true">
        <h2>Uma nova vida para a tecnologia.</h2>
        <img src="/visuals/motherboard.svg" width="800" height="600" alt="" />
      </aside>
      <section className="auth-form-section" aria-labelledby="auth-title">
        <h1 id="auth-title">{title}</h1>
        <p>{description}</p>
        {session.status === 'unavailable' && (
          <div className="notice-box" role="status">
            O acesso está temporariamente indisponível.
            {db && <Button type="button" variant="outline" onClick={() => window.location.reload()}>Tentar novamente</Button>}
          </div>
        )}
        {success ? (
          <div className="success-panel" role="status">
            <Mail size={28} aria-hidden="true" />
            <p>{success}</p>
            <Button variant="outline" onClick={() => changeMode('login')}>{user ? 'Voltar ao perfil' : 'Voltar para entrar'}</Button>
          </div>
        ) : (
          <>
            {passwordChanged ? (
              <div className="notice-box">A senha foi alterada. Encerre as sessões para entrar novamente.</div>
            ) : (
              <form key={activeMode} method="post" onSubmit={submit} className="auth-form" aria-busy={busy}>
                {!newPassword && (
                  <label>
                    E-mail
                    <input name="email" autoComplete="username" type="email" required maxLength={254}
                      spellCheck={false} autoCapitalize="none" defaultValue={activeMode === 'forgot' ? user?.email : undefined} />
                  </label>
                )}
                {activeMode !== 'forgot' && (
                  <>
                    <div className="password-label">
                      <label htmlFor="auth-password">{newPassword ? 'Nova senha' : 'Senha'}</label>
                      {activeMode === 'login' && <button type="button" disabled={busy} onClick={() => changeMode('forgot')}>Esqueci minha senha</button>}
                    </div>
                    <div className="password-field">
                      <input id="auth-password" name="password" type={showPassword ? 'text' : 'password'}
                        autoComplete={activeMode === 'login' ? 'current-password' : 'new-password'}
                        required minLength={newPassword ? minimumPasswordLength : undefined}
                        maxLength={newPassword ? 72 : 128} aria-describedby={activeMode === 'invite' ? 'auth-password-help' : undefined} />
                      <button type="button" className="icon-button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        onClick={() => setShowPassword(value => !value)}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </>
                )}
                {activeMode === 'invite' && <small id="auth-password-help" className="muted">Use pelo menos 12 caracteres.</small>}
                {newPassword && (
                  <label>
                    Confirme a nova senha
                    <input name="confirmation" type="password" autoComplete="new-password" required minLength={minimumPasswordLength} maxLength={72} />
                  </label>
                )}
                {activeMode === 'invite' && (
                  <label className="checkbox-label">
                    <input type="checkbox" required />
                    <span>Li e aceito os <Link href="/termos/" target="_blank" rel="noopener noreferrer">termos de uso</Link> e a <Link href="/privacidade/" target="_blank" rel="noopener noreferrer">política de privacidade</Link>.</span>
                  </label>
                )}
                {error && <p className="form-error" role="alert">{error}</p>}
                <Button type="submit" size="lg" className="full-width" disabled={busy || !ready}>
                  {busy ? 'Aguarde…' : session.status === 'checking' ? 'Verificando sessão…' : action}
                  <ArrowRight size={17} aria-hidden="true" />
                </Button>
              </form>
            )}
            {passwordChanged && error && <p className="form-error" role="alert">{error}</p>}
            <div className="auth-switch">
              {activeMode === 'login' ? (
                <span>Precisa de acesso? Solicite um convite à administração.</span>
              ) : activeMode === 'reset' ? (
                <button type="button" disabled={busy || !ready} onClick={() => void cancelRecovery()}>
                  {passwordChanged ? 'Encerrar sessões' : 'Cancelar redefinição'}
                </button>
              ) : (
                <button type="button" disabled={busy} onClick={() => changeMode('login')}>{user ? 'Voltar ao perfil' : 'Voltar para entrar'}</button>
              )}
            </div>
          </>
        )}
        <div className="auth-security"><ShieldCheck size={15} aria-hidden="true" />Acesso por convite</div>
      </section>
    </main>
  );
}

function ProfilePage({ onRecover }: { onRecover: () => void }) {
 const p=usePlatform();
 const [busy,setBusy]=useState(false),[avatar,setAvatar]=useState(''),[profile,setProfile]=useState({city:'',bio:''});
 useEffect(()=>{if(!p.user||!db)return;void db.from('profiles').select('city,bio,avatar_path').eq('id',p.user.id).maybeSingle().then(async({data})=>{if(!data)return;setProfile({city:data.city??'',bio:data.bio??''});if(data.avatar_path){const image=await db!.storage.from('avatars').createSignedUrl(data.avatar_path,600);if(image.data)setAvatar(image.data.signedUrl);}});},[p.user?.id]);
 async function saveProfile(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!p.user||!db)return;setBusy(true);const data=new FormData(e.currentTarget);try{const {error}=await db.from('profiles').update({display_name:String(data.get('name')).trim(),city:String(data.get('city')??''),bio:String(data.get('bio')??'')}).eq('id',p.user.id);if(error)throw error;const {error:authError}=await db.auth.updateUser({data:{display_name:String(data.get('name')).trim()}});if(authError)throw authError;p.notify('Seu perfil foi atualizado.');await p.refresh();}catch(e){p.notify(errorMessage(e));}finally{setBusy(false);}}
 if(!p.user)return null;
 return <main id="main" className="container page-main"><div className="page-header"><span className="section-kicker">Cada ciclo tem uma história</span><h1>Seu perfil.</h1><p>Cuide das informações da sua conta.</p></div><div className="profile-layout"><aside className="profile-card"><div className="profile-avatar">{avatar?<img src={avatar} alt="Sua foto de perfil" width="88" height="88"/>:(p.user.user_metadata?.display_name??p.user.email??'E').charAt(0).toUpperCase()}</div><h2>{p.user.user_metadata?.display_name??'Minha conta'}</h2><p>{p.user.email}</p><label className="button button-outline"><Camera size={17}/>Alterar foto<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={async e=>{const f=e.target.files?.[0];if(!f||!p.user||!db)return;const invalid=validatePhotos([f]);if(invalid){p.notify(invalid);return;}const path=p.user.id+'/'+crypto.randomUUID()+'.'+f.type.split('/')[1];const {error}=await db.storage.from('avatars').upload(path,f,{contentType:f.type});if(error){p.notify(errorMessage(error));return;}const {error:saveError}=await db.from('profiles').update({avatar_path:path}).eq('id',p.user.id);if(saveError){p.notify(errorMessage(saveError));return;}const {data}=await db.storage.from('avatars').createSignedUrl(path,600);if(data)setAvatar(data.signedUrl);p.notify('Foto atualizada.');}}/></label><Link className="text-link" href="/painel/">Acessar meu painel <ArrowRight size={15}/></Link><Button variant="ghost" onClick={()=>void p.signOut()}><LogOut size={17}/>Sair da conta</Button></aside><form className="panel form-grid" onSubmit={saveProfile}><h2 className="span-2">Informações pessoais</h2><label className="span-2">Nome<input name="name" defaultValue={p.user.user_metadata?.display_name??''} required minLength={2} maxLength={120} autoComplete="name"/></label><label className="span-2">E-mail<input value={p.user.email??''} readOnly type="email"/></label><label className="span-2">Cidade<input name="city" maxLength={100} autoComplete="address-level2" value={profile.city} onChange={e=>setProfile({...profile,city:e.target.value})}/></label><label className="span-2">Sobre você<textarea name="bio" rows={3} maxLength={500} value={profile.bio} onChange={e=>setProfile({...profile,bio:e.target.value})} placeholder="Conte um pouco sobre seus projetos…"/></label><Button type="submit" disabled={busy}>{busy?'Salvando…':'Salvar alterações'}</Button><Button variant="outline" onClick={onRecover} type="button">Redefinir senha</Button></form></div></main>;
}
