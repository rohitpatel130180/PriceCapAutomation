import { test, expect } from "../../src/fixtures/fixtures.ts";
import fs, { writeFile, writeFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { convertArrayToCSV } from 'convert-array-to-csv';
import { annotate } from '../../src/utils/shared/annotate.ts';

test('DualFuel test', async ({ page }) => {
    // Step 1: Read the databucket file
    annotate('Get sorted testing bucket file');
    /*const dualFuelBucket = parse(fs.readFileSync("src/testdata/testbuckets/Fixed Renewal - Dual Fuel - Elec Fixed - Post.csv"), {
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
        Date: string, Checker: string, PDF: string,
        Account: number, GSP: string,
        Fuel: string, Tariff: string, Meter: string,
        Marketing_pref: string, Beyond_Eligibility: string, Creative: string, Incr_Decr_Check: string,

        NewSC: number, NewStandingChargeCorrect: string, PassSc: string,

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
    // const excludeFixMeters:string[] = ['1 Year Fixed','1 Year Fixed Loyalty','1 Year Fixed Economy 7','1 Year Fixed Loyalty Economy 7',
    //     '1 Year Fixed + Boiler Cove','1 Year Fixed + Boiler Cover Economy 7','1 Year Fixed + Greener Electricity',
    //     '1 Year Fixed + Greener Electricity Economy 7','2 Year Fixed Energy - Economy 7','3 Year Fixed - Economy 7',
    //     '3 Year Fixed v5 EPG','3 Year Fixed v5 EPG - Economy 7'];
    const cheapestTariffs: string[] = ['1 Year Fixed', '1 Year Fixed Economy 7', '1 Year Fixed Loyalty', '1 Year Fixed Loyalty Economy 7',
        '1 Year Fixed + Boiler Cover', '1 Year Fixed + Boiler Cover Economy 7', '1 Year Fixed + Greener Electricity',
        '1 Year Fixed + Greener Electricity Economy 7'];

    const multiRateElectircMeters: string[] = ['Economy 7', 'Economy 10', 'Domestic Economy', 'Smart Economy 9', '2 Rate',
        'THTC', 'Flex Rate', '2 Rate (Heating)', 'Superdeal', '3 Rate (Heating)', '3 Rate (E&W, Heating)',
        '4 Rate', 'Economy & Heating Load', 'Heatwise 2 Rate', 'Heatwise 3 Rate', 'Region Specific',
    ];

    //Step 5.1 Navigating through each record of data bucket starts here
    for (const property in dualFuelBucket) {

        //Step 5.1.1: Filtering price file according to zone of cutomer
        let customerZone = dualFuelBucket[property].Zone_1;

        let zoneBasedPriceData = newPriceData.filter(function (el) {
            return el[5] === customerZone;
        });

        //Step 5.1.2: Filtering price file according to Meter type
        if (zoneBasedPriceData.length) {

            //Capturing cheapest similar
            let cheapestSimilarEleMeter = '';
            let cheapestSimilarEle = dualFuelBucket[property].Elec_Cheapest_Similar_Tariff;
            let replaceCheapestSimilar = cheapestSimilarEle.replace(/[-]/g, '');
            cheapestTariffs.forEach((element) => {
                if (element === replaceCheapestSimilar) {
                    cheapestSimilarEle = element;
                
                }
                else if ((cheapestSimilarEle === 'Simpler Energy' || cheapestSimilarEle === 'Warmer Home Plan' || cheapestSimilarEle === 'Pay As You Go')) {
                    cheapestSimilarEle = 'Standard';
                }
                else {
                    multiRateElectircMeters.forEach((element) => {
                        if (cheapestSimilarEle.includes(element)) {
                            cheapestSimilarEle = element;
                        }
                        
                    });
                }
            });

            for (const prop in zoneBasedPriceData) {
                if (cheapestSimilarEle === zoneBasedPriceData[prop][3]) {
                    cheapestSimilarEleMeter = cheapestSimilarEle;
                } else { cheapestSimilarEleMeter = ''; }
            }
            let CheapestEleSimilarPriceData = [];
            if (cheapestSimilarEleMeter !== '') {

                CheapestEleSimilarPriceData = zoneBasedPriceData.filter(function (el) {
                    return (el[3] === cheapestSimilarEleMeter && el[4] === 'Electric');
                });
            }
            //Cheapest Similar calculation complete here
            //Capturing cheapest overall
            let cheapestOverallEleMeter = '';
            let cheapestOverallEle = dualFuelBucket[property].Elec_Cheapest_Overall_Tariff;
            let replaceCheapestOverall = cheapestOverallEle.replace(/[-]/g, '');
            cheapestTariffs.forEach((element) => {
                if (element === replaceCheapestOverall) { cheapestOverallEle = element; }
                else if (cheapestOverallEle === 'Simpler Energy' || cheapestOverallEle === 'Warmer Home Plan' || cheapestOverallEle === 'Pay As You Go') { cheapestOverallEle = 'Standard'; }
                else {
                    multiRateElectircMeters.forEach((element) => {
                        if (cheapestOverallEle.includes(element)) {
                            cheapestOverallEle = element;
                        }
                        
                    });
                }
            }
            );

            for (const prop in zoneBasedPriceData) {
                if (cheapestOverallEle === zoneBasedPriceData[prop][3]) {
                    cheapestOverallEleMeter = cheapestOverallEle;
                } else { cheapestOverallEleMeter = ''; }
            }
            let CheapestEleOverallPriceData = [];
            if (cheapestOverallEleMeter !== '') {
                CheapestEleOverallPriceData = zoneBasedPriceData.filter(function (el) {
                    return (el[3] === cheapestOverallEleMeter && el[4] === 'Electric');
                });
            }
            //Calculation for Cheapest overall complete here
            //Capturing current Electric Meter type
            let eMeter: string = '';
            let eleTariffName: string = dualFuelBucket[property].Elec_Tariff_Name;
            if(!eleTariffName.includes('Fixed')){

                if (eleTariffName === 'Simpler Energy' || eleTariffName === 'Warmer Home Plan' || eleTariffName === 'Pay As You Go') { eleTariffName = 'Standard'; }

                else {
                    multiRateElectircMeters.forEach((element) => {
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
                //Capturing for current tarriff complete here
                let eleMeterBasedPriceData = [];
                if (eMeter !== '') {    
                    eleMeterBasedPriceData = zoneBasedPriceData.filter(function (el) {
                        return (el[3] === eMeter);
                    });
                }

                if (eleMeterBasedPriceData.length) {
                    const elePaymentMethod = dualFuelBucket[property].Elec_Payment_Method;
                    let cheapestSimilarPaymentMethod = '';
                    let cheapestOverallPaymentMethod = '';
                    if (elePaymentMethod !== 'Prepayment') { cheapestSimilarPaymentMethod = 'Direct Debit', cheapestOverallPaymentMethod = 'Direct Debit'; }
                    else { cheapestSimilarPaymentMethod = 'Prepayment'; cheapestOverallPaymentMethod = 'Prepayment'; }
                    let finalCheapestSimilarData = eleMeterBasedPriceData.filter(function (el) {
                        return el[10] === cheapestSimilarPaymentMethod;
                    });
                    let finalCheapestOverallData = eleMeterBasedPriceData.filter(function (el) {
                        return el[10] === cheapestOverallPaymentMethod;
                    });
    
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
                            const ePass = () => {
                                if (dualFuelBucket[property].Elec_New_Stdg_Chrg === standardElectricPrice[0]['13.0000']) {
                                    return 'Pass';
                                }
                                else {
                                    return 'Fail';
                                }
                            }
                            const eleProofingSheetObject: ProofingObject & { [key: string]: any } = {
                                Date: '', Checker: '', PDF: '',
                                Account: dualFuelBucket[property].Elec_Customer_No,
                                GSP: dualFuelBucket[property].Zone_1,
                                Fuel: 'Electric',
                                Tariff: dualFuelBucket[property].Elec_Tariff_Name,
                                Meter: standardElectricPrice[0]['3'],
                                Marketing_pref: dualFuelBucket[property].Marketing_pref,
                                Beyond_Eligibility: dualFuelBucket[property].Beyond_Eligibility,
                                Creative: dualFuelBucket[property].CREATIVE,
                                Incr_Decr_Check: dualFuelBucket[property].INCR_DECR_CHECK,
    
    
                                NewSC: dualFuelBucket[property].Elec_New_Stdg_Chrg, NewStandingChargeCorrect: standardElectricPrice[0]['13.0000'],
                                PassSc: ePass(),
                                NewRate1: dualFuelBucket[property].Elec_New_Unit_1_Inc_Vat, NewRate1Correct: standardElectricPrice[0]['17.0000'],
                                NewRate2: dualFuelBucket[property].Elec_New_Unit_2_Inc_Vat, NewRate2Correct: standardElectricPrice[0]['20.0000'],
                                NewRate3: dualFuelBucket[property].Elec_New_Unit_3_Inc_VAT, NewRate3Correct: standardElectricPrice[0]['23.0000'],
                                NewRate4: dualFuelBucket[property].Elec_New_Unit_4_Inc_VAT, NewRate4Correct: standardElectricPrice[0]['26.0000'],
    
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
            }
            else
            {
                console.log(`Account ${dualFuelBucket[property].Elec_Customer_No} Excluded from calculation as its current tarrif is fixed`);;
            }

            //Sorting price file based on payment method
            
            //Cpatuirng Similar price data
            //Capturing cheapest similar
            let cheapestSimilarGasMeter = '';
            let cheapestSimilarGas = dualFuelBucket[property].Gas_Cheapest_Similar_Tariff;
            let replaceGasSimilar = cheapestSimilarGas.replace(/[-]/g, '');
            cheapestTariffs.forEach((element) => {
                if (element === replaceGasSimilar) {
                    cheapestSimilarGas = element;
                }
                else if ((cheapestSimilarGas === 'Simpler Energy' || cheapestSimilarGas === 'Warmer Home Plan' || cheapestSimilarGas === 'Pay As You Go')) {
                    cheapestSimilarGas = 'Standard';
                }
                else {
                    multiRateElectircMeters.forEach((element) => {
                        if (cheapestSimilarGas.includes(element)) {
                            cheapestSimilarGas = element;
                        }
                       
                    });
                }
            });

            for (const prop in zoneBasedPriceData) {
                if (cheapestSimilarGas === zoneBasedPriceData[prop][3]) {
                    cheapestSimilarGasMeter = cheapestSimilarEle;
                } else { cheapestSimilarGasMeter = ''; }
            }
            let CheapestGasSimilarPriceData = [];
            if (cheapestSimilarGasMeter !== '') {

                CheapestGasSimilarPriceData = zoneBasedPriceData.filter(function (el) {
                    return (el[3] === cheapestSimilarGasMeter && el[4] === 'Gas');
                });
            }
            //Cheapest Similar calculation complete here
            //Capturing cheapest overall
            let cheapestOverallGasMeter = '';
            let cheapestOverallGas = dualFuelBucket[property].Elec_Cheapest_Overall_Tariff;
            let replaceGastOverall = cheapestOverallGas.replace(/[-]/g, '');
            cheapestTariffs.forEach((element) => {
                if (element === replaceGastOverall) { cheapestOverallGas = element; }
                else if (cheapestOverallGas === 'Simpler Energy' || cheapestOverallGas === 'Warmer Home Plan' || cheapestOverallGas === 'Pay As You Go') { cheapestOverallGas = 'Standard'; }
                else {
                    multiRateElectircMeters.forEach((element) => {
                        if (cheapestOverallGas.includes(element)) {
                            cheapestOverallGas = element;
                        }
                       
                    });
                }
            }
            );

            for (const prop in zoneBasedPriceData) {
                if (cheapestOverallGas === zoneBasedPriceData[prop][3]) {
                    cheapestOverallGasMeter = cheapestOverallGas;
                } else { cheapestOverallGasMeter = ''; }
            }
            let CheapestGasOverallPriceData = [];
            if (cheapestOverallEleMeter !== '') {
                CheapestGasOverallPriceData = zoneBasedPriceData.filter(function (el) {
                    return (el[3] === cheapestOverallGasMeter && el[4] === 'Gas');
                });
            }
            //Calculation for Cheapest overall complete here

            //Capturing Gas Meter Type
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
    
                            const gPass = () => {
                                if (dualFuelBucket[property].Gas_New_Stdg_Chrg_Inc_Vat === standardGasPrice[0]['13.0000']) {
                                    return 'Pass';
                                }
                                else {
                                    return 'Fail';
                                }
                            }
                            //Single Gas object start here  
                            const gasProofingSheetObject: ProofingObject & { [key: string]: any } = {
                                Date: '', Checker: '', PDF: '',
                                Account: dualFuelBucket[property].Gas_Customer_No,
                                GSP: dualFuelBucket[property].Zone_1,
                                Fuel: 'Gas',
                                Tariff: dualFuelBucket[property].Gas_Tariff_Name,
                                Meter: standardGasPrice[0]['3'],
    
                                Marketing_pref: dualFuelBucket[property].Marketing_pref,
                                Beyond_Eligibility: dualFuelBucket[property].Beyond_Eligibility,
                                Creative: dualFuelBucket[property].CREATIVE,
                                Incr_Decr_Check: dualFuelBucket[property].INCR_DECR_CHECK,
    
    
                                NewSC: dualFuelBucket[property].Gas_New_Stdg_Chrg_Inc_Vat, NewStandingChargeCorrect: standardGasPrice[0]['13.0000'],
                                PassSc: gPass(),
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

            else 
            {
                console.log(`Excluded as current Gas tariff is fix for Accont ${dualFuelBucket[property].Gas_Customer_No}`);
            
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



