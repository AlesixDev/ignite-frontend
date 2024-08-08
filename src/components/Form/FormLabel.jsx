const FormLabel = ({ htmlFor, help, children }) => {
  return (
    <div className="mb-2">
      <label htmlFor={htmlFor} className="text-base font-medium text-white">
        {children}
      </label>
      {help && <p className="text-xs text-gray-text">{help}</p>}
    </div>
  );
};

export default FormLabel;