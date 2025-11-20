import { Page, Browser, BrowserContext } from '@playwright/test';
import { SelectorHelper } from '../utils/selectors';
import { BlockBidError, withErrorHandling } from '../utils/errors';
import { blockBidConfig, validateConfig } from '../config/env';

export interface LoginOptions {
  headless?: boolean;
  slowMo?: number;
  timeout?: number;
}

export class BlockBidAuth {
  private page: Page;
  private selectorHelper: SelectorHelper;

  constructor(page: Page) {
    this.page = page;
    this.selectorHelper = new SelectorHelper(page);
  }

  /**
   * Login as contracting authority (Ordregiver)
   */
  async loginAsAuthority(): Promise<void> {
    return withErrorHandling(async () => {
      validateConfig();

      console.log('Starting login process...');
      
      // Navigate to login page
      await this.page.goto(`${blockBidConfig.baseUrl}/login`);
      await this.selectorHelper.waitForPageLoad();

      // Wait for login form to be visible
      await this.selectorHelper.waitForElement(
        await this.selectorHelper.findInput('Email', 'email')
      );

      // Fill email
      const emailInput = await this.selectorHelper.findInput('Email', 'email');
      await emailInput.fill(blockBidConfig.email);

      // Fill password
      const passwordInput = await this.selectorHelper.findInput('Password', 'password');
      await passwordInput.fill(blockBidConfig.password);

      // Click login button
      const loginButton = await this.selectorHelper.findButton('Log ind');
      await loginButton.click();

      // Wait for successful login - look for dashboard or user menu
      await this.waitForSuccessfulLogin();

      console.log('Login successful');
    }, 'loginAsAuthority', this.page);
  }

  /**
   * Wait for successful login by checking for dashboard elements
   */
  private async waitForSuccessfulLogin(): Promise<void> {
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check for dashboard elements that indicate successful login
        const dashboardIndicators = [
          { text: 'Dashboard' },
          { text: 'Mine udbud' },
          { text: 'Opret nyt udbud' },
          { role: 'button', name: /profil|user|menu/i },
          { xpath: '//a[contains(@href, "/dashboard")]' }
        ];

        for (const indicator of dashboardIndicators) {
          if (await this.selectorHelper.exists([indicator])) {
            await this.selectorHelper.waitForNetworkIdle();
            return;
          }
        }

        // Check for error messages
        const errorIndicators = [
          { text: /forkert|invalid|error|fejl/i },
          { role: 'alert' },
          { xpath: '//div[contains(@class, "error") or contains(@class, "alert")]' }
        ];

        for (const error of errorIndicators) {
          if (await this.selectorHelper.exists([error])) {
            const errorText = await this.selectorHelper.getText([error]);
            throw new BlockBidError(
              `Login failed: ${errorText}`,
              'loginAsAuthority',
              this.page
            );
          }
        }

        // Wait a bit before checking again
        await this.page.waitForTimeout(1000);
      } catch (error) {
        if (error instanceof BlockBidError) {
          throw error;
        }
        // Continue waiting for other indicators
      }
    }

    throw new BlockBidError(
      'Login timeout - could not verify successful login',
      'loginAsAuthority',
      this.page
    );
  }

  /**
   * Check if user is already logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      // Check for user menu or dashboard elements
      const loggedInIndicators = [
        { text: 'Dashboard' },
        { text: 'Mine udbud' },
        { role: 'button', name: /profil|user|menu/i },
        { xpath: '//a[contains(@href, "/dashboard")]' }
      ];

      for (const indicator of loggedInIndicators) {
        if (await this.selectorHelper.exists([indicator])) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Logout from the application
   */
  async logout(): Promise<void> {
    return withErrorHandling(async () => {
      try {
        // Look for logout button in user menu
        const userMenuButton = await this.selectorHelper.find([
          { role: 'button', name: /profil|user|menu/i },
          { xpath: '//button[contains(@aria-label, "menu") or contains(@class, "user-menu")]' }
        ]);

        await userMenuButton.click();

        // Look for logout option
        const logoutButton = await this.selectorHelper.find([
          { text: 'Log ud' },
          { text: 'Logout' },
          { role: 'menuitem', name: /log ud|logout/i }
        ]);

        await logoutButton.click();

        // Wait for redirect to login page
        await this.page.waitForURL(/login/, { timeout: 10000 });
        console.log('Logout successful');
      } catch (error) {
        // If logout fails, navigate to login page directly
        await this.page.goto(`${blockBidConfig.baseUrl}/login`);
        console.log('Forced logout by navigating to login page');
      }
    }, 'logout', this.page);
  }

  /**
   * Navigate to dashboard
   */
  async navigateToDashboard(): Promise<void> {
    return withErrorHandling(async () => {
      const dashboardLink = await this.selectorHelper.find([
        { text: 'Dashboard' },
        { xpath: '//a[contains(@href, "/dashboard")]' }
      ]);

      await dashboardLink.click();
      await this.selectorHelper.waitForPageLoad();
    }, 'navigateToDashboard', this.page);
  }

  /**
   * Navigate to create new tender page
   */
  async navigateToCreateTender(): Promise<void> {
    return withErrorHandling(async () => {
      const createButton = await this.selectorHelper.findButton('Opret nyt udbud');
      await createButton.click();
      await this.selectorHelper.waitForPageLoad();
    }, 'navigateToCreateTender', this.page);
  }
}

/**
 * Factory function to create authenticated page
 */
export async function createAuthenticatedPage(
  browser: Browser,
  options: LoginOptions = {}
): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: blockBidConfig.language,
    timezoneId: blockBidConfig.timezone,
  });

  const page = await context.newPage();
  const auth = new BlockBidAuth(page);

  // Set default timeout
  page.setDefaultTimeout(options.timeout || 30000);

  // Login if not already logged in
  await page.goto(blockBidConfig.baseUrl);
  await page.waitForLoadState('domcontentloaded');

  if (!(await auth.isLoggedIn())) {
    await auth.loginAsAuthority();
  }

  return page;
}

/**
 * Standalone login function for existing page
 */
export async function loginAsAuthority(page: Page): Promise<void> {
  const auth = new BlockBidAuth(page);
  await auth.loginAsAuthority();
}
