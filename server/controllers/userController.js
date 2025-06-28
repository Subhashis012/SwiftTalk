import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

// Signup a new user
export const signup = async (req, res) => {
  const { fullName, email, password, bio } = req.body;

  try {
    if (!fullName || !email || !password || !bio) {
      return res.json({ success: false, message: "All fields are required" });
    }
    const user = await User.findOne({ email });
    if (user) {
      return res.json({ success: false, message: "Account already exists" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      bio,
    });

    const token = generateToken(newUser._id);

    return res.json({
      success: true,
      userData: newUser,
      token,
      message: "Account created successfully",
    });
  } catch (error) {
    console.error("Error during signup:", error.message);
    return res.json({ success: false, message: "Internal server error" });
  }
};

// Login an existing user
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const userData = await User.findOne({email});

        const isPasswordCorrect = await bcrypt.compare(password, userData.password);

        if (!userData || !isPasswordCorrect) {
            return res.json({success: false, message: "Invalid email or password"});
        }

        const token = generateToken(userData._id);
        return res.json({
            success: true,
            userData,
            token,
            message: "Login successful"
        });
    } catch (error) {
        console.error("Error during login:", error.message);
        return res.json({ success: false, message: "Invalid email or password" });
    }
    
    
}

// Controller to check if user is authenticated
export const checkAuth = (req, res) => {
    res.json({
        success: true,
        user: req.user,
        message: "User is authenticated"
    });
}

// Controller to update user profile
export const updateProfile = async (req, res) => {
    try {
        const { profilePic, bio, fullName} = req.body;
        
        const userId = req.user._id;
        let updatedUser;

        if(!profilePic) {
           updatedUser = await User.findByIdAndUpdate(userId, {bio, fullName}, {new: true});
        } else {
            const upload = await cloudinary.uploader.upload(profilePic);

            updatedUser = await User.findByIdAndUpdate(userId, {profilePic: upload.secure_url, bio, fullName}, {new:true});
        }

        res.json({
            success: true,
            userData: updatedUser,
            message: "Profile updated successfully"
        });
    } catch (error) {
        console.error("Error updating profile:", error.message);
        res.json({ success: false, message: error.message });
    }
}