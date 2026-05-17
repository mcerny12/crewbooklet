'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const router = useRouter();
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError(t('passwordsDoNotMatch'));
      return;
    }
    if (password.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => router.push('/'), 2000);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">{t('resetPassword')}</CardTitle>
          <CardDescription>
            {t('updatePassword')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
              {t('passwordUpdated')}
            </p>
          ) : !isReady ? (
            <p className="text-sm text-gray-500">{tCommon('loading')}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t('newPassword')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('newPassword')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  data-cb-sensitive="true"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">{t('confirmPassword')}</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder={t('confirmPassword')}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  disabled={isLoading}
                  data-cb-sensitive="true"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('updatingPassword') : t('updatePassword')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
