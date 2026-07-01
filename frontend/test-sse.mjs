// Verify the SSE parser handles both \n\n and \r\n\r\n boundaries.
const url = 'http://localhost:8000/api/scan';
const body = JSON.stringify({
  timeframe: '1d',
  symbols: [
    { symbol: 'RELIANCE', exchange: 'NSE' },
    { symbol: 'TCS',      exchange: 'NSE' },
  ],
});

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  },
  body,
});
console.log('status:', res.status, 'ct:', res.headers.get('content-type'));

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
const counts = { progress: 0, result: 0, error: 0, done: 0 };

const findBoundary = (s) => {
  const a = s.indexOf('\n\n');
  const b = s.indexOf('\r\n\r\n');
  if (a === -1) return b;
  if (b === -1) return a;
  return Math.min(a, b);
};

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  let sep;
  while ((sep = findBoundary(buffer)) !== -1) {
    const chunk = buffer.slice(0, sep);
    const advance = buffer.startsWith('\r\n\r\n', sep) ? 4 : 2;
    buffer = buffer.slice(sep + advance);
    let event = 'message', data = '';
    for (const line of chunk.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (!data) continue;
    try {
      const p = JSON.parse(data);
      counts[event] = (counts[event] ?? 0) + 1;
      console.log(event, event === 'result'
        ? `${p.symbol} score=${p.vcpScore} grade=${p.setupGrade}`
        : JSON.stringify(p));
    } catch (e) {
      console.warn('parse fail', data.slice(0, 100));
    }
  }
}

console.log('\nSUMMARY:', counts);