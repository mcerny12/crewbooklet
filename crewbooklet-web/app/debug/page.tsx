'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { MainLayout } from '@/components/layout/main-layout';

export default function DebugPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testConnection() {
      const testResults: any = {};

      // Test 1: Check auth session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      testResults.session = {
        data: sessionData,
        error: sessionError,
        isAuthenticated: !!sessionData.session
      };

      // Test 2: Try to fetch people
      const { data: peopleData, error: peopleError } = await supabase
        .from('people')
        .select('*');
      testResults.people = {
        count: peopleData?.length || 0,
        data: peopleData,
        error: peopleError
      };

      // Test 3: Try to fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*');
      testResults.projects = {
        count: projectsData?.length || 0,
        data: projectsData,
        error: projectsError
      };

      // Test 4: Try to fetch organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*');
      testResults.organizations = {
        count: orgsData?.length || 0,
        data: orgsData,
        error: orgsError
      };

      setResults(testResults);
      setLoading(false);
    }

    testConnection();
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Testing Supabase Connection...</h1>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Supabase Connection Debug</h1>

        <div className="space-y-6">
          {/* Session Info */}
          <div className="border rounded p-4">
            <h2 className="font-semibold text-lg mb-2">Authentication Status</h2>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(results.session, null, 2)}
            </pre>
          </div>

          {/* People */}
          <div className="border rounded p-4">
            <h2 className="font-semibold text-lg mb-2">
              People (Count: {results.people?.count})
            </h2>
            {results.people?.error ? (
              <div className="text-red-600 mb-2">
                Error: {JSON.stringify(results.people.error)}
              </div>
            ) : null}
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto text-xs max-h-48">
              {JSON.stringify(results.people?.data, null, 2)}
            </pre>
          </div>

          {/* Projects */}
          <div className="border rounded p-4">
            <h2 className="font-semibold text-lg mb-2">
              Projects (Count: {results.projects?.count})
            </h2>
            {results.projects?.error ? (
              <div className="text-red-600 mb-2">
                Error: {JSON.stringify(results.projects.error)}
              </div>
            ) : null}
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto text-xs max-h-48">
              {JSON.stringify(results.projects?.data, null, 2)}
            </pre>
          </div>

          {/* Organizations */}
          <div className="border rounded p-4">
            <h2 className="font-semibold text-lg mb-2">
              Organizations (Count: {results.organizations?.count})
            </h2>
            {results.organizations?.error ? (
              <div className="text-red-600 mb-2">
                Error: {JSON.stringify(results.organizations.error)}
              </div>
            ) : null}
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto text-xs max-h-48">
              {JSON.stringify(results.organizations?.data, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
