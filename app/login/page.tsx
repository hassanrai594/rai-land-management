import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AuthForm from '../auth-form';

export const metadata: Metadata = { title: 'Sign in | Land Ledger' };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/');
  return <AuthForm mode="login" />;
}
