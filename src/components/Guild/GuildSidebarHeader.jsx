
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner'
import api from '@/api';
import { GuildsService } from '@/services/guilds.service';
import { PermissionsService } from '@/services/permissions.service';
import { Permissions } from '@/enums/Permissions';
import { CaretDown, Gear, UserPlus, SignOut } from '@phosphor-icons/react';

const GuildSidebarHeader = ({ guildName = '', guild, onOpenServerSettings }) => {
    const navigate = useNavigate();

    const [menuOpen, setMenuOpen] = useState(false);
    const [inviteInfo, setInviteInfo] = useState(null);
    const [loadingInvite, setLoadingInvite] = useState(false);
    const [error, setError] = useState(null);
    const [leaving, setLeaving] = useState(false);

    const containerRef = useRef(null);

    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (e) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(e.target)) setMenuOpen(false);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [menuOpen]);

    const canOpenServerSettings = useMemo(() => {
        return PermissionsService.hasPermission(guild?.id, null, Permissions.MANAGE_GUILD)
    }, [guild?.id]);

    const canInvite = useMemo(() => {
        return PermissionsService.hasPermission(guild?.id, null, Permissions.CREATE_INSTANT_INVITE)
    }, [guild?.id]);

    const handleInvite = useCallback(
        async (e) => {
            e.stopPropagation();
            if (!guild?.id || loadingInvite) return;
            setLoadingInvite(true);
            setError(null);
            try {
                const res = await api.post(`guilds/${guild.id}/invites`);
                setInviteInfo(res.data);
                toast.success('Invite created.');
            } catch (err) {
                const msg = err.response?.data?.message || err.message || 'Unknown error';
                setError(msg);
                toast.error(msg);
            } finally {
                setLoadingInvite(false);
            }
        },
        [guild?.id, loadingInvite]
    );

    const handleLeave = useCallback(
        async (e) => {
            e.stopPropagation();
            if (!guild?.id || leaving) return;

            setLeaving(true);
            setError(null);

            try {
                await api.delete(`@me/guilds/${guild.id}/`);
                toast.success('Left server.');
                setMenuOpen(false);
                setInviteInfo(null);
                navigate('/channels/@me');
                await GuildsService.loadGuilds();
            } catch (err) {
                const msg = err.response?.data?.message || err.message || 'Unknown error';
                setError(msg);
                toast.error(msg);
            } finally {
                setLeaving(false);
            }
        },
        [guild?.id, leaving, navigate]
    );

    const handleCopyInvite = useCallback(async () => {
        if (!inviteInfo?.code) return;
        try {
            await navigator.clipboard.writeText('https://app.ignite-chat.com/invite/' + inviteInfo.code);
            toast.success('Copied invite code.');
        } catch {
            toast.error('Could not copy to clipboard.');
        }
    }, [inviteInfo?.code]);

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                type="button"
                className="w-full cursor-pointer px-4 py-3 text-left transition-colors duration-100 hover:bg-gray-700"
                onClick={() => setMenuOpen((open) => !open)}
            >
                <div className="flex h-6 items-center">
                    <div className="flex-1 truncate text-base font-semibold">{guildName}</div>
                    <CaretDown className={`size-5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {menuOpen && (
                <div className="absolute inset-x-2 top-12 z-10 rounded bg-gray-700 py-2 shadow-lg border border-gray-600">
                    {canInvite && (<>
                        <button
                            type="button"
                            className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-100 hover:bg-gray-600 disabled:opacity-60"
                            onClick={handleInvite}
                            disabled={loadingInvite}
                        >
                            <span>{loadingInvite ? 'Creating Invite…' : 'Invite People'}</span>
                            <UserPlus className="size-4 ml-2" />
                        </button>

                        <hr className="my-1 border-gray-600" /></>
                    )}

                    {canOpenServerSettings && (<>
                        <button
                            type="button"
                            className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-100 hover:bg-gray-600 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-gray-700"
                            onClick={() => {
                                setMenuOpen(false);
                                onOpenServerSettings?.();
                            }}
                        >
                            <span>Server Settings</span>
                            <Gear className="size-4 ml-2" />
                        </button>

                        <hr className="my-1 border-gray-600" />
                    </>
                    )}


                    <button
                        type="button"
                        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-red-300 hover:bg-gray-600 disabled:opacity-60"
                        onClick={handleLeave}
                        disabled={leaving}
                    >
                        <span>{leaving ? 'Leaving…' : 'Leave Server'}</span>
                        <SignOut className="size-4 ml-2" />
                    </button>
                </div>
            )}

            {inviteInfo && (
                <div className="absolute inset-x-2 top-28 z-20 rounded border border-gray-700 bg-gray-800 p-4 shadow-lg">
                    <div className="mb-2 text-sm font-semibold text-gray-100">Invite Created</div>
                    <div className="mb-2 flex items-center gap-2">
                        <span className="break-all font-mono text-xs text-gray-300">{inviteInfo.code}</span>
                        <button
                            type="button"
                            className="rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-gray-100 hover:bg-gray-600"
                            onClick={handleCopyInvite}
                        >
                            Copy
                        </button>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            className="rounded bg-gray-700 px-3 py-1 text-xs text-gray-100 hover:bg-gray-600"
                            onClick={() => setInviteInfo(null)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {error && !inviteInfo && (
                <div className="absolute inset-x-2 top-28 z-20 rounded border border-red-700 bg-red-800 p-4 shadow-lg">
                    <div className="mb-2 text-sm font-semibold text-red-100">Error</div>
                    <div className="mb-2 break-all text-xs text-red-200">{error}</div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            className="rounded bg-red-700 px-3 py-1 text-xs text-red-100 hover:bg-red-600"
                            onClick={() => setError(null)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuildSidebarHeader;