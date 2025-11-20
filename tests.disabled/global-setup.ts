import { chromium, FullConfig } from '@playwright/test';
import { blockBidConfig, validateConfig } from '../src/config/env';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup...');
  
  try {
    // Validate configuration
    validateConfig();
    console.log('✅ Configuration validated');
    
    // Test basic connectivity
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto(blockBidConfig.baseUrl, { timeout: 30000 });
      console.log('✅ BlockBid connectivity verified');
    } catch (error) {
      console.warn('⚠️  Could not verify BlockBid connectivity:', error);
    } finally {
      await context.close();
      await browser.close();
    }
    
    console.log('✅ Global setup completed');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;
