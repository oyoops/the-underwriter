// calculations.js - contains the functions for recalculating the proforma math live.

const MILLAGE_ADJUSTMENT = 9.9999;

/* GLOBALS */
let acreageValue;
let densityValue;
let abatementValue;
let marketStudioSize;
let market1BDSize;
let market2BDSize;
let market3BDSize;
let affordableStudioSize;
let affordable1BDSize;
let affordable2BDSize;
let affordable3BDSize;
let avgMarketSize;
let avgAffordableSize;
let avgBlendedSize;
let maxRent0bd;
let maxRent1bd;
let maxRent2bd;
let maxRent3bd;
// cost inputs
let landCostPerUnit;
let totalHCPerUnit;
// cost outputs
let totalLandCost;
let totalHcCost;
let totalLandAndTotalHc;
let totalLandAndTotalHcPerUnit;  
let totalLandAndTotalHcPerSqFt;
// abatement outputs
let abatementEstimate;
/* MAP GLOBALS */
// tallest building details (may break if tallestBuilding array >1)
let buildingLat;
let buildingLng;
let buildingHeight;
let buildingName; // may not work
let buildingAddress; // may not work

/* DOM */
// map
const mapDisplay = document.getElementById('map');
// acreage & density inputs
const acreageInputDisplay = document.getElementById('acreageInput');
const densityInputDisplay = document.getElementById('densityInput');
// affordable percentage input/output
const affordablePctSliderDisplay = document.getElementById('affordablePctSlider');
const affordablePctDisplay = document.getElementById('affordablePctDisplay');
// unit count outputs
const unitCountTableBody = document.getElementById('unitCalculationTableBody');
const warningContainer = document.getElementById('warningContainer');
// unit size outputs
const marketStudioSizeDisplay = document.getElementById('marketStudioSize');
const market1BDSizeDisplay = document.getElementById('market1BDSize');
const market2BDSizeDisplay = document.getElementById('market2BDSize');
const market3BDSizeDisplay = document.getElementById('market3BDSize');
const affordableStudioSizeDisplay = document.getElementById('affordableStudioSize');
const affordable1BDSizeDisplay = document.getElementById('affordable1BDSize');
const affordable2BDSizeDisplay = document.getElementById('affordable2BDSize');
const affordable3BDSizeDisplay = document.getElementById('affordable3BDSize');
const avgAffordableSizeDisplay = document.getElementById('avgAffordableSizeDisplay');
const avgMarketSizeDisplay = document.getElementById('avgMarketSizeDisplay');
const avgBlendedSizeDisplay = document.getElementById('avgBlendedSizeDisplay');
// cost inputs
const landCostPerUnitInputDisplay = document.getElementById('landCostPerUnitInput');
const totalHCPerUnitInputDisplay = document.getElementById('totalHCPerUnitInput');
// cost outputs
const totalLandCostDisplay = document.getElementById('totalLandCost');
const totalHcCostDisplay = document.getElementById('totalHcCost');
const totalLandAndTotalHcDisplay = document.getElementById('totalLandAndTotalHc');
const totalLandAndTotalHcPerUnitDisplay = document.getElementById('totalLandAndTotalHcPerUnit');
const totalLandAndTotalHcPerSqFtDisplay = document.getElementById('totalLandAndTotalHcPerSqFt');
// abatement output
const abatementTableBody = document.getElementById('abatementTableBody');


/*=============//
// Calculation //
//  Functions  //
//=============*/

// Recalculate abatement table [called by calculateMaximumUnits()]
function calculateAbatement() {
    // Update abatement
    if (affordablePct >= 0.40) {    
        abatementValue = Math.round(0.75 * (affordableUnits / totalUnits) * 100); // assumes all affordable units are 120% AMI
    } else {
        abatementValue = 0;
    }
    abatementEstimate = ((((abatementValue / 100) * totalLandAndTotalHcPerUnit) * (((MILLAGE_ADJUSTMENT + parseFloat(countyData.county_millage)) / 1000)) * (1 - 0.04)) / 12); // estimate = abatement % * estimated tax/unit
    abatementEstimate = abatementEstimate.toFixed(0);
    abatementTableBody.innerHTML = `
        <tr>
            <td>${abatementValue}% net</td>
            <td>$${abatementEstimate} per unit/mo.</td>
        </tr>
    `;
}

