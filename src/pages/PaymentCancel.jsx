import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function PaymentCancel() {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white rounded-3xl p-12 shadow-xl text-center max-w-md">
                <XCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                <h1 className="text-2xl font-black text-slate-800 mb-2">Payment Cancelled</h1>
                <p className="text-slate-500 mb-6">No charge was made. You can try again any time from your dashboard.</p>
                <button
                    onClick={() => navigate('/principal-dashboard')}
                    className="bg-slate-800 text-white px-8 py-3 rounded-2xl font-black hover:bg-slate-700 transition-colors"
                >
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
}
