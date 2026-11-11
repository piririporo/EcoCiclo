'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Button } from './ui/button';
import { db } from '@/lib/supabase';

export function AccountInvites() {
  const [link, setLink] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  async function issue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || sending.current) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    sending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    setLink('');
    try {
      const { data, error } = await db.rpc('issue_account_invite', {
        account_email: String(values.get('email') ?? '').trim(),
        account_name: String(values.get('name') ?? '').trim(),
      });
      if (error) throw error;
      if (typeof data !== 'string' || !/^[a-f0-9]{64}$/.test(data)) throw new Error('Resposta de convite inválida.');
      const activation = new URL('/conta/', window.location.origin);
      activation.hash = new URLSearchParams({ convite: data }).toString();
      setLink(activation.href);
      form.reset();
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
      setError(code === '23505' ? 'Já existe uma conta para este e-mail.' : 'Não foi possível gerar o convite. Confira os dados e tente novamente.');
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setNotice('Link copiado.');
    } catch {
      setNotice('Selecione e copie o link no campo acima.');
    }
  }

  return (
    <section className="panel staff-section" aria-labelledby="invites-heading">
      <h2 id="invites-heading">Convidar uma pessoa</h2>
      <p className="muted">Gere um link individual para a pessoa definir a própria senha. O link vence em 24 horas e só pode ser usado uma vez.</p>
      <form className="form-grid mt-4" onSubmit={issue} method="post" aria-busy={busy}>
        <label>Nome<input name="name" required minLength={2} maxLength={120} autoComplete="off" /></label>
        <label>E-mail<input name="email" type="email" required maxLength={254} autoComplete="off" /></label>
        <div className="span-2"><Button type="submit" disabled={busy}>{busy ? 'Gerando…' : 'Gerar convite'}</Button></div>
      </form>
      {error && <p className="form-error mt-4" role="alert">{error}</p>}
      {link && (
        <div className="form-grid mt-4">
          <label className="span-2">Link do convite<input readOnly value={link} onFocus={event => event.currentTarget.select()} /></label>
          <div className="span-2"><Button variant="outline" onClick={() => void copyLink()}>Copiar link</Button></div>
          <p className="muted span-2">Compartilhe o link em particular com a pessoa convidada.</p>
          {notice && <p className="span-2" role="status">{notice}</p>}
        </div>
      )}
    </section>
  );
}
