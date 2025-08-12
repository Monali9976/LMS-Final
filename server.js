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

app.post('/generate-questions', async (req, res) => {
  try {
    const pdfText = fs.readFileSync('pdfText.txt', 'utf8');

    const prompt = `
    Generate 25 multiple-choice questions from the following text.
    For each question, include:
    - question
    - options (array of 3–5)
    - correctAnswer
    - sourceChapter (the chapter or section name from which the question is derived)

    Make sure the output is valid JSON array.
    Text: ${pdfText}
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

// ✅ Axios me data yahan hota hai:
let data = response.data.choices[0].message.content;

// 🧹 Clean invalid JSON if needed
data = data.trim();
if (data.startsWith("```")) {
  data = data.replace(/```json|```/g, '').trim();
}

const questions = JSON.parse(data);

fs.writeFileSync('questions.json', JSON.stringify(questions, null, 2));

res.json({ ok: true, total: questions.length, file: 'questions.json' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate questions' });
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
app.post('/quiz', (req, res) => {
  const userAnswers = req.body.answers;
  const questions = JSON.parse(fs.readFileSync('questions.json', 'utf8'));

  let score = 0;
  let wrongAnswers = [];

  userAnswers.forEach(ans => {
    const q = questions.find(q => q.question === ans.question);
    if (q) {
      if (q.correctAnswer.trim().toLowerCase() === ans.selected.trim().toLowerCase()) {
        score++;
      } else {
        wrongAnswers.push({
          question: q.question,
          selected: ans.selected,
          correctAnswer: q.correctAnswer,
          sourceChapter: q.sourceChapter || "Chapter info not available"
        });
      }
    }
  });

  res.json({
    score,
    total: userAnswers.length,
    wrongAnswers
  });
});

app.listen(4000, () => console.log("✅ Server running on http://localhost:4000"));
