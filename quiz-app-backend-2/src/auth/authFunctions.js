const jwt = require("jsonwebtoken");

// A more generic role restriction middleware
const restrictTo = (allowedRolesArr) => (req, res, next) => {
  if (!allowedRolesArr.includes(req.user.role)) {
    res.status(401).json({ message: "Unauthorized" });
  }

  next();
};


//new added entry that I later use
const generateAuthToken = (user) => {
  if (!user || !user._id) {
    throw new Error("User object must contain an _id");
  }

  return jwt.sign(
    { _id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" } // Token expires in 1 hour
  );
};


const authenticateUser = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "Access Denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to req
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token." });
  }
};



module.exports = {
 // verifyJWTAuthToken,
  //createAuthenticationToken,
  restrictTo,
  generateAuthToken,
  authenticateUser
};