import express from "express"
import Jwt from "jsonwebtoken"

// import PDFDocument, { info } from 'pdfkit'
import PDFDocument from 'pdfkit';
const { info } = PDFDocument;
import XLSX from "xlsx"
import nodemailer from "nodemailer"
import User from "../model/Schema.js";
import bcrypt from "bcryptjs"
import authenticate from "../middlewares/authenticate.js";
import SubAuthenticate from "../middlewares/SubAuthenticate.js"
// import dotenv from 'dotenv'
import Company from "../model/C_Schema.js";
import subUserModel from "../model/SubUser.js";
import SubcriptionModel from "../model/Subscription.js";

const keysecrete = "Saiashish1729jfiekdjgvnvmcmcmck"

const router = new express.Router();


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.Email_PASSWORD

    }
    
});


// ------------------------------------------------------------------------------>
// <============================(Admin Section)======================>
// ------------------------------------------------------------------------------>
router.post("/adminRegister", async (req, res) => {
    const { fname, email, password, cpassword, mobile, designation, userGroup } = req.body;

    if (!fname || !email || !password || !cpassword || !mobile || !designation || !userGroup) {
        res.status(422).json({ error: 'Fill all the details.' });
        return;
    }

    try {
        const preuser = await User.findOne({ email: email });
        if (preuser) {
            res.status(422).json({ Error: "User already exists." })
        } else if (password !== cpassword) {
            res.status(422).json({ Error: "Password and cpassword didn't match." })
        } else {
            const finaluser = new User({
                fname, email, password, cpassword, mobile, designation, userGroup
            })
            // here password hasing done

            const storedata = await finaluser.save(err => {
                if (err) {
                    res.status(400).json(err)
                } else {
                    res.status(201).json({ message: "Registered Successfully.", finaluser })
                }
            })
        }


    } catch (error) {
        res.status(422).json({ error: "Catch error." })
    }
});

//Login
router.post("/adminLogin", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(422).json({ error: "Fill all the details." })
    }

    try {
        const userValid = await User.findOne({ email: email })

        if (userValid) {
            const isMatch = await bcrypt.compare(password, userValid.password);
            if (!isMatch) {
                res.status(422).json({ error: "Invailid user!!" })
            } else {
                // token generate
                const token = await userValid.generateAuthtoken();

                //cookie generate
                res.cookie("usercookie", token, {
                    expires: new Date(Date.now() + 9000000),
                    httpOnly: true
                });

                const result = {
                    userValid,
                    token
                };

                res.status(201).json({ message: "Login Successfully", status: 201, result })
            }
        }

    } catch (error) {
        res.status(422).json({ error: "Catch error." })
    }
});

// valid user
router.get("/valid", authenticate, async (req, res) => {

    try {
        const validUser = await User.findOne({ _id: req.userId });
        res.status(201).json({ status: 201, validUser })

    } catch (error) {
        res.status(401).json({ status: 401, error })
    }
});

// Admin logout
router.get('/logout', authenticate, async (req, res) => {
    try {
        req.rootUser.tokens = req.rootUser.tokens.filter((curelm) => {
            return curelm.token !== req.token;
        });

        res.clearCookie('userCookie', { path: '/' });

        await req.rootUser.save();

        res.status(201).json(req.rootUser.tokens);
    } catch (error) {
        res.status(401).json({ status: 401, error });
    }
});

// Admin Forget password
router.post("/sendPasswordLink", async (req, res) => {
    const { email } = req.body;
    if (!email) {
        res.status(401).json({ status: 401, message: "Enter your email" })
    }

    try {
        const userFind = await User.findOne({ email: email });

        //token generate for reset password
        const token = Jwt.sign({ _id: userFind._id }, keysecrete, {
            expiresIn: "120s"
        })

        const setUserToken = await User.findByIdAndUpdate({ _id: userFind._id }, { verifytoken: token }, { new: true });

        if (setUserToken) {
            const mailOptions = {
                from: "",
                to: email,
                subject: "Sending Email For Password Reset",
                text: `This Link is valid for 2 Minute http://localhost:3000/forgotpassword/${userFind.id}/${setUserToken.verifytoken}`
            }
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log("Error :", error)
                    res.status(401).json({ status: 401, message: "Email not sent" })
                    console.log(process.env.NODEMAILER_EMAIL);

                } else {
                    console.log("Email sent", info.response);
                    res.status(201).json({ status: 201, message: "Email sent successfully." })
                    console.log(process.env.NODEMAILER_EMAIL);

                }
            })
        }

    } catch (error) {
        res.status(422).json(error)
    }
});

