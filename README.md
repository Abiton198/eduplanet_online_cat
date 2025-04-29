

```markdown
# Exam Attempt System

This React application is designed for students to attempt exams with certain restrictions. It allows users to attempt each exam a limited number of times, provides time-based restrictions, and prevents any suspicious behaviors, such as switching tabs or using developer tools during the exam.

## Features

- **Single-use Passwords**: Passwords for each exam are valid for one-time use only, ensuring that students can't reuse passwords.
- **Limited Attempts**: Students can attempt each exam up to 3 times, with attempts spaced 48 hours apart.
- **Real-time Timer**: The exam has a countdown timer, and students are alerted when they have 5 minutes left.
- **Suspicious Behavior Detection**: The app prevents right-clicking, text selection, and certain keyboard shortcuts to avoid cheating.
- **Attempt Tracking**: The app tracks the number of attempts and the time of each attempt.
- **Result Calculation**: Once the exam is submitted, the app calculates the score and stores the result.

## Technologies Used

- **React**: The front-end framework for building the user interface.
- **LocalStorage**: Used for storing exam attempt data, including student information and results.
- **SweetAlert2**: Used to show popup alerts (e.g., for password prompts and confirmation dialogs).
- **TailwindCSS**: Utility-first CSS framework used for styling the components.

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/abiton198/eduplanet_online_cat.git
```

### 2. Install dependencies

Navigate to the project directory and install the necessary dependencies.

```bash
cd exam-attempt-system
npm install
```

### 3. Run the app

Start the development server:

```bash
npm start
```

Your app should now be running at `http://localhost:3000`.

### 4. Deploy to Netlify (Optional)

If you want to deploy your application to Netlify, follow these steps:

1. Push the repository to GitHub.
2. Go to [Netlify](https://www.netlify.com/) and sign up or log in.
3. Click on "New Site from Git" and choose GitHub.
4. Select the repository and follow the prompts to deploy the site.

## Features Breakdown

### 1. Exam Selection and Password Authentication

Each exam has a unique password, which is required to access the exam. The password can only be used once. After entering the password, the student will have access to attempt the exam.

### 2. Limiting Attempts to 3

Each student can attempt the exam up to **three times**. The number of attempts is tracked in **localStorage**.

### 3. Time Restrictions

Each exam is timed, and students will have a fixed amount of time to complete the exam (e.g., 30 minutes). A countdown timer is displayed, and the exam will be automatically submitted when the time runs out.

### 4. Suspicious Behavior Detection

To prevent cheating, the following actions are blocked during the exam:

- Right-clicking
- Text selection
- Certain keyboard shortcuts (e.g., Ctrl + C, Ctrl + V, F5, etc.)
- Switching tabs or minimizing the browser

### 5. Exam Submission

When the exam is submitted, the following information is calculated and stored:

- Total score
- Time spent
- Number of unanswered questions
- Percentage score

This data is saved in **localStorage** and can be used later for review or reporting.

### 6. Exam Retry Restrictions

Students can retry the exam only after **48 hours** have passed since their last attempt. The "Next attempt in X hours" message will be shown if they try to attempt before the required 48-hour wait.

### 7. Result Calculation

After submitting the exam, the score is calculated based on correct answers. The results are displayed and stored locally.

## File Structure

```
/exam-attempt-system
  /public
    /index.html
  /src
    /components
      ExamPage.jsx
      ResultPage.jsx
      AllResults.jsx
      Index.js
      PasswordPage.jsx
      ResultListPage.jsx
      ReviewPage.jsx
    /utils
      Questions.jsx
      ExamRules.jsx
      ProtectedRoute.jsx
    App.js
    index.js
  /styles
    tailwind.config.js
  package.json
  README.md
```

### Main Components

- **ExamPage.js**: Contains the logic for rendering the exam, handling question selection, and timer countdown.
- **ResultPage.js**: Displays the results after the exam is submitted, including the score, time spent, and unanswered questions.
- **ExamCard.js**: A simple card component that shows exam details and the "Next attempt" message.
- **Questions.js**: Contains an array of questions and answers for each exam. This data is used to render the questions dynamically.
- **Timer.js**: A helper file to manage the countdown timer logic.

## Contributing

If you'd like to contribute to this project, feel free to fork the repository, make your changes, and create a pull request. Here are some ways you can contribute:

- **Improve the UI**: Enhance the visual design or responsiveness of the exam interface.
- **Fix bugs**: If you notice any bugs or issues, submit a fix.
- **Add more features**: Suggestions for new features (e.g., question randomization, multi-language support) are welcome.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgements

- Thanks to [SweetAlert2](https://sweetalert2.github.io/) for the popups.
- Thanks to [TailwindCSS](https://tailwindcss.com/) for the styling framework.

---


