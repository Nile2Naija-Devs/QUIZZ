const express = require("express");
const { authenticateUser } = require("../auth/authFunctions");
const { getAllUsers, signingUp, signIn, forgotPassword, resetPassword, sameUser, updateUserById, deleteUserById, getOneUserById, verifyEmail } = require("../controllers/userController");
const hashPassword = require("../auth/hashPassword");


const userRouter = express.Router();


userRouter.route("/").get(authenticateUser, getAllUsers );
userRouter.route("/signup").post(hashPassword, signingUp);
userRouter.route("/signin").post(signIn);
userRouter.route("/forgot-password").post(forgotPassword);
userRouter.route("/reset-password").post(hashPassword, resetPassword);
userRouter.route("/:id")
.patch(authenticateUser,sameUser,updateUserById) 
.delete(authenticateUser, sameUser, deleteUserById)
.get(authenticateUser, getOneUserById);
userRouter.route("/verify-email").post(verifyEmail);


module.exports = {
  userRouter
}




