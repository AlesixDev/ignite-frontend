import { useState, useMemo } from 'react';
import { Users, X } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFriendsStore } from '@/store/friends.store';
import useStore from '@/hooks/useStore';
import AddFriendForm from './AddFriendForm';
import FriendsList from './FriendsList';
import PendingRequests from './PendingRequests';

const FriendsDashboard = () => {
    const [activeTab, setActiveTab] = useState('online');
    const [searchQuery, setSearchQuery] = useState('');
    const { friends, requests } = useFriendsStore();
    const store = useStore();
    const currentUser = store.user;

    const pendingCount = requests.filter(req => req.sender_id != currentUser.id).length;

    const filteredFriends = useMemo(() => {
        if (!searchQuery.trim()) return friends;
        const query = searchQuery.toLowerCase();
        return friends.filter(friend =>
            friend.username.toLowerCase().includes(query) ||
            friend.name?.toLowerCase().includes(query)
        );
    }, [friends, searchQuery]);

    return (
        <div className="flex h-full flex-col bg-gray-700">
            {/* Header */}
            <header className="flex h-12 items-center justify-between px-4 shadow-sm border-b border-[#1f2124]">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[#f2f3f5] font-semibold">
                        <Users size={20} className="text-[#80848e]" />
                        Friends
                    </div>
                    <Separator orientation="vertical" className="h-6 bg-[#4e5058]" />
                    <nav className="flex items-center gap-2">
                        <TabButton
                            id="online"
                            label="Online"
                            active={activeTab}
                            onClick={setActiveTab}
                        />
                        <TabButton
                            id="all"
                            label="All"
                            active={activeTab}
                            onClick={setActiveTab}
                        />
                        <TabButton
                            id="pending"
                            label="Pending"
                            active={activeTab}
                            onClick={setActiveTab}
                            count={pendingCount}
                        />
                        <Button
                            variant={activeTab === 'add_friend' ? "ghost" : "default"}
                            size="sm"
                            className={`h-7 px-2 text-sm font-medium ${activeTab === 'add_friend'
                                    ? 'text-[#23a559]'
                                    : 'bg-[#248046] hover:bg-[#1a6334] text-white'
                                }`}
                            onClick={() => setActiveTab('add_friend')}
                        >
                            Add Friend
                        </Button>
                    </nav>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
                {activeTab === 'add_friend' && <AddFriendForm />}

                {(activeTab === 'online' || activeTab === 'all') && (
                    <>
                        <div className="mb-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search friends..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-800/50 text-white placeholder:text-gray-500 rounded-lg border border-gray-700/60 text-sm focus:outline-none focus:bg-gray-800/80 focus:border-gray-600 focus:ring-0 transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                        type="button"
                                        aria-label="Clear search"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <FriendsList
                                friends={filteredFriends}
                                filter={activeTab}
                            />
                        </div>
                    </>
                )}

                {activeTab === 'pending' && (
                    <PendingRequests requests={requests} currentUser={currentUser} />
                )}
            </div>
        </div>
    );
};

const TabButton = ({ id, label, active, onClick, count }) => (
    <Button
        variant={active === id ? "secondary" : "ghost"}
        size="sm"
        className="h-7 px-3 text-sm font-medium"
        onClick={() => onClick(id)}
    >
        {label}
        {count > 0 && (
            <Badge className="ml-2 h-4 min-w-4 bg-[#f23f42] p-1 text-[11px] hover:bg-[#f23f42] font-bold">
                {count}
            </Badge>
        )}
    </Button>
);

export default FriendsDashboard;