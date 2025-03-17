import { Page } from "@playwright/test";
import { test } from "../fixtures/fixtures";
import { LoginPageSelectors, PageUtils } from "../ui/login-page";
import { InventoryPageSelectors } from "../ui/inventory-page";
export class SwagLabActions {

    readonly page: Page;

    loginPageSelector: LoginPageSelectors;
    inventoryPageSelector: InventoryPageSelectors;
    constructor(page: Page) {
        this.page = page;
        this.loginPageSelector = new LoginPageSelectors(this.page);
        this.inventoryPageSelector = new InventoryPageSelectors(this.page);
    }
    async loginAction(username: string, password: string) {

        await this.loginPageSelector.getLoginUsername().fill(username);
        await this.loginPageSelector.getLoginPassword().fill(password);
        await this.loginPageSelector.getLoginButton().click();

    }
    async logoutAction() {
        await this.inventoryPageSelector.getBurgerMenuButton().click();
        await this.inventoryPageSelector.getLogoutSidebarLink().click();
    }

}