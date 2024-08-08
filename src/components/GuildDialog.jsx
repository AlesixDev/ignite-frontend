import { useCallback, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { ArrowRight } from '@phosphor-icons/react';
import api from '../api';
import Dialog from './Dialog';
import FormInput from './Form/FormInput';
import FormError from './Form/FormError';
import FormSubmit from './Form/FormSubmit';
import useGuildStore from '../hooks/useGuildStore';

const CreateGuildDialog = ({ isOpen, setIsOpen }) => {
    const { addGuild } = useGuildStore();
    const form = useForm();

    const onSubmit = useCallback(async (data) => {
        try {
            const response = await api.post('guilds', data);
            addGuild(response.data);

            toast.success('Server created successfully.');
            setIsOpen(false);
            form.reset();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'An error occurred.');
        }
    }, [form, setIsOpen]);

    return (
        <Dialog isOpen={isOpen} setIsOpen={setIsOpen} title="Create Your Server">
            <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="flex gap-4">
                        <FormInput type="text" name="name" placeholder="My Server" validation={{ required: "Name is required." }} />
                        <FormSubmit form={form} label="Create" icon={<ArrowRight className="size-4" />} />
                    </div>
                    <FormError name="name" />
                </form>
            </FormProvider>
        </Dialog>
    );
}

const JoinGuildDialog = ({ isOpen, setIsOpen }) => {
    const form = useForm();

    const onSubmit = useCallback(async (data) => {
        api.post(`/invites/${data.invite}`).then((response) => {
            console.log(response.data);
        }).catch((error) => {
            console.error(error);
            toast.error(error.response?.data?.message || 'An error occurred.');
        });
    }, [form, setIsOpen]);

    return (
        <Dialog isOpen={isOpen} setIsOpen={setIsOpen} title="Join a Server">
            <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="flex gap-4">
                        <FormInput type="text" name="invite" placeholder="Enter invite code" validation={{ required: "Invite is required." }} />
                        <FormSubmit form={form} label="Join" icon={<ArrowRight className="size-4" />} />
                    </div>
                    <FormError name="name" />
                </form>
            </FormProvider>
        </Dialog>
    );
}

const GuildDialog = ({ isOpen, setIsOpen }) => {
    const [isCreateGuildDialogOpen, setIsCreateGuildDialogOpen] = useState(false);
    const [isJoinGuildDialogOpen, setIsJoinGuildDialogOpen] = useState(false);

    const handleCreateGuild = () => {
        setIsOpen(false);
        setIsCreateGuildDialogOpen(true);
    }

    const handleJoinGuild = () => {
        setIsOpen(false);
        setIsJoinGuildDialogOpen(true);
    }

    return (
        <>
            <Dialog isOpen={isOpen} setIsOpen={setIsOpen} title="Create Your Server">
                <button type="submit" className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-5 py-2.5 text-sm text-white shadow-md" onClick={handleCreateGuild}>
                    <span>Create Server</span>
                </button>

                <button type="submit" className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-5 py-2.5 text-sm text-white shadow-md" onClick={handleJoinGuild}>
                    <span>Join Server</span>
                </button>
            </Dialog>

            {/* 
                HACK: This is a hack and should be polished out, A transition to the right ( similiar to how discord does it ) is preferable
            */}
            <CreateGuildDialog isOpen={isCreateGuildDialogOpen} setIsOpen={setIsCreateGuildDialogOpen} />

            {/* 
                HACK: This is a hack and should be polished out, A transition to the right ( similiar to how discord does it ) is preferable
            */}
            <JoinGuildDialog isOpen={isJoinGuildDialogOpen} setIsOpen={setIsJoinGuildDialogOpen} />
        </>
    );
}

export default GuildDialog;
