// Types generated from Supabase schema
// Run: npx supabase gen types typescript --local > lib/supabase/types.ts
// For Phase 1, manually define core types:

export interface Database {
  public: {
    Tables: {
      staff: {
        Row: {
          id: string;
          email: string;
          role: 'admin' | 'vendeur';
          created_at: string;
          updated_at: string;
        };
      };
      customers: {
        Row: {
          id: string;
          email: string;
          phone: string;
          first_name: string;
          last_name: string;
          referrer_id: string | null;
          email_verified: boolean;
          email_verification_token: string | null;
          email_verification_token_expires: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      sales: {
        Row: {
          id: string;
          customer_id: string;
          amount: number;
          created_at: string;
        };
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referee_id: string;
          status: 'pending' | 'validated';
          validated_at: string | null;
          sale_id: string | null;
          points_awarded: number;
          created_at: string;
        };
      };
      vouchers: {
        Row: {
          id: string;
          referrer_id: string;
          status: 'available' | 'used' | 'expired';
          used_at: string | null;
          used_in_sale_id: string | null;
          created_at: string;
        };
      };
      program_settings: {
        Row: {
          id: number;
          min_sale_amount: number;
          points_per_referral: number;
          voucher_value_euros: number;
          points_for_voucher: number;
          created_at: string;
          updated_at: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          staff_id: string;
          action: string;
          details: Record<string, unknown> | null;
          created_at: string;
        };
      };
    };
  };
}
