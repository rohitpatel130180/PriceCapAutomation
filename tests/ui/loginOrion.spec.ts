
import { test, expect } from "@playwright/test"
import { annotate } from "../../src/utils/shared/annotate";




test('test', async ({ browser }) => {
    const context = await browser.newContext({
        storageState: "./auth.json"
    })
    const page = await context.newPage();
    await page.goto("https://prod.oot.ovotech.org.uk/");  
    
    await page.getByPlaceholder('Enter account, supply point,').click();
    await page.getByPlaceholder('Enter account, supply point,').fill('20313980');
    //await page.getByPlaceholder('Enter account, supply point,').press('Enter');
    await page.getByRole('link', { name: '20313980 | Jennifer Way 6 St' }).click();
    await expect(page.locator('#root')).toContainText('20313980');
    await page.getByRole('tab', { name: 'Supply points' }).click();
    
   const usage = await page.getByText('1684.14989821 kWh (anytime)').textContent();
    //const usage = await page.locator('.sc-hZDyAQ lloFTd').textContent();
    //let numbers =usage.match(/\d+/g);    
    let result = usage.replace(/[^0-9,.]/g,"");
    let final:any = Number(result).toFixed(4);

    await page.locator('[data-testid="accountMenuButton"]').click();
    //await page.getByTestId('accountMenuButton').click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    
    console.log(usage);
    //console.log(numbers);
    console.log(result);
    console.log(parseInt(final) + 10);
   

});



