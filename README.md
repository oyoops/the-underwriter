# SB102Bot :house_with_garden: :construction_worker:

`This whole description was written by ChatGPT`

**Florida Multifamily Development Calculator**

## Overview
SB102Bot is a Flask web application designed to assist developers and property owners in Florida in evaluating the maximum allowable development intensity for multifamily constructions. The application uses a variety of data sources including county and parcel databases to provide a comprehensive report. The report includes unit counts, affordable housing options, tax abatements, and more.

## Technology Stack
- Backend: Python, Flask
- Frontend: HTML, CSS, JavaScript
- Database: PostgreSQL
- Deployment: Vercel
- APIs: Google Maps API
- Libraries: NumPy, Pandas, Geopy, SQLAlchemy

## Project Structure
- `/api`: Contains JavaScript files for serverless functions that handle API endpoints.
- `/public`: Holds the frontend HTML, CSS, and JavaScript files.
  - `index.html`: Main HTML file that serves as the entry point of the application.
  - `main.js`: Contains the core JavaScript logic to handle form submissions and API interactions.
  - `styles.css`: Stylesheet for the frontend.
  - `acreageCalculation.js`: Contains JavaScript functions related to acreage calculations.
- `server.py`: Main Flask file that initializes the server and routes.
- `database.py`: Handles database connections and queries.
- `utils.py`: Utility functions for data processing and calculations.
- `package.json`: Lists package dependencies for the Node.js environment.
- `requirements.txt`: Lists package dependencies for the Python environment.
- `vercel.json`: Configuration file for Vercel deployment.

## Features
- Accepts an address as input and performs geocoding.
- Queries a PostgreSQL database to retrieve parcel and county data.
- Calculates the maximum number of units that can be developed, including both market-rate and affordable housing.
- Provides real-time updates based on user input for parameters like acreage, unit sizes, and affordable housing percentages.
- Displays the results in a detailed HTML report that includes tables and Google Maps integration.
- Provides tax abatement information based on the percentage of affordable units.

## Setup
1. Clone the repository.
2. Install Python dependencies: `pip install -r requirements.txt`.
3. Install Node.js dependencies: `npm install`.
4. Set up your PostgreSQL database and update the database configuration in `database.py`.
5. Deploy the application with Vercel or run it locally using `flask run`.

## Usage
1. Open the application in a web browser.
2. Enter an address in the search bar and click "What can I do?".
3. Review the generated report for maximum allowable development intensity.

