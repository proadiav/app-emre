'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { searchCustomers } from '@/app/(authenticated)/customers/actions';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface CustomerItem {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  email_verified: boolean;
  referrer_id: string | null;
  created_at: string;
}

interface CustomerSearchProps {
  initialCustomers: CustomerItem[];
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function CustomerSearch({ initialCustomers }: CustomerSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayedCustomers = query.length >= 2 ? results : initialCustomers;

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setResults([]);
      setNoResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const response = await searchCustomers(query);
      if (response.success && response.data) {
        setResults(response.data as CustomerItem[]);
        setNoResults(response.data.length === 0);
      } else {
        setResults([]);
        setNoResults(true);
      }
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  return (
    <div className="space-y-4">
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher par nom, email ou téléphone..."
      />

      {isSearching && (
        <p className="text-sm text-muted-foreground">Recherche en cours...</p>
      )}

      {noResults && !isSearching && (
        <p className="text-sm text-muted-foreground">
          Aucun client trouvé pour « {query} »
        </p>
      )}

      {displayedCustomers.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Parrain</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedCustomers.map((customer) => (
                <TableRow
                  key={customer.id}
                  onClick={() => router.push(`/customers/${customer.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">
                    {customer.first_name} {customer.last_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.phone}
                  </TableCell>
                  <TableCell>
                    {customer.referrer_id && (
                      <Badge variant="points">Oui</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dateFormatter.format(new Date(customer.created_at))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {displayedCustomers.length === 0 && !isSearching && !noResults && (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">Aucun client enregistré pour le moment.</p>
        </div>
      )}
    </div>
  );
}
