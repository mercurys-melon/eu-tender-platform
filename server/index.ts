// server/index.ts
import express from 'express';
import { Page, chromium } from 'playwright';
import { blockBidConfig } from '../src/config/env';
import { createOpenTender } from '../src/flows/openTender';
import { createRestrictedTender } from '../src/flows/restrictedTender';
import { createNegotiatedProcedure } from '../src/flows/negotiatedProcedure';
import { createQualificationSystem } from '../src/flows/qualificationSystem';
import type { TenderCommonInput } from '../src/types';

async function withPage<T>(fn: (page: Page) => Promise<T>) {
  const browser = await chromium.launch({ headless: blockBidConfig.publishingMode === 'api' });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try { return await fn(page); }
  finally { await ctx.close(); await browser.close(); }
}

const app = express();
app.use(express.json({ limit: '2mb' }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'BlockBid Automation Server is running!',
    endpoints: [
      'POST /api/tenders/open',
      'POST /api/tenders/restricted', 
      'POST /api/tenders/negotiated',
      'POST /api/qualification-systems'
    ],
    timestamp: new Date().toISOString()
  });
});

app.post('/api/tenders/open', async (req, res) => {
  try {
    await withPage(page => createOpenTender(page, req.body));
    res.status(201).json({ ok: true });
  } catch (e:any) { res.status(500).json({ ok:false, error: e.message }); }
});

app.post('/api/tenders/restricted', async (req, res) => {
  try {
    await withPage(page => createRestrictedTender(page, req.body));
    res.status(201).json({ ok: true });
  } catch (e:any) { res.status(500).json({ ok:false, error: e.message }); }
});

app.post('/api/tenders/negotiated', async (req, res) => {
  try {
    await withPage(page => createNegotiatedProcedure(page, req.body));
    res.status(201).json({ ok: true });
  } catch (e:any) { res.status(500).json({ ok:false, error: e.message }); }
});

app.post('/api/qualification-systems', async (req, res) => {
  try {
    await withPage(page => createQualificationSystem(page, req.body));
    res.status(201).json({ ok: true });
  } catch (e:any) { res.status(500).json({ ok:false, error: e.message }); }
});

app.listen(process.env.PORT ?? 3000, () => {
  console.log(`Server listening on :${process.env.PORT ?? 3000}`);
});
