'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { db } from '@/lib/supabase';
import { emptyMetrics, type Listing, type Metrics } from '@/lib/types';
import { errorMessage } from '@/lib/utils';
import { useSession } from './use-session';

type CartItem = { id: string; listing_id: string; quantity: number };
type PlatformData = {
  owner: string;
  roles: string[];
  rolesReady: boolean;
  dataReady: boolean;
  listings: Listing[];
  metrics: Metrics;
  favorites: string[];
  cart: CartItem[];
};
type Platform = {
  session: ReturnType<typeof useSession>;
  user: ReturnType<typeof useSession>['user'];
  roles: string[];
  rolesReady: boolean;
  loading: boolean;
  dataReady: boolean;
  listings: Listing[];
  metrics: Metrics;
  favorites: string[];
  cart: CartItem[];
  notice: string;
  notify: (message: string) => void;
  refresh: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  addToCart: (id: string) => Promise<void>;
  setCartQuantity: (id: string, quantity: number) => Promise<void>;
  signOut: () => Promise<void>;
};

const Context = createContext<Platform | null>(null);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const user = session.recovering ? null : session.user;
  const userId = user?.id;
  const [data, setData] = useState<PlatformData | null>(null);
  const [notice, setNotice] = useState('');
  const request = useRef<AbortController | null>(null);
  const current = data?.owner === userId ? data : null;
  const { roles = [], rolesReady = false, dataReady = false, listings = [], metrics = emptyMetrics,
    favorites = [], cart = [] } = current ?? {};
  const loading = session.status === 'checking' || Boolean(userId && !current);
  const notify = useCallback((message: string) => setNotice(message), []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const refresh = useCallback(async () => {
    if (!db || !userId) return;

    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const { signal } = controller;

    const [catalog, impact, permissions, saved, items] = await Promise.all([
      db.from('product_listings').select('*').eq('status', 'published').gt('quantity', 0)
        .order('created_at', { ascending: false }).limit(200).abortSignal(signal),
      db.rpc('impact_metrics').abortSignal(signal),
      db.from('user_roles').select('role').eq('user_id', userId).abortSignal(signal),
      db.from('favorites').select('listing_id').eq('user_id', userId).abortSignal(signal),
      db.from('cart_items').select('id,listing_id,quantity').eq('user_id', userId).abortSignal(signal),
    ]);

    if (signal.aborted) return;
    setData({
      owner: userId,
      roles: (permissions.data ?? []).map(row => row.role),
      rolesReady: !permissions.error,
      dataReady: !catalog.error && !impact.error,
      listings: catalog.data ?? [],
      metrics: (impact.data as Metrics | null) ?? emptyMetrics,
      favorites: (saved.data ?? []).map(row => row.listing_id),
      cart: items.data ?? [],
    });
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setData(null);
      return;
    }

    void refresh();
    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => {
      request.current?.abort();
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, [refresh, userId]);

 async function toggleFavorite(id:string){if(!user){notify('Entre na sua conta para salvar favoritos.');return;}if(!db)return;const saved=favorites.includes(id);const {error}=saved?await db.from('favorites').delete().eq('user_id',user.id).eq('listing_id',id):await db.from('favorites').insert({user_id:user.id,listing_id:id});if(error){notify(errorMessage(error));return;}setData(previous=>previous?.owner===user.id?{...previous,favorites:saved?previous.favorites.filter(value=>value!==id):[...previous.favorites,id]}:previous);notify(saved?'Removido dos favoritos.':'Componente salvo nos favoritos.');}
 async function addToCart(id:string){if(!user){notify('Entre na sua conta para adicionar ao carrinho.');return;}if(!db)return;const old=cart.find(x=>x.listing_id===id),listing=listings.find(x=>x.id===id);if(!listing||listing.seller_id===user.id){notify('Você não pode comprar seu próprio componente.');return;}const quantity=(old?.quantity??0)+1;if(quantity>listing.quantity){notify('Você já adicionou todo o estoque disponível.');return;}const {error}=await db.from('cart_items').upsert({...(old?{id:old.id}:{}),user_id:user.id,listing_id:id,quantity},{onConflict:'user_id,listing_id'});if(error){notify(errorMessage(error));return;}await refresh();notify('Componente adicionado ao carrinho.');}
 async function setCartQuantity(id:string,n:number){if(!db||!user)return;const {error}=n<1?await db.from('cart_items').delete().eq('id',id).eq('user_id',user.id):await db.from('cart_items').update({quantity:n}).eq('id',id).eq('user_id',user.id);if(error)notify(errorMessage(error));else await refresh();}

  async function signOut() {
    if (!db) return;
    const { error } = await db.auth.signOut({ scope: 'local' });
    if (error) {
      notify('Não foi possível sair. Tente novamente.');
      return;
    }
    request.current?.abort();
    setData(null);
    notify('Você saiu da conta.');
  }

  return (
    <Context.Provider value={{
      session, user, roles, rolesReady, loading, dataReady, listings, metrics, favorites, cart,
      notice, notify, refresh, toggleFavorite, addToCart, setCartQuantity, signOut,
    }}>
      {children}
      <div className={`toast ${notice ? 'toast-show' : ''}`} role="status" aria-live="polite">{notice}</div>
    </Context.Provider>
  );
}

export function usePlatform() {
  const platform = useContext(Context);
  if (!platform) throw Error('PlatformProvider missing');
  return platform;
}