// Recalculate unit counts table (and Warnings)
function calculateMaximumUnits() {
    // Acreage, density, and affordable percentage inputs
    acreageValue = parseFloat(acreageInputDisplay.value);
    densityValue = parseFloat(densityInputDisplay.value) || 50; // default density = 50 units/ac.
    affordablePct = parseFloat(affordablePctSliderDisplay.value) / 100;

    // Calculate unit counts
    totalUnits = Math.floor(acreageValue * densityValue);
    affordableUnits = Math.ceil(affordablePct * totalUnits);
    marketUnits = totalUnits - affordableUnits;

    // Update the table with unit counts
    unitCountTableBody.innerHTML = `
        <tr>
            <td>${affordableUnits}</td>
            <td>${marketUnits}</td>
            <td>${totalUnits}</td>
        </tr>
    `;
    // Unhide unit count table
    document.getElementById('unitCalculationTable').style.display = 'block';

    // Reset warnings
    warningContainer.innerHTML = "";  // Clear previous warnings
    // Set warnings
    //// Warning check #1: Minimum percent affordable by approval pathway
    if (affordablePct >= 0.4) {
        if (affordableUnits < 70) {
            //// Warning check #2: If going for steamroll, need >= 70 affordable
            warningContainer.style.display = 'block';
            warningContainer.innerHTML += '<p style="color: orange;">⚠️ Not enough affordable units! <br>Need 40%+ <u>and</u> 70+ affordable to avoid public hearings.</p>';
        } else {
            // Warning check #3: All-clear to steamroll (affordable # >= 70 and affordable % >= 40%)
            warningContainer.style.display = 'block';
            warningContainer.innerHTML = '<p style="color: green;">✅🎉 Good! <br>No public hearings would be required.</p>';
        }
    } else {
        if (affordablePct < 0.1) {
            warningContainer.innerHTML += '<p style="color: red;">❌ Not enough affordable units! <br>Need <u>at least</u> 10% affordable to Live Local.</p>';
            warningContainer.style.display = 'block';
        } else {
            warningContainer.style.display = 'block';
            warningContainer.innerHTML += '<p style="color: orange;">✅⚠️ Good! <br>However, you will need municipal cooperation.<br>And no tax abatement for you!</p>';
        }
    }
    calculateWeightedAverageSizes();
    calculateAbatement();
}

// Calculate weighted average sizes
function calculateWeightedAverageSizes() {
    affordablePct = parseFloat(affordablePctSliderDisplay.value) / 100;
    acreageValue = parseFloat(acreageInputDisplay.value);
    densityValue = parseFloat(densityInputDisplay.value);

    totalUnits = Math.floor(acreageValue * densityValue);
    affordableUnits = Math.ceil(affordablePct * totalUnits);
    marketUnits = totalUnits - affordableUnits;

    marketStudioSize = parseFloat(marketStudioSizeDisplay.value) || 0;
    market1BDSize = parseFloat(market1BDSizeDisplay.value) || 0;
    market2BDSize = parseFloat(market2BDSizeDisplay.value) || 0;
    market3BDSize = parseFloat(market3BDSizeDisplay.value) || 0;

    affordableStudioSize = parseFloat(affordableStudioSizeDisplay.value) || 0;
    affordable1BDSize = parseFloat(affordable1BDSizeDisplay.value) || 0;
    affordable2BDSize = parseFloat(affordable2BDSizeDisplay.value) || 0;
    affordable3BDSize = parseFloat(affordable3BDSizeDisplay.value) || 0;

    // Calculate weighted avg. sq. ft. for market units, affordable units, and blended
    avgMarketSize = (marketStudioSize + market1BDSize + market2BDSize + market3BDSize) / 4;
    avgAffordableSize = (affordableStudioSize + affordable1BDSize + affordable2BDSize + affordable3BDSize) / 4;
    avgBlendedSize = (avgMarketSize * marketUnits + avgAffordableSize * affordableUnits) / totalUnits;

    /* MOVE THESE AVGS. TO A NEW TABLE ROW */
    // Display avg. sq. ft. values
    avgMarketSizeDisplay.innerText = avgMarketSize.toFixed(0);
    avgAffordableSizeDisplay.innerText = avgAffordableSize.toFixed(0);
    avgBlendedSizeDisplay.innerText = avgBlendedSize.toFixed(0);
}

