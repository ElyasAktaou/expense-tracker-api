import dotenv from 'dotenv';
dotenv.config();

export default {
    DB_URL: process.env.DB_URL,
    PORT: process.env.PORT,
    DB_NAME: process.env.DB_NAME,
    API_KEY: process.env.API_KEY,
}