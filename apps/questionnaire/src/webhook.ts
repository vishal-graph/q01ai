export async function postCompletion(url: string, payload: any): Promise<boolean> {
  const attempts = 3;
  let delay = 500;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return true;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, delay));
    delay *= 2;
  }
  return false;
}


