import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import routes from './routes/index.js';
import config from './config.js';
import cors from 'cors';
import logger from 'morgan';

const app = express();

app.use(logger('dev'));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/', routes);

// connect to mongoose
const options = { dbName: config.DB_NAME };
const DB_URL = config.DB_URL;
const PORT = config.PORT;

const connect = mongoose.connect(DB_URL, options);

connect
  .then((db) => {
    console.log("Connected to main db (mongoose connection): " + db.connections[0].name);
  })
  .catch((err) => {
    console.log(err.message);
  });

app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`);
});

// Closing connection when ctrl-C
process.on("SIGINT", async function () {
    console.log("Closing ...");
    await mongoose.disconnect();
    console.log("Connection closed.");
    process.exit(0);
  });