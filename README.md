<div align="center">
  <img src="https://raw.githubusercontent.com/masymars/GAMVRA/main/screenshots/gamvra_logo.png" alt="GAMVRA Logo" width="120">

  <h1 align="center">🧠 GAMVRA – Medical AI Assistant</h1>
  <p align="center">
    An advanced <strong>offline-first</strong> Medical AI Assistant powered by Gemma, built with Electron. It features Medical OCR, a VR Physical Exam Guide, and runs 100% locally for complete privacy.
    <br />
    <br />
    <a href="https://github.com/masymars/GAMVRA/issues">Report Bug</a>
    ·
    <a href="https://github.com/masymars/GAMVRA/issues">Request Feature</a>
  </p>
</div>

<div align="center">
  <a href="https://github.com/masymars/GAMVRA/stargazers"><img src="https://img.shields.io/github/stars/masymars/GAMVRA?style=for-the-badge&logo=github&color=FFDD00" alt="Stargazers"></a>
  <a href="https://github.com/masymars/GAMVRA/network/members"><img src="https://img.shields.io/github/forks/masymars/GAMVRA?style=for-the-badge&logo=github&color=C472F5" alt="Forks"></a>
  <a href="https://github.com/masymars/GAMVRA/blob/main/LICENSE"><img src="https://img.shields.io/github/license/masymars/GAMVRA?style=for-the-badge&color=33B452" alt="License"></a>
  <a href="https://github.com/masymars/GAMVRA/issues"><img src="https://img.shields.io/github/issues/masymars/GAMVRA?style=for-the-badge&logo=github&color=D9534F" alt="Issues"></a>
</div>

<br>

<div align="center">
  <img src="https://raw.githubusercontent.com/masymars/GAMVRA/main/screenshots/main.png" alt="GAMVRA Main Interface Screenshot">
</div>

---

## 📋 Table of Contents

- [About The Project](#-about-the-project)
  - [Tech Stack](#-tech-stack)
- [Key Features](#-key-features)
- [Getting Started](#-getting-started)
  - [Prerequisites](#-prerequisites)
  - [Installation Guide](#-installation-guide)
- [Example Use Cases](#-example-use-cases)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)
- [Acknowledgments](#-acknowledgments)

---

## 📖 About The Project

**GAMVRA** is an advanced **offline-first Medical AI Assistant** designed for doctors, researchers, and healthcare professionals. Powered by a local instance of Google's Gemma 3n, it offers powerful tools for medical knowledge, report analysis, prescription OCR, and a unique VR-based physical exam guide—all while ensuring absolute data privacy by running entirely on your local machine.

No internet connection is needed after setup, and no data ever leaves your device. This makes GAMVRA a secure, fast, and reliable tool for modern healthcare environments.

### 📦 Tech Stack

This project is built with a modern, offline-first technology stack.

| Component | Technology |
| :--- | :--- |
| **Language Model** | [Gemma 3n E2B ONNX](https://huggingface.co/onnx-community/gemma-3n-E2B-it-ONNX) |
| **Inference Engine** | ONNX Runtime (WebAssembly / Native) |
| **Desktop Runtime** | [Electron](https://www.electronjs.org/) |
| **UI Framework** | React + Tailwind CSS |
| **Packaging** | electron-builder |

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

---

## 🚀 Key Features

-   ✨ **Offline Medical AI Assistant**: Powered by Gemma 3n, functioning without any internet connection.
-   🧾 **Medical OCR Plugin**: Extract and analyze data from prescriptions, lab reports, and handwritten notes.
-   🩺 **VR Physical Exam Guide (Gyn/OB)**: Step-by-step 3D guided exams and visualizations for gynecological/obstetric assessments.
-   🔐 **Privacy-First**: 100% local inference with ONNX Runtime. Your data stays on your machine.
-   ⚡ **Fast Local Inference**: Supports quantized models (Q4/Q8/FP16/FP32) with WASM or native runtimes.
-   🧠 **Medical Reasoning & Research Support**: Ask clinical questions, get summaries, suggest diagnoses, and more.
-   🧩 **Plugin System**: Easily extend functionality with new skills like translation or PDF parsing.
-   💻 **Cross-Platform**: Natively supports **macOS**, **Windows**, and **Linux**.

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

---

## 🖥️ Getting Started

Follow these steps to get a local copy of GAMVRA up and running.

### ✅ Prerequisites

Ensure you have the following software installed on your system:
* **Node.js**: Version 18 or higher.
* **Git**: For cloning the repository.
* **npm** or **yarn**: For managing dependencies.
* **Python**: Version 3.11 (optional, only for model conversion/preprocessing).

### ⚙️ Installation Guide

1.  **Clone the Repository**
    ```bash
    git clone [https://github.com/masymars/GAMVRA.git](https://github.com/masymars/GAMVRA.git)
    cd GAMVRA
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    # OR
    yarn install
    ```

3.  **Download the Gemma 3n ONNX Model**
    > **⚠️ This step is required!**

    Download the pre-converted ONNX model from Hugging Face:
    * **[🔗 Download Gemma 3n E2B ONNX](https://huggingface.co/onnx-community/gemma-3n-E2B-it-ONNX)**

    After downloading, place all the model files inside the following directory:
    ```bash
    resources/models/gemma-3n/
    ```

4.  **Run the App in Development Mode**
    ```bash
    npm run dev
    # OR
    yarn dev
    ```

5.  **Build for Production**
    To create a distributable application for your OS:
    ```bash
    npm run build
    # OR
    yarn build
    ```

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

---

## 💡 Example Use Cases

-   **🏥 Medical Chatbot**: Ask clinical questions, inquire about drug interactions, and check symptoms.
-   **🧾 Prescription OCR**: Scan an image of a prescription to extract medicines and dosages.
-   **🩺 VR Physical Exam Guide (Gyn/OB)**: Load a virtual guide for step-by-step visual assistance during gynecological exams.
-   **📑 Lab Report Interpreter**: Analyze and summarize diagnostic test results from a PDF or image.
-   **👩‍⚕️ Diagnosis Assistant**: Input symptoms to receive a list of probable conditions based on the model's knowledge.
-   **🧬 Research Summarizer**: Get a TL;DR of long scientific papers or articles offline.

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

---

## 🛠️ Project Structure

/
├── out/                # Electron build output
├── resources/          # Model files, images, and other assets
│   └── models/
│       └── gemma-3n/   # Place downloaded ONNX model here
├── screenshots/        # Application screenshots
└── src/                # Main source code
├── main/           # Electron main process logic
├── renderer/       # Frontend UI (React components)
├── models/         # Inference and ONNX logic
└── plugins/        # OCR, VR, and other plugins


<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement". Don't forget to give the project a star! Thanks again!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

---

## 📬 Contact

Masymars - [@masymars](https://github.com/masymars) - masy@neuralfulai.com

Project Link: [https://github.com/masymars/GAMVRA](https://github.com/masymars/GAMVRA)

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>

---

## 🙏 Acknowledgments

* [Gemma 3n E2B ONNX by ONNX Community & Google DeepMind](https://huggingface.co/onnx-community/gemma-3n-E2B-it-ONNX)
* [ONNX Runtime](https://onnxruntime.ai/)
* [Electron](https://www.electronjs.org/)
* [React](https://reactjs.org/)
* [Icons by Lucide](https://lucide.dev/)
* [Best-README-Template](https://github.com/othneildrew/Best-README-Template)

<p align="right">(<a href="#-table-of-contents">back to top</a>)</p>