// Verify User for forget password time
router.get("/forgotpassword/:id/:token", async (req, res) => {
    const { id, token } = req.params;

    try {
        const validUser = await User.findOne({ _id: id, verifytoken: token });
        const verifyToken = Jwt.verify(token, keysecrete);

        if (validUser && verifyToken) {
            res.status(201).json({ status: 201, validUser });
        } else {
            res.status(401).json({ status: 401, message: "User not exist" })
        }
    } catch (error) {
        res.status(422).send({ status: 422, error })
    }
});

// Change Password 
router.post("/:id/:token", async (req, res) => {
    const { id, token } = req.params;
    const { password } = req.body;

    try {
        const validUser = await User.findOne({ _id: id, verifytoken: token });
        const verifyToken = Jwt.verify(token, keysecrete);

        if (validUser && verifyToken) {
            const newPassword = await bcrypt.hash(password, 12);
            const setNewPassword = await User.findByIdAndUpdate({ _id: id }, { password: newPassword });
            setNewPassword.save();
            res.status(201).json({ status: 201, setNewPassword });
        } else {
            res.status(401).json({ status: 401, message: "User not exist" })
        }
    } catch (error) {
        res.status(422).send({ status: 422, error })
    }
})
// ------------------------------------------------------------------------------>
// <====================(Admin ends here)=======================>
// ------------------------------------------------------------------------------>


// ------------------------------------------------------------------------------>
// <===========================(Company Section)==================================>
// ------------------------------------------------------------------------------>
// Company Register
router.post('/addCompany', async (req, res) => {
    const { companyname, mobile, email, address, pincode, city, country, countrycode } = req.body;

    if (!companyname || !mobile || !email || !address || !pincode || !city || !country || !countrycode) {
        res.status(422).json({ error: 'Fill all the details.' });
        return;
    }

    try {
        const newUser = new Company({
            companyname,
            mobile,
            email,
            address,
            pincode,
            city,
            country,
            countrycode,
        });

        await newUser.save();
        res.status(201).json({ message: 'Successfully Added', newUser });
    } catch (error) {
        res.status(401).json(error);
    }
});

