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

  // Unified Agentic AI Intelligence Rules
  const engineFeatures = [
    {
      title: "Agentic AI Marking",
      desc: "Our Agentic AI doesn't just check keys; it understands context. It marks your answers against DBE/IEB/SACAI standards in real-time.",
      icon: <BrainCircuit className="text-indigo-600" />,
      color: "border-indigo-400"
    },
    {
      title: "Integrity Moderation",
      desc: "Behavioral tracking is active. Tab switching, browser resizing, or suspicious keystrokes trigger an instant moderation flag.",
      icon: <ShieldAlert className="text-rose-600" />,
      color: "border-rose-400"
    },
    {
      title: "Proactive Recommendations",
      desc: "Post-exam, the AI agent identifies your 'Critical Gap Zones' and suggests specific revision paths for your curriculum.",
      icon: <Zap className="text-amber-500" />,
      color: "border-amber-400"
    },
    {
      title: "Universal Alignment",
      desc: "The marking logic automatically adjusts based on your registered subject and examination body (CAPS, IEB, or SACAI).",
      icon: <LineChart className="text-emerald-600" />,
      color: "border-emerald-400"
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
      {/* Header Bar */}
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase text-slate-800 dark:text-white">
            EduCAT <span className="text-indigo-600">Secure Core</span>
          </h1>
        </div>

        <button
          onClick={handleExit}
          className="flex items-center gap-2 px-6 py-2 rounded-xl bg-white dark:bg-slate-900 text-rose-600 font-bold border border-rose-100 dark:border-rose-900/30 hover:bg-rose-600 hover:text-white transition-all duration-300 shadow-sm"
        >
          <LogOut size={18} />
          <span>Exit Center</span>
        </button>
      </div>

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
                <div key={index} className={`p-6 rounded-3xl border-l-4 bg-slate-50 dark:bg-slate-800/50 ${feature.color} hover:shadow-md transition-all`}>
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-white">{feature.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Behavior Warnings */}
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-3xl p-6 flex items-start gap-4">
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
              onClick={handleStartExam}
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

      </div>
    </div>
  );
}