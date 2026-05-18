import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

export default function PaymentSuccess() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const tier = params.get('tier');

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white rounded-3xl p-12 shadow-xl text-center max-w-md">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h1 className="text-2xl font-black text-slate-800 mb-2">Payment Successful!</h1>
                <p className="text-slate-500 mb-6">
                    Your school has been upgraded to the <strong className="capitalize">{tier}</strong> plan.
                </p>
                <button
                    onClick={() => navigate('/principal-dashboard')}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-indigo-500 transition-colors"
                >
                    Go to Dashboard →
                </button>
            </div>
        </div>
    );
}