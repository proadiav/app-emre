import { CreateCustomerForm } from '@/components/customers/CreateCustomerForm';

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Nouveau client</h1>
      <div className="max-w-xl">
        <CreateCustomerForm />
      </div>
    </div>
  );
}
