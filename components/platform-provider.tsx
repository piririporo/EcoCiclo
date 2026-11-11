'use client';
import { createContext,useCallback,useContext,useEffect,useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { db } from '@/lib/supabase';
import type { Listing,Metrics } from '@/lib/types';
import { emptyMetrics } from '@/lib/types';
import { errorMessage } from '@/lib/utils';
type CartItem={id:string;listing_id:string;quantity:number};
type Platform={user:User|null;roles:string[];loading:boolean;dataReady:boolean;listings:Listing[];metrics:Metrics;favorites:string[];cart:CartItem[];notice:string;notify:(s:string)=>void;refresh:()=>Promise<void>;toggleFavorite:(id:string)=>Promise<void>;addToCart:(id:string)=>Promise<void>;setCartQuantity:(id:string,n:number)=>Promise<void>;signOut:()=>Promise<void>};
const Context=createContext<Platform|null>(null);
export function PlatformProvider({children}:{children:React.ReactNode}){
 const [user,setUser]=useState<User|null>(null),[roles,setRoles]=useState<string[]>([]),[loading,setLoading]=useState(true),[dataReady,setDataReady]=useState(false),[listings,setListings]=useState<Listing[]>([]),[metrics,setMetrics]=useState<Metrics>(emptyMetrics),[favorites,setFavorites]=useState<string[]>([]),[cart,setCart]=useState<CartItem[]>([]),[notice,setNotice]=useState('');
 const notify=useCallback((s:string)=>setNotice(s),[]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),6000);return()=>clearTimeout(t);},[notice]);
 const refresh=useCallback(async()=>{
  if(!db){setLoading(false);return;}
  try{
   const [publicListings,impact,auth]=await Promise.all([db.from('product_listings').select('*').eq('status','published').gt('quantity',0).order('created_at',{ascending:false}).limit(200),db.rpc('impact_metrics'),db.auth.getUser()]);
   if(publicListings.error)throw publicListings.error;
   setDataReady(true);setListings(publicListings.data??[]);if(impact.data)setMetrics(impact.data as Metrics);
   const current=auth.data?.user??null;setUser(current);
   if(current){const [r,f,c]=await Promise.all([db.from('user_roles').select('role').eq('user_id',current.id),db.from('favorites').select('listing_id').eq('user_id',current.id),db.from('cart_items').select('id,listing_id,quantity').eq('user_id',current.id)]);setRoles((r.data??[]).map(x=>x.role));setFavorites((f.data??[]).map(x=>x.listing_id));setCart(c.data??[]);}else{setRoles([]);setFavorites([]);setCart([]);}
  }catch(e){setDataReady(false);console.error('EcoCiclo data refresh failed',errorMessage(e));}finally{setLoading(false);}
 },[notify]);
 useEffect(()=>{void refresh();const sub=db?.auth.onAuthStateChange(()=>{setTimeout(()=>{void refresh();},0);});return()=>sub?.data.subscription.unsubscribe();},[refresh]);
 async function toggleFavorite(id:string){if(!user){notify('Entre na sua conta para salvar favoritos.');return;}if(!db)return;const saved=favorites.includes(id);const {error}=saved?await db.from('favorites').delete().eq('user_id',user.id).eq('listing_id',id):await db.from('favorites').insert({user_id:user.id,listing_id:id});if(error){notify(errorMessage(error));return;}setFavorites(x=>saved?x.filter(v=>v!==id):[...x,id]);notify(saved?'Removido dos favoritos.':'Componente salvo nos favoritos.');}
 async function addToCart(id:string){if(!user){notify('Entre na sua conta para adicionar ao carrinho.');return;}if(!db)return;const old=cart.find(x=>x.listing_id===id),listing=listings.find(x=>x.id===id);if(!listing||listing.seller_id===user.id){notify('Você não pode comprar seu próprio componente.');return;}const quantity=(old?.quantity??0)+1;if(quantity>listing.quantity){notify('Você já adicionou todo o estoque disponível.');return;}const {error}=await db.from('cart_items').upsert({...(old?{id:old.id}:{}),user_id:user.id,listing_id:id,quantity},{onConflict:'user_id,listing_id'});if(error){notify(errorMessage(error));return;}await refresh();notify('Componente adicionado ao carrinho.');}
 async function setCartQuantity(id:string,n:number){if(!db||!user)return;const {error}=n<1?await db.from('cart_items').delete().eq('id',id).eq('user_id',user.id):await db.from('cart_items').update({quantity:n}).eq('id',id).eq('user_id',user.id);if(error)notify(errorMessage(error));else await refresh();}
 async function signOut(){const {error}=await db!.auth.signOut();if(error)notify(errorMessage(error));else{setUser(null);await refresh();notify('Você saiu da conta.');}}
 return <Context.Provider value={{user,roles,loading,dataReady,listings,metrics,favorites,cart,notice,notify,refresh,toggleFavorite,addToCart,setCartQuantity,signOut}}>{children}<div className={`toast ${notice?'toast-show':''}`} role="status" aria-live="polite">{notice}</div></Context.Provider>;
}
export function usePlatform(){const c=useContext(Context);if(!c)throw Error('PlatformProvider missing');return c;}
