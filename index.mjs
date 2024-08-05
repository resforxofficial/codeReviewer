import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";
dotenv.config();

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import multer from "multer";
import { Sequelize, DataTypes } from "sequelize"; // Sequelize 추가
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  safetySetting: [
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_UNSPECIFIED,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ],
  generationConfig: { responseMimeType: "application/json" },
});

const port = 3000;
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });
const uploadMiddleware = upload.single("mcxfile");
app.use(uploadMiddleware);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, ".", "index.html"));
});

app.listen(port, () => {
  console.log(`port ${port} on successfully`);
});

app.post("/upload_text", async (req, res) => {
  /** @type {string} */
  const code = req.body.code;
  const fileit = req.file;

  try {
    const prompt = `When answering, don't answer in a format, just answer in sentences in plain text. But please give a little more explanation.
    You are a developer who is very good at coding.
    You are very good at code reviews, so you can review and analyze all the code you are asked about and explain the content of the code well.
    `;

    const result = model.generateContent([prompt, code]);
    const response = (await result).response;
    const ans = JSON.parse(response.text());

    const answer = ans[Object.keys(ans)[0]];
    res.json({ answer });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed" });
  }
});
