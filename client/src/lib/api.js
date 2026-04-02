const API = '/api';

export async function fetchDocuments() {
  const res = await fetch(`${API}/documents`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function fetchDocument(id) {
  const res = await fetch(`${API}/documents/${id}`);
  if (!res.ok) throw new Error('Failed to fetch document');
  return res.json();
}

export async function createDocument(formData) {
  const res = await fetch(`${API}/documents`, {
    method: 'POST',
    body: formData,
  });
  const text = await res.text();
  if (!text) throw new Error('Server returned an empty response. Please try again.');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Server returned an invalid response. Please try again.');
  }
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create document');
  }
  return data;
}

export async function fetchSigningInfo(token) {
  const res = await fetch(`${API}/sign/${token}`);
  if (!res.ok) throw new Error('Invalid or expired signing link');
  return res.json();
}

export async function submitSignature(token, signatureData) {
  const res = await fetch(`${API}/sign/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signatureData }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to submit signature');
  }
  return res.json();
}
