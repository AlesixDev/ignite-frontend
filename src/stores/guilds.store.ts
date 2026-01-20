import { create } from 'zustand';

type GuildsStore = {
  guilds: any[];

  setGuilds: (guilds: any[]) => void;
  addGuild: (guild: any) => void;
  editGuild: (guildId: string, updates: Partial<any>) => void;
  editGuildChannel: (guildId: string, channelId: string, updates: Partial<any>) => void;
};

export const useGuildsStore = create<GuildsStore>((set) => ({
  guilds: [],
  setGuilds: (guilds) => set({ guilds }),
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
