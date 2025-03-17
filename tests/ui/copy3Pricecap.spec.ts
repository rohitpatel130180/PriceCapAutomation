import { test, expect } from "../../src/fixtures/fixtures.ts";
import fs, { writeFile, writeFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { convertArrayToCSV } from 'convert-array-to-csv';
import { annotate } from '../../src/utils/shared/annotate.ts';

test('DualFuel test', async ({ page }) => {
    // Step 1: Below section will read the databucket file
    annotate('Get sorted testing bucket file');
    const dualFuelBucket = parse(fs.readFileSync("src/testdata/testbuckets/Split Tariff - Dual Fuel - Direct Debit - Post.csv"), {
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

    interface ProofingObject {

        Account: number, GSP: string,
        Fuel:string,
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

    //Step: 4 Navigate thorough each row from origial data bucket and perform calculation
    const newDualFuelBucketData: Object[] = []; //This object is to store and generat csv at the end after all calculation complete


    const meterCategory: string[] = ['Economy 7', 'Economy 10', 'Domestic Economy', 'Smart Economy 9', '2 Rate',
        'THTC', 'Flex Rate', '2 Rate (Heating)', 'Superdeal', '3 Rate (Heating)', '3 Rate (E&W, Heating)',
        '4 Rate', 'Economy & Heating Load', 'Heatwise 2 Rate', 'Heatwise 3 Rate', 'Region Specific',
        '1 Year Fixed Loyalty', '1 Year Fixed Loyalty Economy 7'];

    for (const property in dualFuelBucket) {   //Navigating through each record of data bucket starts here

        //Below code is to make sure customer got zone value  is in data file  and its matching to predefined values
        let customerZone = dualFuelBucket[property].Zone_1;
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
                if (eleTariffName === zoneBasedPriceData[prop][3]) {
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
                if (gasTariffName === zoneBasedPriceData[prop][3]) {
                    gMeter = gasTariffName;
                }
            }

            let meterBasedPriceData = [];
            if (eMeter !== '' && gMeter !== '') {

                meterBasedPriceData = zoneBasedPriceData.filter(function (el) {
                    return (el[3] === eMeter) || (el[3] === gMeter && el[4] === 'Gas');
                });
            }

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
                    return (el[10] === elePayMethod) && (el[10] === gasPayMethod);
                });

                if (finalPriceData.length) {
                    //All calculation should go here
                    let standardElectricPrice = finalPriceData.filter(newPrice => newPrice[4] === 'Electric');
                    const standardGasPrice = finalPriceData.filter(newPrice => newPrice[4] === 'Gas');
                    if (standardElectricPrice.length && standardGasPrice.length) {

                        /*const proofingSheetObject: DualFuelProofingSpreadsheetObject & { [key: string]: any } = {


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
                        */
                        // Single objects starts here
                        const eleProofingSheetObject: ProofingObject & { [key: string]: any } = {

                            Account: dualFuelBucket[property].Elec_Customer_No,                          
                            GSP: dualFuelBucket[property].Zone_1,
                            Fuel:'Electric',

                            NewSC: dualFuelBucket[property].Elec_New_Stdg_Chrg, NewStandingChargeCorrect: '',
                            NewRate1: dualFuelBucket[property].Elec_New_Unit_1_Inc_Vat, NewRate1Correct: '',
                            NewRate2: dualFuelBucket[property].Elec_New_Unit_2_Inc_Vat, NewRate2Correct: '',
                            NewRate3: dualFuelBucket[property].Elec_New_Unit_3_Inc_VAT, NewRate3Correct: '',
                            NewRate4: dualFuelBucket[property].Elec_New_Unit_4_Inc_VAT, NewRate4Correct: '',

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
                        //Single Gas object start here  
                        const gasProofingSheetObject: ProofingObject & { [key: string]: any } = {
                            
                            Account: dualFuelBucket[property].Gas_Customer_No,
                            GSP: dualFuelBucket[property].Zone_1,
                            Fuel:'Gas',
                            
                            NewSC: dualFuelBucket[property].Gas_New_Stdg_Chrg_Inc_Vat, NewStandingChargeCorrect: '',
                            NewRate1: dualFuelBucket[property].Gas_New_Unit_1_Inc_Vat, NewRate1Correct: '',
                            NewRate2:'N/A', NewRate2Correct: 'N/A',
                            NewRate3:'N/A', NewRate3Correct: 'N/A',
                            NewRate4:'N/A', NewRate4Correct: 'N/A',

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
                        console.log(`Account Number ${dualFuelBucket[property].Elec_Customer_No} excluded from calculation`);
                    }
                }
                else {
                    console.log(`Payment Method missing for Account Number ${dualFuelBucket[property].Elec_Customer_No}`);
                }
            }
            else {
                console.log(`Tariff Info missing for Account Number ${dualFuelBucket[property].Elec_Customer_No}`);
            }
        }
        else {
            console.log(`zone missing for Account Number ${dualFuelBucket[property].Elec_Customer_No}`);
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



