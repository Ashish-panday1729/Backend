import Jwt from "jsonwebtoken";
import User from "../model/Schema.js";
const keysecrete = "Saiashish1729jfiekdjgvnvmcmcmck"

const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization;

        const verifytoken = Jwt.verify(token, keysecrete)

        const rootUser = await User.findOne({ _id: verifytoken._id })

        if (!rootUser) { throw new Error("User not found") }

        req.token = token;
        req.rootUser = rootUser;
        req.userId = rootUser._id;
        next()

    } catch (error) {
        res.status(401).json({ status: (401), error: "Unauthorised no token provided!" });
    }
};


export default authenticate