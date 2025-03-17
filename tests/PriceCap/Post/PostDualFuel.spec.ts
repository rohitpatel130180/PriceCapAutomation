import { test, expect } from "../../../src/fixtures/fixtures.ts";
import fs, { writeFile, writeFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { convertArrayToCSV } from 'convert-array-to-csv';
import { annotate } from '../../../src/utils/shared/annotate.ts';
import { ElectircMeterActions } from "../../../Actions/electricActions.ts";

test('DualFuel test', async ({ page }) => {
    // Step 1: Read the databucket file
    annotate('Get sorted testing bucket file');
    const dualFuelBucket = parse(fs.readFileSync("src/testdata/testbuckets/Post/Split Payment - Multi - Dual Fuel - Post.csv"), {
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
        Date: string, Checker: string, Page: string,
        Account_No: number, Cust_Name_Correct: string, Cust_Address_Correct: string,
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
    it should be added to this array as well, also while adding new tariff need to make sure how does it spelled in data file and price file*/
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
        let customerZone = dualFuelBucket[property].Zone_1;
        if (customerZone == undefined) {
            customerZone = dualFuelBucket[property].Zone;
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
            //Declaring current Electric Meter variable and getting current electric tariff name from data bucket
            let eMeter: string = '';
            let eleTariffName: string = dualFuelBucket[property].Elec_Tariff_Name;
            if (!eleTariffName.includes('Fixed')) { //Removing account from calculation if customers currnt price is fixed
                //Capturing cheapest similar meter and price data based on cheapest meter
                let cheapestSimilarEleMeter = '';
                let cheapestSimilarEle = dualFuelBucket[property].Elec_Cheapest_Similar_Tariff;
                if (cheapestSimilarEle === undefined) {
                    cheapestSimilarEle = dualFuelBucket[property].Cheapest_Similar_Tariff;
                }
                let similarChecker: boolean = true;
                let replaceCheapestSimilar = cheapestSimilarEle.replace(/[^a-zA-Z0-9]/g, '');
                cheapestTariffs.forEach((element) => {
                    let ele = element.replace(/[^a-zA-Z0-9]/g, '');
                    if (replaceCheapestSimilar === ele && replaceCheapestSimilar.length === ele.length) {
                        cheapestSimilarEle = element; similarChecker = false;
                    }
                });
                if (similarChecker) {
                    //First Logic to find out Extended Fixed E7 /Domestic Economy
                    //if ((cheapestSimilarEle === 'Extended Fixed - Economy 7' || cheapestSimilarEle === 'Extended Fixed - Domestic Economy')) { cheapestSimilarEle = 'OVO Extended Fixed 26 Feb 2025 E7 / DomEco'; similarChecker = false; }
                    //Second changed Logic to find out Extended Fixed E7 /Domestic Economy, can be changed back to above if not working
                    if ((cheapestSimilarEle.replace(/[^a-zA-Z0-9]/g, '') === 'Extended Fixed - Economy 7'.replace(/[^a-zA-Z0-9]/g, '') || cheapestSimilarEle.replace(/[^a-zA-Z0-9]/g, '') === 'Extended Fixed - Domestic Economy'.replace(/[^a-zA-Z0-9]/g, ''))) { cheapestSimilarEle = 'OVO Extended Fixed 26 Feb 2025 E7 / DomEco'; similarChecker = false; }
                }
                if (similarChecker) {
                    if ((cheapestSimilarEle === 'Simpler Energy' || cheapestSimilarEle === 'Warmer Home Plan' || cheapestSimilarEle === 'Pay As You Go')) { cheapestSimilarEle = 'Standard'; }
                    else {
                        cheapestSimilarEle = cheapestSimilarEle.substring(cheapestSimilarEle.lastIndexOf('-') + 2);
                        multiRateElectircMeters.forEach((element) => {
                            //if (cheapestSimilarEle.includes(element)) { cheapestSimilarEle = element; }
                            if (cheapestSimilarEle === element) { cheapestSimilarEle = element; }
                        });
                    }
                }
                for (const prop in zoneBasedPriceData) {
                    if (cheapestSimilarEle === zoneBasedPriceData[prop][3]) { cheapestSimilarEleMeter = cheapestSimilarEle; }
                    // else { cheapestSimilarEle === ''; }
                }
                let CheapestEleSimilarPriceData: any[] = [];
                if (cheapestSimilarEleMeter !== '') {

                    CheapestEleSimilarPriceData = zoneBasedPriceData.filter(function (el) {
                        return (el[3] === cheapestSimilarEleMeter && el[4] === 'Electric');
                    }
                    );
                }
                //Capturing Cheapest Similar complete here
                //Capturing cheapest overallmeter information and price data for this meter
                let cheapestOverallEleMeter = '';
                let cheapestOverallEle = dualFuelBucket[property].Elec_Cheapest_Overall_Tariff;
                if (cheapestOverallEle === undefined) {
                    cheapestOverallEle = dualFuelBucket[property].Cheapest_Overall_Tariff;
                }
                let overallChecker = true;
                let replaceCheapestOverall = cheapestOverallEle.replace(/[^a-zA-Z0-9]/g, '');
                cheapestTariffs.forEach((element) => {
                    let ele = element.replace(/[^a-zA-Z0-9]/g, '');
                    if (replaceCheapestOverall === ele && replaceCheapestOverall.length === ele.length) {
                        cheapestOverallEle = element; overallChecker = false;
                    }
                    /* ***NOTE**** Below If condition will make sure if cutomers cheapest overall is 1 year fixed loyalt-domestic economy then it will be calculated
                    according to 1 year fixed loyalty economy 7*/
                    if (cheapestOverallEle === "1 Year Fixed Loyalty - Domestic Economy") { cheapestOverallEle = "1 Year Fixed Loyalty - Economy 7"; }
                });
                if (overallChecker) {
                    //First Logic to find out Extended Fixed E7 /Domestic Economy
                    //if ((cheapestOverallEle === 'Extended Fixed - Economy 7' || cheapestOverallEle === 'Extended Fixed - Domestic Economy')) { cheapestOverallEle = 'OVO Extended Fixed 26 Feb 2025 E7 / DomEco'; overallChecker = false; }
                    //Second changed Logic to find out Extended Fixed E7 /Domestic Economy, can be changed back to above if not working
                    if ((cheapestOverallEle.replace(/[^a-zA-Z0-9]/g, '') === 'Extended Fixed - Economy 7'.replace(/[^a-zA-Z0-9]/g, '') || cheapestOverallEle.replace(/[^a-zA-Z0-9]/g, '') === 'Extended Fixed - Domestic Economy'.replace(/[^a-zA-Z0-9]/g, ''))) { cheapestOverallEle = 'OVO Extended Fixed 26 Feb 2025 E7 / DomEco'; overallChecker = false; }
                }

                if (overallChecker) {
                    if (cheapestOverallEle === 'Simpler Energy' || cheapestOverallEle === 'Warmer Home Plan' || cheapestOverallEle === 'Pay As You Go') { cheapestOverallEle = 'Standard'; }
                    else {
                        cheapestOverallEle = cheapestOverallEle.substring(cheapestOverallEle.lastIndexOf('-') + 2);
                        multiRateElectircMeters.forEach((element) => {
                            //if (cheapestOverallEle.includes(element)) {cheapestOverallEle = element;}
                            if (cheapestOverallEle === element) { cheapestOverallEle = element; }
                        });
                    }
                }
                for (const prop in zoneBasedPriceData) {
                    if (cheapestOverallEle === zoneBasedPriceData[prop][3]) {
                        cheapestOverallEleMeter = cheapestOverallEle;
                    }
                    // else { cheapestOverallEleMeter = ''; }          
                }
                let cheapestEleOverallPriceData: any[] = [];
                if (cheapestOverallEleMeter !== '') {
                    cheapestEleOverallPriceData = zoneBasedPriceData.filter(function (el) {
                        return (el[3] === cheapestOverallEleMeter && el[4] === 'Electric');
                    });
                }
                //Capturing Ceapest overall complete here
                //Capturing Current electric meter and current price data based on this meter
                if (eleTariffName === 'Simpler Energy' || eleTariffName === 'Warmer Home Plan' || eleTariffName === 'Pay As You Go') { eleTariffName = 'Standard'; }
                else {
                    eleTariffName = eleTariffName.substring(eleTariffName.lastIndexOf('-') + 2);
                    multiRateElectircMeters.forEach((element) => {
                        // if (eleTariffName.includes(element)) {eleTariffName = element;}
                        if (eleTariffName === element) { eleTariffName = element; }
                    });
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
                //Capturing for current tarriff complete here
                //Now capturing new price based on the payment method
                if (eleMeterBasedPriceData.length) {
                    //Capturing cheapest similar and overall  prices based on the payment method
                    /* as per the current logic if customer is paying by prepayment than we should not offer ondemand or dd as payment method and cheapest similar
                    and overall,if cutomer is on demand than cheapest similar and overall would be direct debit, if customer current pay method is DD than cheapest
                    similar and overall will be DD*/
                    //Getting Cheapest Similar Payment method
                    let cheapEleSimilarTariff = (dualFuelBucket[property].Elec_Cheapest_Similar_Tariff);
                    if (cheapEleSimilarTariff === undefined) {
                        cheapEleSimilarTariff = dualFuelBucket[property].Cheapest_Similar_Tariff;
                    }
                    let cheapestSimilarPaymentMethod = '';
                    if (cheapEleSimilarTariff.includes('Pay As You Go')) {
                        cheapestSimilarPaymentMethod = 'Prepayment';
                    }
                    else { cheapestSimilarPaymentMethod = 'Direct Debit'; }
                    //End of getting Cheapest Similar Payment Method
                    //Getting Cheapest Overall Payment Method
                    let cheapEleOverallTariff = (dualFuelBucket[property].Elec_Cheapest_Overall_Tariff);
                    if (cheapEleOverallTariff === undefined) {
                        cheapEleOverallTariff = dualFuelBucket[property].Cheapest_Overall_Tariff;
                    }
                    // if (elePaymentMethod !== 'Prepayment') { cheapestSimilarPaymentMethod = 'Direct Debit', cheapestOverallPaymentMethod = 'Direct Debit'; }
                    // else { cheapestSimilarPaymentMethod = 'Prepayment'; cheapestOverallPaymentMethod = 'Prepayment'; }
                    let cheapestOverallPaymentMethod = '';
                    if (cheapEleOverallTariff.includes('Pay As You Go')) {
                        cheapestOverallPaymentMethod = 'Prepayment';
                    }
                    else { cheapestOverallPaymentMethod = 'Direct Debit'; }
                    //End of Getting Cheapest Overall Payment Method
                    //getting final prices  for cheapest similar based on the cheapest similar payment method decided above
                    let finalCheapestSimilarData = CheapestEleSimilarPriceData.filter(function (el) {
                        return el[10] === cheapestSimilarPaymentMethod;
                    });
                    //getting final prices for cheapet overall based on the cheapest overall payement method decided above
                    let finalCheapestOverallData = cheapestEleOverallPriceData.filter(function (el) {
                        return el[10] === cheapestOverallPaymentMethod;
                    });
                    //getting prices for current tarriff
                    const elePaymentMethod = dualFuelBucket[property].Elec_Payment_Method; //Storing current ele payment method from data file
                    const checkWarmerTariff = dualFuelBucket[property].Elec_Tariff_Name; //Storing current ele tariff  
                    let elePayMethod = '';
                    if (checkWarmerTariff.includes('Warmer Home Plan')) {
                        elePayMethod = 'Direct Debit';
                    }
                    else {

                        for (const prop in eleMeterBasedPriceData) {
                            if (elePaymentMethod === eleMeterBasedPriceData[prop][10]) {
                                elePayMethod = elePaymentMethod;
                            }
                        }
                    }
                    let eleFinalPriceData = eleMeterBasedPriceData.filter(function (el) {
                        return el[10] === elePayMethod;
                    });

                    if (eleFinalPriceData.length) {
                        //All calculation should go here
                        const standardElectricPrice = eleFinalPriceData.filter(newPrice => newPrice[4] === 'Electric');

                        if (standardElectricPrice.length) {
                            let stMeter = standardElectricPrice[0][3];//this would be actual eMeter for this customer                         
                            let switchMeterDecider = '';
                            let meterChecker = true;
                            let returnValue = 0;
                            standardMeters.forEach((element) => {
                                if (element === stMeter) { switchMeterDecider = 'Standard'; meterChecker = false; }
                            });
                            if (meterChecker === true) {
                                twoRateMeters.forEach((element) => {
                                    if (element === stMeter) { switchMeterDecider = 'TwoRate'; meterChecker = false; }
                                });
                            }
                            if (meterChecker === true) {
                                threeRateMeters.forEach((element) => {
                                    if (element === stMeter) { switchMeterDecider = 'ThreeRate'; meterChecker = false; }
                                });
                            }
                            if (meterChecker === true) {
                                if (fourRateMeters === stMeter) { switchMeterDecider = 'FourRate'; meterChecker = false; }
                            }
                            switch (switchMeterDecider) {

                                case 'Standard':
                                    const totalCurrentCost = () => {
                                        let standingCharge = 365 * Number(standardElectricPrice[0]['13.0000']);
                                        let rate1 = Number(standardElectricPrice[0]['17.0000']) * Number(dualFuelBucket[property].Elec_Annual_Usage);
                                        returnValue = Number((rate1 + standingCharge).toFixed(2));
                                        //return Math.round((dualFuelBucket[property].Elec_Annual_Usage * standardElectricPrice[0]['17.0000']) + (365 * standardElectricPrice[0]['13.0000']))
                                    }
                                    totalCurrentCost();
                                    break;
                                case 'TwoRate':
                                    const totalTwoRateCurrentCost = () => {
                                        let standingCharge = 365 * Number(standardElectricPrice[0]['13.0000']);
                                        let anytimeUsage = Number(dualFuelBucket[property].Anytime_Consumption);
                                        let peakUsage = Number(dualFuelBucket[property].Peak_Consumption);
                                        let offPeakUsage = Number(dualFuelBucket[property].OffPeak_Consumption);
                                        let heatingUsage = Number(dualFuelBucket[property].Heating_Consumption);
                                        let anytimeCost = anytimeUsage * standardElectricPrice[0]['17.0000'];
                                        let peakTimeCost = peakUsage * standardElectricPrice[0]['17.0000'];
                                        let offPeakCost = offPeakUsage * standardElectricPrice[0]['20.0000'];
                                        let heatingCost = heatingUsage * standardElectricPrice[0]['20.0000'];
                                        returnValue = Number((anytimeCost + peakTimeCost + offPeakCost + heatingCost + standingCharge).toFixed(2));
                                    }
                                    totalTwoRateCurrentCost();
                                    break;
                                case 'ThreeRate':
                                    const totalThreeRateCurrentCost = () => {
                                        let standingCharge = 365 * Number(standardElectricPrice[0]['13.0000']);
                                        let anytimeUsage = Number(dualFuelBucket[property].Anytime_Consumption);
                                        let peakUsage = Number(dualFuelBucket[property].Peak_Consumption);
                                        let offPeakUsage = Number(dualFuelBucket[property].OffPeak_Consumption);
                                        let heatingUsage = Number(dualFuelBucket[property].Heating_Consumption);
                                        let eveWeekendUsage = Number(dualFuelBucket[property].Evening_And_Weekend_Consumption);
                                        let anytimeCost = anytimeUsage * standardElectricPrice[0]['17.0000'];
                                        let peakTimeCost; let offPeakCost;
                                        if (standardElectricPrice[0]['7'] === 'Heatwise 3 Rate') {
                                            peakTimeCost = peakUsage * standardElectricPrice[0]['20.0000'];
                                            offPeakCost = offPeakUsage * standardElectricPrice[0]['23.0000'];
                                        }
                                        else {
                                            peakTimeCost = peakUsage * standardElectricPrice[0]['17.0000'];
                                            offPeakCost = offPeakUsage * standardElectricPrice[0]['20.0000'];
                                        }
                                        let eveWeekendCost = eveWeekendUsage * standardElectricPrice[0]['20.0000'];
                                        let heatingCost = heatingUsage * standardElectricPrice[0]['23.0000'];
                                        returnValue = Number((anytimeCost + peakTimeCost + offPeakCost + eveWeekendCost + heatingCost + standingCharge).toFixed(2));

                                    }
                                    totalThreeRateCurrentCost();
                                    break;
                                case 'FourRate':
                                    const totalFourRateCurrentCost = () => {
                                        let standingCharge = 365 * Number(standardElectricPrice[0]['13.0000']);
                                        let anytimeUsage = Number(dualFuelBucket[property].Anytime_Consumption);
                                        let peakUsage = Number(dualFuelBucket[property].Peak_Consumption);
                                        let offPeakUsage = Number(dualFuelBucket[property].OffPeak_Consumption);
                                        let heatingUsage = Number(dualFuelBucket[property].Heating_Consumption);
                                        let eveWeekendUsage = Number(dualFuelBucket[property].Evening_And_Weekend_Consumption);
                                        let anytimeCost = anytimeUsage * standardElectricPrice[0]['17.0000'];
                                        let peakTimeCost = peakUsage * standardElectricPrice[0]['17.0000'];
                                        let offPeakCost = offPeakUsage * standardElectricPrice[0]['20.0000'];
                                        let eveWeekendCost = eveWeekendUsage * standardElectricPrice[0]['23.0000'];
                                        let heatingCost = heatingUsage * standardElectricPrice[0]['26.0000'];
                                        returnValue = Number((anytimeCost + peakTimeCost + offPeakCost + eveWeekendCost + heatingCost + standingCharge).toFixed(2));
                                    }
                                    totalFourRateCurrentCost();
                                    break;
                                default:
                            }
                            let similarMeter = '';
                            let similarReturnTotalCost = 0;
                            let similarSwitchMeterDecider = '';
                            if (finalCheapestSimilarData.length) {
                                similarMeter = finalCheapestSimilarData[0][3];//This would be actual similar meter for this customer                               
                                //let similarSwitchMeterDecider = '';
                                let SimilarMeterChecker = true;
                                //  let returnValue = 0;
                                standardMeters.forEach((element) => {
                                    if (element === similarMeter) { ; similarSwitchMeterDecider = 'Standard'; SimilarMeterChecker = false; }
                                });
                                if (SimilarMeterChecker === true) {
                                    twoRateMeters.forEach((element) => {
                                        if (element === similarMeter) { similarSwitchMeterDecider = 'TwoRate'; SimilarMeterChecker = false; }
                                    });
                                }
                                if (SimilarMeterChecker === true) {
                                    threeRateMeters.forEach((element) => {
                                        if (element === similarMeter) { similarSwitchMeterDecider = 'ThreeRate'; SimilarMeterChecker = false; }
                                    });
                                }
                                if (SimilarMeterChecker === true) {
                                    if (fourRateMeters === similarMeter) { similarSwitchMeterDecider = 'FourRate'; SimilarMeterChecker = false; }

                                }
                                switch (similarSwitchMeterDecider) {
                                    case 'Standard':
                                        const totalCheapestSimilarCost = () => {
                                            if (finalCheapestSimilarData.length) {
                                                let standingCharge = 365 * Number(finalCheapestSimilarData[0]['13.0000']);
                                                let rate1 = Number(finalCheapestSimilarData[0]['17.0000']) * Number(dualFuelBucket[property].Elec_Annual_Usage);
                                                similarReturnTotalCost = Number((rate1 + standingCharge).toFixed(2));
                                            } else { similarReturnTotalCost = 0; }
                                        }
                                        totalCheapestSimilarCost();
                                        break;
                                    case 'TwoRate':
                                        const totalCheapestSimilarTwoRateCost = () => {
                                            if (finalCheapestSimilarData.length) {
                                                let standingCharge = 365 * Number(finalCheapestSimilarData[0]['13.0000']);
                                                let anytimeUsage = Number(dualFuelBucket[property].Anytime_Consumption);
                                                let peakUsage = Number(dualFuelBucket[property].Peak_Consumption);
                                                let offPeakUsage = Number(dualFuelBucket[property].OffPeak_Consumption);
                                                let heatingUsage = Number(dualFuelBucket[property].Heating_Consumption);
                                                let anytimeCost = anytimeUsage * finalCheapestSimilarData[0]['17.0000'];
                                                let peakTimeCost = peakUsage * finalCheapestSimilarData[0]['17.0000'];
                                                let offPeakCost = offPeakUsage * finalCheapestSimilarData[0]['20.0000'];
                                                let heatingCost = heatingUsage * finalCheapestSimilarData[0]['20.0000'];
                                                similarReturnTotalCost = Number((anytimeCost + peakTimeCost + offPeakCost + heatingCost + standingCharge).toFixed(2));
                                            } else { similarReturnTotalCost = 0; }
                                        }
                                        totalCheapestSimilarTwoRateCost();
                                        break;
                                    case 'ThreeRate':
                                        const totalCheapestSimilarThreeRateCost = () => {
                                            if (finalCheapestSimilarData.length) {
                                                let standingCharge = 365 * Number(finalCheapestSimilarData[0]['13.0000']);
                                                let anytimeUsage = Number(dualFuelBucket[property].Anytime_Consumption);
                                                let peakUsage = Number(dualFuelBucket[property].Peak_Consumption);
                                                let offPeakUsage = Number(dualFuelBucket[property].OffPeak_Consumption);
                                                let heatingUsage = Number(dualFuelBucket[property].Heating_Consumption);
                                                let eveWeekendUsage = Number(dualFuelBucket[property].Evening_And_Weekend_Consumption);
                                                let anytimeCost = anytimeUsage * finalCheapestSimilarData[0]['17.0000'];
                                                let peakTimeCost; let offPeakCost;
                                                if (finalCheapestSimilarData[0]['7'] === 'Heatwise 3 Rate') {
                                                    peakTimeCost = peakUsage * finalCheapestSimilarData[0]['20.0000'];
                                                    offPeakCost = offPeakUsage * finalCheapestSimilarData[0]['23.0000'];
                                                }
                                                else {
                                                    peakTimeCost = peakUsage * finalCheapestSimilarData[0]['17.0000'];
                                                    offPeakCost = offPeakUsage * finalCheapestSimilarData[0]['20.0000'];
                                                }
                                                let eveWeekendCost = eveWeekendUsage * finalCheapestSimilarData[0]['20.0000'];
                                                let heatingCost = heatingUsage * finalCheapestSimilarData[0]['23.0000'];
                                                similarReturnTotalCost = Number((anytimeCost + peakTimeCost + offPeakCost + eveWeekendCost + heatingCost + standingCharge).toFixed(2));
                                            } else { similarReturnTotalCost = 0; }
                                        }
                                        totalCheapestSimilarThreeRateCost();
                                        break;
                                    case 'FourRate':
                                        const totalCheapestSimilarFourRateCost = () => {
                                            if (finalCheapestSimilarData.length) {
                                                let standingCharge = 365 * Number(finalCheapestSimilarData[0]['13.0000']);
                                                let anytimeUsage = Number(dualFuelBucket[property].Anytime_Consumption);
                                                let peakUsage = Number(dualFuelBucket[property].Peak_Consumption);
                                                let offPeakUsage = Number(dualFuelBucket[property].OffPeak_Consumption);
                                                let heatingUsage = Number(dualFuelBucket[property].Heating_Consumption);
                                                let eveWeekendUsage = Number(dualFuelBucket[property].Evening_And_Weekend_Consumption);
                                                let anytimeCost = anytimeUsage * finalCheapestSimilarData[0]['17.0000'];
                                                let peakTimeCost = peakUsage * finalCheapestSimilarData[0]['17.0000'];
                                                let offPeakCost = offPeakUsage * finalCheapestSimilarData[0]['20.0000'];
                                                let eveWeekendCost = eveWeekendUsage * finalCheapestSimilarData[0]['23.0000'];
                                                let heatingCost = heatingUsage * finalCheapestSimilarData[0]['26.0000'];
                                                similarReturnTotalCost = Number((anytimeCost + peakTimeCost + offPeakCost + eveWeekendCost + heatingCost + standingCharge).toFixed(2));
                                            } else { similarReturnTotalCost = 0; }
                                        }
                                        totalCheapestSimilarFourRateCost();
                                        break;
                                    default:
                                }
                            }
                            let overallMeter = '';
                            let returnOverallValue = 0;
                            if (finalCheapestOverallData.length) {
                                overallMeter = finalCheapestOverallData[0][3];//This would be actual overall meter for this customer                                                        
                                let overallSwitchMeterDecider = '';
                                let overallMeterChecker = true;

                                standardMeters.forEach((element) => {
                                    if (element === overallMeter) { overallSwitchMeterDecider = 'Standard'; overallMeterChecker = false; }
                                });
                                if (overallMeterChecker === true) {
                                    twoRateMeters.forEach((element) => {
                                        if (element === overallMeter) { overallSwitchMeterDecider = 'TwoRate'; overallMeterChecker = false; }
                                    });
                                }
                                if (overallMeterChecker === true) {
                                    threeRateMeters.forEach((element) => {
                                        if (element === overallMeter) { overallSwitchMeterDecider = 'ThreeRate'; overallMeterChecker = false; }
                                    });
                                }
                                if (overallMeterChecker === true) {
                                    if (fourRateMeters === overallMeter) { overallSwitchMeterDecider = 'FourRate'; overallMeterChecker = false; }
                                }
                                switch (overallSwitchMeterDecider) {
                                    case 'Standard':
                                        const totalCheapestOverallCost = () => {
                                            if (finalCheapestOverallData.length) {
                                                let standingCharge = 365 * Number(finalCheapestOverallData[0]['13.0000']);
                                                let rate1 = Number(finalCheapestOverallData[0]['17.0000']) * Number(dualFuelBucket[property].Elec_Annual_Usage);
                                                returnOverallValue = Number((rate1 + standingCharge).toFixed(2));
                                            }
                                            else { returnOverallValue = 0; }
                                        }
                                        totalCheapestOverallCost();
                                        break;
                                    case 'TwoRate':
                                        const totalCheapestOverallTwoRateCost = () => {
                                            if (finalCheapestOverallData.length) {
                                                let standingCharge = 365 * Number(finalCheapestOverallData[0]['13.0000']);
                                                let anytimeUsage = Number(dualFuelBucket[property].Anytime_Consumption);
                                                let peakUsage = Number(dualFuelBucket[property].Peak_Consumption);
                                                let offPeakUsage = Number(dualFuelBucket[property].OffPeak_Consumption);
                                                let heatingUsage = Number(dualFuelBucket[property].Heating_Consumption);
                                                let anytimeCost = anytimeUsage * finalCheapestOverallData[0]['17.0000'];
                                                let peakTimeCost = peakUsage * finalCheapestOverallData[0]['17.0000'];
                                                let offPeakCost = offPeakUsage * finalCheapestOverallData[0]['20.0000'];
                                                let heatingCost = heatingUsage * finalCheapestOverallData[0]['20.0000'];
                                                returnOverallValue = Number((anytimeCost + peakTimeCost + offPeakCost + heatingCost + standingCharge).toFixed(2));
                                            }
                                            else { returnOverallValue = 0; }
                                        }
                                        totalCheapestOverallTwoRateCost();
                                        break;
                                    case 'ThreeRate':
                                        const totalCheapestOverallThreeRateCost = () => {
                                            if (finalCheapestOverallData.length) {
                                                let standingCharge = 365 * Number(finalCheapestOverallData[0]['13.0000']);
                                                let anytimeUsage = Number(dualFuelBucket[property].Anytime_Consumption);
                                                let peakUsage = Number(dualFuelBucket[property].Peak_Consumption);
                                                let offPeakUsage = Number(dualFuelBucket[property].OffPeak_Consumption);
                                                let heatingUsage = Number(dualFuelBucket[property].Heating_Consumption);
                                                let eveWeekendUsage = Number(dualFuelBucket[property].Evening_And_Weekend_Consumption);
                                                let anytimeCost = anytimeUsage * finalCheapestOverallData[0]['17.0000'];
                                                let peakTimeCost; let offPeakCost;
                                                if (finalCheapestOverallData[0]['7'] === 'Heatwise 3 Rate') {
                                                    peakTimeCost = peakUsage * finalCheapestOverallData[0]['20.0000'];
                                                    offPeakCost = offPeakUsage * finalCheapestOverallData[0]['23.0000'];
                                                }
                                                else {
                                                    peakTimeCost = peakUsage * finalCheapestOverallData[0]['17.0000'];
                                                    offPeakCost = offPeakUsage * finalCheapestOverallData[0]['20.0000'];
                                                }
                                                let eveWeekendCost = eveWeekendUsage * finalCheapestOverallData[0]['20.0000'];
                                                let heatingCost = heatingUsage * finalCheapestOverallData[0]['23.0000'];
                                                returnOverallValue = Number((anytimeCost + peakTimeCost + offPeakCost + eveWeekendCost + heatingCost + standingCharge).toFixed(2));
                                            }
                                            else { returnOverallValue = 0; }
                                        }
                                        totalCheapestOverallThreeRateCost();
                                        break;
                                    case 'FourRate':
                                        const totalCheapestOverallFourRateCost = () => {
                                            if (finalCheapestOverallData.length) {
                                                let standingCharge = 365 * Number(finalCheapestOverallData[0]['13.0000']);
                                                let anytimeUsage = Number(dualFuelBucket[property].Anytime_Consumption);
                                                let peakUsage = Number(dualFuelBucket[property].Peak_Consumption);
                                                let offPeakUsage = Number(dualFuelBucket[property].OffPeak_Consumption);
                                                let heatingUsage = Number(dualFuelBucket[property].Heating_Consumption);
                                                let eveWeekendUsage = Number(dualFuelBucket[property].Evening_And_Weekend_Consumption);
                                                let anytimeCost = anytimeUsage * finalCheapestOverallData[0]['17.0000'];
                                                let peakTimeCost = peakUsage * finalCheapestOverallData[0]['17.0000'];
                                                let offPeakCost = offPeakUsage * finalCheapestOverallData[0]['20.0000'];
                                                let eveWeekendCost = eveWeekendUsage * finalCheapestOverallData[0]['23.0000'];
                                                let heatingCost = heatingUsage * finalCheapestOverallData[0]['26.0000'];
                                                returnOverallValue = Number((anytimeCost + peakTimeCost + offPeakCost + eveWeekendCost + heatingCost + standingCharge).toFixed(2));
                                            }
                                            else { returnOverallValue = 0; }
                                        }
                                        totalCheapestOverallFourRateCost();
                                        break;
                                    default:

                                }
                            }
                            //Calculating similar saving
                            function calculateSimilarSaving() {
                                if (returnValue !== 0 && similarReturnTotalCost !== 0) {
                                    return returnValue - similarReturnTotalCost;
                                }
                                else { return 0; }
                            }
                            //Making sure similar saving correct or not
                            let eleCheapestSimilarSaving: number = Number(dualFuelBucket[property].Elec_Cheapest_Saving);
                            if (eleCheapestSimilarSaving === undefined) {
                                eleCheapestSimilarSaving = Number(dualFuelBucket[property].Elec_Cheapest_Similar_Saving);
                            }
                            function isEleSimilarSavingCorrect() {
                                let UL: number = (eleCheapestSimilarSaving + eleCheapestSimilarSaving * 0.05);
                                let LL: number = (eleCheapestSimilarSaving - eleCheapestSimilarSaving * 0.05);
                                //let similarSaving:number = Number((((eleCheapestSimilarSaving) / (returnValue - similarReturnTotalCost)) * 100).toFixed(2));
                                let similarSaving: number = returnValue - similarReturnTotalCost;
                                if (similarSaving === 0) { return 'No Similar Saving' }
                                else { return (similarSaving >= LL && similarSaving <= UL) ? 'Yes' : 'No'; }

                            }
                            //Calculating overall saving
                            function calculateOverallSaving() {
                                if (returnValue !== 0 && returnOverallValue !== 0) {
                                    return returnValue - returnOverallValue;
                                }
                                else { return 0; }
                            }
                            //Making sure overall cost correct or not
                            let elecheapestOverallSaving: number = Number(dualFuelBucket[property].Elec_Cheapest_Overall_saving);
                            function isEleOverallSavingCorrect() {
                                let LL: number = (elecheapestOverallSaving - elecheapestOverallSaving * 0.05);
                                let UL: number = (elecheapestOverallSaving + elecheapestOverallSaving * 0.05);
                                let overallSaving: number = returnValue - returnOverallValue;
                                if (overallSaving === 0) { return 'No Overall Saving' }
                                else {
                                    return overallSaving >= LL && overallSaving <= UL ? 'Yes' : 'No';
                                }
                            }
                            //Assignment of proofing Sheet object
                            const eleProofingSheetObject: ProofingObject & { [key: string]: any } = {
                                Date: '', Checker: '', Page: '',
                                Account_No: dualFuelBucket[property].Elec_Customer_No, Cust_Name_Correct: '', Cust_Address_Correct: '',
                                Beyond_Eligibility: beyondEligibility,
                                Marketing_Preference: dualFuelBucket[property].Marketing_pref, Marketing_Consent_Correct: '',
                                // GSP: dualFuelBucket[property].Zone_1,
                                GSP: customerZone, Fuel: 'Electric',
                                Tariff: dualFuelBucket[property].Elec_Tariff_Name,
                                Meter_Type: standardElectricPrice[0]['3'],
                                Payment_Method: dualFuelBucket[property].Elec_Payment_Method,
                                // Payment_Method:elePayMethod,
                                //Below 5 values only for Live Run Testing to check correct price(Excluding VAT) in KAE   
                                NewSC_KAE: Math.round(standardElectricPrice[0]['12'] * 10000) / 10000,
                                NewR1_KAE: Math.round(standardElectricPrice[0]['16'] * 10000) / 10000,
                                NewR2_KAE: Math.round(standardElectricPrice[0]['19'] * 10000) / 10000,
                                NewR3_KAE: Math.round(standardElectricPrice[0]['22'] * 10000) / 10000,
                                NewR4_KAE: Math.round(standardElectricPrice[0]['25'] * 10000) / 10000,
                                New_KAE_SC_Rates_Correct: '',
                                /******Logic 1: To convert 6 digit after decimal to 4 digit after decimal */
                                /*NewSC_PIN: dualFuelBucket[property].Elec_New_Stdg_Chrg, NewSC_PriceFile: Number(standardElectricPrice[0]['13.0000']).toFixed(4),
                                NewR1_PIN: dualFuelBucket[property].Elec_New_Unit_1_Inc_Vat, NewR1_PriceFile: Number(standardElectricPrice[0]['17.0000']).toFixed(4),
                                NewR2_PIN: dualFuelBucket[property].Elec_New_Unit_2_Inc_Vat, NewR2_PriceFile: Number(standardElectricPrice[0]['20.0000']).toFixed(4),
                                NewR3_PIN: dualFuelBucket[property].Elec_New_Unit_3_Inc_Vat, NewR3_PriceFile: Number(standardElectricPrice[0]['23.0000']).toFixed(4),
                                NewR4_PIN: dualFuelBucket[property].Elec_New_Unit_4_Inc_Vat, NewR4_PriceFile: Number(standardElectricPrice[0]['26.0000']).toFixed(4),*/

                                /******Logic 2: To convert 6 digit after decimal to 4 digit after decimal */
                                /*NewSC_PIN: Math.round(dualFuelBucket[property].Elec_New_Stdg_Chrg * 10000) / 10000, NewSC_PriceFile: Math.round(standardElectricPrice[0]['13.0000'] * 10000) / 10000,
                                NewR1_PIN: Math.round(dualFuelBucket[property].Elec_New_Unit_1_Inc_Vat * 10000) / 10000, NewR1_PriceFile: Math.round(standardElectricPrice[0]['17.0000'] * 10000) / 10000,
                                NewR2_PIN: Math.round(dualFuelBucket[property].Elec_New_Unit_2_Inc_Vat * 10000) / 10000, NewR2_PriceFile: Math.round(standardElectricPrice[0]['20.0000'] * 10000) / 10000,
                                NewR3_PIN: Math.round(dualFuelBucket[property].Elec_New_Unit_3_Inc_Vat * 10000) / 10000, NewR3_PriceFile: Math.round(standardElectricPrice[0]['23.0000'] * 10000) / 10000,
                                NewR4_PIN: Math.round(dualFuelBucket[property].Elec_New_Unit_4_Inc_Vat * 10000) / 10000, NewR4_PriceFile: Math.round(standardElectricPrice[0]['26.0000'] * 10000) / 10000,*/

                                /******Logic 3: To convert 6 digit after decimal to 4 digit after decimal */
                                NewSC_PIN: (Number(dualFuelBucket[property].Elec_New_Stdg_Chrg) + 1e-10).toFixed(4), NewSC_PriceFile: (Number(standardElectricPrice[0]['13.0000']) + 1e-10).toFixed(4),
                                NewR1_PIN: (Number(dualFuelBucket[property].Elec_New_Unit_1_Inc_Vat) + 1e-10).toFixed(4), NewR1_PriceFile: (Number(standardElectricPrice[0]['17.0000']) + 1e-10).toFixed(4),
                                NewR2_PIN: (Number(dualFuelBucket[property].Elec_New_Unit_2_Inc_Vat) + 1e-10).toFixed(4), NewR2_PriceFile: (Number(standardElectricPrice[0]['20.0000']) + 1e-10).toFixed(4),
                                NewR3_PIN: (Number(dualFuelBucket[property].Elec_New_Unit_3_Inc_Vat) + 1e-10).toFixed(4), NewR3_PriceFile: (Number(standardElectricPrice[0]['23.0000']) + 1e-10).toFixed(4),
                                NewR4_PIN: (Number(dualFuelBucket[property].Elec_New_Unit_4_Inc_Vat) + 1e-10).toFixed(4), NewR4_PriceFile: (Number(standardElectricPrice[0]['26.0000']) + 1e-10).toFixed(4),

                                New_SC_Rates_Correct: '',

                                OldAnnualCost: dualFuelBucket[property].Elec_Total_Old_Cost,
                                NewAnnualCost: dualFuelBucket[property].Elec_Total_New_Cost,
                                ChangeDifference: Number(dualFuelBucket[property].Elec_Total_New_Cost - dualFuelBucket[property].Elec_Total_Old_Cost),
                                ChangeAmountCorrect: '',
                                AreFrontPageCalculationCorrect: '',

                                PIN_Personal_Projection: dualFuelBucket[property].Elec_Total_New_Cost,
                                Calculated_Personal_Projection: returnValue,
                                // Difference: (dualFuelBucket[property].Elec_Annual_Usage * standardElectricPrice[0]['17.0000'] / dualFuelBucket[property].Elec_Total_New_Cost),
                                Difference: ((returnValue / dualFuelBucket[property].Elec_Total_New_Cost) * 100).toFixed(2) + '%',

                                //SimilarTariff: dualFuelBucket[property].Elec_Cheapest_Similar_Tariff,
                                SimilarTariff: cheapEleSimilarTariff,
                                SimilarMeter: similarMeter,
                                // SimilarMeter: finalCheapestSimilarData[0]['3'],
                                Calculated_Similar_Projection: similarReturnTotalCost,
                                //Calculated_Similar_Saving: returnValue - similarReturnTotalCost,
                                Calculated_Similar_Saving: calculateSimilarSaving(),
                                Similar_Saving_Correct: isEleSimilarSavingCorrect(),
                                //OverallTariff: dualFuelBucket[property].Elec_Cheapest_Overall_Tariff,
                                OverallTariff: cheapEleOverallTariff,
                                OverallMeter: overallMeter,
                                // OverallMeter: finalCheapestOverallData[0]['3'],
                                Calculated_Overall_Projection: returnOverallValue,
                                //Calculated_Overall_Saving: returnValue - returnOverallValue,
                                Calculated_Overall_Saving: calculateOverallSaving(),
                                //Overall_Saving_Correct: (((elecheapestOverallSaving) / (returnValue - returnOverallValue)) * 100).toFixed(2) + '%',
                                Overall_Saving_Correct: isEleOverallSavingCorrect(),
                                PresentmentCorrect: '',
                                PassFailUnsure: '',
                                Comments: '',
                            }
                            newDualFuelBucketData.push(eleProofingSheetObject);
                            //Single Ele Object finish here
                        }

                        else {
                            console.log(` Electric Account ${dualFuelBucket[property].Elec_Customer_No} Excluded from calculation, Unable to find Final Price`);
                        }
                    }
                    else {
                        console.log(`Electirc Account  ${dualFuelBucket[property].Elec_Customer_No} Excluded from Calculation, Unable to find Payment Method`);
                    }
                }
                else {
                    console.log(` Electirc Account  ${dualFuelBucket[property].Elec_Customer_No} Excluded from Calculation,No Tariff available`);
                }
            }
            else {
                console.log(` Electric Account ${dualFuelBucket[property].Elec_Customer_No} Excluded from calculation, Current Tariff is Fixed`);
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
                                Date: '', Checker: '', Page: '',
                                Account_No: dualFuelBucket[property].Gas_Customer_No, Cust_Name_Correct: '', Cust_Address_Correct: '',
                                Beyond_Eligibility: beyondEligibility,
                                Marketing_Preference: dualFuelBucket[property].Marketing_pref, Marketing_Consent_Correct: '',
                                //GSP: dualFuelBucket[property].Zone_1, 
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
                                /*NewSC_PIN: dualFuelBucket[property].Gas_New_Stdg_Chrg_Inc_Vat, NewSC_PriceFile: Number(standardGasPrice[0]['13.0000']).toFixed(4),
                                NewR1_PIN: dualFuelBucket[property].Gas_New_Unit_1_Inc_Vat, NewR1_PriceFile: Number(standardGasPrice[0]['17.0000']).toFixed(4),*/
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
            console.log(`zone missing for Ele A/c${dualFuelBucket[property].Elec_Customer_No} Gas A/c ${dualFuelBucket[property].Gas_Customer_No} `);
        }
    }

    annotate('The we should be able to generate new CSV testing file');
    // // //Below code to write final arrays to file
    if (newDualFuelBucketData.length) {
        const csvFromArrayOfObjects = convertArrayToCSV(newDualFuelBucketData);
        fs.writeFile('CSV Output/Multi DF Split Payment POST.csv', csvFromArrayOfObjects, err => {
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



