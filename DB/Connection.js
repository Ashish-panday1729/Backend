import mongoose from "mongoose";


const Connection = async () => {
    await mongoose.connect(process.env.MONGO_ATLAS_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
        .then((res) => {
            console.log("Database Connected")
            
    })
        .catch((err) => console.log(err));
};

export default Connection;
