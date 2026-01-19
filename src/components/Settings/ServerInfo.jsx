import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';

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
  const confirmTransfer = ownerForm.watch('confirm_transfer');

  const getErrorMessage = (form, field) => form.formState.errors?.[field]?.message;

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

  useEffect(() => {
    ownerForm.register('confirm_transfer');
  }, [ownerForm]);

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
    <div className="w-full space-y-6 min-w-0">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Server Info</h3>
        <p className="text-sm text-muted-foreground">
          View and update the server profile details.
        </p>
      </div>
      <div className="w-full rounded-lg border border-border bg-card/60 p-5 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Profile Settings
            </div>
            <div className="text-sm text-muted-foreground">
              Keep server details up to date for members.
            </div>
          </div>
        </div>
        <Separator className="my-4" />
        {loading && <div className="text-xs text-muted-foreground">Loading profile...</div>}
        {error && <div className="text-xs text-destructive">{error}</div>}
        {!loading && (
          <div className="grid gap-4 text-sm text-foreground">
            <form
              onSubmit={nameForm.handleSubmit(async (data) => {
                const name = data.name?.trim();
                if (!name) return;
                const saved = await handleSave({ name }, (nextProfile) =>
                  nameForm.reset({ name: nextProfile?.name || '' })
                );
                if (saved) setEditingField(null);
              })}
              className="rounded-md border border-border bg-background/40 p-4"
            >
              <div className="flex flex-col gap-1">
                <Label htmlFor="profile-name">Name</Label>
                <p className="text-xs text-muted-foreground">Shown in the server header and invite list.</p>
              </div>
              {editingField === 'name' ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <Input
                      id="profile-name"
                      type="text"
                      placeholder="Server name"
                      {...nameForm.register('name')}
                    />
                    {getErrorMessage(nameForm, 'name') && (
                      <p className="mt-2 text-xs text-destructive">{getErrorMessage(nameForm, 'name')}</p>
                    )}
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button type="submit" className="w-full sm:w-auto">
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        nameForm.reset({ name: profile?.name || '' });
                        setEditingField(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="text-sm text-foreground break-words">
                    {profile?.name || guild?.name || 'Unnamed Server'}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => setEditingField('name')}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </form>

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
              className="rounded-md border border-border bg-background/40 p-4"
            >
              <div className="flex flex-col gap-1">
                <Label htmlFor="profile-description">Description</Label>
                <p className="text-xs text-muted-foreground">Short summary shown on the server profile.</p>
              </div>
              {editingField === 'description' ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <Input
                      id="profile-description"
                      type="text"
                      placeholder="Short description"
                      {...descriptionForm.register('description')}
                    />
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button type="submit" className="w-full sm:w-auto">
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        descriptionForm.reset({ description: profile?.description || '' });
                        setEditingField(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="text-sm text-muted-foreground break-words">
                    {profile?.description || 'No description set.'}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => setEditingField('description')}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </form>

            <form
              onSubmit={iconForm.handleSubmit(async (data) => {
                const icon = data.icon?.trim();
                const saved = await handleSave(
                  { icon: icon || '' },
                  (nextProfile) => iconForm.reset({ icon: nextProfile?.icon || '' })
                );
                if (saved) setEditingField(null);
              })}
              className="rounded-md border border-border bg-background/40 p-4"
            >
              <div className="flex flex-col gap-1">
                <Label htmlFor="profile-icon">Icon URL</Label>
                <p className="text-xs text-muted-foreground">Square image recommended for best results.</p>
              </div>
              {editingField === 'icon' ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <Input
                      id="profile-icon"
                      type="text"
                      placeholder="https://..."
                      {...iconForm.register('icon')}
                    />
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button type="submit" className="w-full sm:w-auto">
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        iconForm.reset({ icon: profile?.icon || '' });
                        setEditingField(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="text-sm text-muted-foreground break-words">
                    {profile?.icon || 'No icon set.'}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => setEditingField('icon')}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </form>

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
              className="rounded-md border border-border bg-background/40 p-4"
            >
              <div className="space-y-1">
                <Label htmlFor="profile-owner">Owner user ID</Label>
                <p className="text-xs text-muted-foreground">
                  Warning: Changing this transfers ownership to the provided user ID.
                </p>
              </div>
              {editingField === 'owner_id' ? (
                <div className="mt-3 flex flex-col gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <Input
                        id="profile-owner"
                        type="text"
                        placeholder="User ID"
                        {...ownerForm.register('owner_id')}
                      />
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto">
                      <Button type="submit" className="w-full sm:w-auto">
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
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
                      </Button>
                    </div>
                  </div>
                  {ownerWarning && <div className="text-xs text-destructive">{ownerWarning}</div>}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={Boolean(confirmTransfer)}
                      onCheckedChange={(checked) =>
                        ownerForm.setValue('confirm_transfer', checked, { shouldDirty: true })
                      }
                    />
                    <span>I understand this will transfer ownership.</span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="text-sm text-muted-foreground break-words">
                    {profile?.owner_id ? String(profile.owner_id) : 'Unknown'}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => {
                      setOwnerWarning('');
                      setEditingField('owner_id');
                    }}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerInfo;
