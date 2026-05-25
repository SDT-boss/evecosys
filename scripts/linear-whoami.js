#!/usr/bin/env node
/**
 * Lightweight script to call Linear API using a personal API key stored in env
 * Usage: LINEAR_API_KEY=xxxx node scripts/linear-whoami.js
 */
import("@linear/sdk").then(({ LinearClient }) => {
  const key = process.env.LINEAR_API_KEY;
  if (!key) {
    console.error('Please set LINEAR_API_KEY in environment');
    process.exit(1);
  }
  const client = new LinearClient({ apiKey: key });
  client.viewer().then(v => {
    console.log('Linear viewer:', v);
  }).catch(err => {
    console.error('Linear API error:', err);
    process.exit(1);
  });
});