// (get by unit type) market-rate rent per sq. ft.
function getMarketRatePerSqFt(unitType) {
    const mktrent = parseFloat(document.getElementById(`marketRate${unitType}`).value) || 0;
    const mktunitsize = parseFloat(document.getElementById(`market${unitType}Size`).value) || 0;
    return (mktunitsize === 0) ? 'N/A' : (mktrent / mktunitsize).toFixed(2);
}
// (get by unit type) calculate affordable rents per Sq. Ft.
function getAffordableRatePerSqFt(unitType) {
    if (typeof countyData === 'undefined') {
        console.log("Error! County data not yet available.");
        return 'N/A';
    }  
    let affordablerent = 0;
    // convert max rent strings to floats
    maxRent0bd = parseFloat(countyData.max_rent_0bd_120ami);
    maxRent1bd = parseFloat(countyData.max_rent_1bd_120ami);
    maxRent2bd = parseFloat(countyData.max_rent_2bd_120ami);
    maxRent3bd = parseFloat(countyData.max_rent_3bd_120ami);
    // select appropriate affordable rate based on unit type
    switch (unitType) {
        case 'Studio':
            affordablerent = maxRent0bd;
            break;
        case '1BD':
            affordablerent = maxRent1bd;
            break;
        case '2BD':
            affordablerent = maxRent2bd;
            break;
        case '3BD':
            affordablerent = maxRent3bd;
            break;
        default:
            console.error("Invalid unit type.");
            return 'N/A';
    }
    let affordableunitsize = parseFloat(document.getElementById(`affordable${unitType}Size`).value) || 0;    
    return (affordableunitsize === 0) ? 'N/A' : (affordablerent / affordableunitsize).toFixed(2);
}

// Update rent per sq. ft. table
function updateRentPerSqFtTable() {
    document.getElementById('marketRateStudioPerSqFt').innerText = '$' + getMarketRatePerSqFt('Studio');
    document.getElementById('affordableStudioPerSqFt').innerText = '$' + getAffordableRatePerSqFt('Studio');
    document.getElementById('marketRate1BDPerSqFt').innerText = '$' + getMarketRatePerSqFt('1BD');
    document.getElementById('affordable1BDPerSqFt').innerText = '$' + getAffordableRatePerSqFt('1BD');
    document.getElementById('marketRate2BDPerSqFt').innerText = '$' + getMarketRatePerSqFt('2BD');
    document.getElementById('affordable2BDPerSqFt').innerText = '$' + getAffordableRatePerSqFt('2BD');
    document.getElementById('marketRate3BDPerSqFt').innerText = '$' + getMarketRatePerSqFt('3BD');
    document.getElementById('affordable3BDPerSqFt').innerText = '$' + getAffordableRatePerSqFt('3BD');
}

// Recalculate total costs
function updateTotalCosts() {
    // Get input values
    landCostPerUnit = parseFloat(landCostPerUnitInputDisplay.value);
    totalHCPerUnit = parseFloat(totalHCPerUnitInputDisplay.value);

    // Ensure the inputs are numbers
    if (isNaN(landCostPerUnit) || isNaN(totalHCPerUnit)) {
        alert('Please enter valid costs (positive numbers)!');
        return;
    }

    // Recalculate costs
    totalLandCost = landCostPerUnit * totalUnits;
    totalHcCost = totalHCPerUnit * totalUnits;
    totalLandAndTotalHc = totalLandCost + totalHcCost;
    totalLandAndTotalHcPerUnit = totalLandAndTotalHc / totalUnits;  
    totalLandAndTotalHcPerSqFt = totalLandAndTotalHc / totalUnits / avgBlendedSize;  
    
    // Update costs table
    totalLandCostDisplay.textContent = '$' + totalLandCost.toFixed(0);
    totalHcCostDisplay.textContent = '$' + totalHcCost.toFixed(0);
    totalLandAndTotalHcDisplay.textContent = '$' + totalLandAndTotalHc.toFixed(0);
    totalLandAndTotalHcPerUnitDisplay.textContent = '$' + totalLandAndTotalHcPerUnit.toFixed(0);
    totalLandAndTotalHcPerSqFtDisplay.textContent = '$' + totalLandAndTotalHcPerSqFt.toFixed(2);
}



