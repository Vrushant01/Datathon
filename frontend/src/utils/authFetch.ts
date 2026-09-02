export const authFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const token = localStorage.getItem('token');
  
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers
  });

  if (response.status === 401) {
    // Optionally trigger a logout or redirect here if desired, 
    // but for now, we just let the caller handle it.
    console.warn('authFetch received 401 Unauthorized for', input);
  }

  return response;
};
