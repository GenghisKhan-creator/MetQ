import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { CreditCard, FileText, CheckCircle, AlertCircle } from 'lucide-react';

const Invoices = () => {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                // Adjust endpoint based on user role
                const endpoint = user.role === 'patient'
                    ? 'http://localhost:5000/api/invoices/patient'
                    : 'http://localhost:5000/api/invoices/doctor';

                const res = await axios.get(endpoint, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setInvoices(res.data);
            } catch (err) {
                console.error('Failed to fetch invoices', err);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchInvoices();
        }
    }, [user]);

    const handlePayment = async (invoiceId) => {
        try {
            await axios.patch(`http://localhost:5000/api/invoices/${invoiceId}/status`,
                { status: 'paid' },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );

            setInvoices(invoices.map(inv =>
                inv.id === invoiceId ? { ...inv, status: 'paid' } : inv
            ));

            setMsg({ type: 'success', text: 'Payment processed successfully!' });
            setTimeout(() => setMsg({ type: '', text: '' }), 3000);
        } catch (err) {
            setMsg({ type: 'error', text: 'Payment failed. Please try again.' });
        }
    };

    if (loading) {
        return <div className="min-h-screen pt-32 pb-20 flex justify-center"><div className="w-12 h-12 border-4 border-medical-primary border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="min-h-screen pt-32 pb-20 px-8 bg-[#E2E8F0]">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-10">
                    <div className="p-4 bg-white rounded-2xl premium-shadow text-medical-primary">
                        <CreditCard size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Billing & Invoices</h1>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">
                            {user?.role === 'patient' ? 'Manage your medical bills' : 'Track patient payments'}
                        </p>
                    </div>
                </div>

                {msg.text && (
                    <div className={`mb-8 p-4 rounded-2xl text-sm font-bold border ${msg.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {msg.text}
                    </div>
                )}

                <div className="bg-white rounded-[3rem] premium-shadow border border-white overflow-hidden">
                    {invoices.length === 0 ? (
                        <div className="p-16 text-center">
                            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-xl font-black text-gray-900 mb-2">No Invoices Found</h3>
                            <p className="text-gray-500 font-medium">You don't have any pending or past invoices.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {invoices.map((invoice) => (
                                <div key={invoice.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-gray-50 transition-colors group">
                                    <div className="flex items-center gap-6">
                                        <div className={`p-4 rounded-2xl ${invoice.status === 'paid' ? 'bg-green-100 text-green-600' : invoice.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                            {invoice.status === 'paid' ? <CheckCircle size={24} /> : invoice.status === 'cancelled' ? <AlertCircle size={24} /> : <FileText size={24} />}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-gray-900">
                                                {user?.role === 'patient' ? `Dr. ${invoice.doctor_name || 'Clinic'}` : invoice.patient_name}
                                            </h4>
                                            <p className="text-sm font-medium text-gray-500 mb-1">{invoice.description}</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                {new Date(invoice.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-8 w-full md:w-auto">
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-gray-900">${parseFloat(invoice.amount).toFixed(2)}</div>
                                            <div className={`text-[10px] font-black uppercase tracking-widest mt-1 ${invoice.status === 'paid' ? 'text-green-600' : invoice.status === 'cancelled' ? 'text-red-500' : 'text-orange-500 animate-pulse'}`}>
                                                {invoice.status}
                                            </div>
                                        </div>

                                        {user?.role === 'patient' && invoice.status === 'unpaid' && (
                                            <button
                                                onClick={() => handlePayment(invoice.id)}
                                                className="px-6 py-3 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform premium-shadow"
                                            >
                                                Pay Now
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Invoices;
