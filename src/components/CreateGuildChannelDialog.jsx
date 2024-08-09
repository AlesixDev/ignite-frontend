import { useCallback } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { ArrowRight } from '@phosphor-icons/react';
import api from '../api';
import Dialog from './Dialog';
import FormInput from './Form/FormInput';
import FormError from './Form/FormError';
import FormSubmit from './Form/FormSubmit';
import useGuildStore from '../hooks/useGuildStore';

const CreateGuildChannelDialog = ({ isOpen, setIsOpen, guild }) => {
  const { editGuild } = useGuildStore();
  const form = useForm();

  const onSubmit = useCallback(async (data) => {
    try {
      const response = await api.post(`/guilds/${guild.id}/channels`, data);
      editGuild({ ...guild, channels: [...guild.channels, response.data] });

      toast.success('Channel created successfully.');
      setIsOpen(false);
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'An error occurred.');
    }
  }, [editGuild, form, guild, setIsOpen]);

  return (
    <Dialog isOpen={isOpen} setIsOpen={setIsOpen} title="Create A Channel">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <input type="hidden" name="type" value="0" {...form.register('type')} />
          <div className="flex gap-4">
            <FormInput type="text" name="name" placeholder="My Channel" validation={{ required: "Name is required." }} />
            <FormSubmit form={form} label="Create" icon={<ArrowRight className="size-4" />}/>
          </div>
          <FormError name="name" />
        </form>
      </FormProvider>
    </Dialog>
  );
}

export default CreateGuildChannelDialog;
