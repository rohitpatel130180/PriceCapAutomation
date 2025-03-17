import { Page } from '@playwright/test';
import { PlaywrightSiteUtils } from '../../utils/ui/playwright-site-utils';

export class PlaywrightSiteActions {
  readonly playwrightSiteUtils: PlaywrightSiteUtils;
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
    this.playwrightSiteUtils = new PlaywrightSiteUtils(this.page);
  }

  async visitCommunityPage() {
    await this.playwrightSiteUtils.goToCommunityPage();
    await this.playwrightSiteUtils.assertCommunityPageHeader();
  }
}