// get Company
router.get('/getCompany', async (req, res) => {
    try {
        // Pegignation 
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const size = req.query.size ? parseInt(req.query.size) : 10;

        const skip = (page - 1) * size;


        const total = await Company.countDocuments();

        const companies = await Company.find().skip(skip).limit(size);
        res.status(200).json({ records: companies, total, page, size });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// get a single Company
router.get('/getCompany/:id', async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        res.status(201).json(company);
    } catch (error) {
        res.status(422).json(error);
    }
});

// Update Company
router.post('/updateCompany/:id', async (req, res) => {
    const { companyname, mobile, email, address, pincode, city, country, countrycode } = req.body;

    if (!companyname || !mobile || !email || !address || !pincode || !city || !country || !countrycode) {
        res.status(422).json({ error: 'Fill all the details.' });
        return;
    }

    try {
        const updatedCompany = {
            companyname,
            mobile,
            email,
            address,
            pincode,
            city,
            country,
            countrycode,
        };

        await Company.findByIdAndUpdate(req.params.id, updatedCompany);
        res.status(201).json({ message: 'Successfully Updated', updatedCompany });
    } catch (error) {
        res.status(409).json(error);
    }
});

// Delete Company
router.delete('/deleteCompany/:id', async (req, res) => {
    // console.log(req.params.id)
    try {
        await Company.deleteOne({ _id: req.params.id });
        res.status(201).json({ message: 'Successfully deleted' });
    } catch (error) {
        res.status(422).json({ message: 'Error while deleting company', error });
    }
});

// download Company Excel sheet
router.get('/downloadCompanyExcelSheet', async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const size = req.query.size ? parseInt(req.query.size) : 5;

        const skip = (page - 1) * size;

        const companies = await Company.find().skip(skip).limit(size);

        // Convert companies data to the required format
        const jsonData = companies.map((company) => ({
            'Company Name': company.companyname,
            Mobile: company.mobile,
            Email: company.email,
            Address: company.address,
            'Pin Code': company.pincode,
            City: company.city,
            Country: company.country,
            'Country Code': company.countrycode
        }));

        // Create a new workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(jsonData);

        // Set column headers
        const headers = ['Company Name', 'Mobile', 'Email', 'Address', 'Pin Code', 'City', 'Country', 'Country Code'];
        XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });

        // Add worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Company');

        // Convert workbook to a buffer
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set the response headers for file download
        res.setHeader('Content-Disposition', 'attachment; filename=company.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // Send the Excel buffer as the response
        res.send(excelBuffer);
    } catch (error) {
        console.error('Route error:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});


// ------------------------------------------------------------------------------>
// <=====================(Company ends here)==========================>
// ------------------------------------------------------------------------------>

// ------------------------------------------------------------------------------>
// <=========================(Sub_User Section) ======================>
// ------------------------------------------------------------------------------>

// Register User
router.post("/subAdminRegister", async (req, res) => {
    const { fname, email, password, cpassword, mobile, designation, userGroup } = req.body;

    if (!fname || !email || !password || !cpassword || !mobile || !designation || !userGroup) {
        res.status(422).json({ error: 'Fill all the details.' });
        return;
    }

    try {
        const preuser = await subUserModel.findOne({ email: email });
        if (preuser) {
            res.status(422).json({ Error: "User already exists." })
        } else if (password !== cpassword) {
            res.status(422).json({ Error: "Password and cpassword didn't match." })
        } else {
            const IpAddress = req.ip;
            const finaluser = new subUserModel({
                fname, email, password, cpassword, mobile, designation, userGroup, IpAddress
            })
            // here password hasing done

            const storedata = await finaluser.save(err => {
                if (err) {
                    res.status(400).json(err)
                } else {
                    res.status(201).json({ message: "Registered Successfully.", finaluser })
                }
            })
        }


    } catch (error) {
        res.status(422).json({ error: "Catch error." })
    }
});

// Login User
router.post("/subAdminLogin", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(422).json({ error: "Fill all the details." })
    }

    try {
        const userValid = await subUserModel.findOne({ email: email })

        if (userValid) {
            const isMatch = await bcrypt.compare(password, userValid.password);
            if (!isMatch) {
                res.status(422).json({ error: "Invailid user!!" })
            } else {
                // token generate
                const token = await userValid.generateAuthtoken();

                //cookie generate
                res.cookie("usercookie", token, {
                    expires: new Date(Date.now() + 9000000),
                    httpOnly: true
                });

                const result = {
                    userValid,
                    token
                };

                res.status(201).json({ status: 201, result })
            }
        }

    } catch (error) {
        res.status(422).json({ error: "Catch error." })
    }
});

// get sub_User
router.get("/getSubUser", async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const size = req.query.size ? parseInt(req.query.size) : 5;
      const skip = (page - 1) * size;
  
      const total = await subUserModel.countDocuments();
      const subUsers = await subUserModel
        .find()
        .skip(skip)
        .limit(size)
        .select("-password -cpassword"); // Exclude password and cpassword fields
  
      res.status(200).json({ records: subUsers, total, page, size });
    } catch (error) {
      res.status(422).json(error);
    }
  });
  

// Logout
router.get('/subUserLogout', SubAuthenticate, async (req, res) => {
    try {
        req.rootUser.tokens = req.rootUser.tokens.filter((curelm) => {
            return curelm.token !== req.token;
        });

        res.clearCookie('userCookie', { path: '/' });

        await req.rootUser.save();

        res.status(201).json(req.rootUser.tokens);
    } catch (error) {
        res.status(401).json({ status: 401, error });
    }
});

