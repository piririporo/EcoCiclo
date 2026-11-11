'use client';

import { usePathname } from 'next/navigation';
import { AuthPage } from './auth-page';
import { usePlatform } from './platform-provider';
import { Shell } from './shell';

export function AccessGate({ children }: { children: React.ReactNode }) {
  const route = usePathname().replace(/\/$/, '');
  const { user, session } = usePlatform();
  const account = route === '/conta';
  const legal = route === '/termos' || route === '/privacidade';
  const showAuth = account || (!user && (!legal || session.recovering));

  return (
    <Shell key={user?.id ?? 'access'} restricted={!user}>
      {showAuth ? <AuthPage account={account} /> : children}
    </Shell>
  );
}
