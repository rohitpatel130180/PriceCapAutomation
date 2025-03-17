import { Page } from "@playwright/test";
//import { test } from "../fixtures/fixtures";
//import { LoginPageSelectors, PageUtils } from "../ui/login-page";
//import { InventoryPageSelectors } from "../ui/inventory-page";
export class ElectircMeterActions {

    readonly page: Page;

    //loginPageSelector: LoginPageSelectors;
    //inventoryPageSelector: InventoryPageSelectors;
    constructor() {
      //  this.page = page;
        //this.loginPageSelector = new LoginPageSelectors(this.page);
        //this.inventoryPageSelector = new InventoryPageSelectors(this.page);
    }
  ePass = () => {
console.log('Hello');
            }  
    
}
const obj = new ElectircMeterActions();
obj.ePass();
