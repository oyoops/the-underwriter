// gmap.js - Functions for the Google Map


/* MAP GLOBALS */
/*
// tallest building details (may break if tallestBuilding array >1)
let buildingLat;
let buildingLng;
let buildingHeight;
let buildingName; // may not work
let buildingAddress; // may not work
// DOM:
const mapDisplay = document.getElementById('map');
*/

/* FUNCTIONS */

// url callback (?)
function initMap() {
    // Maps API is now loaded and can be used.
}

// Load the Google Maps API dynamically
function loadGoogleMapsAPI() {
    const script = document.createElement('script');
    script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyDJlvljO-CVH5ax4paudEnj9RoERL6Xhbc&libraries=geometry&callback=initMap";
    document.body.appendChild(script);
}

// Initialize the Google Map
async function initializeMap(lat, lng) {
    console.log('Centering map on lat:', lat, ', lng:', lng);
    const mapOptions = {
        center: { lat: lat, lng: lng },
        zoom: 17,
        mapTypeId: google.maps.MapTypeId.SATELLITE
    };

    // Initialize map
    console.log("Generating map...");
    const map = new google.maps.Map(mapDisplay, mapOptions);
    console.log('Map generated.');

    // Add a marker at the user's input location
    console.log("Adding user marker");
    const userMarker = new google.maps.Marker({
        position: { lat: lat, lng: lng },
        map: map
    });

    const userInfowindow = new google.maps.InfoWindow({
        content: `<div style="text-align:center;"><strong>Subject</strong></div>`
        ////////content: `<div style="text-align:center;">${address}</div>`
    });

    userMarker.addListener('click', function() {
        userInfowindow.open(map, userMarker);
    });

    // Fetch and add markers for the three tallest buildings within a 1-mile radius
    const radius = 1.02; // 1 mi. + 2% tolerance
    const tallestBuildingsData = await fetchTallestBuilding(lat, lng, radius); // returns an array of bldg(s)

    if (tallestBuildingsData && tallestBuildingsData.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(new google.maps.LatLng(lat, lng));

        tallestBuildingsData.forEach((buildingData, index) => {
            buildingLat = parseFloat(buildingData.lat);
            buildingLng = parseFloat(buildingData.lng);
            buildingHeight = buildingData.height || "Uncertain";
            buildingName = buildingData.name || `#${index + 1} Tallest Bldg. < 1mi.`;
            buildingAddress = buildingData.address || "-";

            const buildingMarker = new google.maps.Marker({
                position: { lat: buildingLat, lng: buildingLng },
                map: map,
            });

            const buildingInfoContent = `
                <div style="text-align:center;">
                    <strong>${buildingName}</strong><br>
                    ${buildingHeight.toFixed(0)} feet tall<br>
                    ${buildingAddress}
                </div>
            `;

            const buildingInfowindow = new google.maps.InfoWindow({
                content: buildingInfoContent
            });

            buildingMarker.addListener('click', function () {
                buildingInfowindow.open(map, buildingMarker);
            });

            // Draw a line between the input address and this building
            const line = new google.maps.Polyline({
                path: [
                    { lat: lat, lng: lng },
                    { lat: buildingLat, lng: buildingLng }
                ],
                strokeColor: '#FF0000',
                strokeOpacity: 0.7,
                strokeWeight: 2,
                map: map
            });

            // Calculate and display the distance
            const distanceInMeters = google.maps.geometry.spherical.computeDistanceBetween(
                new google.maps.LatLng(lat, lng),
                new google.maps.LatLng(buildingLat, buildingLng)
            );
            const distanceInMiles = distanceInMeters * 0.000621371;

            // Draw a label showing distanc between input address and tallest building(s)
            const lineLabelPos = new google.maps.LatLng((lat + buildingLat) / 2, (lng + buildingLng) / 2);
            createStyledMarker(lineLabelPos, map, `${distanceInMiles.toFixed(2)} mi.`);

            // Extend the map bounds to include this building
            bounds.extend(new google.maps.LatLng(buildingLat, buildingLng));
        });

        // Adjust the map view to show all markers
        map.fitBounds(bounds);
        
        /* Done initializing map */

    } else {
        console.error("An error occurred during map initialization:", error);
    }

    // Show the Google Map
    document.getElementById('map').style.display = 'block';
    document.getElementById('map').scrollIntoView();
}

// Create a text marker (transparent placemark with a label)
function createStyledMarker(position, map, label) {
    const marker = new google.maps.Marker({
        position: position,
        map: map,
        icon: {
            labelOrigin: new google.maps.Point(11, 50),
            url: 'data:image/svg+xml;charset=utf-8,' +
                encodeURIComponent('<svg width="22" height="22" xmlns="http://www.w3.org/2000/svg"></svg>'),
            size: new google.maps.Size(22, 22),
        },
        label: {
            text: label,
            color: "yellow",
            fontWeight: "bold",
            fontSize: "20px"
        }
    });
    return marker;
}
