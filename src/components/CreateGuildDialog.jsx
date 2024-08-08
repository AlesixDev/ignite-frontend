import { useCallback } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { ArrowRight } from '@phosphor-icons/react';
import api from '../api';
import Dialog from './Dialog';
import FormInput from './Form/FormInput';
import FormError from './Form/FormError';
import FormSubmit from './Form/FormSubmit';

const CreateGuildDialog = ({ isOpen, setIsOpen }) => {
  const form = useForm();

  const onSubmit = useCallback(async (data) => {
    try {
      await api.post('guilds', data);
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
            <FormSubmit form={form} label="Create" icon={<ArrowRight className="size-4" />}/>
          </div>
          <FormError name="name" />
        </form>
      </FormProvider>
    </Dialog>
  );
}

export default CreateGuildDialog;
