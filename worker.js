export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/earnings') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders() });
      }
      const date = url.searchParams.get('date') || '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return new Response(JSON.stringify({ error: 'bad date' }), { status: 400, headers: { 'content-type': 'application/json', ...corsHeaders() } });
      }
      const upstream = await fetch(`https://api.nasdaq.com/api/calendar/earnings?date=${date}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' }
      });
      return new Response(await upstream.text(), {
        status: upstream.ok ? 200 : upstream.status,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=900', ...corsHeaders() }
      });
    }
    if (url.pathname === '/api/ambient') {
      if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });
      const app = env.AMBIENT_APPLICATION_KEY;
      const api = env.AMBIENT_API_KEY;
      if (!app || !api) {
        return new Response(JSON.stringify({ error: 'not configured' }), { status: 503, headers: { 'content-type': 'application/json', ...corsHeaders() } });
      }
      const upstream = await fetch(`https://rt.ambientweather.net/v1/devices?applicationKey=${encodeURIComponent(app)}&apiKey=${encodeURIComponent(api)}`);
      if (!upstream.ok) {
        return new Response(JSON.stringify({ error: 'upstream' }), { status: upstream.status, headers: { 'content-type': 'application/json', ...corsHeaders() } });
      }
      const devices = await upstream.json();
      const device = Array.isArray(devices) ? devices[0] : null;
      const last = (device && device.lastData) || {};
      const body = {
        name: device && device.info && device.info.name,
        tempf: last.tempf,
        feelsLike: last.feelsLike,
        humidity: last.humidity,
        dewPoint: last.dewPoint,
        windspeedmph: last.windspeedmph,
        windgustmph: last.windgustmph,
        winddir: last.winddir,
        hourlyrainin: last.hourlyrainin,
        dailyrainin: last.dailyrainin,
        baromrelin: last.baromrelin,
        uv: last.uv,
        solarradiation: last.solarradiation,
        tempinf: last.tempinf,
        humidityin: last.humidityin,
        date: last.date,
        dateutc: last.dateutc
      };
      return new Response(JSON.stringify(body), {
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=30', ...corsHeaders() }
      });
    }
    if (url.pathname === '/api/quote') {
      if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });
      const symbol = url.searchParams.get('symbol') || '';
      if (!/^[\^A-Za-z0-9.\-]{1,12}$/.test(symbol)) {
        return new Response(JSON.stringify({ error: 'bad symbol' }), { status: 400, headers: { 'content-type': 'application/json', ...corsHeaders() } });
      }
      const upstream = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m`, {
        headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }
      });
      return new Response(await upstream.text(), {
        status: upstream.ok ? 200 : upstream.status,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60', ...corsHeaders() }
      });
    }
    return env.ASSETS.fetch(request);
  }
};

function corsHeaders() {
  return { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS' };
}
