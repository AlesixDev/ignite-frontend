import { create } from 'zustand';

type UnreadsStore = {
    channelUnreads: any [];

    setChannelUnreads: (channelUnreads: any []) => void;
};

export const useUnreadsStore = create<UnreadsStore>((set) => ({
    channelUnreads: [],

    setChannelUnreads: (channelUnreads) => set({ channelUnreads }),
}));