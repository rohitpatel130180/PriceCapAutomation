import type { Page } from "@playwright/test";
import {expect} from "@playwright/test";

export class PlaywrightSiteSelectors {
    private readonly page: Page
    constructor(page: Page) {
        this.page = page
    }

    getCommunityNavButton() {
        return this.page.locator('a[href="/community/welcome"]')
    }

    getWelcomeHeader() {
        return this.page.locator('h1').getByText('Welcome')
    }
}


export class PlaywrightSiteUtils {
    private readonly page: Page;
    readonly playwrightSiteSelectors: PlaywrightSiteSelectors;
    constructor(page: Page) {
        this.page = page
        this.playwrightSiteSelectors = new PlaywrightSiteSelectors(this.page)
    }

    async goToCommunityPage() {
        await this.playwrightSiteSelectors.getCommunityNavButton().click()
    }
    async assertCommunityPageHeader() {
        await expect(this.playwrightSiteSelectors.getWelcomeHeader()).toBeVisible()
    }
}