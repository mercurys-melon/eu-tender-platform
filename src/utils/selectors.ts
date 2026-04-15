import { Page, Locator, AriaRole } from '@playwright/test';

export interface LocatorHint {
  role?: AriaRole;
  name?: string | RegExp;
  label?: string;
  text?: string | RegExp;
  placeholder?: string;
  xpath?: string;
  testId?: string;
}

export class SelectorHelper {
  constructor(private page: Page) {}

  /**
   * Find element using multiple fallback strategies
   */
  async find(locatorHints: LocatorHint[]): Promise<Locator> {
    for (const hint of locatorHints) {
      try {
        let locator: Locator | null = null;

        // Try by role first (most accessible)
        if (hint.role && hint.name) {
          locator = this.page.getByRole(hint.role, { name: new RegExp(hint.name, 'i') });
        }

        // Try by label
        if (!locator && hint.label) {
          locator = this.page.getByLabel(new RegExp(hint.label, 'i'));
        }

        // Try by placeholder
        if (!locator && hint.placeholder) {
          locator = this.page.getByPlaceholder(new RegExp(hint.placeholder, 'i'));
        }

        // Try by text content
        if (!locator && hint.text) {
          locator = this.page.getByText(new RegExp(hint.text, 'i'));
        }

        // Try by test ID
        if (!locator && hint.testId) {
          locator = this.page.getByTestId(hint.testId);
        }

        // Try XPath as last resort
        if (!locator && hint.xpath) {
          locator = this.page.locator(hint.xpath);
        }

        if (locator) {
          // Check if element is visible and enabled
          await locator.waitFor({ state: 'visible', timeout: 5000 });
          return locator;
        }
      } catch (error) {
        // Continue to next hint
        continue;
      }
    }

    throw new Error(`Could not find element with any of the provided hints: ${JSON.stringify(locatorHints)}`);
  }

  /**
   * Find button by text or role
   */
  async findButton(text: string): Promise<Locator> {
    return this.find([
      { role: 'button', name: text },
      { text: text },
      { xpath: `//button[contains(text(), "${text}")]` }
    ]);
  }

  /**
   * Find input field by label or placeholder
   */
  async findInput(label: string, placeholder?: string): Promise<Locator> {
    const hints: LocatorHint[] = [
      { label: label },
      { placeholder: placeholder || label }
    ];
    
    if (placeholder) {
      hints.push({ placeholder: placeholder });
    }

    return this.find(hints);
  }

  /**
   * Find select/dropdown by label
   */
  async findSelect(label: string): Promise<Locator> {
    return this.find([
      { role: 'combobox', name: label },
      { label: label },
      { xpath: `//select[contains(@aria-label, "${label}")]` }
    ]);
  }

  /**
   * Find checkbox by label
   */
  async findCheckbox(label: string): Promise<Locator> {
    return this.find([
      { role: 'checkbox', name: label },
      { label: label },
      { xpath: `//input[@type="checkbox" and contains(@aria-label, "${label}")]` }
    ]);
  }

  /**
   * Find radio button by label
   */
  async findRadio(label: string): Promise<Locator> {
    return this.find([
      { role: 'radio', name: label },
      { label: label },
      { xpath: `//input[@type="radio" and contains(@aria-label, "${label}")]` }
    ]);
  }

  /**
   * Find file input
   */
  async findFileInput(): Promise<Locator> {
    return this.find([
      { xpath: '//input[@type="file"]' },
      { role: 'button', name: /upload|fil|dokument/i }
    ]);
  }

  /**
   * Find date picker input
   */
  async findDateInput(label: string): Promise<Locator> {
    return this.find([
      { label: label },
      { placeholder: /dd-mm-yyyy|date|dato/i },
      { xpath: `//input[contains(@placeholder, "dd-mm") or contains(@aria-label, "${label}")]` }
    ]);
  }

  /**
   * Find textarea by label
   */
  async findTextarea(label: string): Promise<Locator> {
    return this.find([
      { role: 'textbox', name: label },
      { label: label },
      { xpath: `//textarea[contains(@aria-label, "${label}")]` }
    ]);
  }

  /**
   * Find element by containing text
   */
  async findByText(text: string, tag?: string): Promise<Locator> {
    const hints: LocatorHint[] = [
      { text: text }
    ];

    if (tag) {
      hints.push({ xpath: `//${tag}[contains(text(), "${text}")]` });
    }

    return this.find(hints);
  }

  /**
   * Wait for element to be visible and enabled
   */
  async waitForElement(locator: Locator, timeout: number = 10000): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
    await locator.waitFor({ state: 'attached', timeout: 1000 });
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if element exists without throwing
   */
  async exists(locatorHints: LocatorHint[]): Promise<boolean> {
    try {
      await this.find(locatorHints);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get element text content
   */
  async getText(locatorHints: LocatorHint[]): Promise<string> {
    const element = await this.find(locatorHints);
    return await element.textContent() || '';
  }

  /**
   * Check if element is checked/selected
   */
  async isChecked(locatorHints: LocatorHint[]): Promise<boolean> {
    const element = await this.find(locatorHints);
    return await element.isChecked();
  }
}
