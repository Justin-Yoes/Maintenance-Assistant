import dotenv from "dotenv";
dotenv.config();

import express from "express";
import OpenAI from "openai";
import path from "path";

const app = express();

app.use(express.json());
app.use(express.static(path.resolve()));

console.log("OPENAI KEY:", process.env.OPENAI_API_KEY);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ⚠️ NOTE: still global session (unchanged for your deployment)
let conversation = [];

// Language map
const LANGUAGE_MAP = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  it: "Italian"
};

// Dynamic system prompt
function getSystemPrompt(language = "en") {
  const langName = LANGUAGE_MAP[language] || "English";

  return `
You are a senior maintenance technician assistant.

You MUST communicate with the technician in: ${langName}

Your job is to interview a maintenance technician about a machine failure and then produce a complete CMMS work order.

You must:
- Ask ONE question at a time
- Only ask for missing critical information
- Stop asking questions when you have enough information to write a full report

You are trying to gather:
- Machine / asset name
- Machine status when arrived
- Failure description / symptoms
- Fault codes (if any)
- Actions taken to diagnose
- Corrective action performed
- Root cause (if known; otherwise state "unknown but likely cause")
- Parts used or replaced
- Verification of repair
- Preventive recommendation

Output rules:

If information is incomplete:
Output ONLY the next question.

If information is sufficient:
Output a structured work order using this exact format in ENGLISH ONLY:

Problem Summary:
Machine Status on Arrival:
Observed Symptoms:
Troubleshooting Performed:
Root Cause:
Corrective Action:
Parts Used:
Verification:
Preventive Recommendation:
`;
}

app.post("/chat", async (req, res) => {
  try {
    const userInput = req.body.message;
    const language = req.body.language || "en";

    conversation.push({
      role: "user",
      content: userInput
    });

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: getSystemPrompt(language)
        },
        ...conversation
      ]
    });

    const aiMessage = response.choices[0].message.content;

    conversation.push({
      role: "assistant",
      content: aiMessage
    });

    res.json({
      reply: aiMessage
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      reply: "Something went wrong."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});