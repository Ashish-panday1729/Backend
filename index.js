import express from "express";
import cors from "cors";
import Connection from "./DB/Connection.js";
import router from "./Routes/routes.js"
import cookieParser from "cookie-parser";
import dotenv from "dotenv"


const PORT = 8009;

const app = express();

//dotenv 
dotenv.config();


app.use(express.json());
app.use(cors());
app.use(cookieParser());



// Database Connection
Connection();



//Route
app.use(router)

app.get("/", (req, res) => {
  res.send("Hello");
});

app.listen(PORT, () => {
  console.log(`Listening on PORT ${PORT}`);
 
});
