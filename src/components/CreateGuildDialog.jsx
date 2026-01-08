import { useCallback, useEffect, useMemo } from 'react';
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

  const form = useForm({
    mode: 'onChange',
    defaultValues: { name: '' },
  });

  const isSubmitting = form.formState.isSubmitting;
  const name = form.watch('name') || '';
  const trimmedName = useMemo(() => name.trim(), [name]);
  const canSubmit = !!trimmedName && !isSubmitting;

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen, form]);

  const onSubmit = useCallback(
    async (data) => {
      const payload = { ...data, name: data.name?.trim() };

      try {
        const response = await api.post('guilds', payload);
        addGuild(response.data);
        toast.success('Server created successfully.');
        setIsOpen(false);
        form.reset();
      } catch (error) {
        console.error(error);
        toast.error(error.response?.data?.message || 'An error occurred.');
      }
    },
    [addGuild, form, setIsOpen]
  );

  return (
    <Dialog isOpen={isOpen} setIsOpen={setIsOpen} title="Create Your Server">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Server name</div>
              <div className="text-xs text-muted-foreground">{Math.min(trimmedName.length, 50)}/50</div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex-1">
                <FormInput
                  type="text"
                  name="name"
                  placeholder="My Server"
                  validation={{
                    required: 'Name is required.',
                    validate: (v) => (v?.trim()?.length ? true : 'Name is required.'),
                    minLength: { value: 2, message: 'Name must be at least 2 characters.' },
                    maxLength: { value: 50, message: 'Name must be 50 characters or less.' },
                  }}
                />
              </div>

              <div className="sm:pt-[2px]">
                <FormSubmit
                  form={form}
                  label={isSubmitting ? 'Creating…' : 'Create'}
                  icon={<ArrowRight className="size-4" />}
                  disabled={!canSubmit}
                />
              </div>
            </div>

            <FormError name="name" />
            <div className="text-xs text-muted-foreground">
              Tip: keep it short—you can change it later.
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border bg-background px-4 py-2 text-sm shadow-sm transition hover:shadow-md disabled:opacity-50"
              onClick={() => {
                setIsOpen(false);
                form.reset();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm text-white shadow-md transition hover:shadow-lg disabled:opacity-50"
              disabled={!canSubmit}
            >
              <span className="mr-2">{isSubmitting ? 'Creating…' : 'Create server'}</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </form>
      </FormProvider>
    </Dialog>
  );
};

export default CreateGuildDialog;
