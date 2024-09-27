const pgp = require("pg-promise")(/* options */);
require('dotenv').config()
const cn = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: process.env.DB_MAX, // use up to 30 connections
  // "types" - in case you want to set custom type parsers on the pool level
};

// Creating a new database instance from the connection details:
const db = pgp(cn);

// Exporting the database object for shared use:
module.exports = db;
