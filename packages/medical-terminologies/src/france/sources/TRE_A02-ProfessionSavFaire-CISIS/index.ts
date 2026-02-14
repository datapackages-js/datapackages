// @generated - DO NOT EDIT BY HAND
// To update this file, run: npm run update-sources

import type { TerminologyData } from './types';

/**
 * Loads the dataset from NDJSON.
 */
export async function loadData(): Promise<TerminologyData> {
  const url = new URL('./data.ndjson', import.meta.url);
  let text: string;

  if (url.protocol === 'file:' && typeof process !== 'undefined') {
    const fs = await import('node:fs/promises');
    text = await fs.readFile(url, 'utf-8');
  } else {
    const response = await fetch(url.href);
    text = await response.text();
  }

  const concepts = text.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
  return { concept: concepts };
}

/**
 * Returns the URL for NDJSON streaming.
 */
export async function getStreamURL(): Promise<string> {
  return new URL('./data.ndjson', import.meta.url).href;
}

/**
 * Returns the remote source URL from meta.json.
 */
export async function getSourceURL(): Promise<string | null> {
  const url = new URL('./meta.json', import.meta.url);
  let meta: any;

  if (url.protocol === 'file:' && typeof process !== 'undefined') {
    const fs = await import('node:fs/promises');
    const text = await fs.readFile(url, 'utf-8');
    meta = JSON.parse(text);
  } else {
    const response = await fetch(url.href);
    meta = await response.json();
  }

  return meta.sourceUrl || null;
}

export default { loadData, getStreamURL, getSourceURL };
export * from './types';
