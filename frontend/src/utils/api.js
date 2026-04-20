export async function simulateLoadFlow(payload) {
  console.log('Sending simulation payload to backend:', JSON.stringify(payload, null, 2));
  const response = await fetch('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Simulation request failed');
  }
  return data;
}
