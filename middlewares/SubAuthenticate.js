import Jwt from "jsonwebtoken";
import subUserModel from "../model/SubUser.js";
const keysecrete = "Saiashish1729jfiekdjgvnvmcmcmck"

const SubAuthenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization;

        const verifytoken = Jwt.verify(token, keysecrete)

        const rootUser = await subUserModel.findOne({ _id: verifytoken._id })

        if (!rootUser) { throw new Error("User not found") }

        req.token = token;
        req.rootUser = rootUser;
        req.userId = rootUser._id;
        next()

    } catch (error) {
        res.status(401).json({ status: (401), error: "Unauthorised no token provided!" });
    }
};


export default SubAuthenticate