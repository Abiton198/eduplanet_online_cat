import React from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  ShieldAlert,
  Zap,
  BrainCircuit,
  Lock,
  LineChart,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Play
} from "lucide-react";

export default function ExamRules() {
  const navigate = useNavigate();

  const handleFeatureClick = (feature) => {
    Swal.fire({
      title: feature.title,
      html: feature.detail,
      icon: "info",
      confirmButtonText: "Got it",
      confirmButtonColor: "#4f46e5",
      background: "#0f172a",
      color: "#cbd5e1",
      width: 600,
      padding: "2rem",
      customClass: {
        popup: "rounded-3xl",
      },
    });
  };

  const handleModerationClick = () => {
    Swal.fire({
      title: "Moderation Protocol",
      html: `
        <div style="text-align: left; font-size: 14px; line-height: 1.7; color: #cbd5e1;">
          <p style="margin-bottom: 12px; color: #e2e8f0;"><strong>What is disabled during an exam session:</strong></p>
          <ul style="padding-left: 20px; margin-bottom: 12px;">
            <li style="margin-bottom: 6px;"><strong style="color: #e2e8f0;">F5 / Refresh</strong> — page reload is blocked to prevent session loss.</li>
            <li style="margin-bottom: 6px;"><strong style="color: #e2e8f0;">Tab-switching</strong> — leaving the exam tab triggers a logged warning.</li>
            <li style="margin-bottom: 6px;"><strong style="color: #e2e8f0;">Command keys</strong> — Ctrl+C/V, right-click, and browser context menu are disabled.</li>
            <li style="margin-bottom: 6px;"><strong style="color: #e2e8f0;">Browser resize</strong> — resizing beyond a threshold flags potential split-screen cheating.</li>
            <li style="margin-bottom: 6px;"><strong style="color: #e2e8f0;">Keystroke patterns</strong> — suspicious pasting or automation is detected and logged.</li>
          </ul>
          <p style="margin-bottom: 12px; color: #e2e8f0;"><strong>What happens on a breach:</strong></p>
          <ul style="padding-left: 20px;">
            <li style="margin-bottom: 6px;">Every violation is timestamped and recorded in the <strong style="color: #e2e8f0;">Principal's Audit Trail</strong>.</li>
            <li style="margin-bottom: 6px;">Teachers see the breach log on the results dashboard alongside the student's score.</li>
            <li style="margin-bottom: 6px;">Repeated or severe violations may invalidate the attempt at the school's discretion.</li>
            <li style="margin-bottom: 6px;">The system does <em>not</em> auto-submit on breach — you can continue the exam unless your institution's policy states otherwise.</li>
          </ul>
        </div>
      `,
      icon: "warning",
      confirmButtonText: "Understood",
      confirmButtonColor: "#e11d48",
      background: "#0f172a",
      color: "#cbd5e1",
      width: 600,
      padding: "2rem",
      customClass: {
        popup: "rounded-3xl",
      },
    });
  };

  // Unified Agentic AI Intelligence Rules
  const engineFeatures = [
    {
      title: "Agentic AI Marking",
      desc: "Our Agentic AI doesn't just check keys; it understands context. It marks your answers against any uploaded curricula or standards in real-time.",
      icon: <BrainCircuit className="text-indigo-600" />,
      color: "border-indigo-400",
      detail: `
        <div style="text-align: left; font-size: 14px; line-height: 1.7; color: #cbd5e1;">
          <p style="margin-bottom: 12px; color: #e2e8f0;"><strong>How it works:</strong></p>
          <ul style="padding-left: 20px; margin-bottom: 12px;">
            <li style="margin-bottom: 6px;">The AI agent receives your answer <strong style="color: #e2e8f0;">plus</strong> the official memo/key.</li>
            <li style="margin-bottom: 6px;">It compares <em>meaning</em> — not exact wording — against the expected answer.</li>
            <li style="margin-bottom: 6px;">For open-ended questions, Groq LLM (llama-3.3-70b) evaluates context, structure, and factual correctness.</li>
            <li style="margin-bottom: 6px;">MCQ and True/False are graded instantly by exact match — zero AI latency.</li>
            <li style="margin-bottom: 6px;">Matching-pair questions are scored proportionally per correct connection.</li>
          </ul>
          <p style="margin-bottom: 12px; color: #e2e8f0;"><strong>Key safeguards:</strong></p>
          <ul style="padding-left: 20px;">
            <li style="margin-bottom: 6px;">Score clamping — the AI cannot award more than the maximum marks for any question.</li>
            <li style="margin-bottom: 6px;">Teachers can trigger an <strong style="color: #e2e8f0;">AI re-mark</strong> or a <strong style="color: #e2e8f0;">manual adjust</strong> if they disagree.</li>
            <li style="margin-bottom: 6px;">Every AI decision is logged to the <strong style="color: #e2e8f0;">Principal's Audit Trail</strong> for transparency.</li>
            <li style="margin-bottom: 6px;">The agent never reveals the memo to the student — it only explains <em>why</em> an answer was marked correct or incorrect.</li>
          </ul>
        </div>
      `,
    },
    {
      title: "Integrity Moderation",
      desc: "Behavioral tracking is active. Tab switching, browser resizing, or suspicious keystrokes trigger an instant moderation flag.",
      icon: <ShieldAlert className="text-rose-600" />,
      color: "border-rose-400",
      detail: `
        <div style="text-align: left; font-size: 14px; line-height: 1.7; color: #cbd5e1;">
          <p style="margin-bottom: 12px; color: #e2e8f0;"><strong>What is monitored:</strong></p>
          <ul style="padding-left: 20px; margin-bottom: 12px;">
            <li style="margin-bottom: 6px;">Tab switches / window blur events — counted and logged with timestamps.</li>
            <li style="margin-bottom: 6px;">Browser resize beyond threshold — flags potential split-screen cheating.</li>
            <li style="margin-bottom: 6px;">Suspicious keystroke patterns — pasting, rapid copy, or automation detection.</li>
            <li style="margin-bottom: 6px;">Right-click context menu is disabled during the session.</li>
          </ul>
          <p style="color: #e2e8f0;"><strong>Consequence:</strong> Any breach is recorded in the <strong style="color: #e2e8f0;">Principal's Audit Trail</strong> and made visible to the teacher on the results dashboard. Repeated or severe violations may invalidate the attempt at the institution's discretion.</p>
        </div>
      `,
    },
    {
      title: "Proactive Recommendations",
      desc: "Post-exam, the AI agent identifies your 'Critical Gap Zones' and suggests specific revision paths for your curriculum.",
      icon: <Zap className="text-amber-500" />,
      color: "border-amber-400",
      detail: `
        <div style="text-align: left; font-size: 14px; line-height: 1.7; color: #cbd5e1;">
          <p style="margin-bottom: 12px; color: #e2e8f0;"><strong>How the AI analyses your performance:</strong></p>
          <ul style="padding-left: 20px; margin-bottom: 12px;">
            <li style="margin-bottom: 6px;">After submission, the agent reviews every <strong style="color: #e2e8f0;">incorrect answer</strong> across all subjects.</li>
            <li style="margin-bottom: 6px;">It groups mistakes by <strong style="color: #e2e8f0;">topic / skill area</strong> (e.g., Algebra, Data Interpretation, Grammar).</li>
            <li style="margin-bottom: 6px;">Using Groq, it generates a <strong style="color: #e2e8f0;">subject gap analysis</strong> — a plain-language diagnostic of <em>why</em> you struggled and <em>what</em> to study.</li>
            <li style="margin-bottom: 6px;">The AI Tutor then incorporates these gaps into your persistent <strong style="color: #e2e8f0;">study plan</strong>.</li>
          </ul>
          <p style="margin-bottom: 12px; color: #e2e8f0;"><strong>You get:</strong></p>
          <ul style="padding-left: 20px;">
            <li style="margin-bottom: 6px;">A personalised revision path tailored to your curriculum (CAPS, ZIMSEC, etc.).</li>
            <li style="margin-bottom: 6px;">Topic-level pass/fail breakdowns with trend lines over time.</li>
            <li style="margin-bottom: 6px;">AI-generated study recommendations — not just scores, but <em>what to do next</em>.</li>
          </ul>
        </div>
      `,
    },
    {
      title: "Universal Alignment",
      desc: "The marking logic automatically adjusts based on your registered subject and examination body as registered by institution.",
      icon: <LineChart className="text-emerald-600" />,
      color: "border-emerald-400",
      detail: `
        <div style="text-align: left; font-size: 14px; line-height: 1.7; color: #cbd5e1;">
          <p style="margin-bottom: 12px; color: #e2e8f0;"><strong>Curriculum-aware marking:</strong></p>
          <ul style="padding-left: 20px; margin-bottom: 12px;">
            <li style="margin-bottom: 6px;">Your school's <strong style="color: #e2e8f0;">curriculum</strong> (CAPS/NSC, ZIMSEC, IGCSE, etc.) is stored in your profile.</li>
            <li style="margin-bottom: 6px;">When a teacher uploads an exam, they tag it with the subject and curriculum.</li>
            <li style="margin-bottom: 6px;">The AI agent adjusts its grading criteria to match the examination body's standards.</li>
            <li style="margin-bottom: 6px;">Question extraction from PDF/DOCX preserves the original exam structure — the AI marks against <em>that specific paper's memo</em>.</li>
          </ul>
          <p style="margin-bottom: 12px; color: #e2e8f0;"><strong>Multi-tenant isolation:</strong></p>
          <ul style="padding-left: 20px;">
            <li style="margin-bottom: 6px;">Every school's data is segregated by <strong style="color: #e2e8f0;">schoolId</strong> — no cross-school data leaks.</li>
            <li style="margin-bottom: 6px;">Firestore Security Rules enforce that teachers can only see their own school's exams and students.</li>
            <li style="margin-bottom: 6px;">Billing tiers, currency, and locale settings are per-school, not global.</li>
          </ul>
        </div>
      `,
    },
  ];

  const handleStartExam = () => {
    Swal.fire({
      title: "Enter Access Code",
      input: "password",
      inputPlaceholder: "Enter 6-Digit Exam PIN",
      showCancelButton: true,
      confirmButtonText: "Initialize Session",
      confirmButtonColor: "#4f46e5",
      background: "#f8fafc",
    }).then((result) => {
      if (result.value) {
        // Here you would validate the PIN against Firestore
        Swal.fire({
          icon: "success",
          title: "Session Verified",
          text: "Agentic AI Marking is now live.",
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          navigate("/exam-session");
        });
      }
    });
  };

  const handleExit = () => {
    navigate("/")
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 transition-colors duration-500">

      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">

        {/* Left Column: AI Logic & Moderation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
            <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
              <BrainCircuit className="text-indigo-600 w-8 h-8" />
              Intelligence Briefing
            </h2>
            <p className="text-slate-500 mb-8 font-medium italic">How our Agentic AI processes your assessment:</p>

            <div className="grid sm:grid-cols-2 gap-6">
              {engineFeatures.map((feature, index) => (
                <div key={index} onClick={() => handleFeatureClick(feature)} className={`p-6 rounded-3xl border-l-4 bg-slate-50 dark:bg-slate-800/50 ${feature.color} hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer`}>
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-white">{feature.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Behavior Warnings */}
          <div onClick={handleModerationClick} className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-3xl p-6 flex items-start gap-4 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all">
            <AlertTriangle className="text-rose-600 shrink-0 mt-1" />
            <div>
              <h4 className="font-black text-rose-900 dark:text-rose-400 uppercase text-xs tracking-widest mb-1">Moderation Protocol</h4>
              <p className="text-sm text-rose-800/70 dark:text-rose-400/70">
                Refresh (F5), Tab-Switching, and Command-Keys are disabled. Any breach of protocol is logged instantly to the <b>Principal's Audit Trail</b>.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Rules & Start */}
        <div className="space-y-6">
          <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200 dark:shadow-none">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2 uppercase tracking-tight">
              <Lock className="w-5 h-5" />
              Secure Session
            </h3>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-sm font-medium opacity-90 italic">
                <CheckCircle className="w-4 h-4 shrink-0" /> Adaptive Timer
              </li>
              <li className="flex items-center gap-3 text-sm font-medium opacity-90 italic">
                <CheckCircle className="w-4 h-4 shrink-0" /> Anytime 24/7 Access
              </li>
              <li className="flex items-center gap-3 text-sm font-medium opacity-90 italic">
                <CheckCircle className="w-4 h-4 shrink-0" /> Auto-Save on Disconnect
              </li>
              <li className="flex items-center gap-3 text-sm font-medium opacity-90 italic">
                <CheckCircle className="w-4 h-4 shrink-0" /> Proctored Submission
              </li>
            </ul>

            <button

              className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-lg"
            >
              <Play className="fill-current w-5 h-5" /> START ASSESSMENT
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8">
            <h4 className="font-bold text-slate-800 dark:text-white mb-4">Exam Support</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Experiencing technical issues? Contact your School Admin or the IT Department immediately. Do not attempt to fix browser errors yourself during a live session.
            </p>
          </div>
        </div>


        {/* Header Bar */}
        <div className="max-w-6xl mx-auto flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
          </div>

          <button
            onClick={handleExit}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-white dark:bg-slate-900 text-rose-600 font-bold border border-rose-100 dark:border-rose-900/30 hover:bg-rose-600 hover:text-white transition-all duration-300 shadow-sm"
          >
            <LogOut size={18} />
            <span>Exit Center</span>
          </button>
        </div>
      </div>
    </div>
  );
}