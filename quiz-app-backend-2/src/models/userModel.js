// src/models/userModel.js
import pkg from 'pg';
const { Client } = pkg;
import { connect } from '../db.js';
connect();



//Added by Christian

const chrisDb = require("../db.js");

// to enable uuid because postgres id is just plain integer and not unique
const enableUuidExtension = async () => {
  const query = `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;
  try {
    await chrisDb.query(query);
    console.log("UUID extension enabled (if not already)");
  } catch (err) {
    console.error("Error enabling UUID extension:", err);
  }
};


//Creating User table 

const createUserTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS Users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'participant',
      verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
  //Check console for this to ensure that user table has been created succesfully
    await chrisDb.query(query);
    console.log('Users table created or already exists');
  } catch (err) {
    console.error('Error creating Users table:', err);
  }
};


//creating userVerificationOtp table that will hold the user otp, email, and expiry time before verification
const createVerifyUserOtpTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS VerifyUserOtp (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) NOT NULL,
      otp VARCHAR(6) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL
    );
  `;
  try {
    //Check the console to ensure the successful creation of this verifyOTP table
    await chrisDb.query(query);
    console.log('VerifyUserOtp table created or already exists');
  } catch (err) {
    console.error('Error creating VerifyUserOtp table:', err);
  }
};

//Creating resetPasswordOtp table
const createResetPasswordOtpTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS ResetPasswordOtp (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) NOT NULL,
      otp VARCHAR(6) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL
    );
  `;
  try {
    //check the console for the succesful creation of this table
    await chrisDb.query(query);
    console.log('ResetPasswordOtp table created or already exists');
  } catch (err) {
    console.error('Error creating ResetPasswordOtp table:', err);
  }
};


//let call the above functions to create those tables
createUserTable();
createVerifyUserOtpTable();
createResetPasswordOtpTable();















class User {
  static async createUser({ id, email, password, username, role }) {
    const client = new Client();
    await client.connect();
    const query = `
      INSERT INTO users (id, email, password, username, role, created_at)
      VALUES ($1, $2, $3, $4, $5, now())
      RETURNING *;
    `;
    const values = [id, email, password, username, role];
    const result = await client.query(query, values);
    await client.end();
    return result.rows[0];
  }

  static async getUserByEmail(email) {
    const client = new Client();
    await client.connect();
    const query = 'SELECT * FROM users WHERE email = $1;';
    const result = await client.query(query, [email]);
    await client.end();
    return result.rows[0];
  }
}

export default User;
