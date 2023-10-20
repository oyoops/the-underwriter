const { Client } = require('pg');

module.exports = async (req, res) => {
    const county = req.query.county;
    const city = req.query.city;

    console.log('Received request for max_density with county:', county, 'and city:', city);

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
        const query = `
            SELECT max_density 
            FROM max_muni_densities 
            WHERE county_name_id=$1 AND city_name_id=$2;
        `;

        const result = await client.query(query, [county, city]);

        if (result.rows.length > 0) {
            console.log('Fetched max_density for', county, city, 'is:', result.rows[0].max_density);
            res.json({ max_density: result.rows[0].max_density });
        } else {
            console.log('No max_density found for', county, city);
            res.json({ error: "Not found" });
        }
    } catch (error) {
        console.error('Error querying the database:', error);
        res.status(500).send('Error querying the database.');
    } finally {
        await client.end();
    }
};
