import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import api from '../../api';
import FormError from '../Form/FormError';
import FormInput from '../Form/FormInput';
import FormLabel from '../Form/FormLabel';
import FormSubmit from '../Form/FormSubmit';

const ServerInfo = ({ guild }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ownerWarning, setOwnerWarning] = useState('');
  const [editingField, setEditingField] = useState(null);
  const nameForm = useForm({ defaultValues: { name: '' } });
  const descriptionForm = useForm({ defaultValues: { description: '' } });
  const iconForm = useForm({ defaultValues: { icon: '' } });
  const ownerForm = useForm({ defaultValues: { owner_id: '', confirm_transfer: false } });

  useEffect(() => {
    if (!guild?.id) return;

    let active = true;
    setLoading(true);
    setError('');

    api.get(`/guilds/${guild.id}/profile`)
      .then((response) => {
        if (!active) return;
        setProfile(response.data);
        nameForm.reset({ name: response.data?.name || '' });
        descriptionForm.reset({ description: response.data?.description || '' });
        iconForm.reset({ icon: response.data?.icon || '' });
        ownerForm.reset({
          owner_id: response.data?.owner_id ? String(response.data.owner_id) : '',
          confirm_transfer: false,
        });
      })
      .catch((err) => {
        if (!active) return;
        const msg = err.response?.data?.message || err.message || 'Could not load server profile.';
        setError(msg);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [guild?.id, descriptionForm, iconForm, nameForm, ownerForm]);

  const handleSave = async (params, resetForm) => {
    if (!guild?.id) return;
    setLoading(true);
    setError('');

    try {
      await api.patch(`/guilds/${guild.id}/profile`, null, { params });
      const response = await api.get(`/guilds/${guild.id}/profile`);
      setProfile(response.data);
      resetForm?.(response.data);
      setOwnerWarning('');
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not update server profile.';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Server Info</h3>
        <p className="mt-1 text-sm text-gray-400">
          View and update the server profile details.
        </p>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-4">
        {loading && <div className="text-xs text-gray-400">Loading profile...</div>}
        {error && <div className="text-xs text-red-400">{error}</div>}
        {!loading && (
          <div className="grid gap-4 text-sm text-gray-300">
            <FormProvider {...nameForm}>
              <form
                onSubmit={nameForm.handleSubmit(async (data) => {
                  const name = data.name?.trim();
                  if (!name) return;
                  const saved = await handleSave({ name }, (nextProfile) =>
                    nameForm.reset({ name: nextProfile?.name || '' })
                  );
                  if (saved) setEditingField(null);
                })}
                className="grid gap-2"
              >
                <FormLabel htmlFor="profile-name">Name</FormLabel>
                {editingField === 'name' ? (
                  <>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <FormInput id="profile-name" type="text" name="name" placeholder="Server name" />
                      </div>
                      <FormSubmit form={nameForm} label="Save" />
                      <button
                        type="button"
                        className="rounded border border-gray-700 px-3 py-2 text-xs text-gray-200 hover:bg-gray-800"
                        onClick={() => {
                          nameForm.reset({ name: profile?.name || '' });
                          setEditingField(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                    <FormError name="name" />
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-gray-200">
                      {profile?.name || guild?.name || 'Unnamed Server'}
                    </div>
                    <button
                      type="button"
                      className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-200 hover:bg-gray-800"
                      onClick={() => setEditingField('name')}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </form>
            </FormProvider>

            <FormProvider {...descriptionForm}>
              <form
                onSubmit={descriptionForm.handleSubmit(async (data) => {
                  const description = data.description?.trim();
                  const saved = await handleSave(
                    { description: description || '' },
                    (nextProfile) =>
                      descriptionForm.reset({ description: nextProfile?.description || '' })
                  );
                  if (saved) setEditingField(null);
                })}
                className="grid gap-2"
              >
                <FormLabel htmlFor="profile-description">Description</FormLabel>
                {editingField === 'description' ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <FormInput
                        id="profile-description"
                        type="text"
                        name="description"
                        placeholder="Short description"
                      />
                    </div>
                    <FormSubmit form={descriptionForm} label="Save" />
                    <button
                      type="button"
                      className="rounded border border-gray-700 px-3 py-2 text-xs text-gray-200 hover:bg-gray-800"
                      onClick={() => {
                        descriptionForm.reset({ description: profile?.description || '' });
                        setEditingField(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-gray-300">
                      {profile?.description || 'No description set.'}
                    </div>
                    <button
                      type="button"
                      className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-200 hover:bg-gray-800"
                      onClick={() => setEditingField('description')}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </form>
            </FormProvider>

            <FormProvider {...iconForm}>
              <form
                onSubmit={iconForm.handleSubmit(async (data) => {
                  const icon = data.icon?.trim();
                  const saved = await handleSave(
                    { icon: icon || '' },
                    (nextProfile) => iconForm.reset({ icon: nextProfile?.icon || '' })
                  );
                  if (saved) setEditingField(null);
                })}
                className="grid gap-2"
              >
                <FormLabel htmlFor="profile-icon">Icon URL</FormLabel>
                {editingField === 'icon' ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <FormInput id="profile-icon" type="text" name="icon" placeholder="https://..." />
                    </div>
                    <FormSubmit form={iconForm} label="Save" />
                    <button
                      type="button"
                      className="rounded border border-gray-700 px-3 py-2 text-xs text-gray-200 hover:bg-gray-800"
                      onClick={() => {
                        iconForm.reset({ icon: profile?.icon || '' });
                        setEditingField(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-gray-300">
                      {profile?.icon || 'No icon set.'}
                    </div>
                    <button
                      type="button"
                      className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-200 hover:bg-gray-800"
                      onClick={() => setEditingField('icon')}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </form>
            </FormProvider>

            <FormProvider {...ownerForm}>
              <form
                onSubmit={ownerForm.handleSubmit(async (data) => {
                  const nextOwnerId = data.owner_id?.trim();
                  const currentOwnerId = profile?.owner_id ? String(profile.owner_id) : '';
                  const isTransfer = nextOwnerId && nextOwnerId !== currentOwnerId;
                  if (!nextOwnerId) return;
                  if (isTransfer && !data.confirm_transfer) {
                    setOwnerWarning('Confirm the ownership transfer to continue.');
                    return;
                  }
                  const saved = await handleSave(
                    { owner_id: nextOwnerId },
                    (nextProfile) =>
                      ownerForm.reset({
                        owner_id: nextProfile?.owner_id ? String(nextProfile.owner_id) : '',
                        confirm_transfer: false,
                      })
                  );
                  if (saved) setEditingField(null);
                })}
                className="grid gap-2"
              >
                <FormLabel
                  htmlFor="profile-owner"
                  help="Warning: Changing this transfers ownership to the provided user ID."
                >
                  Owner user ID
                </FormLabel>
                {editingField === 'owner_id' ? (
                  <>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <FormInput id="profile-owner" type="text" name="owner_id" placeholder="User ID" />
                      </div>
                      <FormSubmit form={ownerForm} label="Save" />
                      <button
                        type="button"
                        className="rounded border border-gray-700 px-3 py-2 text-xs text-gray-200 hover:bg-gray-800"
                        onClick={() => {
                          ownerForm.reset({
                            owner_id: profile?.owner_id ? String(profile.owner_id) : '',
                            confirm_transfer: false,
                          });
                          setOwnerWarning('');
                          setEditingField(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                    {ownerWarning && <div className="text-xs text-red-400">{ownerWarning}</div>}
                    <label className="flex items-center gap-2 text-xs text-gray-300">
                      <input type="checkbox" {...ownerForm.register('confirm_transfer')} />
                      I understand this will transfer ownership.
                    </label>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-gray-300">
                      {profile?.owner_id ? String(profile.owner_id) : 'Unknown'}
                    </div>
                    <button
                      type="button"
                      className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-200 hover:bg-gray-800"
                      onClick={() => {
                        setOwnerWarning('');
                        setEditingField('owner_id');
                      }}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </form>
            </FormProvider>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerInfo;
