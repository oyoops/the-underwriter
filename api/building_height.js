const axios = require('axios');

const NUM_TALLEST_BLDGS = 1;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusMiles = parseFloat(req.query.radius ?? 1);
    const radiusMeters = radiusMiles * 1609.34;

    if (isNaN(lat) || isNaN(lng) || isNaN(radiusMiles)) {
        return res.status(400).send('Invalid latitude, longitude, or radius value(s).');
    }

    try {
        // Query Overpass API for building heights
        const overpassQuery = `
            [out:json];
            (
                way["building"](around:${radiusMeters},${lat},${lng});
            );
            out body;
        `;

        const overpassResult = await axios.get('https://overpass-api.de/api/interpreter', {
            params: { data: overpassQuery }
        });

        const buildings = overpassResult.data.elements;

        if (buildings.length === 0) {
            return res.status(404).send('No buildings found within the specified radius.');
        }

        // Collect all buildings with height information
        const buildingsWithHeight = buildings.map(building => {
            if (building.tags && building.tags.height) {
                const height = parseFloat(building.tags.height);
                return {
                    id: building.id,
                    height: height,
                    name: building.tags.name || '',
                    address: {
                        street: building.tags['addr:street'] || '',
                        housenumber: building.tags['addr:housenumber'] || '',
                        postcode: building.tags['addr:postcode'] || '',
                        city: building.tags['addr:city'] || ''
                    }
                };
            }
            return null;
        }).filter(b => b !== null);

        // Sort buildings by height in descending order and take the top 3
        const topThreeTallestBuildings = buildingsWithHeight.sort((a, b) => b.height - a.height).slice(0, NUM_TALLEST_BLDGS);

        if (topThreeTallestBuildings.length === 0) {
            console.log("No buildings found with a height value.");
            return res.status(404).send('No buildings found with a height value.');
        }

        // Fetch coordinates for each of the top 3 tallest buildings
        const results = [];
        for (const building of topThreeTallestBuildings) {
            // Fetch geometry (coordinates) using OpenStreetMap API
            const geometryUrl = `https://api.openstreetmap.org/api/0.6/way/${building.id}.json`;
            const geometryResponse = await axios.get(geometryUrl);
            const nodes = geometryResponse.data.elements[0].nodes;

            // Fetch node details
            const nodeUrl = `https://api.openstreetmap.org/api/0.6/nodes?nodes=${nodes.join(',')}`;
            const nodeResponse = await axios.get(nodeUrl);

            let sumLat = 0, sumLon = 0;
            nodeResponse.data.elements.forEach(node => {
                sumLat += parseFloat(node.lat);
                sumLon += parseFloat(node.lon);
            });

            const avgLat = sumLat / nodeResponse.data.elements.length;
            const avgLon = sumLon / nodeResponse.data.elements.length;

            const addressString = `${building.address.housenumber} ${building.address.street}, ${building.address.city}`;

            results.push({
                lat: avgLat,
                lng: avgLon,
                height: building.height * 3.28084, // Convert to feet
                name: building.name,
                address: addressString
            });
        }

        res.status(200).json(results);

    } catch (err) {
        console.error(`Error encountered: ${err.message}`);
        res.status(500).send(`Error: ${err.message}`);
    }
};