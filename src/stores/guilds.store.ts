import { create } from 'zustand';

type GuildsStore = {
  guilds: any[];
  activeGuildId: string | null;

  setGuilds: (guilds: any[]) => void;
  setActiveGuildId: (guildId: string | null) => void;
  addGuild: (guild: any) => void;
  editGuild: (guildId: string, updates: Partial<any>) => void;
  editGuildChannel: (guildId: string, channelId: string, updates: Partial<any>) => void;
};

export const useGuildsStore = create<GuildsStore>((set) => ({
  guilds: [],
  activeGuildId: null,
  setGuilds: (guilds) => set({ guilds }),
  setActiveGuildId: (guildId) => set({ activeGuildId: guildId }),
  addGuild: (guild) => set((state) => ({ guilds: [...state.guilds, guild] })),
  editGuild: (guildId, updates) =>
    set((state) => ({
      guilds: state.guilds.map((g) =>
        g.id === guildId ? { ...g, ...updates } : g
      ),
    })),
  editGuildChannel: (guildId, channelId, updates) =>
    set((state) => ({
      guilds: state.guilds.map((g) => {
        if (g.id === guildId) {
          return {
            ...g,
            channels: g.channels.map((c: any) =>
              c.id === channelId ? { ...c, ...updates } : c
            ),
          };
        }
        return g;
      })
    }))
}));
