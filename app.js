// require("dotenv").config();
import { configDotenv } from "dotenv";

import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import { fileURLToPath } from "url";

import path from "path";

configDotenv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: true,
});

const BALE_API = `https://tapi.bale.ai/bot${process.env.BALE_BOT_TOKEN}`;

async function sendTextToBale(text) {
  await axios.post(`${BALE_API}/sendMessage`, {
    chat_id: "4713244199",
    text,
  });
}

async function sendPhotoToBale(photoPath, caption = "") {
  const form = new FormData();

  form.append("chat_id", process.env.BALE_CHANNEL_ID);
  form.append("caption", caption);
  form.append("photo", fs.createReadStream(photoPath));

  await axios.post(`${BALE_API}/sendPhoto`, form, {
    headers: form.getHeaders(),
  });
}

async function downloadTelegramFile(fileId) {
  const file = await telegramBot.getFile(fileId);

  const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

  const fileName = path.basename(file.file_path);

  const savePath = path.join(__dirname, "downloads", fileName);

  if (!fs.existsSync("downloads")) {
    fs.mkdirSync("downloads");
  }

  const response = await axios({
    url: fileUrl,
    method: "GET",
    responseType: "stream",
  });

  const writer = fs.createWriteStream(savePath);

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => resolve(savePath));
    writer.on("error", reject);
  });
}

telegramBot.on("channel_post", async (msg) => {
  try {
    console.log("New channel post");

    // Text Message
    if (msg.text) {
      await sendTextToBale(msg.text);
      return;
    }

    // Photo
    if (msg.photo) {
      const photo = msg.photo[msg.photo.length - 1];

      const filePath = await downloadTelegramFile(photo.file_id);

      await sendPhotoToBale(filePath, msg.caption || "");

      fs.unlinkSync(filePath);

      return;
    }

 
    console.log("Unsupported message type");
  } catch (error) {
    console.error(error.response?.data || error.message);
  }
});

console.log("Bridge is running...");
