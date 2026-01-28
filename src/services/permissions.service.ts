import { Permissions } from "@/enums/Permissions";
import useStore from "@/hooks/useStore";
import { useGuildsStore } from "@/stores/guilds.store";
import { useRolesStore } from "@/stores/roles.store";

export const PermissionsService = {
    /**
     * Checks if the current user has the specified permission in a given guild and channel.
     * 
     * @param guildId The ID of the guild.
     * @param channelId The ID of the channel.
     * @param permission The permission to check
     * @return True if the user has the permission, false otherwise.
     */
    hasPermission: (guildId: string, channelId: string, permission: bigint): boolean => {
        const localUser = useStore.getState().user;
        const guild = useGuildsStore.getState().guilds.find(g => g.id === guildId);

        if (!guild) return false;

        // Guild owner has all permissions
        if (guild.owner_id === localUser.id) {
            return true;
        }

        const guildMembers = useGuildsStore.getState().guildMembers[guildId] || [];
        const guildRoles = useRolesStore.getState().guildRoles[guildId] || [];

        // Get the current user's member object in the guild
        const member = guildMembers.find(m => m.user_id === localUser.id);

        // Get all role IDs assigned to the member
        const memberRoleIds = member.roles.map(role => role.id);

        // Get roles from the roles store
        const memberRoles = guildRoles.filter(role => memberRoleIds.includes(role.id));

        // Check if any of the user's roles have the specified permission or has the ADMINISTRATOR permission
        for (const role of memberRoles) {
            const rolePermissions = BigInt(role.permissions);

            if ((rolePermissions & permission) || (rolePermissions & Permissions.ADMINISTRATOR)) {
                return true;
            }
        }

        return false;
    }
};