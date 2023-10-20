// main.js - the primary script for SB102bot web app.

// Global variables
let address;
let lat;
let lng;
let countyData;
let cityData;
let parcelData;
let acres;
let maxMuniDensity;

let totalUnits;
let affordableUnits;
let marketUnits;
let affordablePct;

// after page is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    window.scrollTo(0, 0); // scroll to top

    // DOM
    const mainHeader = document.getElementById("mainHeader");
    const initialContent = document.querySelector('#initialContent');
    const form = document.querySelector('#searchForm');
    const addressInput = document.querySelector('#addressInput');
    const googlemap = document.getElementById('map');
    const countyTableBody = document.querySelector('#countyDataTable tbody');
    const rentsTableBody = document.querySelector('#countyMaxRentsTable tbody');
    const parcelDataTableBody = document.querySelector('#parcelDataTable tbody');
    const eligibilityDiv = document.getElementById("eligibilityStatus");
    const parcelDataTable = document.getElementById('parcelDataTable');
    const developmentProgramInputSection = document.getElementById('developmentProgramInputSection');
    const affordablePercentageSlider = document.getElementById("affordablePctSlider");
    const affordablePctDisplay = document.getElementById('affordablePctDisplay');
    const unitCalculationTable = document.getElementById('unitCalculationTable');
    const sizeInputs = document.querySelectorAll('.sizeInput');
    const marketInputs = document.querySelectorAll('.marketSizeInput');
    const affordableSizeInputs = document.querySelectorAll('.affordableSizeInput');
    const marketRateInputSection = document.getElementById('marketRateInputSection');
    const marketRateInputs = document.querySelectorAll('.marketRateInput');
    const acreageInput = document.getElementById("acreageInput");
    const densityInput = document.getElementById('densityInput');
    const matchAffordableSizesCheckbox = document.getElementById('matchAffordableSizes');
    const rentPerSqFtTableSection = document.getElementById('rentPerSqFtTableSection');
    
    const landAndTotalHcInputSection = document.getElementById('landAndTotalHcInputSection');
    const landCostPerUnit = document.getElementById('landCostPerUnitInput');
    const totalHCPerUnit = document.getElementById('totalHCPerUnitInput');
    
    const landAndTotalHcOutputSection = document.getElementById('totalLandAndTotalHcOutputSection');
    
    const abatementTable = document.getElementById('abatementTable');
    const tryAgainButton = document.getElementById("tryAgainButton");

    // on New Search button click:
    tryAgainButton.addEventListener("click", function() {
        location.reload();
    });
    
    // on form submit:
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        address = addressInput.value;

        if (!address) {
            alert('You might want to enter an address first... <br>Just a suggestion, though!');
            return;
        }

        try {
            // hide initial content
            mainHeader.style.display = 'none';  // hide main header
            initialContent.style.display = 'none';  // hide the rest of initial content
            
            // show loading indicator
            document.querySelector('.loading').style.display = 'block';
            
            // geocode the input address
            const geocodeEndpoint = `/api/geocode?address=${encodeURIComponent(address)}`;
            const geocodeResponse = await fetch(geocodeEndpoint);
            // check success
            if (!geocodeResponse.ok) {
                console.log('ERROR: Geocode failed!');
                throw new Error(`Server responded with ${geocodeResponse.status}: ${await geocodeResponse.text()}`);
            }
            const geocodeData = await geocodeResponse.json();
            if (!geocodeData.results || geocodeData.results.length === 0) {
                throw new Error(`Whoops... That address isn't in my coverage area.\nI only know about Florida (and only the good counties at that).`);
            }

            /* Geocode was successful */
            
            // get coordinates from results
            lat = geocodeData.results[0].geometry.location.lat; // global
            lng = geocodeData.results[0].geometry.location.lng; // global

            // show map with placemarks: (1) input address at center of map; (2,3,4) the tallest three bldgs. within a ~1-mi radius
            initializeMap(lat, lng);

            // fetch the city of the address (Lat,Lng = CityData || CityName = Unincorporated if not in a city)
            const cityCheckEndpoint = `/api/check_city?lat=${lat}&lng=${lng}`;
            const cityCheckResponse = await fetch(cityCheckEndpoint);
            cityData = await cityCheckResponse.json(); // global
            console.log("City Data Received:", cityData);
            if (cityData.isInCity) {
                console.log(`Address is within city: ${cityData.cityName}`);
            } else {
                console.log('Address is unincorporated.');
                cityData.cityName = 'Unincorporated';
            }
            
            // fetch the county data for the address (Lat,Lng = CountyData)
            const countyDataEndpoint = `/api/load_county_table?lat=${lat}&lng=${lng}`;
            const countyDataResponse = await fetch(countyDataEndpoint);
            countyData = await countyDataResponse.json(); // global
            console.log("County Data Received:", countyData);
            if (!countyData.county_name) {
                throw new Error('No county data available for the address.');
            }

            /* PostgreSQL match found */

            // fetch the parcel data for the address (Lat,Lng + County = ParcelData)
            const parcelDataEndpoint = `/api/load_parcel_data?lat=${lat}&lng=${lng}&county_name=${countyData.county_name}`;
            const parcelDataResponse = await fetch(parcelDataEndpoint);
            parcelData = await parcelDataResponse.json(); // global
            console.log("Parcel Data Received:", parcelData);

            // hide loading indicator
            document.querySelector('.loading').style.display = 'none';
            
            // show try again button
            document.querySelector('#tryAgainButton').style.display = 'block';  // show try again button
            
            // ...

            
            
            // ...
                        
            // Populate the municipal data table
            const countyRow = `
                <tr>
                    <td>${countyData.county_name}</td>
                    <td>${cityData.cityName}</td>
                    <td>$${countyData.county_amis_income}</td>
                    <td>${countyData.county_millage}</td>
                </tr>
            `;
            countyTableBody.innerHTML = countyRow;
            document.getElementById('countyDataTable').style.display = 'table'; // Unhide
            
            // Populate the max rents table
            const rentsRow = `
                <tr>
                    <td>$${countyData.max_rent_0bd_120ami}</td>
                    <td>$${countyData.max_rent_1bd_120ami}</td>
                    <td>$${countyData.max_rent_2bd_120ami}</td>
                    <td>$${countyData.max_rent_3bd_120ami}</td>
                </tr>
            `;
            rentsTableBody.innerHTML = rentsRow;
            document.getElementById('countyMaxRentsTable').style.display = 'table'; // Unhide

            // Display eligibility
            if (maybeEligibleCodes.includes(parcelData.dor_uc)) {
                eligibilityDiv.innerHTML = `This site is <b>VERY UNLIKELY</b> to be eligible for Live Local Act development. <br>To qualify, it can't <b>already</b> be apartments.`;
                eligibilityDiv.style.color = "orange";
                eligibilityDiv.style.fontSize = "20px";
            } else if (eligibleCodes.includes(parcelData.dor_uc)) {
                buildingHeight = parseFloat(buildingHeight);
                console.log("HEIGHT:", buildingHeight, "feet");
                eligibilityDiv.innerHTML = `This site is <b>ELIGIBLE</b> for Live Local Act development. <br>You could build up to <b>${buildingHeight.toFixed(0)} feet</b> tall here. `;
                if (buildingHeight >= 100) {
                    eligibilityDiv.innerHTML += `<br><i>Wow, that's a lot of feet!</i> 👣👣👣👀`;
                }
                eligibilityDiv.style.color = "green";
                eligibilityDiv.style.fontSize = "20px";
            } else {
                eligibilityDiv.innerHTML = `This site is <b>NOT ELIGIBLE</b> for Live Local Act development. <br>To qualify, it must currently be <b>commercial</b> or <b>industrial</b>. <br>I could be wrong about this parcel, though, so verify its zoning.`;
                eligibilityDiv.style.color = "red";
                eligibilityDiv.style.fontSize = "20px";
            }

            // convert land sq. ft. to acres
            acres = parseFloat(parcelData.lnd_sqfoot) / 43560;
            
            // Populate parcel data table
            const parcelDataRow = `
                <tr>
                    <td>${parcelData.parcel_id}</td>
                    <td>${acres.toFixed(2)}</td>
                    <td>${parcelData.own_name}</td>
                    <td>${useCodeLookup[parcelData.dor_uc] || parcelData.dor_uc}</td>
                </tr>
            `;
            parcelDataTableBody.innerHTML = parcelDataRow;

            // scroll to top of map after everything is loaded x1
            googlemap.scrollIntoView();
            window.scrollTo(0, 0);
            

            /* USER INPUTS SECTION START */

            // unhide tables and I/O sections            
            parcelDataTable.style.display = 'table'; // parcel data
            developmentProgramInputSection.style.display = 'block'; // development program inputs (??)
            unitCalculationTable.style.display = 'block'; // unit counts
            marketRateInputSection.style.display = 'block'; // market rate rent inputs
            rentPerSqFtTableSection.style.display = 'block'; // rent per Sq Ft
            abatementTable.style.display = 'block'; // property tax abatement
            // ...
            landAndTotalHcInputSection.style.display = 'block';
            landAndTotalHcOutputSection.style.display = 'block';
            // ...
            



            // ...
            
            // set acreage input placeholder
            acreageInput.value = acres.toFixed(2);

            // ...




            // DENSITY TESTING!
            const maxDensity = await getMaxDensity(county, city);
            if (maxDensity !== null) {
                // set global
                maxMuniDensity = maxDensity;
                // set input placeholder
                densityInput.value = maxDensity.toFixed(0);
            } else {
                console.log ("WARNING: Maximum municipal density was not found!")
                // set global
                maxMuniDensity = 0;
                // set input placeholder
                densityInput.value = maxMuniDensity.toFixed(0);
            }




            // ...

            // affordable percentage slider
            affordablePercentageSlider.value = 40; // 0.40; // default = 40% affordable units
            affordablePercentageSlider.oninput = function() {
                // Recalculate unit sizes and revenues on slider change
                calculateWeightedAverageSizes();
                updateRentPerSqFtTable();
                
            }

            /* Event Listeners: */

            // on acreage [A ac.] input:
            acreageInput.addEventListener('input', function() {
                // Recalculate unit counts and revenues
                calculateMaximumUnits();
                updateRentPerSqFtTable();
                
            });
            // on density [D units/ac.] input:
            densityInput.addEventListener('input', function() {
                // Recalculate unit counts and revenues
                calculateMaximumUnits();
                updateRentPerSqFtTable();
                
            });
            // on affordable % slider [%aff] change:
            affordablePercentageSlider.addEventListener('input', function() {
                affordablePctDisplay.innerText = `${this.value}%`;
                // Recalculate unit counts and revenues
                calculateMaximumUnits();
                updateRentPerSqFtTable();
                
            });
            // on all SqFt/unit [s SqFt] inputs:
            sizeInputs.forEach(input => {
                input.addEventListener('input', () => {
                    // Recalculate unit counts, unit sizes, and revenues
                    calculateMaximumUnits(); // unnecessary?
                    calculateWeightedAverageSizes();
                    updateRentPerSqFtTable();
                    
                });
            });
            // on market-rate SqFt/unit [s SqFt(mkt)] inputs: (if checkbox = checked)
            marketInputs.forEach((input, index) => {
                input.addEventListener('input', () => {
                    if (matchAffordableSizesCheckbox.checked) {
                        affordableSizeInputs[index].value = input.value;
                        // Recalculate unit sizes
                        calculateWeightedAverageSizes();
                    }
                });
            });
            // on market-rate rent per unit [$ Rent(mkt)] inputs:
            marketRateInputs.forEach(input => {
                input.addEventListener('input', function() {
                    // Recalculate revenues
                    updateRentPerSqFtTable();
                    
                });
            });
            // on checkbox change:
            matchAffordableSizesCheckbox.addEventListener('change', function() {
                const affordableInputs = affordableSizeInputs;    
                //      Checked   = Lock affordable avg. size inputs; keep them matched to corresponding market-rate sizes.
                //      Unchecked = Unlock affordable avg. size inputs; allow affordable units to have different avg. sizes.
                if (this.checked) {
                    // checkbox = checked
                    affordableInputs.forEach((input, index) => {
                        input.value = marketInputs[index].value;
                        input.disabled = true;
                    });
                } else {
                    // checkbox = unchecked
                    affordableInputs.forEach(input => input.disabled = false);
                }
                // Recalculate unit counts, unit sizes, and revenues
                calculateMaximumUnits();
                calculateWeightedAverageSizes();
                updateRentPerSqFtTable();
                
            });
            // on cost inputs change:
            landCostPerUnit.addEventListener('input', updateTotalCosts);
            totalHCPerUnit.addEventListener('input', updateTotalCosts);

            // (more event listeners...)
            
            
            // run initial calculations using loaded & default values
            calculateMaximumUnits();
            calculateWeightedAverageSizes();
            updateRentPerSqFtTable();
            updateTotalCosts();
            
            /* USER INPUTS SECTION END. */

            
            /*
            // AI SECTION START            
            const runAIButton = document.getElementById("runAIButton");
            runAIButton.addEventListener('click', runAISection);
               ENDPOINT PARAMS:
                    ASK_AI: 
                        address, 
                        county, 
                        acreage, 
                        totalUnits, 
                        affordablePct,
                        affStudio,
                        aff1BD,
                        aff2BD,
                        aff3BD,
                        textModifier
            // AI SECTION END
            */
            
            // scroll to top x2
            googlemap.scrollIntoView();
            window.scrollTo(0, 0);
            
        } catch (error) {
            if (error.message.startsWith("Server responded with")) {
                console.error('Server error:', error);
                alert('There was an error with the server. Please try again later.');
            } else {
                console.error('Error:', error);
                // to-do: significantly improve error handling.
                alert('Whoops, something bad happened and I broke.\nEither try again or give up. The choice is yours!');
            }
        }
    });

    // Dynamically load the Google Maps API
    loadGoogleMapsAPI();

});


