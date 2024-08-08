import useStore from '../../hooks/useStore';
import DefaultLayout from '../../layouts/DefaultLayout';

const DashboardPage = () => {
  const store = useStore();

  return (
    <DefaultLayout>
      <h1 class="text-primary-500">
        Hi, {store.user?.username}!
      </h1>
    </DefaultLayout>
  );
};

export default DashboardPage;