// get a single sub_User by _id
router.get("/singleUser/:id", async (req, res) => {
    try {
        const singleUser = await subUserModel.findById(req.params.id);
        res.status(201).json(singleUser)
    } catch (error) {
        res.status(422).json(error);
    }
});

// update Sub_User
router.post("/updateSingleSubUser/:id", async (req, res) => {
    const { fname, email, mobile, designation, userGroup } = req.body;

    if (!fname || !email || !mobile || !designation || !userGroup) {
        res.status(422).json({ error: 'Fill all the details.' });
        return;
    }

    try {
        const updateSubUser = {
            fname, email, mobile, designation, userGroup
        }
        await subUserModel.findByIdAndUpdate(req.params.id, updateSubUser);
        res.status(201).json({ message: "Successfully updated!", updateSubUser })
    } catch (error) {
        res.status(422).json(error);
    }
});

// Delete Sub_User
router.post("/deleteUser/:id", async (req, res) => {
    try {
        await subUserModel.deleteOne({ _id: req.params.id });
        res.status(201).json({ message: "Successfully Deleted!" })
        // console.log(req.params.id)
    } catch (error) {
        res.status(422).json(error);
    }
});

//Sub_User_Profile
router.get("/validSubUser", SubAuthenticate, async (req, res) => {

    try {
        const validUser = await subUserModel.findOne({ _id: req.userId });
        res.status(201).json({ status: 201, validUser })

    } catch (error) {
        res.status(401).json({ status: 401, error })
    }
});

// Sub_User pdf download
router.get('/downloadSubUser', async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const size = req.query.size ? parseInt(req.query.size) : 5;

        const skip = (page - 1) * size;

        const subUsers = await subUserModel.find().skip(skip).limit(size);

        // Create a new PDF document
        const doc = new PDFDocument();

        // Set the response headers for file download
        res.setHeader('Content-Disposition', 'attachment; filename=subUser.pdf');
        res.setHeader('Content-Type', 'application/pdf');

        // Pipe the PDF document to the response
        doc.pipe(res);

        // Add content to the PDF document
        doc.fontSize(12).text('Sub User List', { align: 'center', underline: true });
        doc.moveDown();

        subUsers.forEach((subUser) => {
            doc.text(`Name: ${subUser.fname}`);
            doc.text(`Email: ${subUser.email}`);
            doc.text(`Mobile: ${subUser.mobile}`);
            doc.text(`Designation: ${subUser.designation}`);
            doc.text(`User_Group: ${subUser.userGroup}`);
            doc.text(`Date_of_Creation: ${subUser.DateOfCreation}`);
            doc.text(`Ip_Address: ${subUser.IpAddress}`);
            doc.moveDown();
        });

        // Finalize the PDF document
        doc.end();
    } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
    }
});


// table form pdf download
// router.get('/downloadSubUser', async (req, res) => {
//     try {
//       const page = req.query.page ? parseInt(req.query.page) : 1;
//       const size = req.query.size ? parseInt(req.query.size) : 5;

//       const skip = (page - 1) * size;

//       const subUsers = await subUserModel.find().skip(skip).limit(size);

//       // Create a new PDF document
//       const doc = new PDFDocument();

//       // Set the response headers for file download
//       res.setHeader('Content-Disposition', 'attachment; filename=subUser.pdf');
//       res.setHeader('Content-Type', 'application/pdf');

//       // Pipe the PDF document to the response
//       doc.pipe(res);

//       // Add content to the PDF document
//       doc.fontSize(12).text('Sub User List', { align: 'center', underline: true });
//       doc.moveDown();

//       const tableHeaders = ['Name', 'Email', 'Mobile', 'Designation', 'User Group', 'Date of Creation'];

//       // Define the table properties
//       const table = {
//         headers: tableHeaders,
//         rows: []
//       };

//       subUsers.forEach((subUser) => {
//         const row = [
//           subUser.fname,
//           subUser.email,
//           subUser.mobile,
//           subUser.designation,
//           subUser.userGroup,
//           subUser.DateOfCreation,
//         //   subUser.IpAddress
//         ];
//         table.rows.push(row);
//       });

