import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Wallet } from '../types';

interface WalletState {
  activeWalletId: number | null;
  setActiveWalletId: (id: number | null) => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      activeWalletId: null,
      setActiveWalletId: (id) => set({ activeWalletId: id }),
    }),
    { name: 'utxo-pilot-wallet' }
  )
);
