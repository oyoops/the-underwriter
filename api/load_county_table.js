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
    console.log(`Received coordinates: Latitude = ${lat}, Longitude = ${lng}`);

    // Check if lat and lng are valid numbers
    if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).send('Invalid latitude or longitude values provided.');
    }

    try {
        const countyQuery = `
            WITH CloseParcels AS (
                SELECT county_name, geom
                FROM public.parcels_master
                WHERE ST_DWithin(geom, ST_SetSRID(ST_Point($1, $2), 4326), $3)
            )
            SELECT county_name
            FROM CloseParcels
            ORDER BY ST_Distance(geom, ST_SetSRID(ST_Point($1, $2), 4326))
            LIMIT 1;
        `;
        
        console.log('County query starting...');
        const countyResult = await pool.query(countyQuery, [lng, lat, 0.01]);
        console.log('County query complete.');

        if (countyResult.rows.length === 0) {
            console.log('ERROR! No parcels found within ~0.25 mi. of input address.');
            return res.status(404).send('No parcel found for the geocoded coordinates in the Florida database.');
        }
        
        const countyName = countyResult.rows[0].county_name;
        console.log("COUNTY:",countyName);

        console.log('Starting COUNTY DATA query...');
        const dataQuery = `
            SELECT 
                fc.county_name, 
                fc.area_median_income, 
                ca.area_median_income AS county_amis_income,
                cm.millage AS county_millage,
                cr.max_rent_0bd_120ami,
                cr.max_rent_1bd_120ami,
                cr.max_rent_2bd_120ami,
                cr.max_rent_3bd_120ami
            FROM public.florida_counties AS fc
            LEFT JOIN county_amis AS ca ON fc.county_name = ca.county_name
            LEFT JOIN county_millages AS cm ON fc.county_name = cm.county_name
            LEFT JOIN county_max_rents AS cr ON fc.county_name = cr.county_name
            WHERE fc.county_name = $1;
        `;
        const dataResult = await pool.query(dataQuery, [countyName]);
        console.log('Data query complete.');
        console.log(`Data query returned ${dataResult.rowCount} rows.\nResponse: ${JSON.stringify(dataResult.rows[0])}`);
        
        // ...

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
        
        const parcelDataResult = await pool.query(parcelDataQuery, [lng, lat, countyName]);
        console.log('Parcel data query complete.');
        console.log(`Parcel data query returned ${parcelDataResult.rowCount} rows.\nResponse: ${JSON.stringify(parcelDataResult.rows[0])}`);
        

        // ...
        
        console.log('Sending response to client.');
        res.status(200).json(dataResult.rows[0]);
    } catch (err) {
        console.error(`Error encountered: ${err.message}`);
        res.status(500).send(`Error: ${err.message}`);
    }
};
