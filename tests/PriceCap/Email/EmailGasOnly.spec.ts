import { test, expect } from "../../../src/fixtures/fixtures.ts";
import fs, { writeFile, writeFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { convertArrayToCSV } from 'convert-array-to-csv';
import { annotate } from '../../../src/utils/shared/annotate.ts';
import { ElectircMeterActions } from "../../../Actions/electricActions.ts";

test('DualFuel test', async ({ page }) => {
    // Step 1: Read the databucket file
    annotate('Get sorted testing bucket file');
    const dualFuelBucket = parse(fs.readFileSync("src/testdata/testbuckets/Email/Warmer Home Plan - Gas Only - DD - Email.csv"), {
        columns: true,
        skip_empty_lines: true,
        //delimiter: ";",      
    });
    //Step2:Read the latest price 
    annotate('Getting price data');
    const newPriceData = parse(fs.readFileSync("src/testdata/newpricefiles/Live Run Calculator April 2025 v3 - Rohit - Tariff Info & Rates.csv"), {
        columns: true,
        skip_empty_lines: true,
        //delimiter: ";",
    });

    //Step 3: Declare new Proofing Object prototype 
    interface ProofingObject {
        Date: string, Checker: string,
        Account_No: number, Cust_Name_Correct: string,
        Beyond_Eligibility: string, Marketing_Preference: string, Marketing_Consent_Correct: string,
        GSP: string, Fuel: string, Tariff: string, Meter_Type: string, Payment_Method: string,
        //Below fields are ment for Live Run to check correct price on KAE.Need to remove and add comments according to need
        NewSC_KAE: any, NewR1_KAE: any, NewR2_KAE: any, NewR3_KAE: any, NewR4_KAE: any, New_KAE_SC_Rates_Correct: any,

        NewSC_PIN: any, NewSC_PriceFile: any,
        NewR1_PIN: any, NewR1_PriceFile: any,
        NewR2_PIN: any, NewR2_PriceFile: any,
        NewR3_PIN: any, NewR3_PriceFile: any,
        NewR4_PIN: any, NewR4_PriceFile: any,
        New_SC_Rates_Correct: string,

        OldAnnualCost: number, NewAnnualCost: number, ChangeDifference: number, ChangeAmountCorrect: String,
        PIN_Personal_Projection: number, Calculated_Personal_Projection: number, Difference: any, AreFrontPageCalculationCorrect: string,
        SimilarTariff: string, SimilarMeter: string, Calculated_Similar_Projection: number, Calculated_Similar_Saving: number,
        Similar_Saving_Correct: string,
        OverallTariff: string, OverallMeter: string, Calculated_Overall_Projection: number, Calculated_Overall_Saving: number,
        Overall_Saving_Correct: string,

        PresentmentCorrect: string, PassFailUnsure: string, Comments: string,
    }
    //Step:4 Declare an object to store and generate new csv with calculation
    const newDualFuelBucketData: Object[] = [];
    //Step:5 Navigate thorough each row,received  from Step 1: data bucket and perform calculation
    /* cheapestTariffs array contain all the prices used for cheapest similar and overall, It is highly possible that CTM will be changed every time, so if new priced added then 
    it should be added to this array as well*/
    const cheapestTariffs: string[] = ['1 Year Fixed', '1 Year Fixed - Economy 7', '1 Year Fixed Loyalty', '1 Year Fixed Loyalty - Economy 7',
        '1 Year Fixed + Boiler Cover', '1 Year Fixed + Boiler Cover - Economy 7', '1 Year Fixed + Greener Electricity', '1 Year Fixed + Greener Electricity - Economy 7', '2 Year Fixed + Heating Control',
        '2 Year Fixed + Heating Control - Economy 7', '1 Year Fixed Loyalty - Domestic Economy', '2 Year Fixed Energy - Economy 7', '3 Year Fixed - Economy 7',
        '3 Year Fixed v5 EPG', '3 Year Fixed v5 EPG - Economy 7', 'Extended Fixed', 'OVO Extended Fixed 26 Feb 2025 E7 / DomEco', '2 Year Fixed + Heating Control',
    ];
    //multiRateElectricMeters array is to identify correct meter type for multi rate meters  
    const multiRateElectircMeters: string[] = ['Economy 7', 'Economy 10', 'Domestic Economy', 'Smart Economy 9', '2 Rate (Heating)', '2 Rate',
        'THTC', 'Flex Rate', 'Superdeal', '3 Rate (Heating)', '3 Rate (E&W, Heating)',
        '4 Rate', 'Economy & Heating Load', 'Heatwise 2 Rate', 'Heatwise 3 Rate', 'Region Specific',];
    /*Below 4 arrays contains element based on thier meters i.e. standard, two rate, three rate or four Rate, Every time CTM section changed we need to add those new tariffs
    in below related arrays as well to make sure its been picked up in calculation*/
    const standardMeters = ['Standard', '1 Year Fixed', '1 Year Fixed Loyalty', '1 Year Fixed + Boiler Cover', '1 Year Fixed + Greener Electricity', 'Extended Fixed'];
    const twoRateMeters = ['Economy 7', '1 Year Fixed Loyalty - Economy 7', 'Economy 10', 'Domestic Economy', 'Smart Economy 9', 'THTC', 'Flex Rate', '2 Rate (Heating)', '2 Rate',
        'Heatwise 2 Rate', '1 Year Fixed Loyalty Economy 7', '1 Year Fixed + Boiler Cover Economy 7', '1 Year Fixed + Greener Electricity Economy 7', 'OVO Extended Fixed 26 Feb 2025 E7 / DomEco'];
    const threeRateMeters = ['3 rate', 'Superdeal', '3 Rate (Heating)', '3 Rate (E&W, Heating)', 'Economy & Heating Load', 'Heatwise 3 Rate', 'Region Specific'];
    const fourRateMeters = '4 rate';

    //Step 5.1 Navigating through each record of data bucket starts here
    for (const property in dualFuelBucket) {
        //Step 5.1.1: Filtering price file according to zone of cutomer
        let customerZone = dualFuelBucket[property].Zone;
        if (customerZone == undefined) {
            customerZone = dualFuelBucket[property].Zone_1;
        }
        let zoneBasedPriceData = newPriceData.filter(function (el) {
            return el[5] === customerZone;
        });

        //Step 5.1.2: Filtering price file according to Meter type
        if (zoneBasedPriceData.length) {
            let beyondEligibility = dualFuelBucket[property].Beyond_Eligibility; //This code will make sure beyond eleigibility identification 
            if (beyondEligibility === undefined) {
                beyondEligibility = dualFuelBucket[property].Beyond_eligibility;
            }

            //Capturing cheapest similar gas prices         

            let cheapestSimilarGasMeter = '';
            let cheapestSimilarGas = dualFuelBucket[property].Gas_Cheapest_Similar_Tariff;
            let replaceGasSimilar = cheapestSimilarGas.replace(/[^a-zA-Z0-9]/g, '');
            let similarGChecker: boolean = true;
            cheapestTariffs.forEach((element) => {
                let ele = element.replace(/[^a-zA-Z0-9]/g, '');
                if (replaceGasSimilar === ele && replaceGasSimilar.length === ele.length) {
                    cheapestSimilarGas = element; similarGChecker = false;
                } //else { similarGChecker = true; }
            });
            if (similarGChecker) {
                if ((cheapestSimilarGas === 'Simpler Energy' || cheapestSimilarGas === 'Warmer Home Plan' || cheapestSimilarGas === 'Pay As You Go')) {
                    cheapestSimilarGas = 'Standard';
                }
                /*else {//Below code may be not used for gas as gas will never have multi rate price
                    multiRateElectircMeters.forEach((element) => {
                        if (cheapestSimilarGas.includes(element)) {
                            cheapestSimilarGas = element;
                        }
                    });
                }*/
            }

            for (const prop in zoneBasedPriceData) {
                if (cheapestSimilarGas === zoneBasedPriceData[prop][3]) {
                    cheapestSimilarGasMeter = cheapestSimilarGas;
                }
                // else{ cheapestSimilarGas ='';}
            }
            let cheapestGasSimilarPriceData = [];
            if (cheapestSimilarGasMeter !== '') {
                cheapestGasSimilarPriceData = zoneBasedPriceData.filter(function (el) {
                    return (el[3] === cheapestSimilarGasMeter && el[4] === 'Gas');
                });
            }
            //Capturing cheapest overall gas
            let cheapestOverallGasMeter = '';
            let cheapestOverallGas = dualFuelBucket[property].Gas_Cheapest_Overall_Tariff;
            let overallGChecker = true;
            let replaceGasOverall = cheapestOverallGas.replace(/[^a-zA-Z0-9]/g, '');

            cheapestTariffs.forEach((element) => {
                let ele = element.replace(/[^a-zA-Z0-9]/g, '');
                if (replaceGasOverall === ele && replaceGasOverall.length === ele.length) { cheapestOverallGas = element; overallGChecker = false; }
                // else { overallGChecker = true; }

            });
            if (overallGChecker) {
                if (cheapestOverallGas === 'Simpler Energy' || cheapestOverallGas === 'Warmer Home Plan' || cheapestOverallGas === 'Pay As You Go') { cheapestOverallGas = 'Standard'; }
                /*else {//Below code may be not used for gas as gas will never have multi rate price
                    multiRateElectircMeters.forEach((element) => {
                        if (cheapestOverallGas.includes(element)) {
                            cheapestOverallGas = element;
                        }
                    });
                }*/
            }
            for (const prop in zoneBasedPriceData) {
                if (cheapestOverallGas === zoneBasedPriceData[prop][3]) {
                    cheapestOverallGasMeter = cheapestOverallGas;
                }
                //else{cheapestOverallGas = '';}
            }
            let cheapestGasOverallPriceData = [];
            if (cheapestOverallGasMeter !== '') {
                cheapestGasOverallPriceData = zoneBasedPriceData.filter(function (el) {
                    return (el[3] === cheapestOverallGasMeter && el[4] === 'Gas');
                });
            }
            //Capturing current Gas Meter Type
            let gMeter: string = '';
            let gasTariffName: string = dualFuelBucket[property].Gas_Tariff_Name;
            if (!gasTariffName.includes('Fixed')) {
                if (gasTariffName === 'Simpler Energy' || gasTariffName === 'Warmer Home Plan' || gasTariffName === 'Pay As You Go') { gasTariffName = 'Standard'; }
                else {
                    gasTariffName = '';
                }
                for (const prop in zoneBasedPriceData) {
                    if (gasTariffName === zoneBasedPriceData[prop][3]) {
                        gMeter = gasTariffName;
                    }
                }
                let gasMeterBasedPriceData = [];
                if (gMeter !== '') {
                    gasMeterBasedPriceData = zoneBasedPriceData.filter(function (el) {
                        return (el[3] === gMeter);
                    });
                }
                if (gasMeterBasedPriceData.length) {

                    let cheapestSimilarGasPaymentMethod = '';
                    const cheapGasSimilarPayMethod = (dualFuelBucket[property].Gas_Cheapest_Similar_Tariff);
                    const cheapGasOverallPayMethod = (dualFuelBucket[property].Gas_Cheapest_Overall_Tariff);
                    let cheapestSimilarPaymentMethod = '';
                    if (cheapGasSimilarPayMethod.includes('Pay As You Go')) {
                        cheapestSimilarGasPaymentMethod = 'Prepayment';
                    }
                    else { cheapestSimilarGasPaymentMethod = 'Direct Debit'; }
                    let finalCheapestGasSimilarData = cheapestGasSimilarPriceData.filter(function (el) {
                        return el[10] === cheapestSimilarGasPaymentMethod;
                    });
                    let cheapestOverallGasPaymentMethod = '';
                    let cheapestOverallPaymentMethod = '';
                    if (cheapGasOverallPayMethod.includes('Pay As You Go')) {
                        cheapestOverallGasPaymentMethod = 'Prepayment';
                    }
                    else { cheapestOverallGasPaymentMethod = 'Direct Debit'; }
                    let finalCheapestGasOverallData = cheapestGasOverallPriceData.filter(function (el) {
                        return el[10] === cheapestOverallGasPaymentMethod;
                    });
                    const gasPaymentMethod = dualFuelBucket[property].Gas_Payment_Method;
                    const checkGasWarmerTariff = dualFuelBucket[property].Gas_Tariff_Name;
                    let gasPayMethod = '';
                    if (checkGasWarmerTariff.includes('Warmer Home Plan')) {
                        gasPayMethod = 'Direct Debit';
                    }
                    else {
                        for (const prop1 in gasMeterBasedPriceData) {
                            if (gasPaymentMethod === gasMeterBasedPriceData[prop1][10]) {
                                gasPayMethod = gasPaymentMethod;
                            }
                        }
                    }
                    let gasFinalPriceData = gasMeterBasedPriceData.filter(function (el) {
                        return (el[10] === gasPayMethod);
                    });
                    if (gasFinalPriceData.length) {
                        const standardGasPrice: any[] = gasFinalPriceData.filter(newPrice => newPrice[4] === 'Gas');
                        if (standardGasPrice.length) {
                            const totalGasCurrentCost = () => {//Calculating total gas current cost
                                let standingCharge = 365 * Number(standardGasPrice[0]['13.0000']);
                                let rate1 = Number(standardGasPrice[0]['17.0000']) * Number(dualFuelBucket[property].Gas_Annual_Usage);
                                return Number((rate1 + standingCharge).toFixed(2));
                            }
                            const totalGasSimilarCost = () => {
                                if (finalCheapestGasSimilarData.length) {//Calculating total gas similar cost
                                    let standingCharge = 365 * Number(finalCheapestGasSimilarData[0]['13.0000']);
                                    let rate1 = Number(finalCheapestGasSimilarData[0]['17.0000']) * Number(dualFuelBucket[property].Gas_Annual_Usage);
                                    return Number((rate1 + standingCharge).toFixed(2));
                                } else { return 0; }
                            }

                            const totalGasOverallCost = () => {
                                if (finalCheapestGasOverallData.length) {//Calculating total gas overall cost
                                    let standingCharge = 365 * Number(finalCheapestGasOverallData[0]['13.0000']);
                                    let rate1 = Number(finalCheapestGasOverallData[0]['17.0000']) * Number(dualFuelBucket[property].Gas_Annual_Usage);
                                    return Number((rate1 + standingCharge).toFixed(2));
                                }
                                else { return 0; }
                            }
                            //Calculating gas similar saving
                            function calculateGasSimilarSaving() {
                                if (totalGasCurrentCost() !== 0 && totalGasSimilarCost() !== 0) {
                                    return totalGasCurrentCost() - totalGasSimilarCost();
                                }
                                else { return 0; }
                            }
                            //Making sure gas similar saving is correct or not
                            let gasCheapestSimilarSaving: number = Number(dualFuelBucket[property].Gas_Cheapest_Saving);
                            if (gasCheapestSimilarSaving === undefined) {
                                gasCheapestSimilarSaving = Number(dualFuelBucket[property].Gas_Cheapest_Similar_Saving);
                            }
                            function isGasSimilarSavingCorrect() {
                                let UL: number = (gasCheapestSimilarSaving + gasCheapestSimilarSaving * 0.05);
                                let LL: number = (gasCheapestSimilarSaving - gasCheapestSimilarSaving * 0.05);
                                let similarSaving: number = totalGasCurrentCost() - totalGasSimilarCost();
                                if (similarSaving === 0) { return 'No Similar Saving' }
                                else { return (similarSaving >= LL && similarSaving <= UL) ? 'Yes' : 'No'; }

                            }
                            //Calculating gas overall saving
                            function calculateGasOverallSaving() {
                                if (totalGasCurrentCost() !== 0 && totalGasOverallCost() !== 0) {
                                    return totalGasCurrentCost() - totalGasOverallCost();
                                }
                                else { return 0; }
                            }
                            //Making sure is gas overall saving is correct or not
                            let gasCheapestOverallSaving: number = Number(dualFuelBucket[property].Gas_Overall_Saving);
                            function isGasOverallSavingCorrect() {
                                let UL: number = (gasCheapestOverallSaving + gasCheapestOverallSaving * 0.05);
                                let LL: number = (gasCheapestOverallSaving - gasCheapestOverallSaving * 0.05);
                                let overallSaving: number = totalGasCurrentCost() - totalGasOverallCost();
                                if (overallSaving === 0) { return 'No Overall Saving' }
                                else {
                                    return overallSaving >= LL && overallSaving <= UL ? 'Yes' : 'No';
                                }
                            }


                            //Single Gas object start here  
                            const gasProofingSheetObject: ProofingObject & { [key: string]: any } = {
                                Date: '', Checker: '',
                                Account_No: dualFuelBucket[property].Gas_Customer_No, Cust_Name_Correct: '',
                                Beyond_Eligibility: beyondEligibility,
                                Marketing_Preference: dualFuelBucket[property].Marketing_pref, Marketing_Consent_Correct: '',
                                //GSP: dualFuelBucket[property].Zone, 
                                GSP: customerZone, Fuel: 'Gas',
                                Tariff: dualFuelBucket[property].Gas_Tariff_Name,
                                Meter_Type: standardGasPrice[0]['3'],
                                Payment_Method: dualFuelBucket[property].Gas_Payment_Method,

                                //Below 5 values only for Live Run to check correct price on KAE (Excluding VAT) in KAE.Need to remove and add comments according to need  
                                NewSC_KAE: Math.round(standardGasPrice[0]['12'] * 10000) / 10000,
                                NewR1_KAE: Math.round(standardGasPrice[0]['16'] * 10000) / 10000,
                                NewR2_KAE: 'N/A',
                                NewR3_KAE: 'N/A',
                                NewR4_KAE: 'N/A',
                                New_KAE_SC_Rates_Correct: '',
                                /******Logic 1: To convert 6 digit after decimal to 4 digit after decimal */
                                /*NewSC_PIN: Number(dualFuelBucket[property].Gas_New_Stdg_Chrg_Inc_Vat).toFixed(4), NewSC_PriceFile: Number(standardGasPrice[0]['13.0000']).toFixed(4),
                                NewR1_PIN: Number(dualFuelBucket[property].Gas_New_Unit_1_Inc_Vat).toFixed(4), NewR1_PriceFile: Number(standardGasPrice[0]['17.0000']).toFixed(4),*/
                                /******Logic 2: To convert 6 digit after decimal to 4 digit after decimal */
                                /*NewSC_PIN: Math.round(dualFuelBucket[property].Gas_New_Stdg_Chrg_Inc_Vat * 10000) / 10000, NewSC_PriceFile: Math.round(standardGasPrice[0]['13.0000'] * 10000) / 10000,
                                NewR1_PIN: Math.round(dualFuelBucket[property].Gas_New_Unit_1_Inc_Vat * 10000) / 10000, NewR1_PriceFile: Math.round(standardGasPrice[0]['17.0000'] * 10000) / 10000,*/
                                /******Logic 3: To convert 6 digit after decimal to 4 digit after decimal */
                                NewSC_PIN: (Number(dualFuelBucket[property].Gas_New_Stdg_Chrg_Inc_Vat) + 1e-10).toFixed(4), NewSC_PriceFile: (Number(standardGasPrice[0]['13.0000']) + 1e-10).toFixed(4),
                                NewR1_PIN: (Number(dualFuelBucket[property].Gas_New_Unit_1_Inc_Vat) + 1e-10).toFixed(4), NewR1_PriceFile: (Number(standardGasPrice[0]['17.0000']) + 1e-10).toFixed(4),
                                NewR2_PIN: 'N/A', NewR2_PriceFile: 'N/A',
                                NewR3_PIN: 'N/A', NewR3_PriceFile: 'N/A',
                                NewR4_PIN: 'N/A', NewR4_PriceFile: 'N/A',
                                New_SC_Rates_Correct: '',

                                OldAnnualCost: dualFuelBucket[property].Gas_Total_Old_Cost,
                                NewAnnualCost: dualFuelBucket[property].Gas_Total_New_Cost,
                                ChangeDifference: Number(dualFuelBucket[property].Gas_Total_New_Cost - dualFuelBucket[property].Gas_Total_Old_Cost),
                                //ChangeDifference: (Number(dualFuelBucket[property].Gas_Total_New_Cost - dualFuelBucket[property].Gas_Total_Old_Cost)+ 1e-10).toFixed(2),
                                ChangeAmountCorrect: '',
                                AreFrontPageCalculationCorrect: '',

                                PIN_Personal_Projection: dualFuelBucket[property].Gas_Total_New_Cost,
                                Calculated_Personal_Projection: totalGasCurrentCost(),
                                Difference: ((totalGasCurrentCost() / dualFuelBucket[property].Gas_Total_New_Cost) * 100).toFixed(2) + '%',
                                // Difference: totalGasCurrentCost() / (dualFuelBucket[property].Gas_Total_New_Cost),
                                // Difference: (dualFuelBucket[property].Gas_Annual_Usage * standardGasPrice[0]['17.0000']) / (dualFuelBucket[property].Gas_Total_New_Cost),

                                SimilarTariff: dualFuelBucket[property].Gas_Cheapest_Similar_Tariff,
                                SimilarMeter: cheapestSimilarGasMeter,
                                Calculated_Similar_Projection: totalGasSimilarCost(),
                                //Calculated_Similar_Saving: totalGasSimilarCost() - totalGasCurrentCost(),
                                Calculated_Similar_Saving: calculateGasSimilarSaving(),
                                //Similar_Saving_Correct: (((gasCheapestSimilarSaving) / (totalGasSimilarCost() - totalGasCurrentCost())) * 100).toFixed(2) + '%',
                                Similar_Saving_Correct: isGasSimilarSavingCorrect(),

                                OverallTariff: dualFuelBucket[property].Gas_Cheapest_Overall_Tariff,
                                OverallMeter: cheapestOverallGasMeter,
                                Calculated_Overall_Projection: totalGasOverallCost(),
                                // Calculated_Overall_Saving: totalGasOverallCost() - totalGasCurrentCost(),
                                Calculated_Overall_Saving: calculateGasOverallSaving(),
                                //Overall_Saving_Correct: (((gasCheapestOverallSaving) / (totalGasOverallCost() - totalGasCurrentCost())) * 100).toFixed(2) + '%',
                                Overall_Saving_Correct: isGasOverallSavingCorrect(),

                                PresentmentCorrect: '',
                                PassFailUnsure: '',
                                Comments: '',
                            }
                            newDualFuelBucketData.push(gasProofingSheetObject);
                            //Single Gas Object finish here
                        }
                        else {
                            console.log(`Gas Account ${dualFuelBucket[property].Gas_Customer_No} Excluded from calculation, Unable to find Final Price`);
                        }
                    }
                    else {
                        console.log(`Gas Account ${dualFuelBucket[property].Gas_Customer_No} Excluded from Calculation, Unable to find Payment Method`);
                    }
                }
                else {
                    console.log(` Gas Account ${dualFuelBucket[property].Gas_Customer_No} Excluded from Calculation, No Tariff available`);
                }
            }
            else {
                console.log(` Gas Account ${dualFuelBucket[property].Gas_Customer_No} Excluded from calculation, Current Tariff is Fixed`);
            }
        }
        else {
            console.log(`zone missing for Gas A/c ${dualFuelBucket[property].Gas_Customer_No} `);
        }
    }

    annotate('The we should be able to generate new CSV testing file');
    // // //Below code to write final arrays to file
    if (newDualFuelBucketData.length) {
        const csvFromArrayOfObjects = convertArrayToCSV(newDualFuelBucketData);
        fs.writeFile('CSV Output/WHP GAS ONLY DD.csv', csvFromArrayOfObjects, err => {
            if (err) {
                console.log(18, err);
            }
            console.log('Proofing_Sheet Generated Successfully');
        })
    }
    else {
        console.log('No Proofing_Sheet Generated for this Bucket due to all accounts missing required info i.e. zone,tariff,Paymentmthod..etc');
    }
});



