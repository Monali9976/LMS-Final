require("dotenv").config();
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(express.json());

// ===== Multer Setup =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
});
const upload = multer({ storage });

// // ===== API 1: Upload PDF + Generate Questions =====
app.post("/upload-pdf", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No PDF uploaded" });

        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdfParse(dataBuffer);

        fs.writeFileSync("pdfText.txt", data.text.trim());
        fs.unlinkSync(req.file.path);

        res.json({ message: "PDF text saved successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/generate-questions", async (req, res) => {
    try {
        if (!fs.existsSync("pdfText.txt")) {
            return res.status(400).json({ error: "Upload a PDF first" });
        }

        const pdfText = fs.readFileSync("pdfText.txt", "utf8").trim();
        if (!pdfText) {
            return res.status(400).json({ error: "PDF text is empty" });
        }

        const truncatedText = pdfText.slice(0, 5000);
        console.log("Sending text length to Sarvam:", truncatedText.length);

//         const prompt = `
// Create exactly 20 multiple-choice questions from the given text.
// Each question must have exactly 3 options, and only ONE correctAnswer.
// Output strictly in JSON format like:
// [
//   {
//     "question": "string",
//     "options": ["string", "string", "string"],
//     "correctAnswer": "string"
//   }
// ]
// Text: ${truncatedText}
//         `;
const prompt = `
Create exactly 15 multiple-choice questions from the given text.
- Each question must have exactly 3 options, and only ONE correctAnswer.
- Output ONLY a valid JSON array, no code blocks, no extra text.
- Do NOT include explanations, keys must match exactly: "question", "options", "correctAnswer".
Text: ${truncatedText}
`;

        const response = await axios.post(
            "https://api.sarvam.ai/v1/chat/completions",
            {
                model: "sarvam-m",
                messages: [
                    { role: "system", content: "You are a quiz generator that outputs only JSON." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.2,
                max_tokens: 4000
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.SARVAM_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        let outputText = response.data.choices[0].message.content.trim();
        // Remove possible ```json or ``` markers
outputText = outputText.replace(/```json/gi, "").replace(/```/g, "").trim();
        let questions;

        try {
            questions = JSON.parse(outputText);
        } catch (err) {
            return res.status(500).json({ error: "Sarvam AI did not return valid JSON" });
        }

        fs.writeFileSync("questions.json", JSON.stringify(questions, null, 2));
        res.json({ ok: true, total: questions.length, file: "questions.json" });

    } catch (err) {
        console.error("Sarvam API error:", err.response?.data || err.message);
        res.status(500).json({ error: err.response?.data || err.message });
    }
});

// ===== API 2: Get 10 Random Questions =====
app.get("/quiz", (req, res) => {
  try {
    const questions = JSON.parse(fs.readFileSync("questions.json", "utf-8"));
    const randomQuestions = questions.sort(() => 0.5 - Math.random()).slice(0, 10);
    res.json(randomQuestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== API 3: Submit Quiz =====
app.post("/quiz", (req, res) => {
  try {
    const answers = req.body.answers; // [{question, selected}]
    const questions = JSON.parse(fs.readFileSync("questions.json", "utf-8"));

    let score = 0;
    answers.forEach((ans) => {
      const q = questions.find((q) => q.question === ans.question);
      if (q && q.correctAnswer === ans.selected) score++;
    });

    res.json({ score, total: answers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(4000, () => console.log("✅ Server running on http://localhost:4000"));
