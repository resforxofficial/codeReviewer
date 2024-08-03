import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const port = 3000;
const app = express();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, ".", "index.html"));
});

app.listen(port, () => {
    console.log(`port ${port} on successfully`);
});

app.post("/encv", (req, res) => {
    console.log(req.body);
    /** @type {string} */
    const ques = req.body.ques;

    try {
        res.json({ ques });
    } catch (e) {
        console.error(e);
        res.status(500).send({ msg: "failed" });
    }
});