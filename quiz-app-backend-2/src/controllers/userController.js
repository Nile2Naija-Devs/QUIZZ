//import bcrypt from 'bcryptjs';
//import jwt from 'jsonwebtoken';
import { client } from '../db.js'; // Correctly import the PostgreSQL client



//Added By Christian
const jwt = require("jsonwebtoken");
require("dotenv").config();
const nodemailer = require("nodemailer");
const { generateAuthToken } = require("../auth/authFunctions");
const express = require("express");

const app = express();

app.use(express.json());
const bcrypt = require("bcryptjs");
const chrisDb = require("../db.js")




//nodemailer configuration for sending OTP
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",//"sandbox.smtp.mailtrap.io",
  port: 587,//2525,
  auth: {
    user: process.env.USER_EMAIL,//"738325143302dd", // mail trap logins
    pass: process.env.APP_PASSWORD//"c40cd7025264c1"
  }
});

transporter.verify((error, success) =>{
  if (error){
      console.log(error);
  }else{
      console.log('Nodemailer is ready');
      console.log(success);
  }
});



//signup process ...............

export const signingUp = async (req, res, next) => {

  let {username, email, password} = req.body;
  
  //trimming white spaces
  username = username.trim();
  email = email.trim();
  
  //regex for validation
  const userNameRegex = /^[a-zA-Z\s]{2,50}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if(username == "" || email == ""){
    return res.json({
      message: "Empty input field is not accepted"
    })
  }
  
  if(!userNameRegex.test(username)){
    return res.json({
      message: "Invalid name, Must be 2-50 characters, letters and spaces only"
    })
  }
  
  if(!emailRegex.test(email)){
    return res.json({
      message: "Invalid Email address"
    })
  }
  
  
  //checking existing user
  // when I was still using mongoDB
  // const existingUser = await User1.findOne({
  //   $or: [{ username }, { email }],
  // });
  
  // if(existingUser){
  //   if(existingUser.username == username){
  //     return res.json({
  //       message: "Username Already exist"
  //     })
  //   }
  //   if(existingUser.email == email){
  //     return res.json({
  //       message: "Email Already exist"
  //     })
  //   }
  // }


  // Using postgres now to check for existing user
  const existingUserQuery = 'SELECT * FROM Users WHERE email = $1';
  const existingUserQueryUserName = 'SELECT * FROM Users WHERE username = $1';
  const existingUser = await chrisDb.query(existingUserQuery, [email]);//this will give us an array of emails
  const existingUserUserName = await chrisDb.query(existingUserQueryUserName, [username]);//this will give us an array of usernames
  if (existingUser.rows.length > 0) {
    //if the length is greater than zero, therefore, a user with he email already exist
    return res.status(400).json({ message: 'Email already in use' });
  }

  if (existingUserUserName.rows.length > 0) {
    //if the length is greater than zero, therefore, a user with the UserName already exist
    return res.status(400).json({ message: 'UserName already in use' });
  }


  //if the email and username are not in use, we then go ahead and create the user
    try {

      const insertUserQuery = 'INSERT INTO Users (username, email, password) VALUES ($1, $2, $3) RETURNING *';//creating columns for the user entities
      //executing the querry
      const newUser = await chrisDb.query(insertUserQuery, [username, email, password]);
  
        //The below two lines of code was used when i was using mongoDB
        //const newUser = new User1({ username, email, password });
        // await newUser.save();

        try {
          //recall newUser returns an object with a property rows, to access the username, we have to look for the row where it was inserted
          const addMe = newUser.rows[0].username;
          const addMeEmail = newUser.rows[0].email;
          console.log(addMe);
          const generatedVerifyOtp = Math.floor(1000 + Math.random() * 9000);
          console.log(`generatedVerifyOtp : ${generatedVerifyOtp}`);
          const expiresAt = Date.now() + 600000;//The OTP expires in ten minutes

          //creating verification OTP columns in our database
          const insertOtpQuerry = 'INSERT INTO VerifyUserOtp (email, otp, expires_at) VALUES ($1, $2, $3)';
          await chrisDb.query(insertOtpQuerry, [email, generatedVerifyOtp, expiresAt]);


          //the below commented code was used while i was using mongoDB
          //  const newVerifyOtp = new UserVerificationOtp({
          //    email: newUser.email, 
          //    otp: generatedVerifyOtp, 
          //    createdAt: Date.now(),
          //    expiresAt:Date.now() + 600000,
          //  });
       
          //  await newVerifyOtp.save();
          //  console.log(newVerifyOtp);
    
    
        
        
        //setting mail option for Verification OTP
        const mailOptions = {
          from: {
            name: 'Group 3 Lab One Project',
            address:  process.env.USER_EMAIL    //'group3labproject@gmail.com'
          },
          to: addMeEmail,//the valid email the user passed in while signing up
          subject: "Verify your Email address",
          html:  `<p>Dear <b>${addMe},</b></p>
                <p>Welcome to <b>The Group 3 Lab One Project!</b></p>
                <p>To proceed, kindly verify your email address with the code : <b>${generatedVerifyOtp}</b></p>
                <p>Note, this code expires in <b>10 mnutes </b></p>
                <p><b>Group 3 Lab One Project Team</b></p>`,
        };
    
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
            return res.status(500).json({
              message: "Internal server error",
            });
          } else {
            console.log("Email sent: " + info.response);
            return res.status(200).json({
              message: "Verify Email OTP sent successfully",
            });
          }
        });
        } catch (error) {
          return res.status(400).json({
            message: error.message?error.message:"Error occur while sending verification Email OTP"
          })
        }

  } 

    catch (error) {
        return res.status(400).json({
          message: error.message?error.message:"Error occured while signing up"
        })
      }
  };




