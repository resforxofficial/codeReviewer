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
import fs from "fs";
import { Sequelize, DataTypes } from "sequelize";

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "mysql",
});

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

app.post("/api/chats", async (req, res) => {
  try {
    const count = await Chat.count();
    if (count >= 10) {
      return res.status(400).json({ error: "Cannot add more than 10 chats." });
    }
    const newChat = await Chat.create({ name: `Chat ${count + 1}` });
    res.json(newChat);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to add chat" });
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
  const code = req.body.code;
  const fileit = req.file;

  try {
    let codeContent = code;

    if (fileit) {
      codeContent = fs.readFileSync(fileit.path, "utf-8");
    }

    const prompt = `You are an expert code reviewer. Explain the following Python code in detail. Make sure to explain each line and its purpose.

Code:
\`\`\`
${codeContent}
\`\`\`

Explanation:
`;

    const result = await model.generateContent([prompt, codeContent]);
    const response = result.response;
    const answer = JSON.parse(response.text());
    res.json({ answer: answer.text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to analyze the code" });
  }
});
