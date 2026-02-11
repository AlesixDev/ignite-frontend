import { useState, useCallback, useEffect, useMemo } from 'react';
import { useChannelContext } from '../../contexts/ChannelContext.jsx';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '../ui/context-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import GuildMemberContextMenu from '../GuildMember/GuildMemberContextMenu.jsx';
import GuildMemberPopoverContent from '../GuildMember/GuildMemberPopoverContent.jsx';
import Avatar from '../Avatar.jsx';
import { useRolesStore } from '../../store/roles.store.ts';
import { useGuildsStore } from '@/store/guilds.store.ts';
import { GuildsService } from '@/services/guilds.service.ts';
import { CircleNotch, CaretDown, CaretRight } from '@phosphor-icons/react';

const MemberListItem = ({ member, onMention }) => {
    const topColor = useMemo(() => {
        if (!member.roles || member.roles.length === 0) return 'inherit';

        // Sort by position descending (highest position first)
        const sorted = [...member.roles].sort((a, b) => b.position - a.position);

        // Find the first role that has a non-zero color
        const topRole = sorted.find((r) => r.color && r.color !== 0);

        if (!topRole) return 'inherit';

        // Convert integer color to Hex (e.g., 16711680 -> #ff0000)
        return `#${topRole.color.toString(16).padStart(6, '0')}`;
    }, [member.roles]);

    return (
        <Popover>
            <ContextMenu>
                <PopoverTrigger className="w-full text-left">
                    <ContextMenuTrigger>
                        <div className="flex items-center gap-3 rounded-md p-2 transition hover:bg-gray-700/50">
                            <Avatar user={member.user} className="size-8" />
                            <div className="min-w-0 flex-1">
                                <p
                                    className="truncate text-sm font-medium"
                                    style={{ color: topColor }}
                                >
                                    {member.user.name ?? member.user.username}
                                </p>
                                <p className="truncate text-xs text-gray-400">
                                    {member.user.status}
                                </p>
                            </div>
                        </div>
                    </ContextMenuTrigger>
                </PopoverTrigger>
                <ContextMenuContent>
                    <GuildMemberContextMenu user={member.user} onMention={onMention} />
                </ContextMenuContent>
            </ContextMenu>
            <PopoverContent className="w-auto p-2" align="start" alignOffset={0}>
                <GuildMemberPopoverContent user={member.user} guild={null} />
            </PopoverContent>
        </Popover>
    );
};

const MemberList = ({ guildId }) => {
    const { memberListOpen, setInputMessage, inputRef } = useChannelContext();
    const { guildMembers } = useGuildsStore();
    const [membersByRole, setMembersByRole] = useState({});
    const [membersWithoutRoles, setMembersWithoutRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [collapsedRoles, setCollapsedRoles] = useState({});

    const activeGuildMembers = guildMembers[guildId];

    useEffect(() => {
        if (!guildId) return;

        setIsLoading(true);

        GuildsService.loadGuildMembers(guildId).finally(() => setIsLoading(false));
    }, [guildId]);

    const onMention = useCallback((user) => {
        setInputMessage((prev) => `${prev} @${user.username} `);
        inputRef.current.focus();
    }, [inputRef, setInputMessage]);

    const roles = useRolesStore().guildRoles[guildId] || [];

    const toggleRole = useCallback((roleId) => {
        setCollapsedRoles((prev) => ({
            ...prev,
            [roleId]: !prev[roleId]
        }));
    }, []);

    useEffect(() => {
        const tempMembersByRole = {};
        const tempMembersWithoutRoles = [];
        const assignedMemberIds = new Set();

        activeGuildMembers?.forEach((member) => {
            if (member.roles && member.roles.length > 0) {
                // Map member's role ids to role objects, filter out missing, sort by position
                const firstRole = member.roles.sort((a, b) => b.position - a.position)[0];
                if (firstRole && !assignedMemberIds.has(member.user.id)) {
                    if (!tempMembersByRole[firstRole.id]) tempMembersByRole[firstRole.id] = [];
                    tempMembersByRole[firstRole.id].push(member);
                    assignedMemberIds.add(member.user.id);
                }
            } else {
                tempMembersWithoutRoles.push(member);
            }
        });

        setMembersByRole(tempMembersByRole);
        setMembersWithoutRoles(tempMembersWithoutRoles);
    }, [activeGuildMembers, roles]);

    return (
        <div className={`relative z-0 transition-all duration-300 ${memberListOpen ? 'w-60 md:w-72' : 'w-0'}`}>
            {memberListOpen && (
                <div className="flex h-full flex-col border-l border-gray-800 bg-gray-800">
                    <div className="flex h-12 items-center border-b border-gray-700 px-4 text-sm font-semibold text-gray-300">
                        Members
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-2 text-gray-400 overflow-y-auto">
                        {isLoading ? (
                            <CircleNotch size={32} className="mx-auto animate-spin text-gray-500" />
                        ) : (
                            <>
                                {roles.map((role) =>
                                    membersByRole[role.id] && membersByRole[role.id].length > 0 ? (
                                        <div key={role.id}>
                                            <div
                                                className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-gray-400 cursor-pointer hover:text-gray-300 transition"
                                                onClick={() => toggleRole(role.id)}
                                            >
                                                {collapsedRoles[role.id] ? (
                                                    <CaretRight size={12} weight="bold" />
                                                ) : (
                                                    <CaretDown size={12} weight="bold" />
                                                )}
                                                {role.name} &mdash; {membersByRole[role.id].length}
                                            </div>
                                            {!collapsedRoles[role.id] && membersByRole[role.id].map((member) => (
                                                <MemberListItem
                                                    key={member.user.id}
                                                    member={member}
                                                    onMention={onMention}
                                                />
                                            ))}
                                        </div>
                                    ) : null
                                )}
                                {membersWithoutRoles.length > 0 && (
                                    <div>
                                        <div
                                            className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-gray-400 cursor-pointer hover:text-gray-300 transition"
                                            onClick={() => toggleRole('no-role')}
                                        >
                                            {collapsedRoles['no-role'] ? (
                                                <CaretRight size={12} weight="bold" />
                                            ) : (
                                                <CaretDown size={12} weight="bold" />
                                            )}
                                            Members &mdash; {membersWithoutRoles.length}
                                        </div>
                                        {!collapsedRoles['no-role'] && membersWithoutRoles.map((member) => (
                                            <MemberListItem
                                                key={member.user.id}
                                                member={member}
                                                onMention={onMention}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MemberList;