//Verifying the email process .....
export const verifyEmail = async (req, res, next) => {
  try {
    /* 
    This is the thought process here, I will first request to verify my email. Then I will go ahead and querry
    the database using the email only. If the record is found, then there should exist an otp attached to that
    email address. I will first ascertain if the OTP has expired before going forward. If it has expired, I will
    just delete the record from the database. If it has not expired, I will check if the input OTP from the
    user matches the one we stored in the database. If it matches, I will go ahead and update the user table 
    by setting verified to be true, anddeleting the record as well immediately. If there is no match, I will
    throw an error message
    */
    const {email, otp} = req.body;

    const verifyOtpQuery = 'SELECT * FROM VerifyUserOtp WHERE email = $1'; //querrying the database
    const otpRecord = await chrisDb.query(verifyOtpQuery, [email]);

    //checking if such email exist in the first place
    if (otpRecord.rows.length === 0){
      return res
      .status(400)
      .json({
         message: 'No such record exist' 
        });
    }

    const storedOtpDb = otpRecord.rows[0].otp; //The Otp record from the database
    const otpExpiry = otpRecord.rows[0].expires_at; //The expiration record from the database

    //checking for otp expiration
    if(otpExpiry < Date.now()){
      //Otp has expired, we then go ahead and delete it from the database
      const deleteExpiredOtpQuery = 'DELETE FROM VerifyUserOtp WHERE email = $1';
      await chrisDb.query(deleteExpiredOtpQuery, [email]);
      
      return res
      .status(400)
      .json({
         message: 'OTP has expired, request for a new one by signing up again' 
        });
    }

    //if the OTP has not expired, we then go ahead and compare it with the one user is passing
    if(otp != storedOtpDb){
      return res
      .status(400)
      .json({
         message: 'Invalid OTP, Please check well' 
        });
    }

    //if it matches, i will then update the user table
    const updateUserQuery = 'UPDATE Users SET verified = true WHERE email = $1 RETURNING *';
    const updatedUser = await chrisDb.query(updateUserQuery, [email]);

    //then delete the user
    const deleteOtpQuery = 'DELETE FROM VerifyUserOtp WHERE email = $1';
    await chrisDb.query(deleteOtpQuery, [email]);

    const user = updatedUser.rows[0];

    const authToken = generateAuthToken(user);
    return res
    .status(400)
    .json({
       message: 'Email Verification Successful',
       authToken 
      });

    // The below commented code is when i was using mongoDB
    // const userVerifyOtp = await UserVerificationOtp.findOne({ email });
    // const {expiresAt} = userVerifyOtp.expiresAt;
    // if (!userVerifyOtp) {
    //   return res.status(404).json({
    //     message: "Such user record is not found",
    //   });
    // }

    // // Check if the otp and email matches,
    // if (userVerifyOtp.otp == otp && userVerifyOtp.email == email) {

    //   //check if the otp has expired
    //   if(expiresAt < Date.now()){
    //     //delete the otp and the user record if expired
    //     UserVerificationOtp.findOneAndDelete({email});
    //     User1.findOneAndDelete({email});
    //     return res.json({
    //       message: 'Email Verification OTP has expired, request a fresh one'
    //     })
    //   } else{
    //     //link is still active, update the pasword
    //     const user = await User1.findOne({ email });
    //     //update the verification status
    //     user.verified = true;
    //     const newChasis = await user.save();
    //     const token = generateAuthToken(newChasis)
  
    //     // Delete the otp record so the same otp can't be used twice
    //     const deletedRecord = await UserVerificationOtp.findOneAndDelete({ email });
  
    //     return res.status(200).json({
    //       token,
    //       user: {
    //         _id: newChasis._id,
    //         username: newChasis.username,
    //         email: newChasis.email,
    //       },
    //       message: "Email verified succesfully",
    //     });
    //   }

    // }
    // return res.status(400).json({
    //   message: "Invalid Email Verification Otp",
    // });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error while verifying email address",
    });
  }
};