//       // Set the table properties
//       const tableTop = 100; // Vertical position of the table
//       const lineHeight = 50 // Height of each table row
//       const tableWidth = 600; // Width of the table
//     //   const tableColumnWidth = tableWidth / tableHeaders.length; // Width of each table column
//     const tableColumnWidth = 110;

//       // Draw table headers
//       doc.font('Helvetica-Bold').fontSize(10);
//       tableHeaders.forEach((header, columnIndex) => {
//         doc.text(header, tableColumnWidth * columnIndex, tableTop);
//       });

//       // Draw table rows
//       doc.font('Helvetica').fontSize(10);
//       table.rows.forEach((row, rowIndex) => {
//         row.forEach((cell, columnIndex) => {
//           doc.text(cell, tableColumnWidth * columnIndex, tableTop + lineHeight * (rowIndex + 1));
//         });
//       });

//       // Finalize the PDF document
//       doc.end();
//     } catch (error) {
//       console.error('Route error:', error);
//       res.status(500).json({ error: 'An error occurred' });
//     }
//   });

// Excel Sheet download
router.get('/downloadSubUserExcelSheet', async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const size = req.query.size ? parseInt(req.query.size) : 5;

        const skip = (page - 1) * size;

        const subUsers = await subUserModel.find().skip(skip).limit(size);

        // Convert subUsers data to the required format
        const jsonData = subUsers.map((subUser) => ({
            Name: subUser.fname,
            Email: subUser.email,
            Mobile: subUser.mobile,
            Designation: subUser.designation,
            'User Group': subUser.userGroup,
            'Date of Creation': subUser.DateOfCreation,
            'IP Address': subUser.IpAddress
        }));

        // Create a new workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(jsonData);

        // Set column headers
        const headers = ['Name', 'Email', 'Mobile', 'Designation', 'User Group', 'Date of Creation', 'IP Address'];
        XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });

        // Add worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sub Users');

        // Convert workbook to a buffer
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set the response headers for file download
        res.setHeader('Content-Disposition', 'attachment; filename=subUser.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // Send the Excel buffer as the response
        res.send(excelBuffer);
    } catch (error) {
        console.error('Route error:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

// ------------------------------------------------------------------------------>
// <==================(Sub_User Section ends here)=================>
// ------------------------------------------------------------------------------>


// ------------------------------------------------------------------------------>
// <==================(Subscription_Route starts here)=================>
// ------------------------------------------------------------------------------>

router.post("/subscription", (req, res) => {
    const { SubscriptionName, ForServiceCategory, ForServiceSubCategory, DurationInMonth, SubscriptionPrice, } = req.body;

    if (!SubscriptionName || !ForServiceCategory || !ForServiceSubCategory || !DurationInMonth || !SubscriptionPrice) {
        res.status(422).send({ message: "Please fill all the details!" })
        return
    }

    const finalSubscription = new SubcriptionModel({
        SubscriptionName, ForServiceCategory, ForServiceSubCategory, DurationInMonth, SubscriptionPrice
    });

    finalSubscription.save((err) => {
        if (err) {
            res.status(500).send(err)
        } else {
            res.status(201).json({ message: "Data inserted successfully" })
        }
    })
});

// get details of subscription 
router.get("/getSubscriptionDetails", async(req,res)=>{
    try {
        const mySubscription = await SubcriptionModel.find();
        res.status(201).json(mySubscription);
    } catch (error) {
        res.status(422).json(error);
    }
})

// ------------------------------------------------------------------------------>
// <========================(What's app API)====================>
// ------------------------------------------------------------------------------>
// Whats App api
import twilio from "twilio"
router.post('/send-message', (req, res) => {
    const { accountSid, authToken, numbers, messageBody, from } = req.body;
    const client = twilio(accountSid, authToken);

    const promises = numbers.map((number) => {
        return client.messages.create({
            body: messageBody,
            from,
            to: number
        });
    });

    Promise.all(promises)
        .then((messages) => {
            const successfulMessages = messages.map((message) => ({
                to: message.to,
                body: message.body
            }));
            res.status(201).json({ messages: successfulMessages });
        })
        .catch((error) => {
            console.error('Error sending messages:', error);
            res.status(422).json({ error: error.message });
        });
});


export default router