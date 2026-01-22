import { toast } from 'sonner'
import api from '../api.js';
import useStore from '../hooks/useStore';
import { useRolesStore } from '../stores/roles.store.js';
import { useGuildsStore } from '../stores/guilds.store.js';

export const RolesService = {
    /**
     * Initialize roles for each guild by guild.roles or fetching from Ignite API if not present.
     * 
     * @returns void
     */
    async initializeGuildRoles() {
        const { setGuildRoles } = useRolesStore.getState();
        const { guilds } = useGuildsStore.getState();

        for (const guild of guilds) {
            if (guild.roles && Object.keys(guild.roles).length > 0) {
                // Use existing roles from guild object
                setGuildRoles(guild.id, guild.roles);

                console.log(`Loaded roles for guild ${guild.id} from existing data.`);
            } else {
                // Unimplemented: Fetch roles from Ignite API
                console.error(`Roles for guild ${guild.id} not found locally. Fetching from Ignite API is unimplemented.`);
            }
        }
    },

    /**
     * Create a new role in the specified guild and update the local store.
     * 
     * @param guildId The ID of the guild where the role will be created.
     * @param roleData The data for the new role.
     * @returns void
     */
    async createGuildRole(guildId: string, roleData: any) {
        try {
            const response = await api.post(`/guilds/${guildId}/roles`, roleData);
            const newRole = response.data;

            // Update local store
            const { guildRoles, setGuildRoles } = useRolesStore.getState();
            const roles = guildRoles[guildId] || [];
            setGuildRoles(guildId, [...roles, newRole]);

            toast.success('Role created successfully');
        }
        catch (error) {
            console.error('Failed to create role:', error);
            toast.error('Failed to create role');
        }
    },

    /**
     * Update an existing role in the specified guild and update the local store.
     * 
     * @param guildId The ID of the guild where the role exists.
     * @param roleId The ID of the role to be updated.
     * @param updates The updates to be applied to the role.
     * @returns void
     */
    async updateGuildRole(guildId: string, roleId: string, updates: any) {
        try {
            await api.patch(`/guilds/${guildId}/roles/${roleId}`, updates);

            // Update role in local store
            const { guildRoles, setGuildRoles } = useRolesStore.getState();
            const roles = guildRoles[guildId] || [];
            const updatedRoles = roles.map(role =>
                role.id === roleId ? { ...role, ...updates } : role
            );
            setGuildRoles(guildId, updatedRoles);
        }
        catch (error) {
            console.error('Failed to save role changes:', error);
        }
    },

    /**
     * Delete a role from the specified guild and update the local store.
     * 
     * @param guildId The ID of the guild where the role exists.
     * @param roleId The ID of the role to be deleted.
     * @returns void
     */
    async deleteGuildRole(guildId: string, roleId: string) {
        try {
            await api.delete(`/guilds/${guildId}/roles/${roleId}`);

            // Remove role from local store
            const { guildRoles, setGuildRoles } = useRolesStore.getState();
            const roles = guildRoles[guildId] || [];
            const updatedRoles = roles.filter(role => role.id !== roleId);
            setGuildRoles(guildId, updatedRoles);

            toast.success('Role deleted successfully');
        }
        catch (error) {
            console.error('Failed to delete role:', error);
            toast.error('Failed to delete role');
        }
    }
};
