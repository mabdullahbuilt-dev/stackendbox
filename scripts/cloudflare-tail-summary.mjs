// Parse Wrangler's JSON event stream without printing request headers, cookies,
// query strings, addresses, trace details, or application log payloads.
let buffer = '';
for await (const chunk of process.stdin) {
  buffer += chunk;
  let end;
  while ((end = buffer.indexOf('\n}')) >= 0) {
    const start = buffer.indexOf('{');
    const record = buffer.slice(start, end + 2);
    buffer = buffer.slice(end + 2);
    if (start < 0) continue;
    try {
      const event = JSON.parse(record);
      console.log(JSON.stringify({ path: event.event?.request?.url ? new URL(event.event.request.url).pathname : 'background', status: event.event?.response?.status, cpuMs: event.cpuTime, wallMs: event.wallTime, outcome: event.outcome, exceptionNames: (event.exceptions || []).map(error => error.name) }));
    } catch { /* Ignore non-event CLI notices. Never echo raw records. */ }
  }
  if (buffer.length > 1024 * 1024) throw new Error('Unexpected oversized tail event');
}
