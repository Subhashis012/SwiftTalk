import mongoose from "mongoose";

// Connect to MongoDB
export const connectDB = async () => {
    try {

        mongoose.connection.on('connected', ()=> console.log('MongoDB connected successfully'));
        
        await mongoose.connect(`${process.env.MONGODB_URI}/chat-app`)
    } catch (error) {
        console.log(`Error connecting to MongoDB: ${error.message}`);
    }
}