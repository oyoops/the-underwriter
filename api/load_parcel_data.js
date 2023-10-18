const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const county_name = req.query.county_name;
    console.log(`Received coordinates: Latitude = ${lat}, Longitude = ${lng}, County = ${county_name}`);
    
    // Check if lat and lng are valid numbers
    if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).send('Invalid latitude or longitude values provided.');
    }

    try {
        console.log('Starting PARCEL DATA query...');
        const parcelDataQuery = `
            WITH input_point AS (
                SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326) AS geom
            )
            
            -- Find the closest parcel in Broward County and join with data_master
            SELECT dm.*
            FROM input_point AS ip, parcels_master AS pm
            INNER JOIN data_master AS dm ON pm.parcelno = dm.PARCEL_ID
            WHERE pm.county_name = dm.county_name AND pm.county_name = $3
            AND ST_DWithin(ip.geom, pm.geom, 0.01) -- Preliminary distance filter in degrees
            ORDER BY ST_Distance(ip.geom, pm.geom)
            LIMIT 1;
        `;
        
        const parcelDataResult = await pool.query(parcelDataQuery, [lng, lat, county_name]);
        console.log('Parcel data query complete.');
        console.log(`Parcel data query returned ${parcelDataResult.rowCount} rows.\nResponse: ${JSON.stringify(parcelDataResult.rows[0])}`);
        
        // ...
        
        console.log('Sending response to client.');
        res.status(200).json(parcelDataResult.rows[0]);
    } catch (err) {
        console.error(`Error encountered: ${err.message}`);
        res.status(500).send(`Error: ${err.message}`);
    }
};
