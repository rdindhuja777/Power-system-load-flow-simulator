const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const simulateEndpoint = `${apiBaseUrl}/api/simulate`;

function backendHint() {
  return import.meta.env.DEV
    ? 'Backend API is unavailable. Start the backend server and try again.'
    : 'Backend API is unavailable. GitHub Pages hosts only the frontend. Deploy the backend separately and set VITE_API_BASE_URL at build time.';
}

export async function simulateLoadFlow(payload) {
  const response = await fetch(simulateEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let data = null;
  if (isJson) {
    data = await response.json();
  } else {
    await response.text();
  }

  if (!response.ok) {
    throw new Error(data?.message || backendHint());
  }

  if (!isJson || !data) {
    throw new Error(backendHint());
  }

  return data;
}
