import useStore from '../../hooks/useStore';
import BaseAuthLayout from '../../layouts/BaseAuthLayout';

const DashboardPage = () => {
  const store = useStore();

  return (
    <BaseAuthLayout>
      <h1 className="text-primary-500">
        Hi, {store.user?.username}!
      </h1>
    </BaseAuthLayout>
  );
};

export default DashboardPage;
