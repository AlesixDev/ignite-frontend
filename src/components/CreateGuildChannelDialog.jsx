import { useCallback } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { ArrowRight } from '@phosphor-icons/react';
import { GuildsService } from '../services/guilds.service';
import Dialog from './Dialog';
import FormInput from './Form/FormInput';
import FormError from './Form/FormError';
import FormSubmit from './Form/FormSubmit';

const CreateGuildChannelDialog = ({ isOpen, setIsOpen, guild, categoryId }) => {
  const form = useForm();

  const onSubmit = useCallback(async (data) => {
    GuildsService.createGuildChannel(guild.id, {
      ...data,
      parent_id: categoryId,
    });

    setIsOpen(false);
    form.reset();
  }, [form, guild, setIsOpen]);

  console.log("Category ID:", categoryId);

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
