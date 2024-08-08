import { useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { toast } from 'react-toastify';
import { ArrowRight } from '@phosphor-icons/react';
import useStore from '../../hooks/useStore';
import api from '../../api';
import BaseGuestLayout from '../../layouts/BaseGuestLayout';
import FormLabel from '../../components/Form/FormLabel';
import FormError from '../../components/Form/FormError';
import FormInput from '../../components/Form/FormInput';
import FormSubmit from '../../components/Form/FormSubmit';

const LoginPage = () => {
  const form = useForm();
  const store = useStore();
  const navigate = useNavigate();

  const onSubmit = useCallback(async (data) => {
    try {
      const response = await api.post('login', data);

      if (response.data.user && response.data.token) {
        store.login(response.data.user, response.data.token);
        navigate('/channels/1/1');
        toast.success('Logged in successfully.');
      } else {
        toast.error('Failed to login.');
      }
    } catch (error) {
      console.error(error);
    toast.error(error.response?.data?.message || error.message);
    }
  }, [navigate, store]);

  return (
    <BaseGuestLayout>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="mx-auto w-full rounded-lg border border-white/5 bg-dark-bg sm:w-[32rem]">
            <div className="bg-dark-bg-active px-6 py-4 text-center">
              <Link to="/" className="mb-1 block text-3xl font-medium">
                <span className="text-white">Sell<span className="text-primary">Auth</span></span>
              </Link>
              <p className="text-xs">Log in to your account.</p>
            </div>
            <div className="px-6 py-4">
              <div className="mb-3">
                <FormLabel htmlFor="email">Email</FormLabel>
                <FormInput type="text" id="email" name="email" validation={{ required: "Email is required.", pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email address" } }} />
                <FormError name="email" />
              </div>
              <div className="mb-1">
                <FormLabel htmlFor="password">Password</FormLabel>
                <FormInput type="password" id="password" name="password" validation={{ required: "Password is required.", minLength: { value: 8, message: "Password must be at least 8 characters." } }} />
                <FormError name="password" />
              </div>
              <div className="mb-4 text-right">
                <Link to="/forgot-password" className="text-xs text-primary">Forgot password?</Link>
              </div>
              <div className="mb-8">
                <FormSubmit form={form} label="Login" icon={<ArrowRight className="size-4" />}/>
              </div>
              <div className="text-center">
                <p className="text-sm">Don&apos;t have an account? <Link to="/register" className="text-primary">Register</Link></p>
              </div>
            </div>
          </div>
        </form>
      </FormProvider>
    </BaseGuestLayout>
  );
};

export default LoginPage;
