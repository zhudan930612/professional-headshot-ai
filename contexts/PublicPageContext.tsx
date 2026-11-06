import { createContext, useContext } from 'react';
import type { PublicPageData } from '@/types';

export const PublicPageContext = createContext<PublicPageData | null>(null);
export const usePublicPageData = () => useContext(PublicPageContext);
