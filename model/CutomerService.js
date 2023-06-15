import mongoose from "mongoose"

const customerSchema = new mongoose.Schema({
    customerGroup: {
        type: String,
        required: true
    },
    customerList: {
        type: String,
        required: true
    }
});

const cutomerModel = new mongoose.model("Customer", customerSchema);

export default cutomerModel