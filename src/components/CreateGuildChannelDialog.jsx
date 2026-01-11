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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <input type="hidden" name="type" value="0" {...form.register('type')} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex-1">
              <FormInput type="text" name="name" placeholder="My Channel" validation={{ required: "Name is required." }} />
            </div>
            <FormSubmit
              form={form}
              label="Create"
              icon={<ArrowRight className="size-4" />}
              className="w-full sm:w-auto"
            />
          </div>
          <FormError name="name" />
        </form>
      </FormProvider>
    </Dialog>
  );
}

export default CreateGuildChannelDialog;