//Sign in process .......
export const signIn = async (req, res, next) => {
  const { username, password } = req.body;

  //checking empty input field
  if (username === "" || password === "") {
    return res.status(400).json({
        message: 'Email or Password cannot be empty',
    });
  }

  try {
    //checking for the user in the database to ensure it exists
    const findUserQuery = 'SELECT * FROM Users WHERE username = $1 RETURNING *';
    const user = await chrisDb.query(findUserQuery, [username]);

    if (user.rows.length === 0) {
      return res
      .status(400)
      .json({ 
        message: 'Invalid username or Password'
       });
    }

    //if user is found, check if the user is verified
    const verified = user.rows[0].verified;
    if(!verified){
      return res
      .status(400)
      .json({ 
        message: 'Email has not been verifird, please do so'
       });
    }

    //if the user is verified, then check for the password match
    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    if(!isMatch){
      //if it does not match, i will throw an error
      return res
      .status(400)
      .json({ 
        message: 'Invalid username or Password'
       });
    }

    //if it matches
    user.rows[0].password = undefined;
    //checking
    console.log(user);
    
    const authToken = generateAuthToken(user);

    return res
    .status(400)
    .json({
       message: 'Email Verification Successful',
       authToken 
      });



  // The below commented code was used when i was using mongoDB
  //   const user = await User1.findOne({ username }).select("+password");
  //   //checking
  //   console.log(`user before error : ${user}`);

  //   if (!user) {
  //     return res.status(401).json({ message: "Invalid Username or Password" });
  //   }

  //   //checking if a user is verified 
  //   if (!user.verified) {//checking if the user is verified
  //     return res.status(400).json({
  //         message: 'Email has not been verified, please do so',
  //     });
  //   }

  //  //checking the match of the passwords
  //   const isMatch = await bcrypt.compare(password, user.password);
  //   if (!isMatch) {
  //     return res.status(401).json({ message: "Invalid Username or Password" });
  //   }
  //   user.password = undefined;
  //   console.log(user);
  //   req.user = user;
  //   //createAuthenticationToken(req.user, res, 200);
  //   const token = generateAuthToken(user);
  //   return res.json({
  //     token,
  //     message: "signed in successfully"
  //   });
    
  } catch (error) {

    return res.status(400).json({
      message: error.message ? error.message : " Error occured while signing in a user"
    })
    
  }

};



/* 
forgot password thought process: When a user forgot his or her password, he/she request by passing his/her
email. We first check if the user with that particular email exist in the first place.If it does not, we throw 
an error message. if it exist, we send an otp to the email, then save this record in the databse. This record
will be used for comparison during reset password ish.
this otp will be passed when reseting the password
*/

//forgot password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    //checking for the user in the database using the email to ensure it exists
    const findUserQuery = 'SELECT * FROM Users WHERE email = $1';
    const user = await chrisDb.query(findUserQuery, [email]);


    if (user.rows.length === 0) {
      return res
      .status(400)
      .json({ 
        message: 'User not found'
       });
    }


    //the below code was used while the db is mongoDB
    // const user = await User1.findOne({ email });
    // if (!user) {
    //   return res.status(404).json({
    //     message: "User not found",
    //   });
    // }



    //if the user exist, we generate otp
    // Generate Otp
    const generatedOtp = Math.floor(1000 + Math.random() * 9000);
    console.log(generatedOtp); //for checking

    //creating verification OTP columns in our database
    const expiresAt = Date.now() + 1800000;//The OTP expires in ten minutes
    const insertOtpQuerry = 'INSERT INTO ResetPasswordOtp (email, otp, expires_at) VALUES ($1, $2, $3)';
    await chrisDb.query(insertOtpQuerry, [email, generatedOtp, expiresAt]);


    //the below code was used during mongoDB
    // const newOtp = new Otp({
    //   email: user.email, 
    //   otp: generatedOtp, 
    //   createdAt: Date.now(),
    //   expiresAt:Date.now() + 1800000,
    // });
    //  await newOtp.save();
    //console.log("i have saved to the database ooo");



    //setting mail option for forgot password OTP
    const addMeEmail = user.rows[0].email;
    const mailOptions = {
      from: {
        name: 'Group 3 Lab Project',
        address:  process.env.USER_EMAIL    //'group3labproject@gmail.com'
      },
      to: addMeEmail,
      subject: "Reset Password Otp",
      html:  `<p>OOPS! So Sorry you lost your password. </p>
            <p>Use the OTP : <b> ${generatedOtp}</b> to reset it</p>
            <p>Recall, this link expires in <b> 30 minutes.</b></p>`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
        return res.status(500).json({
          message: "Internal server error",
        });
      } else {
        console.log("Email sent: " + info.response);
        return res.status(200).json({
          message: "Otp sent successfully",
        });
      }
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


