import { test, expect } from "../../src/fixtures/fixtures.ts";
import fs, { writeFile, writeFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { convertArrayToCSV } from 'convert-array-to-csv';
import { annotate } from '../../src/utils/shared/annotate.ts';

test('DualFuel test', async ({ page }) => {
    // Step 1: Read the databucket file
    /*annotate('Get sorted testing bucket file');
    const dualFuelBucket = parse(fs.readFileSync("src/testdata/testbuckets/Fixed Renewal - Dual Fuel - Elec Fixed - Post.csv"), {
        columns: true,
        skip_empty_lines: true,
        //delimiter: ";",

    })*/

   const dualFuelBucket = parse(fs.readFileSync("src/testdata/testbuckets/Simpler Energy - Multi-Rate - Dual Fuel - On Demand - Post.csv"), {
        columns: true,
        skip_empty_lines: true,
        //delimiter: ";",

    });


    //Step2:Read the latest price 
    annotate('Getting price data');
    const newPriceData = parse(fs.readFileSync("src/testdata/newpricefiles/January Live Run Calculator - Rohit - Tariff Info & Rates.csv"), {
        columns: true,
        skip_empty_lines: true,
        //delimiter: ";",
    })

    //Step 3: Declare new Proofing Object prototype 

    interface ProofingObject {
        Date:string,Checker:string,PDF:string,Page:string,
        Account: number, GSP: string,
        Fuel: string,Tariff:string, Meter:string,
        NewSC: number, NewStandingChargeCorrect: string,
        NewRate1: number, NewRate1Correct: string,
        NewRate2: any, NewRate2Correct: string,
        NewRate3: any, NewRate3Correct: string,
        NewRate4: any, NewRate4Correct: string,

        OldAnnualCost: number, NewAnnualCost: number, ChangeDifference: number, ChangeAmountCorrect: String,
        PDFPersonalProjection: number, ManualCalculationProjection: number, Difference: number,
        AreFrontPageCalculationCorrect: string,
        RelevantCheapestTariffCorrect: string,
        ActualCheapestOverallTariffCorrect: string,
        PresentmentCorrect: string,
        PassFail: string,
        Comments: string,

    }

    //Step:4 Declare an object to store and generate new csv with calculation
    const newDualFuelBucketData: Object[] = [];

    //Step:5 Navigate thorough each row,received  from Step 1: data bucket and perform calculation
    // Declare meter category available into latest price file
    const meterCategory: string[] = ['Economy 7', 'Economy 10', 'Domestic Economy', 'Smart Economy 9', '2 Rate',
        'THTC', 'Flex Rate', '2 Rate (Heating)', 'Superdeal', '3 Rate (Heating)', '3 Rate (E&W, Heating)',
        '4 Rate', 'Economy & Heating Load', 'Heatwise 2 Rate', 'Heatwise 3 Rate', 'Region Specific',
        '1 Year Fixed Loyalty', '1 Year Fixed Loyalty Economy 7', '1 Year Fixed', '1 Year Fixed Economy 7', '1 Year Fixed + Boiler Cover',
        '1 Year Fixed + Boiler Cover Economy 7', '1 Year Fixed + Greener Electricity', '1 Year Fixed + Greener Electricity Economy 7'];

    const gasMeterCategory:string[] = ['Standard','1 Year Fixed Loyalty','1 Year Fixed','1 Year Fixed + Boiler Cover','1 Year Fixed + Greener Electricity'];    
    //Step 5.1 Navigating through each record of data bucket starts here
    for (const property in dualFuelBucket) {

        //Step 5.1.1: Filtering price file according to zone of cutomer
        let customerZone = dualFuelBucket[property].Zone_1;

        let zoneBasedPriceData = newPriceData.filter(function (el) {
            return el[5] === customerZone;
        });

        //Step 5.1.2: Filtering price file according to Meter type
        if (zoneBasedPriceData.length) {

            //Capturing Electric Meter type
            let eMeter: string = '';
            let eleTariffName: string = dualFuelBucket[property].Elec_Tariff_Name;
            
            if (eleTariffName === 'Simpler Energy' || eleTariffName === 'Warmer Home Plan' || eleTariffName === 'Pay As You Go') { eleTariffName = 'Standard'; }

            else {
                meterCategory.forEach((element) => {
                    if (element === eleTariffName) {
                        eleTariffName = element;
                    }
                });

                if (eleTariffName === '') {
                    meterCategory.forEach((element) => {
                        if (eleTariffName.includes(element)) {
                            eleTariffName = element;
                        }
                    });
                }
            }

            for (const prop in zoneBasedPriceData) {
                if (eleTariffName === zoneBasedPriceData[prop][3]) {
                    eMeter = eleTariffName;
                }
            }
           
            let eleMeterBasedPriceData = [];
            if (eMeter !== '') {

                eleMeterBasedPriceData = zoneBasedPriceData.filter(function (el) {
                    return (el[3] === eMeter);
                });
                

            }

            if (eleMeterBasedPriceData.length) {
               
                const elePaymentMethod = dualFuelBucket[property].Elec_Payment_Method;
                let elePayMethod = '';
                for (const prop in eleMeterBasedPriceData) {
                    if (elePaymentMethod === eleMeterBasedPriceData[prop][10]) {
                        elePayMethod = elePaymentMethod;
                    }
                }
                let eleFinalPriceData = eleMeterBasedPriceData.filter(function (el) {
                    return el[10] === elePayMethod;
                });

                if (eleFinalPriceData.length) {
                   
                    //All calculation should go here
                    const standardElectricPrice = eleFinalPriceData.filter(newPrice => newPrice[4] === 'Electric');
                    if (standardElectricPrice.length) {                        
                        // Ele Single objects starts here
                        const eleProofingSheetObject: ProofingObject & { [key: string]: any } = {
                            Date: '',Checker:'',PDF:'',Page:'',
                            Account: dualFuelBucket[property].Elec_Customer_No,
                            GSP: dualFuelBucket[property].Zone_1,
                            Fuel: 'Electric',
                            Tariff:dualFuelBucket[property].Elec_Tariff_Name,
                            Meter:standardElectricPrice[0]['3'],


                            NewSC: dualFuelBucket[property].Elec_New_Stdg_Chrg, NewStandingChargeCorrect:standardElectricPrice[0]['13.0000'],
                            NewRate1: dualFuelBucket[property].Elec_New_Unit_1_Inc_Vat, NewRate1Correct:standardElectricPrice[0]['17.0000'],
                            NewRate2: dualFuelBucket[property].Elec_New_Unit_2_Inc_Vat, NewRate2Correct:standardElectricPrice[0]['20.0000'],
                            NewRate3: dualFuelBucket[property].Elec_New_Unit_3_Inc_VAT, NewRate3Correct:standardElectricPrice[0]['23.0000'],
                            NewRate4: dualFuelBucket[property].Elec_New_Unit_4_Inc_VAT, NewRate4Correct:standardElectricPrice[0]['26.0000'],

                            OldAnnualCost: dualFuelBucket[property].Elec_Total_Old_Cost,
                            NewAnnualCost: dualFuelBucket[property].Elec_Total_New_Cost,
                            ChangeDifference: dualFuelBucket[property].Elec_Total_Old_Cost - dualFuelBucket[property].Elec_Total_New_Cost,
                            ChangeAmountCorrect: '',
                            PDFPersonalProjection: dualFuelBucket[property].Elec_Total_New_Cost,

                            ManualCalculationProjection: Math.round((dualFuelBucket[property].Elec_Annual_Usage * standardElectricPrice[0]['17.0000']) + (365 * standardElectricPrice[0]['13.0000'])),
                            Difference: (dualFuelBucket[property].Elec_Annual_Usage * standardElectricPrice[0]['17.0000']) / (dualFuelBucket[property].Elec_Total_New_Cost),
                            AreFrontPageCalculationCorrect: '',
                            RelevantCheapestTariffCorrect: '',
                            ActualCheapestOverallTariffCorrect: '',
                            PresentmentCorrect: '',
                            PassFail: '',
                            Comments: '',

                        }
                        newDualFuelBucketData.push(eleProofingSheetObject);
                        //Single Ele Object finish here
                    }
                    else {
                        console.log(`Account Number ${dualFuelBucket[property].Elec_Customer_No} Excluded from calculation due to no price available`);
                    }
                }
                else {
                    console.log(`Account Excluded from Calculation, No Payment Method available for Account: ${dualFuelBucket[property].Elec_Customer_No}`);
                }
            }
            else {
                console.log(`Account Excluded from Calculation,No Tariff available for Account:  ${dualFuelBucket[property].Elec_Customer_No}`);
            }
            //Capturing Gas Meter Type
            let gMeter: string = '';
            let gasTariffName: string = dualFuelBucket[property].Gas_Tariff_Name;

            if (gasTariffName === 'Simpler Energy' || gasTariffName === 'Warmer Home Plan' || gasTariffName === 'Pay As You Go') { gasTariffName = 'Standard'; }
            else {
                gasMeterCategory.forEach((gElement) => {
                    if (gasTariffName.includes(gElement)) {
                        gasTariffName = gElement;
                    }
                })
            }
            for (const prop in zoneBasedPriceData) {
                if (gasTariffName === zoneBasedPriceData[prop][3]) {
                    gMeter = gasTariffName;
                }
            }
            //console.log('Gas meter Tariff picked up is' + gMeter)

            let gasMeterBasedPriceData = [];
            if (gMeter !== '') {

                gasMeterBasedPriceData = zoneBasedPriceData.filter(function (el) {
                    return (el[3] === gMeter);
                });

            }
            if (gasMeterBasedPriceData.length) {
                const gasPaymentMethod = dualFuelBucket[property].Gas_Payment_Method;
                let gasPayMethod = '';
                for (const prop1 in gasMeterBasedPriceData) {
                    if (gasPaymentMethod === gasMeterBasedPriceData[prop1][10]) {
                        gasPayMethod = gasPaymentMethod;
                    }
                }

                let gasFinalPriceData = gasMeterBasedPriceData.filter(function (el) {
                    return (el[10] === gasPayMethod);
                });
                if (gasFinalPriceData.length) {
                    const standardGasPrice = gasFinalPriceData.filter(newPrice => newPrice[4] === 'Gas');
                    if (standardGasPrice.length) {
                        //Single Gas object start here  
                        const gasProofingSheetObject: ProofingObject & { [key: string]: any } = {
                            Date: '',Checker:'',PDF:'',Page:'',
                            Account: dualFuelBucket[property].Gas_Customer_No,
                            GSP: dualFuelBucket[property].Zone_1,
                            Fuel: 'Gas',
                            Tariff:dualFuelBucket[property].Gas_Tariff_Name,
                            Meter:standardGasPrice[0]['3'],
                            NewSC: dualFuelBucket[property].Gas_New_Stdg_Chrg_Inc_Vat, NewStandingChargeCorrect: standardGasPrice[0]['13.0000'],
                            NewRate1: dualFuelBucket[property].Gas_New_Unit_1_Inc_Vat, NewRate1Correct: standardGasPrice[0]['17.0000'],
                            NewRate2: 'N/A', NewRate2Correct: 'N/A',
                            NewRate3: 'N/A', NewRate3Correct: 'N/A',
                            NewRate4: 'N/A', NewRate4Correct: 'N/A',

                            OldAnnualCost: dualFuelBucket[property].Gas_Total_Old_Cost,
                            NewAnnualCost: dualFuelBucket[property].Gas_Total_New_Cost,
                            ChangeDifference: dualFuelBucket[property].Gas_Total_Old_Cost - dualFuelBucket[property].Gas_Total_New_Cost,
                            ChangeAmountCorrect: '',
                            PDFPersonalProjection: dualFuelBucket[property].Gas_Total_New_Cost,

                            ManualCalculationProjection: Math.round((dualFuelBucket[property].Gas_Annual_Usage * standardGasPrice[0]['17.0000']) + (365 * standardGasPrice[0]['13.0000'])),
                            Difference: (dualFuelBucket[property].Gas_Annual_Usage * standardGasPrice[0]['17.0000']) / (dualFuelBucket[property].Gas_Total_New_Cost),
                            AreFrontPageCalculationCorrect: '',
                            RelevantCheapestTariffCorrect: '',
                            ActualCheapestOverallTariffCorrect: '',
                            PresentmentCorrect: '',
                            PassFail: '',
                            Comments: '',

                        }

                        newDualFuelBucketData.push(gasProofingSheetObject);
                        //Single Gas Object finish here
                    }
                    else {
                        console.log(`Account Number ${dualFuelBucket[property].Gas_Customer_No} Excluded from calculation due to no price available`);
                    }


                }
                else {
                    console.log(`Account Excluded from Calculation, No Payment Method available for Account: ${dualFuelBucket[property].Gas_Customer_No}`);
                }

            } else {
                console.log(`Account Excluded from Calculation,No Tariff available for Account:  ${dualFuelBucket[property].Gas_Customer_No}`);
            }

        }
        else {
            console.log(`zone missing for Ele A/c${dualFuelBucket[property].Elec_Customer_No} Gas A/c ${dualFuelBucket[property].Gas_Customer_No} `);
        }
    }

    annotate('The we should be able to generate new CSV testing file');
    // // //Below code to write final arrays to file
    if (newDualFuelBucketData.length) {
        const csvFromArrayOfObjects = convertArrayToCSV(newDualFuelBucketData);
        fs.writeFile('CSV Output/trial.csv', csvFromArrayOfObjects, err => {
            if (err) {
                console.log(18, err);
            }
            console.log('CSV file created');
        })

    }
    else {
        console.log('No CSV File generated for this Bucket due to all accounts missing required info i.e. zone,tariff,Paymentmthod..etc');
    }

});



