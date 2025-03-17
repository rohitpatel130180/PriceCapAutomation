import { test, expect } from "../../src/fixtures/fixtures.ts";
import fs, { writeFile, writeFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { convertArrayToCSV } from 'convert-array-to-csv';
import { annotate } from '../../src/utils/shared/annotate.ts';




test('DualFuel test', async ({ page }) => {
    // Step 1: Below section will read the databucket file
    annotate('Get sorted testing bucket file');
    const dualFuelBucket = parse(fs.readFileSync("src/testdata/testbuckets/Simpler Energy - Dual Fuel - On Demand - Post.xlsx - Sheet1.csv"), {
        columns: true,
        skip_empty_lines: true,
        //delimiter: ";",
    })

    //Step2:Below code will read the price file
    annotate('Getting price data');
    const newPriceData = parse(fs.readFileSync("src/testdata/newpricefiles/Jan2025Price.csv"), {
        columns: true,
        skip_empty_lines: true,
        //delimiter: ";",
    })

    //Declare new objects to be created
    interface DualFuelProofingSpreadsheetObject {

        EleAccountNo: number, GasAccountNumber?: number, GSP: string,

        EleNewSC: number, EleNewStandingChargeCorrect: string,
        EleNewRate1: number, NewUnitRate1Correct: string,
        EleNewRate2: number, NewUnitRate2Correct: string,
        EleNewRate3: number, NewUnitRate3Correct: string,
        EleNewRate4: number, NewUnitRate4Correct: string,

        GasNewRate: number, NewGasRateCorrect: string,
        GasNewSC: number, GasNewStandingChargeCorrect: string,

        EleOldAnnualCost: number, EleNewAnnualCost: number, ElePdfProj: number, EleManualProj: number, ElDiff: number,
        EleChangeDiff: number, EleChangeAmountCorrect: string,

        GasOldAnnualCost: number, GasNewAnnualCost: number, GasPdfProj: number, GasManualProj: number, GasDiff: number,
        GasChangeDiff: number, GasChangeAmountCorrect: string,
    }
    //Step: 4 Navigate thorough each row from origial data bucket and perform calculation
    const newDualFuelBucketData: Object[] = []; //This object is to store and generat csv at the end after all calculation complete

    let finalPriceData: string[] = [];
    const meterCategory: string[] = ['Economy 7', 'Economy 10', 'Domestic Economy', 'Smart Economy 9', '2 Rate',
        'THTC', 'Flex Rate', '2 Rate (Heating)', 'Superdeal', '3 Rate (Heating)', '3 Rate (E&W, Heating)',
        '4 Rate', 'Economy & Heating Load', 'Heatwise 2 Rate', 'Heatwise 3 Rate', 'Region Specific',
        '1 Year Fixed Loyalty', '1 Year Fixed Loyalty Economy 7'];
       

    for (const property in dualFuelBucket) {   //Navigating through each record of data bucket starts here

        //Below code is to make sure customer got zone value  is in data file  and its matching to predefined values

        // const newPriceCustomerZone: string[] = ['_A', '_B', '_C', '_D', '_E', '_F', '_G', '_H', '_J', '_K', '_L', '_M', '_N', '_P'];
        let customerZone = dualFuelBucket[property].Zone_1;

        // const customerZone = newPriceCustomerZone.find(val => val === zone);
        //let customerZone = zone;
        //let subNewPriceData: string[] = [];
        let zoneBasedPriceData = newPriceData.filter(function (el) {
            return el[5] === customerZone;
        });

        if (zoneBasedPriceData.length) {//If customer data got information about zone then move forward and look for thier meter type

            let eMeter = '';
            let eleTariffName = dualFuelBucket[property].Elec_Tariff_Name;
            if (eleTariffName === 'Simpler Energy' || eleTariffName === 'Warmer Home Plan' || eleTariffName === 'Pay As You Go') { eleTariffName = 'Standard'; }
            else {
                meterCategory.forEach((element) => {
                    if (eleTariffName.includes(element)) {
                        eleTariffName = element;      

                    }
                    
                });
            }
           
            for (const prop in zoneBasedPriceData) {
                if (eleTariffName === zoneBasedPriceData[prop][7]) {
                    eMeter = eleTariffName;
                }
            }
           
            let gMeter = '';
            let gasTariffName = dualFuelBucket[property].Gas_Tariff_Name;
            if (gasTariffName === 'Simpler Energy' || gasTariffName === 'Warmer Home Plan' || gasTariffName === 'Pay As You Go') { gasTariffName = 'Standard'; }
            else {
                meterCategory.forEach((element) => {

                    if (gasTariffName.includes(element)) {
                        gasTariffName = element;
                    }
                    

                })
            }
            
            for (const prop in zoneBasedPriceData) {
                if (gasTariffName === zoneBasedPriceData[prop][7]) {
                    gMeter = gasTariffName;
                }
            }
            
            let meterBasedPriceData = zoneBasedPriceData.filter(function (el) {
                return el[7] === eMeter || el[7] === gMeter;
            });
           
            if (meterBasedPriceData.length) {
                const elePaymentMethod = dualFuelBucket[property].Elec_Payment_Method;
                const gasPaymentMethod = dualFuelBucket[property].Gas_Payment_Method;

                let elePayMethod = '';
                let gasPayMethod = '';
                for (const prop in meterBasedPriceData) {
                    if (elePaymentMethod === meterBasedPriceData[prop][10]) {
                        elePayMethod = elePaymentMethod;
                    }
                }
                for (const prop1 in meterBasedPriceData) {
                    if (gasPaymentMethod === meterBasedPriceData[prop1][10]) {
                        gasPayMethod = gasPaymentMethod;
                    }
                }
                let finalPriceData = meterBasedPriceData.filter(function (el) {
                    return el[10] === elePayMethod || el[10] === gasPayMethod;
                });
                if (finalPriceData.length) {
                    //All calculation should go here
                    console.log(finalPriceData);

                }
                else {

                    console.log('Payment Type missing');
                }

            }


            else {
                console.log('Meter category missing');
            }

        }

        else {
            console.log('zone missing for');
        }



        //console.log(finalPriceData[0]);


        // for (const prop in newPriceData) {
        //     if (zone === newPriceData[prop][5]) {
        //         customerZone = zone;
        //         subNewPriceData =  newPriceData.filter((element)=>{
        //             return element == customerZone;
        //         });
        //     }
        // }
        //console.log(newPriceData);
        // console.log(subNewPriceData);



        //Below code is to make sure cusotmer got payment method in data file and its matching to predefined values
        // const newPriceCustomerPaymentMethod: string[] = ['On Demand', 'Prepayment', 'Direct Debit'];

        //const elePayMethod = newPriceCustomerPaymentMethod.find(val => val === elePaymentMethod);

        // const gasPayMethod = newPriceCustomerPaymentMethod.find(val => val === gasPaymentMethod);



        //Below code is to make sure customer got Electric and Gas tarrif value in data file for the customer


        // console.log(customerZone, eMeter, gMeter, elePayMethod, gasPayMethod);
        /* if (customerZone !== undefined || customerZone !== null || customerZone !== '') {
  
              if (eMeter !== undefined && gMeter !== undefined || eMeter !== null && gMeter !== null || eMeter !== '' && gMeter !== '') {
                  if (elePayMethod !== undefined || gasPayMethod !== undefined) {
                      const standardElectricPrice = newPriceData.filter(newPrice => newPrice[5] === customerZone && newPrice[3] === eMeter && newPrice[4] === 'Electric' && newPrice[10] === elePayMethod);
                      const standardGasPrice = newPriceData.filter(newPrice => newPrice[5] === customerZone && newPrice[3] === gMeter && newPrice[4] === 'Gas' && newPrice[10] === gasPayMethod);
  
  
                      //Below code will create new obejct and assing key and value to it
                      const proofingSheetObject: DualFuelProofingSpreadsheetObject & { [key: string]: any } = {
  
  
                          EleAccountNo: dualFuelBucket[property].Elec_Customer_No,
                          GasAccountNumber: dualFuelBucket[property].Gas_Customer_No,
                          GSP: dualFuelBucket[property].Zone_1,
  
                          EleNewSC: dualFuelBucket[property].Elec_New_Stdg_Chrg, EleNewStandingChargeCorrect: '',
                          EleNewRate1: dualFuelBucket[property].Elec_New_Unit_1_Inc_Vat, NewUnitRate1Correct: '',
                          EleNewRate2: dualFuelBucket[property].Elec_New_Unit_2_Inc_Vat, NewUnitRate2Correct: '',
                          EleNewRate3: dualFuelBucket[property].Elec_New_Unit_3_Inc_VAT, NewUnitRate3Correct: '',
                          EleNewRate4: dualFuelBucket[property].Elec_New_Unit_4_Inc_VAT, NewUnitRate4Correct: '',
  
                          GasNewRate: dualFuelBucket[property].Gas_New_Unit_1_Inc_Vat, NewGasRateCorrect: '',
                          GasNewSC: dualFuelBucket[property].Gas_New_Stdg_Chrg_Inc_Vat, GasNewStandingChargeCorrect: '',
  
                          EleOldAnnualCost: dualFuelBucket[property].Elec_Total_Old_Cost,
                          EleNewAnnualCost: dualFuelBucket[property].Elec_Total_New_Cost,
                          EleChangeDiff: dualFuelBucket[property].Elec_Total_Old_Cost - dualFuelBucket[property].Elec_Total_New_Cost,
                          EleChangeAmountCorrect: '',
                          ElePdfProj: dualFuelBucket[property].Elec_Total_New_Cost,
  
                          EleManualProj: Math.round((dualFuelBucket[property].Elec_Annual_Usage * standardElectricPrice[0]['17.0000']) + (365 * standardElectricPrice[0]['13.0000'])),
                          ElDiff: (dualFuelBucket[property].Elec_Annual_Usage * standardElectricPrice[0]['17.0000']) / (dualFuelBucket[property].Elec_Total_New_Cost),
  
  
                          GasOldAnnualCost: dualFuelBucket[property].Gas_Total_Old_Cost,
                          GasNewAnnualCost: dualFuelBucket[property].Gas_Total_New_Cost,
                          GasChangeDiff: dualFuelBucket[property].Gas_Total_Old_Cost - dualFuelBucket[property].Gas_Total_New_Cost,
                          GasChangeAmountCorrect: '',
                          GasPdfProj: dualFuelBucket[property].Gas_Total_New_Cost,
  
                          GasManualProj: Math.round((dualFuelBucket[property].Gas_Annual_Usage * standardGasPrice[0]['17.0000']) + (365 * standardGasPrice[0]['13.0000'])),
                          GasDiff: (dualFuelBucket[property].Gas_Annual_Usage * standardGasPrice[0]['17.0000']) / (dualFuelBucket[property].Gas_Total_New_Cost),
  
                      }
  
                      newDualFuelBucketData.push(proofingSheetObject);
                  }
                  else { console.log('Unable to find payment method'); }
              }
              else { console.log('Unable to find emter or g meter method'); }
  
          } 
          else {
              console.log(`${dualFuelBucket[property].Elec_Customer_No} account missing some required value in order to check for new price `);
          } */


    }
    annotate('The we should be able to generate new CSV testing file');
    // // //Below code to write final arrays to file
    // const csvFromArrayOfObjects = convertArrayToCSV(newDualFuelBucketData);
    // fs.writeFile('CSV Output/trial.csv', csvFromArrayOfObjects, err => {
    //     if (err) {
    //         console.log(18, err);
    //     }
    //     console.log('CSV file created');
    // })

});



