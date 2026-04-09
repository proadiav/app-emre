'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  getErrorMessage,
  ApiResponse,
} from '@/lib/utils/errors';
import {
  getTotalCustomers,
  getTotalReferrals,
  getTotalSalesAmount,
  getTotalVouchersGenerated,
  getTopReferrers,
} from '@/lib/db/stats';
import { getCustomerById } from '@/lib/db/customers';
import { logAction } from '@/lib/utils/audit';

interface StatisticsData {
  totalCustomers: number;
  totalReferrals: number;
  totalSalesAmount: number;
  totalVouchersGenerated: number;
  topReferrers: Array<{
    customerId: string;
    email: string;
    firstName: string;
    lastName: string;
    count: number;
  }>;
}

/**
 * Server Action: Get comprehensive statistics (ADMIN only)
 *
 * Fetches all statistics in parallel:
 * - Total customers
 * - Total referrals
 * - Total sales amount
 * - Total vouchers generated
 * - Top referrers (with customer details)
 */
export async function getStatisticsAction(): Promise<ApiResponse<StatisticsData>> {
  try {
    // Check admin role
    const supabase = createServerSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.error('[getStatisticsAction] Failed to get current user:', authError);
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    // Verify admin role
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (staffError || !staff || staff.role !== 'admin') {
      console.warn('[getStatisticsAction] Non-admin user attempted access:', {
        userId: authData.user.id,
      });
      return errorResponse(ErrorCodes.FORBIDDEN, 'Accès administrateur requis');
    }

    // Fetch all stats in parallel
    const [totalCustomers, totalReferrals, totalSalesAmount, totalVouchersGenerated, topReferrersRaw] = await Promise.all([
      getTotalCustomers(),
      getTotalReferrals(),
      getTotalSalesAmount(),
      getTotalVouchersGenerated(),
      getTopReferrers(10),
    ]);

    // Enrich top referrers with customer details
    const topReferrers: StatisticsData['topReferrers'] = [];
    for (const referrer of topReferrersRaw) {
      try {
        const customerResponse = await getCustomerById(referrer.customer_id);
        if (customerResponse.success && customerResponse.customer) {
          const customer = customerResponse.customer;
          topReferrers.push({
            customerId: referrer.customer_id,
            email: customer.email,
            firstName: customer.first_name,
            lastName: customer.last_name,
            count: referrer.count,
          });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('[getStatisticsAction] Failed to fetch customer details:', {
          customerId: referrer.customer_id,
          error: errorMsg,
        });
        // Continue even if one customer fails
      }
    }

    const data: StatisticsData = {
      totalCustomers,
      totalReferrals,
      totalSalesAmount,
      totalVouchersGenerated,
      topReferrers,
    };

    return successResponse<StatisticsData>(data);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[getStatisticsAction] Exception:', errorMsg);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}

/**
 * Server Action: Export statistics as CSV (ADMIN only)
 *
 * Process:
 * 1. Get statistics using getStatisticsAction
 * 2. Generate CSV from topReferrers data
 * 3. Log export action
 * 4. Return CSV string
 */
export async function exportStatsAsCSVAction(): Promise<ApiResponse<string>> {
  try {
    // Check admin role
    const supabase = createServerSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.error('[exportStatsAsCSVAction] Failed to get current user:', authError);
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
    }

    // Verify admin role
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (staffError || !staff || staff.role !== 'admin') {
      console.warn('[exportStatsAsCSVAction] Non-admin user attempted access:', {
        userId: authData.user.id,
      });
      return errorResponse(ErrorCodes.FORBIDDEN, 'Accès administrateur requis');
    }

    // Get statistics
    const statsResult = await getStatisticsAction();
    if (!statsResult.success || !statsResult.data) {
      console.error('[exportStatsAsCSVAction] Failed to fetch statistics:', statsResult.error);
      return errorResponse(ErrorCodes.UNKNOWN_ERROR, 'Impossible de générer le rapport');
    }

    const stats = statsResult.data;

    // Generate CSV header
    const csvHeader = ['Email', 'Prénom', 'Nom', 'Filleuls Validés'].join(',');

    // Generate CSV rows from top referrers
    const csvRows = stats.topReferrers.map(referrer =>
      [
        `"${referrer.email}"`,
        `"${referrer.firstName}"`,
        `"${referrer.lastName}"`,
        referrer.count,
      ].join(',')
    );

    // Combine header and rows
    const csv = [csvHeader, ...csvRows].join('\n');

    // Log action
    await logAction(authData.user.id, 'export_stats', {
      rowCount: stats.topReferrers.length,
    });

    return successResponse<string>(csv);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[exportStatsAsCSVAction] Exception:', errorMsg);
    return errorResponse(ErrorCodes.UNKNOWN_ERROR, getErrorMessage(ErrorCodes.UNKNOWN_ERROR));
  }
}
