import type { Metadata } from 'next';
import { AdminLayout } from './AdminLayout';

export default function ({ children }) {
  if (process.env.cloudMode) {
    return null;
  }

  return <AdminLayout>{children}</AdminLayout>;
}

export const metadata: Metadata = {
  title: {
    template: '%s | Admin | 3Peaks Analytics',
    default: 'Admin | 3Peaks Analytics',
  },
};
