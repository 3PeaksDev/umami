import type { Metadata } from 'next';
import { FleetPage } from './FleetPage';

export default function () {
  return <FleetPage />;
}

export const metadata: Metadata = {
  title: 'Fleet',
};
