import { CreateCustomerForm } from '@/components/customers/CreateCustomerForm';

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Nouveau client</h1>
      <div className="max-w-xl">
        <CreateCustomerForm />
      </div>
    </div>
  );
}
