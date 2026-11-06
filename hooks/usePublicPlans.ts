import { useEffect, useState } from 'react';
import { usePublicPageData } from '@/contexts/PublicPageContext';
import { getSubscriptionPlans } from '@/services/subscriptionService';
import { parsePublicPlans } from '@/prerender/plans';

export const usePublicPlans = () => {
  const pageData = usePublicPageData();
  const [plans, setPlans] = useState(pageData?.plans ?? []);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void getSubscriptionPlans(controller.signal).then(data => {
      if (controller.signal.aborted) return;
      setPlans(parsePublicPlans(data));
      setUnavailable(false);
    }).catch(() => {
      if (!controller.signal.aborted) setUnavailable(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);
  return { plans, loading, unavailable };
};
