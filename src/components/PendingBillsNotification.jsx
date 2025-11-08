import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchReceptionistPatients, fetchReceptionistBillingRequests } from '../features/receptionist/receptionistThunks';
import { 
  AlertCircle, 
  X, 
  DollarSign, 
  UserPlus, 
  Clock,
  Phone,
  User,
  CheckCircle,
  FileText,
  CreditCard
} from 'lucide-react';

export default function PendingBillsNotification({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { patients, loading, billingRequests, billingLoading } = useSelector((state) => state.receptionist);
  const [pendingBills, setPendingBills] = useState([]);
  const [reassignmentBills, setReassignmentBills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      console.log('🔍 Opening notification, fetching data...');
      // Fetch both consultation billing patients and billing requests
      Promise.all([
        dispatch(fetchReceptionistPatients()),
        dispatch(fetchReceptionistBillingRequests())
      ]).then((results) => {
        console.log('🔍 Fetch results:', {
          patients: results[0],
          billingRequests: results[1]
        });
      }).catch((error) => {
        console.error('🔍 Error fetching data:', error);
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [dispatch, isOpen]);

  useEffect(() => {
    if (patients.length > 0) {
      const pending = patients.filter(patient => {
        const status = getPatientStatus(patient);
        // Only log if patient has pending bills
        if (status !== 'All Paid') {
          console.log('Consultation Patient:', patient.name, 'Status:', status);
        }
        return status !== 'All Paid';
      });
      console.log('Pending consultation bills:', pending.length);
      setPendingBills(pending);
    } else {
      setPendingBills([]);
    }
  }, [patients]);

  useEffect(() => {
    if (billingRequests && billingRequests.length > 0) {
      const reassignmentPending = billingRequests.filter(request => {
        if (!request) return false;
        
        const isReassignment = request.type === 'reassignment_consultation' || request.isReassignedEntry || request.reassignmentRequest;
        if (!isReassignment) {
          return false;
        }

        const billingData = Array.isArray(request.billing) ? request.billing : request.billing ? [request.billing] : [];

        const hasUnpaid = billingData.some(bill =>
          bill &&
          (bill.status === 'No payments' ||
           bill.status === 'no payments' ||
           bill.status === 'pending' ||
           bill.status === 'partially_paid' ||
           bill.status === 'unpaid' ||
           bill.status === 'partial' ||
           (parseFloat(bill.remaining || 0) > 0))
        );

        if (billingData.length === 0) {
          return request.status === 'No payments' ||
            request.status === 'no payments' ||
            request.status === 'pending' ||
            request.status === 'Billing Generated' ||
            request.status === 'Billing_Pending' ||
            request.status === 'Billing_Generated' ||
            (request.status === 'Billing_Paid' && parseFloat(request.remaining || 0) > 0) ||
            (parseFloat(request.total || 0) > parseFloat(request.paid || 0));
        }

        return hasUnpaid;
      });

      setReassignmentBills(reassignmentPending);
    } else {
      setReassignmentBills([]);
    }
  }, [billingRequests]);

  const filterConsultationBilling = (billing = []) => {
    if (!billing || billing.length === 0) return [];

    const superInvoices = new Set();
    billing.forEach((bill) => {
      const consultationType = (bill.consultationType || '').toLowerCase();
      if (consultationType.startsWith('superconsultant') && bill.invoiceNumber) {
        superInvoices.add(bill.invoiceNumber);
      }
      if ((bill.meta?.source || '').toLowerCase() === 'superconsultant' && bill.invoiceNumber) {
        superInvoices.add(bill.invoiceNumber);
      }
    });

    return billing.filter((bill) => {
      const consultationType = (bill.consultationType || '').toLowerCase();
      if (consultationType.startsWith('superconsultant')) {
        return false;
      }
      if ((bill.meta?.source || '').toLowerCase() === 'superconsultant') {
        return false;
      }
      if (bill.invoiceNumber && superInvoices.has(bill.invoiceNumber)) {
        return false;
      }
      return ['consultation', 'registration', 'service'].includes((bill.type || '').toLowerCase());
    });
  };

  const computeOutstanding = (bill) => {
    if (!bill) return 0;
    const status = (bill.status || '').toLowerCase();
    if (['cancelled', 'refunded'].includes(status)) {
      return 0;
    }

    if (typeof bill.remaining === 'number') {
      return Math.max(0, bill.remaining);
    }

    const amount = parseFloat(bill.amount || 0) || 0;
    const paidAmount = parseFloat(bill.paidAmount || 0) || 0;
    const refundAmount = Array.isArray(bill.refunds)
      ? bill.refunds.reduce((sum, refund) => sum + (parseFloat(refund.amount) || 0), 0)
      : parseFloat(bill.refundAmount || 0) || 0;

    const effectivePaid = Math.max(paidAmount, refundAmount);
    const remaining = amount - effectivePaid;
    return Math.max(0, remaining);
  };

  const getPatientStatus = (patient) => {
    if (!patient?.billing || patient.billing.length === 0) {
      return 'Consultation Fee Required';
    }

    const consultationBilling = filterConsultationBilling(patient.billing);

    if (consultationBilling.length === 0) {
      // If only super-consultation bills exist, consider them settled for this workflow
      return 'All Paid';
    }

    let consultationOutstanding = 0;
    let registrationOutstanding = 0;
    let serviceOutstanding = 0;

    consultationBilling.forEach((bill) => {
      const outstanding = computeOutstanding(bill);
      if (outstanding <= 0.5) {
        return;
      }

      const type = (bill.type || '').toLowerCase();
      if (type === 'consultation' || bill.description?.toLowerCase().includes('consultation')) {
        consultationOutstanding += outstanding;
      } else if (type === 'registration') {
        registrationOutstanding += outstanding;
      } else if (type === 'service') {
        serviceOutstanding += outstanding;
      }
    });

    if (consultationOutstanding <= 0 && registrationOutstanding <= 0 && serviceOutstanding <= 0) {
      return 'All Paid';
    }

    if (consultationOutstanding > 0) {
      return 'Consultation Fee Pending';
    }

    if (registrationOutstanding > 0) {
      return 'Registration Fee Pending';
    }

    if (serviceOutstanding > 0) {
      return 'Service Charges Pending';
    }

    return 'Pending Payment';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'All Paid': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Consultation Fee Pending': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'Service Charges Pending': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'Registration Fee Pending': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'Consultation Fee Required': return <DollarSign className="h-4 w-4 text-red-500" />;
      case 'Registration Fee Required': return <UserPlus className="h-4 w-4 text-purple-500" />;
      case 'No Payments': return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'All Paid': return 'text-green-600 bg-green-100';
      case 'Consultation Fee Pending': return 'text-orange-600 bg-orange-100';
      case 'Service Charges Pending': return 'text-orange-600 bg-orange-100';
      case 'Registration Fee Pending': return 'text-orange-600 bg-orange-100';
      case 'Consultation Fee Required': return 'text-red-600 bg-red-100';
      case 'Registration Fee Required': return 'text-purple-600 bg-purple-100';
      case 'No Payments': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm  flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Pending Bills Notification</h2>
              <p className="text-sm text-slate-600">Patients requiring payment collection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading pending bills...</p>
            <p className="text-xs text-slate-500 mt-2">Fetching patient data...</p>
          </div>
        ) : (pendingBills.length === 0 && reassignmentBills.length === 0) ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-600 mb-2">All Clear!</h3>
            <p className="text-slate-600">No pending bills at the moment.</p>
            <p className="text-xs text-slate-500 mt-2">Total patients checked: {patients.length + (billingRequests?.length || 0)}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold text-orange-800">
                  {(pendingBills.length + reassignmentBills.length)} Patient{(pendingBills.length + reassignmentBills.length) !== 1 ? 's' : ''} Require{(pendingBills.length + reassignmentBills.length) === 1 ? 's' : ''} Payment
                </h3>
              </div>
              <p className="text-sm text-orange-700">
                Please collect the following pending payments from patients.
              </p>
              <div className="text-xs text-orange-600 mt-2">
                Consultation: {pendingBills.length}, Reassignment: {reassignmentBills.length}, Total: {pendingBills.length + reassignmentBills.length}
              </div>
            </div>

            {/* Consultation Fee Pending Bills */}
            {pendingBills.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">Consultation Fee Pending ({pendingBills.length})</h4>
                </div>
                <div className="grid gap-3">
                  {pendingBills.map((patient) => {
                    const status = getPatientStatus(patient);
                    const statusIcon = getStatusIcon(status);
                    const statusColor = getStatusColor(status);
                    
                    return (
                      <div key={patient._id} className="border border-blue-200 rounded-lg p-4 hover:bg-blue-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-800">{patient.name}</h4>
                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {patient.phone || 'No phone'}
                                  </div>
                                  <div>
                                    UH ID: {patient.uhId || 'Not assigned'}
                                  </div>
                                  <div>
                                    Doctor: {patient.assignedDoctor?.name || 'Not assigned'}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${statusColor}`}>
                                {statusIcon}
                                {status}
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-right text-sm text-slate-600">
                            <div>{patient.age} years, {patient.gender}</div>
                            <div className="text-xs text-slate-500">
                              {patient.email || 'No email'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reassignment Bills */}
            {reassignmentBills.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-purple-600" />
                  <h4 className="font-semibold text-purple-800">Reassignment Bills Pending ({reassignmentBills.length})</h4>
                </div>
                <div className="grid gap-3">
                  {reassignmentBills.map((request) => {
                    const patientName = request.patient?.name || request.patientName || 'Unknown Patient';
                    const patientPhone = request.patient?.phone || request.patientPhone || 'No phone';
                    const patientUhId = request.patient?.uhId || 'Not assigned';
                    const doctorName = request.doctor?.name || request.doctorName || 'Not assigned';
                    const patientAge = request.patient?.age || 'N/A';
                    const patientGender = request.patient?.gender || 'N/A';

                    const billingData = Array.isArray(request.billing) ? request.billing : request.billing ? [request.billing] : [];
                    const outstandingAmount = billingData.reduce((sum, bill) => {
                      const remaining = parseFloat(bill?.remaining || 0);
                      return Number.isFinite(remaining) ? sum + remaining : sum;
                    }, 0);

                    const statusLabel = (() => {
                      if (billingData.some(bill => bill?.status === 'partially_paid' || bill?.status === 'partial')) {
                        return 'Partially Paid';
                      }
                      if (billingData.some(bill => bill?.status === 'pending' || bill?.status === 'No payments' || bill?.status === 'no payments')) {
                        return 'Payment Pending';
                      }
                      if (outstandingAmount > 0) {
                        return 'Outstanding Balance';
                      }
                      return 'Payment Pending';
                    })();

                    return (
                      <div key={request._id} className="border border-purple-200 rounded-lg p-4 hover:bg-purple-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-purple-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-800">{patientName}</h4>
                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {patientPhone}
                                  </div>
                                  <div>
                                    UH ID: {patientUhId}
                                  </div>
                                  <div>
                                    Address: {patientAddress}
                                  </div>
                                  <div>
                                    Doctor: {doctorName}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-2">
                              <span className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-purple-100 text-purple-700">
                                <Clock className="h-3 w-3" />
                                {statusLabel}
                              </span>
                              {outstandingAmount > 0 && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                  Outstanding ₹{outstandingAmount.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right text-sm text-slate-600">
                            <div>{patientAge} years, {patientGender}</div>
                            <div className="text-xs text-purple-600 mt-1">
                              Bill #{request._id?.slice(-8)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <h4 className="font-semibold text-blue-800">Next Steps</h4>
              </div>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Navigate to Consultation Billing page to collect payments</li>
                <li>• Contact patients via phone to schedule payment collection</li>
                <li>• Update patient records after payment collection</li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Got it, Let's Collect Payments
          </button>
        </div>
      </div>
    </div>
  );
}
