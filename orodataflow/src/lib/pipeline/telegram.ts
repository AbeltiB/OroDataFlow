import TelegramBot from "node-telegram-bot-api";
import fs from "fs/promises";

export interface SendResult {
  chatId: string;
  success: boolean;
  error?: string;
}

export async function sendTelegramFile(
  filePath: string,
  caption: string,
  chatIds: string[]
): Promise<SendResult[]> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

  const bot = new TelegramBot(token);
  const fileBuffer = await fs.readFile(filePath);
  const filename = filePath.split(/[\\/]/).pop() || "report.xlsx";

  const results: SendResult[] = [];

  for (const chatId of chatIds) {
    try {
      await bot.sendDocument(chatId, fileBuffer, { caption }, { filename, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      results.push({ chatId, success: true });
    } catch (err) {
      results.push({ chatId, success: false, error: String(err) });
    }
  }

  return results;
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const bot = new TelegramBot(token);
  await bot.sendMessage(chatId, text);
}
