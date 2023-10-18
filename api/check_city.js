
const { Client } = require('pg');


module.exports = async (req, res) => {
    const lat = req.query.lat;
    const lng = req.query.lng;
    console.log('Received request for check_city with lat:', lat, 'and lng:', lng);

    // Setup database connection
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: process.env.DB_PORT,
    });

    await client.connect();

    try {
        // Perform a spatial query to check if the provided lat/lng lies within any city
        const query = `
            SELECT name 
            FROM city_boundaries 
            WHERE ST_Contains(geom, ST_SetSRID(ST_Point($1, $2), 4326));
        `;

        const result = await client.query(query, [lng, lat]);

        if (result.rows.length > 0) {
            console.log('Address is within city:', result.rows[0].name,'and county:', result.rows[0].county);

            res.json({ isInCity: true, cityName: result.rows[0].name });
        } else {
            console.log('Address is not within any city.');
            res.json({ isInCity: false });
        }
    } catch (error) {
        console.error('Error querying the database:', error);
        res.status(500).send('Error querying the database.');
    } finally {
        await client.end();
    }
};
