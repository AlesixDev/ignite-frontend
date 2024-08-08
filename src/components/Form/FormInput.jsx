import { useFormContext } from 'react-hook-form';

const FormInput = ({ name, validation, className, ...rest }) => {
  const { register } = useFormContext();

  return (
    <input {...(name && register(name, validation))} {...rest} className={`w-full rounded-md border border-white/5 bg-dark-bg-active px-4 py-2 text-white focus:border-primary focus:ring-primary ${className}`} />
  );
};

export default FormInput;