//reset password process.......
/* 
The thought process: The user will pass in his/her email, the otp passed during the forget password,
then the new password. We will use the email to check if the user record is on the request password table. 
if it does not, we throw an error. If it does, we check if the otp has expired, if it have, we delete the
record. if it has not expired, we check their match, if they match, we update the password to the new password
. we will hash it before tho.
*/
export const resetPassword = async (req, res, next) => {
  try {
    // Get otp, email and password
    const { otp, email, password } = req.body;

    const verifyOtpQuery = 'SELECT * FROM ResetPasswordOtp WHERE email = $1'; //querrying the database
    const otpRecord = await chrisDb.query(verifyOtpQuery, [email]);

    //checking if such email exist in the first place
    if (otpRecord.rows.length === 0){
      return res
      .status(400)
      .json({
         message: 'No such record exist in the forgot password table' 
        });
    }

    //if it exists, we check for the expiration
    const storedOtpDb = otpRecord.rows[0].otp; //The Otp record from the database
    const otpExpiry = otpRecord.rows[0].expires_at; //The expiration record from the database

    //checking for otp expiration
    if(otpExpiry < Date.now()){
      //Otp has expired, we then go ahead and delete it from the database
      const deleteExpiredOtpQuery = 'DELETE FROM ResetPasswordOtp WHERE email = $1';
      await chrisDb.query(deleteExpiredOtpQuery, [email]);
      
      return res
      .status(400)
      .json({
         message: 'OTP has expired, request for a new one by signing up again' 
        });
    }

    //if the OTP has not expired, we then go ahead and compare it with the one user is passing
    if(otp != storedOtpDb){
      return res
      .status(400)
      .json({
         message: 'Invalid OTP, Please check well' 
        });
    }

    const updatePasswordQuery = 'UPDATE Users SET password = $1 WHERE email = $2 RETURNING *';
    await client.query(updatePasswordQuery, [password, email]);
  
    // Delete OTP after successful password reset
    const deleteOtpQuery = 'DELETE FROM ResetPasswordOtp WHERE email = $1 AND otp = $2';
    await client.query(deleteOtpQuery, [email, otp]);
  
    return res
    .status(200)
    .json({ 
      message: 'Password reset successful' 
    });
 




    // The below commented line is when i was still using MongoDB

    // const userOtp = await Otp.findOne({ email });
    // console.log("i have found the email");
   
    // if (!userOtp) {
    //   return res.status(404).json({
    //     message: "User not found",
    //   });
    // }
    // const {expiresAt} = userOtp.expiresAt;

    // // Check if the otp and email matches, then update password
    // if (userOtp.otp == otp && userOtp.email == email) {

    //   //check if the otp has expired
    //   if(expiresAt < Date.now()){
    //     //delete the ot record if expired
    //     Otp.findOneAndDelete({email});
    //     return res.json({
    //       message: 'OTP has expired, request a fresh one'
    //     })
    //   } else{
    //     //link is still active, update the pasword
    //     const user = await User1.findOne({ email });
    //     user.password = password;
    //     await user.save();
  
    //     // Delete the otp record so the same otp can't be used twice
    //     const deletedRecord = await Otp.findOneAndDelete({ email });
  
    //     return res.status(200).json({
    //       message: "Password updated successfully",
    //     });
    //   }


    // }

    // return res.status(400).json({
    //   message: "Invalid Otp",
    // });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error while resetting password",
    });
  }
};



//function to check if it is the same user
export const sameUser = (req, res, next) => {
  const { id } = req.params;

  // Ensure req.user exists or contains an 'id' (PostgreSQL UUID)
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "Unauthorized access" });
  }

  // Compare UUIDs as strings (PostgreSQL stores UUID as text)
  if (req.user.id !== id) {
    return res
    .status(403)
    .json({ 
      message: "You don't have control over this" });
  }

  next();
};



