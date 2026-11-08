// Create the tables as soon as the server starts (Node.js runtime only).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ready } = await import('./lib/of/db');
    await ready();
  }
}
