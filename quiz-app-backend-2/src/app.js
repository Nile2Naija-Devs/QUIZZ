import express from 'express';
const userRouter = require("./routes/users")
const app = express();

// Set up middleware, routes, etc.
app.use(express.json());  // For parsing JSON bodies
app.use('/users', userRouter);  // Set up users route

export default app;
