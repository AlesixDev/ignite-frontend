import { create } from 'zustand';

type UnreadsStore = {
    channelUnreads: any[];
    channelUnreadsLoaded: boolean;

    setChannelUnreads: (channelUnreads: any[]) => void;
};

export const useUnreadsStore = create<UnreadsStore>((set) => ({
    channelUnreads: [],
    channelUnreadsLoaded: false,

    setChannelUnreads: (channelUnreads) => set({ channelUnreads, channelUnreadsLoaded: true }),
}));