import { useState } from 'react';
import { Users } from 'lucide-react';
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
    const { friends, requests } = useFriendsStore();
    const store = useStore();
    const currentUser = store.user;

    const pendingCount = requests.filter(req => req.sender_id != currentUser.id).length;

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
            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'add_friend' && <AddFriendForm />}

                {(activeTab === 'online' || activeTab === 'all') && (
                    <FriendsList
                        friends={friends}
                        filter={activeTab}
                    />
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