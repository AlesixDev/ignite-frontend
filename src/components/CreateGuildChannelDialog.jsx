import { useCallback, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { ArrowRight } from '@phosphor-icons/react';
import { GuildsService } from '../services/guilds.service';
import Dialog from './Dialog';
import FormInput from './Form/FormInput';
import FormError from './Form/FormError';
import FormSubmit from './Form/FormSubmit';
import { InputGroup, InputGroupInput } from './ui/input-group';

const CreateGuildChannelDialog = ({ isOpen, setIsOpen, guild, categoryId }) => {
  const form = useForm();

  const onSubmit = useCallback(async (data) => {
    GuildsService.createGuildChannel(guild.id, {
      name: data.name,
      type: 0,
      parent_id: categoryId,
    });

    setIsOpen(false);
    form.reset();
  }, [form, guild, setIsOpen]);

  return (
    <Dialog isOpen={isOpen} setIsOpen={setIsOpen} title="Create Channel">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
          <div className="flex gap-3 items-center">
            <InputGroup className={`h-12 bg-gray-800`}>
              <InputGroupInput
                placeholder={`new-channel`}
                {...form.register('name', { required: "Name is required." })}
              />
            </InputGroup>
            <FormSubmit
              form={form}
              label="Create"
              icon={<ArrowRight className="size-4" />}
              className="w-full sm:w-auto"
            />
          </div>
        </form>
      </FormProvider>
    </Dialog>
  );
}

export default CreateGuildChannelDialog;
