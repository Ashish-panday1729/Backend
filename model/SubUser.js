import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs"
import Jwt from "jsonwebtoken";

const keysecrete = "Saiashish1729jfiekdjgvnvmcmcmck";

const subUserSchema = new mongoose.Schema({
    fname: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        validator(value) {
            if (!validator.isEmail(value)) {
                throw new Error("Email is not valid")
            }
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    cpassword: {
        type: String,
        required: true,
        minlength: 6
    },
    mobile: {
        type: String,
        // required: true,
        trim: true
      },
      designation: {
        type: String,
        trim: true
      },
      userGroup: {
        type: String,
        trim: true
      },
      IPOfCreation: {
        type: String
      },
      DateOfCreation: {
        type: Date,
        default: Date.now()
      },
      IpAddress: {
        type: String
      },

    tokens: [
        {
            token: {
                type: String,
                required: true
            }
        }
    ]
});

// Hash password 
subUserSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 12)
        this.cpassword = await bcrypt.hash(this.cpassword, 12)
    }

    next()
});

//token generate
subUserSchema.methods.generateAuthtoken = async function () {
    try {
        let token23 = Jwt.sign({ _id: this._id }, keysecrete, {
            expiresIn: "1d"
        });

        this.tokens = this.tokens.concat({ token: token23 })
        await this.save()
        return token23
    } catch (error) {
        res.status(401).json(error)
    }
}

const subUserModel = new mongoose.model("SubAdmin", subUserSchema);

export default subUserModel;
