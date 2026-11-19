import { useCapability, sampleErrorCopy } from './platform/claude.js';

const $ = (sel) => document.querySelector(sel);

async function checkLive() {
  const out = $('#live-out');
  const btn = $('#live-btn');
  btn.disabled = true;
  out.textContent = 'Thinking...';
  const sample = await useCapability('sample');
  if (!sample) {
    out.textContent = 'Live Claude is not available here (local copy, or the page is not running inside claude.ai).';
    btn.disabled = false;
    return;
  }
  try {
    const data = await sample.json(
      'You are a demon in a video game prototype, speaking to a traveler for the first time. ' +
      'Reply with only a JSON object {"line": string} where line is one short in-character greeting.',
      { cache: false },
    );
    out.textContent = typeof data?.line === 'string' ? `"${data.line}"` : 'Got a reply, but not in the expected shape.';
  } catch (e) {
    out.textContent = sampleErrorCopy(e?.code) || 'Stopped.';
  } finally {
    btn.disabled = false;
  }
}

function boot() {
  $('#live-btn').addEventListener('click', checkLive);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
