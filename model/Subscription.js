import mongoose from 'mongoose'

const subcriptionSchema = new mongoose.Schema({
    SubscriptionName: String,
    ForServiceCategory: String,
    ForServiceSubCategory: String,
    DurationInMonth: String,
    SubscriptionPrice: String,
    lastupdatedon: {
        type: Date,
        default: Date.now()
    },
})

const SubcriptionModel = new mongoose.model("Subscription_Management", subcriptionSchema);

export default SubcriptionModel