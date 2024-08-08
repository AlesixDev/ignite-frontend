import { useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { toast } from 'react-toastify';
import { ArrowRight } from '@phosphor-icons/react';
import useStore from '../../hooks/useStore';
import api from '../../api';
import AuthLayout from '../../layouts/AuthLayout';
import FormLabel from '../../components/Form/FormLabel';
import FormError from '../../components/Form/FormError';
import FormInput from '../../components/Form/FormInput';
import FormSubmit from '../../components/Form/FormSubmit';

const RegisterPage = () => {
  const form = useForm();
  const store = useStore();
  const navigate = useNavigate();

  const onSubmit = useCallback(async (data) => {
    try {
      const response = await api.post('register', data);

      if (response.data.user && response.data.token) {
        store.login(response.data.user, response.data.token);
        navigate('/dashboard');
        toast.success('Registered successfully.');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message);
    }
  }, [navigate, store]);

  return (
    <AuthLayout>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="mx-auto w-full rounded-lg border border-white/5 bg-dark-bg sm:w-[32rem]">
            <div className="bg-dark-bg-active px-6 py-4 text-center">
              <Link to="/" className="mb-1 block text-3xl font-medium">
                <span className="text-primary-500">Ignite</span>
              </Link>
              <p className="text-xs">Create a free account.</p>
            </div>
            <div className="px-6 py-4">
              <div className="mb-3">
                <FormLabel htmlFor="username">Username</FormLabel>
                <FormInput type="text" id="username" name="username" validation={{ required: "Username is required.", pattern: { value: /^[A-Za-z0-9-]+$/, message: "Username may only contain letters, numbers, dashes and underscores." } }} />
                <FormError name="username" />
              </div>
              <div className="mb-3">
                <FormLabel htmlFor="email">Email</FormLabel>
                <FormInput type="text" id="email" name="email" validation={{ required: "Email is required.", pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email address" } }} />
                <FormError name="email" />
              </div>
              <div className="mb-3">
                <FormLabel htmlFor="password">Password</FormLabel>
                <FormInput type="password" id="password" name="password" validation={{ required: "Password is required.", minLength: { value: 8, message: "Password must be at least 8 characters." } }} />
                <FormError name="password" />
              </div>
              <div className="mb-4">
                <FormLabel htmlFor="password_confirmation">Confirm Password</FormLabel>
                <FormInput type="password" id="password_confirmation" name="password_confirmation" validation={{ required: "Confirm Password is required.", validate: (value) => value === form.watch('password') || "Passwords do not match." }} />
                <FormError name="password_confirmation" />
              </div>
              <div className="mb-8">
                <FormSubmit form={form} label="Register" icon={<ArrowRight className="size-4" />}/>
              </div>
              <div className="text-center">
                <p className="text-sm">Already have an account? <Link to="/login" className="text-primary">Login</Link></p>
              </div>
            </div>
          </div>
        </form>
      </FormProvider>
    </AuthLayout>
  );
};

export default RegisterPage;
