import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AuthForm from '../auth-form';

export const metadata: Metadata = { title: 'Create account | Land Ledger' };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect('/');
  return <AuthForm mode="signup" />;
}
