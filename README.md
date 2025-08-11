# 📚 PDF to Quiz Generator

A Node.js + Express application that:

1. Uploads a PDF file
2. Extracts text from it
3. Uses **Sarvam AI API** to generate multiple-choice questions
4. Stores the questions in JSON
5. Lets you get a random quiz or submit answers for scoring

---

## 🚀 Features

- Upload any PDF
- Automatically generates **MCQs** from the text
- Outputs valid JSON with `question`, `options`, `correctAnswer`
- Get random quiz questions
- Submit answers to get a score

---

## 📦 Installation

``bash

# Clone the repo

git clone https://github.com/Monali9976/LMS-Final.git

# Install dependencies

npm install
🔑 Environment Variables
Create a .env file in the project root:

# .env

SARVAM_API_KEY=your_sarvam_api_key_here

# ▶️ Running the Server

node server.js

Server will run at:

http://localhost:4000

📌 API Endpoints

## 1️⃣ Upload PDF

POST /upload-pdf

Uploads a PDF and extracts its text.

Request:

http://localhost:4000/upload-pdf

Response:

{
"message": "PDF text saved successfully"
}

## 2️⃣ Generate Questions

POST /generate-questions

Generates MCQs from the uploaded PDF text using Sarvam AI.

Request:

http://localhost:4000/generate-questions

{
"ok": true,
"total": 15,
"file": "questions.json"
}

## 3️⃣ Get Random Quiz

GET /quiz

Returns 10 random questions.

Request:

http://localhost:4000/quiz

Response:

[
{
"question": "What is ...?",
"options": ["A", "B", "C"],
"correctAnswer": "A"
}
]

## 4️⃣ Submit Quiz

POST /quiz

Send your answers and get your score.

Request:

http://localhost:4000/quiz \
-H "Content-Type: application/json" \
-d '{
"answers": [
{"question": "What is ...?", "selected": "A"},
{"question": "Which ...?", "selected": "B"}
]
}'

Response:

{
"score": 2,
"total": 2
}
🛠 Notes
Make sure you upload a PDF first before generating questions.

Sarvam AI model used: sarvam-m

If AI returns invalid JSON, the app cleans and parses it automatically.
![App Screenshot](assets/Screenshot%202025-08-11%20170304.png)

![App Screenshot](assets/Screenshot%202025-08-11%20170342.png)

![App Screenshot](assets/Screenshot%202025-08-11%20170420.png)

![App Screenshot](assets/Screenshot%202025-08-11%20170450.png)

