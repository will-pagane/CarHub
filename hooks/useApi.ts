import { useCallback } from 'react';
import { API_BASE_URL } from '../constants';
import { useAuth } from '../contexts/AuthContext';

export default function useApi() {
  const { idToken } = useAuth();

  const callApi = useCallback(async (endpoint: string, method: string = 'GET', body?: unknown) => {
    if (!idToken) throw new Error('No authentication token');
    const headers: HeadersInit = {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    };
    const config: RequestInit = { method, headers };
    if (body) config.body = JSON.stringify(body);
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API ${response.status}: ${errorText}`);
    }
    if (response.status === 204) return null;
    return response.json();
  }, [idToken]);

  return { callApi };
}
