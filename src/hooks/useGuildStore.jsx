import { create } from 'zustand';

// const useStore = create((set) => ({
//   user: null,
//   token: null,

//   login: (user, token) => {
//     localStorage.setItem('token', token);
//     set({ user, token });
//   },

//   logout: () => {
//     localStorage.removeItem('token');
//     set({ user: null, token: null, shops: [], shopId: null });
//   },

//   setUser: (user) => set({ user }),

//   guilds: [],

//   setGuilds: (guilds) => set({ guilds }),

//   selectedGuildId: null,

//   setSelectedGuildId: (guildId) => set({ selectedGuildId: guildId }),
// }));

const guildStore = (set, get) => ({
    guilds: [],
    selectedGuildId: null,

    setGuilds: (guilds) => set({ guilds }),
    setSelectedGuildId: (guildId) => set({ selectedGuildId: guildId }),
    addGuild: (guild) => set({ guilds: [...get().guilds, guild] }),
    editGuild: (guild) => set({ guilds: get().guilds.map((g) => g.id === guild.id ? guild : g) }),
});

const useGuildStore = create(guildStore);

export default useGuildStore;
