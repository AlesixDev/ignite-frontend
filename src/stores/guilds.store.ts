import { create } from 'zustand';

type GuildsStore = {
  guilds: any[];
  guildMembers: { [guildId: string]: any[] };

  discordGuilds: any[];

  setGuilds: (guilds: any[]) => void;
  setGuildMembers: (guildId: string, members: any[]) => void;

  setDiscordGuilds: (discordGuilds: any[]) => void;

  addGuild: (guild: any) => void;
  editGuild: (guildId: string, updates: Partial<any>) => void;
  editGuildChannel: (guildId: string, channelId: string, updates: Partial<any>) => void;

  addDiscordGuild: (discordGuild: any) => void;
  editDiscordGuild: (guildId: string, updates: Partial<any>) => void;
  editDiscordGuildChannel: (guildId: string, channelId: string, updates: Partial<any>) => void;
};

export const useGuildsStore = create<GuildsStore>((set) => ({
  guilds: [],
  guildMembers: {},
  
  discordGuilds: [],

  setGuilds: (guilds) => set({ guilds }),
  setGuildMembers: (guildId, members) =>
    set((state) => ({
      guildMembers: {
        ...state.guildMembers,
        [guildId]: members,
      },
    })),

  setDiscordGuilds: (discordGuilds) => set({ discordGuilds }),
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
    })),

  addDiscordGuild: (discordGuild) =>
    set((state) => ({ discordGuilds: [...state.discordGuilds, discordGuild]
    })),
  editDiscordGuild: (guildId, updates) =>
    set((state) => ({
      discordGuilds: state.discordGuilds.map((g) =>
        g.id === guildId ? { ...g, ...updates } : g
      ),
    })),
  editDiscordGuildChannel: (guildId, channelId, updates) =>
    set((state) => ({
      discordGuilds: state.discordGuilds.map((g) => {
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