//Getting all users process ......
export const getAllUsers = async (req, res) => {
  try {
    const query = "SELECT * FROM Users"; 
    const result = await chrisDb.query(query); 
    return res
    .status(200)
    .json(result.rows);
  } catch (err) {
    console.error("Error occured while fetching users:", err);
    return res
    .status(500)
    .json({ 
      message: "Internal Server Error while fetching users" 
    });
  }
};


//getting a single user using id process.....
export const getOneUserById = async (req, res) => {
  const { id } = req.params; 

  try {
    const query = "SELECT * FROM Users WHERE id = $1::uuid"; 
    const result = await chrisDb.query(query, [id]); 

    if (result.rows.length === 0) {
      return res
      .status(404)
      .json({ 
        message: "User not found" 
      });
    }

    return res
    .status(200)
    .json(result.rows[0]); 

  } catch (err) {
    console.error("Error occured while fetching user during getting one user:", err);
    res
    .status(500)
    .json({ 
      message: "Internal Server Error occured while  getting one user through ID"
     });
  }
};


//updating user by id process
export const updateUserById = async (req, res) => {
  const { id } = req.params;
  const { username, email, role } = req.body; 

  try {
    // Check if the user exists
    const checkUserQuery = "SELECT * FROM Users WHERE id = $1::uuid";
    const userResult = await chrisDb.query(checkUserQuery, [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    //update querry
    const updateQuery = `
      UPDATE Users 
      SET 
        username = COALESCE($1, username), 
        email = COALESCE($2, email), 
        role = COALESCE($3, role),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4::uuid
      RETURNING *;
    `;

    const result = await chrisDb.query(updateQuery, [username, email, role, id]);

    return res
    .status(200)
    .json({
      message: "User updated successfully",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("Error occur while updating user:", err);
    res
    .status(500)
    .json({ 
      message: "Internal Server Error while updating user" 
    });
  }
};



//Deleting a user  process
export const deleteUserById = async (req, res) => {
  const { id } = req.params; 

  try {
    // Check if the user exists in the database
    const checkUserQuery = "SELECT * FROM Users WHERE id = $1::uuid";
    const userResult = await chrisDb.query(checkUserQuery, [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete user query
    const deleteQuery = "DELETE FROM Users WHERE id = $1::uuid RETURNING *";
    const result = await chrisDb.query(deleteQuery, [id]);

    return res
    .status(200)
    .json({
      message: "User deleted successfully",
      deletedUser: result.rows[0],
    });
  } catch (err) {
    console.
    error("Error occcured while deleting user:", err);
    return res
    .status(500)
    .json({ 
      message: "Internal Server Error while deleting user"
     });
  }
};


















// Get all users
// export const getAllUsers = async (req, res) => {
//   try {
//     const result = await client.query('SELECT * FROM users');
//     res.json(result.rows);
//   } catch (error) {
//     res.status(500).json({ error: 'Error fetching users' });
//   }
// };

// Create a new user
// export const createUser = async (req, res) => {
//   const { username, email, password } = req.body;

//   try {
//     const hashedPassword = await bcrypt.hash(password, 10);

//     const result = await client.query(
//       'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
//       [username, email, hashedPassword]
//     );

//     res.status(201).json({
//       message: 'User created successfully!',
//       user: result.rows[0],
//     });
//   } catch (error) {
//     res.status(500).json({ error: 'Error creating user' });
//   }
// };

// // Get a user by ID
// export const getUserById = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const result = await client.query('SELECT id, username, email FROM users WHERE id = $1', [id]);

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     res.json(result.rows[0]);
//   } catch (error) {
//     res.status(500).json({ error: 'Error fetching user' });
//   }
// };

// // Update a user by ID
// export const updateUser = async (req, res) => {
//   const { id } = req.params;
//   const { username, email, password } = req.body;

//   try {
//     let hashedPassword = password ? await bcrypt.hash(password, 10) : null;

//     const query = `
//       UPDATE users
//       SET 
//         username = COALESCE($1, username), 
//         email = COALESCE($2, email), 
//         password = COALESCE($3, password)
//       WHERE id = $4
//       RETURNING id, username, email
//     `;

//     const values = [username, email, hashedPassword, id];

//     const result = await client.query(query, values);

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     res.json({ message: 'User updated successfully', user: result.rows[0] });
//   } catch (error) {
//     res.status(500).json({ error: 'Error updating user' });
//   }
// };

// // Delete a user by ID
// export const deleteUser = async (req, res) => {
//   const { id } = req.params;

//   try {
//     const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     res.json({ message: 'User deleted successfully' });
//   } catch (error) {
//     res.status(500).json({ error: 'Error deleting user' });
//   }
// };
