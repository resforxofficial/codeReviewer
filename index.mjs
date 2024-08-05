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
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

import { Sequelize, DataTypes } from "sequelize"; // Sequelize 추가

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "mysql",
});

// Chat 모델 정의
const Chat = sequelize.define("Chat", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

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

app.get("/api/chats", async (req, res) => {
  try {
    const chats = await Chat.findAll();
    res.json(chats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load chats" });
  }
});

app.delete("/api/chats/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const chat = await Chat.findByPk(id);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }
    await chat.destroy();
    res.json({ message: "Chat deleted" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete chat" });
  }
});

app.listen(port, async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
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
