import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import AccountantLayout from './AccountantLayout';
import { fetchReceptionistBillingRequests, generateReceptionistBill, markReceptionistBillPaid, updatePaidBill } from '../../features/receptionist/receptionistThunks';
import { Search, Filter, Plus, CheckCircle, FileText, IndianRupee, Hash, X, CreditCard, Receipt, Upload, Clock, Download, DollarSign, Building, Edit, Trash2 } from 'lucide-react';
import { API_CONFIG } from '../../config/environment';
import { applyRoundingAdjustment } from '../../utils/rounding';

const currencySymbol = '₹';

const resolveBillingTimestamp = (billing = {}, fallback) => {
  if (!billing) return fallback || null;

  const payments = Array.isArray(billing.payments) ? billing.payments : [];
  const firstPaymentWithTimestamp = payments.find((payment) => payment?.createdAt || payment?.timestamp);

  return (
    billing.generatedAt ||
    billing.createdAt ||
    billing.updatedAt ||
    firstPaymentWithTimestamp?.createdAt ||
    firstPaymentWithTimestamp?.timestamp ||
    fallback ||
    null
  );
};

const formatServerDateTime = (value, options) => {
  if (!value) return 'N/A';

  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }
    return date.toLocaleString('en-GB', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    });
  } catch (error) {
    console.error('Error formatting server timestamp:', value, error);
    return 'N/A';
  }
};

// Utility function to safely render object fields
const safeRender = (value, fallback = 'N/A') => {
  if (typeof value === 'string') return value || fallback;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  if (typeof value === 'object' && value !== null) {
    // If it's an object with a name property, return the name
    if (value.name && typeof value.name === 'string') return value.name;
    // If it's an object with other common properties, return the first string one
    const keys = Object.keys(value);
    for (const key of keys) {
      if (typeof value[key] === 'string') return value[key];
      if (typeof value[key] === 'number') return value[key].toString();
    }
    // If no string/number found, return fallback
    return fallback;
  }
  return fallback;
};

// Helper function to safely get nested object properties
const safeGet = (obj, path, fallback = 'N/A') => {
  if (!obj || typeof obj !== 'object') return fallback;
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return fallback;
    }
  }
  return safeRender(current, fallback);
};

// Enhanced safe render for table cells
const safeRenderCell = (value, fallback = 'N/A') => {
  try {
    const result = safeRender(value, fallback);
    // Ensure we always return a string
    return typeof result === 'string' ? result : fallback;
  } catch (error) {
    console.error('Error in safeRenderCell:', error, 'Value:', value);
    return fallback;
  }
};

// Ultra-safe render function for any value
const ultraSafeRender = (value, fallback = 'N/A') => {
  try {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value || fallback;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (Array.isArray(value)) return value.length > 0 ? value[0].toString() : fallback;
    if (typeof value === 'object') {
      // Try to find a string property
      for (const [key, val] of Object.entries(value)) {
        if (typeof val === 'string' && val) return val;
        if (typeof val === 'number') return val.toString();
      }
      return fallback;
    }
    return fallback;
  } catch (error) {
    console.error('Error in ultraSafeRender:', error, 'Value:', value);
    return fallback;
  }
};

const hasSampleBeenCollected = (request = {}) => {
  const normalizedStatus = (request.status || '').toLowerCase();
  if ([
    'sample_collection_scheduled',
    'sample_collected',
    'in_lab_testing',
    'testing_completed',
    'report_generated',
    'report_sent',
    'completed'
  ].includes(normalizedStatus)) {
    return true;
  }

  const sampleCollectionStatus = (request.sampleCollectionStatus || '').toLowerCase();
  if (['completed', 'sample_collected'].includes(sampleCollectionStatus)) {
    return true;
  }

  if (request.sampleCollectionActualDate) {
    return true;
  }

  return false;
};

function AccountantBilling() {
  const dispatch = useDispatch();
  const { billingRequests, loading, error } = useSelector((s) => s.receptionist);
  const { user, token } = useSelector((s) => s.auth); // Add auth state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [selected, setSelected] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(2);
  const [items, setItems] = useState([{ name: '', code: '', quantity: 1, unitPrice: 0 }]);
  const [taxes, setTaxes] = useState(0);
  const [discounts, setDiscounts] = useState(0);
  const [notes, setNotes] = useState('');
  
  // Discount management
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'amount'
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
const [customDiscountReason, setCustomDiscountReason] = useState('');
  
  // Center discount settings
  const [centerDiscountSettings, setCenterDiscountSettings] = useState({
    staff: 10,
    senior: 20,
    student: 15,
    employee: 10,
    insurance: 0,
    referral: 5,
    promotion: 10,
    charity: 100
  });
  const [centerBranding, setCenterBranding] = useState({
    name: '',
    phone: '',
    fax: '',
    website: '',
    logoUrl: ''
  });
  
  // ✅ NEW: Lab test search state
  const [testSearchTerm, setTestSearchTerm] = useState('');
  const [showTestDropdown, setShowTestDropdown] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(null);
  const [labTests, setLabTests] = useState([]);
  const [labTestsLoading, setLabTestsLoading] = useState(false);
  const [autoFetchingItems, setAutoFetchingItems] = useState(new Set());
  
  // ✅ NEW: Payment details state
  const [paymentDetails, setPaymentDetails] = useState({
    paymentMethod: '',
    transactionId: '',
    receiptUpload: '',
    paymentNotes: '',
    paymentAmount: 0
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedForPayment, setSelectedForPayment] = useState(null);
  
  // ✅ NEW: Cancel and Refund state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedForCancel, setSelectedForCancel] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedForRefund, setSelectedForRefund] = useState(null);
  const [cancelDetails, setCancelDetails] = useState({
    reason: '',
    initiateRefund: false
  });
  const [refundDetails, setRefundDetails] = useState({
    amount: 0,
    method: '',
    reason: '',
    notes: ''
  });

  // ✅ NEW: Edit Bill state
  const [showEditBillModal, setShowEditBillModal] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState(null);
  const [editBillItems, setEditBillItems] = useState([]);
  const [editBillTaxes, setEditBillTaxes] = useState(0);
  const [editBillDiscounts, setEditBillDiscounts] = useState(0);
  const [refundAmount, setRefundAmount] = useState(0);
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    if (user && token) {
      dispatch(fetchReceptionistBillingRequests());
    }
  }, [dispatch, user, token]);

  // Fetch center discount settings
  useEffect(() => {
    const fetchCenterDiscountSettings = async () => {
      if (!user?.centerId) return;
      
      try {
        const centerId = typeof user.centerId === 'object' ? user.centerId._id : user.centerId;
        const response = await API.get(`/centers/${centerId}/fees`);
        if (response.data?.discountSettings) {
          setCenterDiscountSettings(response.data.discountSettings);
        }
        if (response.data) {
          const derivedName =
            typeof user?.centerId === 'object' && user?.centerId?.name
              ? user.centerId.name
              : centerBranding.name;

          setCenterBranding((prev) => ({
            ...prev,
            name: derivedName || prev.name || 'Center',
            phone: response.data.mobileNumber || prev.phone,
            fax: response.data.fax || prev.fax,
            website: response.data.website || prev.website,
            logoUrl: resolveLogoUrl(response.data.logoUrl) || prev.logoUrl
          }));
        }
      } catch (error) {
        console.error('Error fetching center discount settings:', error);
      }
    };

    fetchCenterDiscountSettings();
  }, [user]);

  // Enhanced function to get partial payment data from localStorage
  const getPartialPaymentData = (requestId) => {
    const paymentKey = `partial_payment_${requestId}`;
    const payments = JSON.parse(localStorage.getItem(paymentKey) || '[]');
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Sort payments by timestamp (newest first)
    const sortedPayments = payments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return { 
      payments: sortedPayments, 
      totalPaid,
      paymentCount: payments.length,
      lastPayment: payments.length > 0 ? payments[payments.length - 1] : null
    };
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (billingRequests || [])
      .filter(r => {
        if (status === 'all') return true;
        if (status === 'payment_received') {
          return r.status === 'Billing_Generated' && r.billing?.status === 'payment_received';
        }
        if (status === 'Billing_Paid') {
          // Include Billing_Paid, Report_Sent, and Completed in Bill Paid & Verified filter
          return ['Billing_Paid', 'Report_Sent', 'Completed'].includes(r.status);
        }
        if (status === 'cancelled') {
          return r.billing?.status === 'cancelled';
        }
        if (status === 'refunded') {
          return r.billing?.status === 'refunded';
        }
        return r.status === status;
      })
      .filter(r => {
        if (paymentStatus === 'all') return true;
        
        const totalAmount = r.billing?.amount || 0;
        const paidAmount = r.billing?.paidAmount || 0;
        
        if (paymentStatus === 'unpaid') {
          return totalAmount > 0 && paidAmount === 0;
        }
        if (paymentStatus === 'full') {
          return totalAmount > 0 && paidAmount >= totalAmount;
        }
        
        return true;
      })
      .filter(r => !term || 
        `${r.patientName || ''} ${r.doctorName || ''} ${r.testType || ''}`.toLowerCase().includes(term));
  }, [billingRequests, search, status, paymentStatus]);

  // Pagination logic
  const totalPages = Math.ceil((filtered?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filtered?.slice(startIndex, endIndex) || [];


  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, paymentStatus]);

  // Pagination controls component
  const PaginationControls = () => {
    // Always show pagination if there are any filtered results
    if (!filtered || filtered.length === 0) return null;

    return (
      <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filtered?.length || 0)} of {filtered?.length || 0} results
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={2}>2</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              <span className="text-sm text-gray-600">per page</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-300"
              >
                Previous
              </button>
              
              {/* Page Numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded-md text-xs font-medium border ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const subTotal = items.reduce((s, it) => s + (Number(it.quantity || 0) * Number(it.unitPrice || 0)), 0);

  // Calculate discount based on type
  let calculatedDiscount = 0;
  if (discountType === 'percentage') {
    calculatedDiscount = subTotal * (discountPercentage / 100);
  } else if (discountType === 'amount') {
    calculatedDiscount = discountAmount || 0;
  } else {
    // Fallback to old discounts value
    calculatedDiscount = Number(discounts || 0);
  }

  const roundingDetails = applyRoundingAdjustment({
    subtotal: subTotal,
    taxes: Number(taxes || 0),
    discounts: calculatedDiscount
  });

  const grandTotal = Math.max(0, roundingDetails.roundedTotal);
  const rawGrandTotal = roundingDetails.rawTotal;
  const roundingDifference = roundingDetails.roundingDifference;

  // Calculate billing workflow statistics (including completed and Report_Sent)
  const workflowStats = useMemo(() => {
    const stats = {
      total: billingRequests?.length || 0,
      pending: billingRequests?.filter(r => r.status === 'Pending').length || 0,
      billingPending: billingRequests?.filter(r => r.status === 'Billing_Pending').length || 0,
      billingGenerated: billingRequests?.filter(r => r.status === 'Billing_Generated' && r.billing?.status !== 'cancelled' && r.billing?.status !== 'refunded').length || 0,
      paymentReceived: billingRequests?.filter(r => r.status === 'Billing_Generated' && r.billing?.status === 'payment_received').length || 0,
      billingPaid: billingRequests?.filter(r => r.status === 'Billing_Paid' || r.status === 'Report_Sent').length || 0,
      completed: billingRequests?.filter(r => r.status === 'Completed').length || 0,
      cancelled: billingRequests?.filter(r => r.billing?.status === 'cancelled').length || 0,
      refunded: billingRequests?.filter(r => r.billing?.status === 'refunded').length || 0
    };
    return stats;
  }, [billingRequests]);

  const openBillModal = (req) => {
    setSelected(req);
    
    
    // ✅ NEW: Check for selectedTests first, then billing items, then fallback to testType
    if (req.billing?.items?.length) {
      // If bill already exists, use existing items
      setItems(req.billing.items.map(it => ({ 
        name: it.name, 
        code: it.code, 
        quantity: it.quantity, 
        unitPrice: it.unitPrice 
      })));
      setTaxes(req.billing.taxes || 0);
      setDiscounts(req.billing.discounts || 0);
      setNotes(req.billing.notes || '');
      const savedDiscountType = req.billing.discountType || 'amount';
      setDiscountType(savedDiscountType);
      if (savedDiscountType === 'percentage') {
        setDiscountPercentage(req.billing.discountPercentage || 0);
        setDiscountAmount(0);
      } else {
        setDiscountPercentage(0);
        setDiscountAmount(req.billing.discountAmount || 0);
      }
      const savedReason = req.billing.discountReason || '';
      const predefinedReasons = ['staff', 'senior', 'student', 'employee', 'insurance', 'referral', 'promotion', 'charity', ''];
      if (savedReason && !predefinedReasons.includes(savedReason)) {
        setDiscountReason('other');
        setCustomDiscountReason(savedReason);
      } else {
        setDiscountReason(savedReason);
        setCustomDiscountReason('');
      }
    } else if (req.selectedTests && Array.isArray(req.selectedTests) && req.selectedTests.length > 0) {
      // ✅ NEW: If selectedTests exist, automatically populate items
      setItems(req.selectedTests.map(test => ({
        name: test.testName || test.name,
        code: test.testCode || test.code || '',
        quantity: test.quantity || 1,
        unitPrice: test.cost || test.unitPrice || test.price || 0
      })));
      setTaxes(0);
      setDiscounts(0);
      setNotes('');
      // Reset discount fields
      setDiscountType('percentage');
      setDiscountPercentage(0);
      setDiscountAmount(0);
      setDiscountReason('');
      setCustomDiscountReason('');
      toast.success(`Automatically loaded ${req.selectedTests.length} test(s) from request with codes and prices`);
    } else {
      // Fallback to old method with testType
      console.log('⚠️ No selectedTests found, using testType fallback:', req.testType);
      const testNames = req.testType ? req.testType.split(',').map(t => t.trim()) : [''];
      
      if (testNames.length > 1) {
        // If multiple tests in testType, create separate items
        setItems(testNames.map(name => ({ 
          name, 
          code: '', 
          quantity: 1, 
          unitPrice: '' 
        })));
        
        // Auto-fetch details for each test immediately
        testNames.forEach((testName, index) => {
          // Start fetching immediately for each test
          autoFetchTestDetails(index, testName);
        });
        
        toast.info(`🔄 Auto-fetching codes & prices for ${testNames.length} tests...`, {
          autoClose: 3000
        });
      } else {
        // Single test
        setItems([{ name: req.testType || '', code: '', quantity: 1, unitPrice: '' }]);
        
        // Auto-fetch details for the single test immediately
        autoFetchTestDetails(0, req.testType || '');
        
        toast.info('🔄 Auto-fetching code & price from catalog...', {
          autoClose: 3000
        });
      }
      
      setTaxes(0);
      setDiscounts(0);
      setNotes('');
      // Reset discount fields
      setDiscountType('percentage');
      setDiscountPercentage(0);
      setDiscountAmount(0);
      setDiscountReason('');
      setCustomDiscountReason('');
    }
  };

  const closeBillModal = () => {
    setSelected(null);
    setTestSearchTerm('');
    setShowTestDropdown(false);
    setActiveItemIndex(null);
    // Reset discount fields
    setDiscountType('percentage');
    setDiscountPercentage(0);
    setDiscountAmount(0);
    setDiscountReason('');
    setCustomDiscountReason('');
  };

  // ✅ NEW: Search lab tests
  const searchLabTests = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      setLabTests([]);
      return;
    }
    
    setLabTestsLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/lab-tests/search?q=${encodeURIComponent(searchTerm)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLabTests(data.data || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error('Failed to search lab tests');
      }
    } catch (error) {
      toast.error('Network error while searching tests');
    } finally {
      setLabTestsLoading(false);
    }
  };

  // ✅ NEW: Auto-fetch test details for items without codes/prices
  const autoFetchTestDetails = async (itemIndex, testName) => {
    if (!testName || testName.trim().length < 2) return;
    
    // Mark this item as being auto-fetched
    setAutoFetchingItems(prev => new Set([...prev, itemIndex]));
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/lab-tests/search?q=${encodeURIComponent(testName.trim())}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const tests = data.data || [];
        
        // Try multiple matching strategies
        let exactMatch = null;
        
        // 1. Exact match by name
        exactMatch = tests.find(test => 
          test.testName.toLowerCase() === testName.toLowerCase()
        );
        
        // 2. If no exact match, try partial match
        if (!exactMatch) {
          exactMatch = tests.find(test => 
            test.testName.toLowerCase().includes(testName.toLowerCase()) ||
            testName.toLowerCase().includes(test.testName.toLowerCase())
          );
        }
        
        // 3. If still no match, try code match
        if (!exactMatch) {
          exactMatch = tests.find(test => 
            test.testCode.toLowerCase() === testName.toLowerCase()
          );
        }
        
        if (exactMatch) {
          updateItem(itemIndex, {
            code: exactMatch.testCode,
            unitPrice: exactMatch.cost
          });
          // Remove the toast notification to make it seamless
        } else {
        }
      }
    } catch (error) {
    } finally {
      // Remove this item from auto-fetching state
      setAutoFetchingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemIndex);
        return newSet;
      });
    }
  };

  // ✅ NEW: Handle test selection from dropdown
  const handleTestSelect = (test, idx) => {
    updateItem(idx, {
      name: test.testName,
      code: test.testCode,
      unitPrice: test.cost
    });
    setTestSearchTerm('');
    setShowTestDropdown(false);
    setActiveItemIndex(null);
    toast.success(`Added ${test.testName} - Code: ${test.testCode} - Price: ₹${test.cost}`);
  };

  // ✅ NEW: Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (testSearchTerm && showTestDropdown) {
        searchLabTests(testSearchTerm);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [testSearchTerm, showTestDropdown]);

  // ✅ NEW: Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTestDropdown && !event.target.closest('.relative')) {
        setShowTestDropdown(false);
        setActiveItemIndex(null);
        setTestSearchTerm('');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTestDropdown]);

  // ✅ NEW: Open payment modal
  const openPaymentModal = (req) => {
    setSelectedForPayment(req);
    const totalAmount = req.billing?.amount || 0;
    const paidAmount = req.billing?.paidAmount || 0;
    const remainingAmount = totalAmount - paidAmount;
    
    
    setPaymentDetails({
      paymentMethod: '',
      transactionId: '',
      receiptUpload: '',
      paymentNotes: '',
      paymentAmount: remainingAmount // Default to remaining amount (full payment required)
    });
    setShowPaymentModal(true);
  };

  // ✅ NEW: Close payment modal
  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedForPayment(null);
    setPaymentDetails({
      paymentMethod: '',
      transactionId: '',
      receiptUpload: '',
      paymentNotes: '',
      paymentAmount: 0
    });
  };

  // ✅ NEW: Open edit bill modal
  const openEditBillModal = (req) => {
    // Only Center Admin can edit paid bills
    const isCenterAdmin = user?.userType === 'centeradmin' || user?.role === 'Center Admin' || user?.userType === 'CenterAdmin';
    if (!isCenterAdmin) {
      toast.error('Only Center Admin can edit paid bills');
      return;
    }

    if (!req.billing || !req.billing.items || !Array.isArray(req.billing.items)) {
      toast.error('Bill data is not available or invalid');
      return;
    }

    setSelectedForEdit(req);
    // Initialize edit items from existing bill
    const initialItems = req.billing.items.map(item => ({
      name: item.name || '',
      code: item.code || '',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      _id: item._id // Keep item ID for reference
    }));
    setEditBillItems(initialItems);
    setEditBillTaxes(req.billing.taxes || 0);
    setEditBillDiscounts(req.billing.discounts || 0);
    setEditNotes(req.billing.notes || '');
    
    // Calculate initial refund amount (will be recalculated when items change)
    calculateRefund(req, initialItems, req.billing.taxes || 0, req.billing.discounts || 0);
    setShowEditBillModal(true);
  };

  // ✅ NEW: Calculate refund amount with proportional discount
  const calculateRefund = (req, items, taxes, discounts) => {
    const originalAmount = req.billing?.amount || 0;
    const originalSubTotal = req.billing?.items?.reduce((sum, item) => {
      return sum + (Number(item.quantity || 1) * Number(item.unitPrice || 0));
    }, 0) || originalAmount;
    const originalDiscounts = req.billing?.discounts || 0;
    const originalTaxes = req.billing?.taxes || 0;
    
    // Calculate new amount from remaining items
    const newSubTotal = items.reduce((sum, item) => {
      return sum + (Number(item.quantity || 1) * Number(item.unitPrice || 0));
    }, 0);
    
    const newTaxes = Number(taxes || 0);
    const newDiscounts = Number(discounts || 0);
    
    // Calculate removed items value (before discount)
    const removedSubTotal = originalSubTotal - newSubTotal;
    
    // Calculate proportional discount for removed items
    // If original sub-total was 460 and discount was 46, and we remove 360:
    // Proportional discount = (360 / 460) * 46 = 36
    let proportionalDiscountOnRemoved = 0;
    if (originalSubTotal > 0 && removedSubTotal > 0 && originalDiscounts > 0) {
      proportionalDiscountOnRemoved = (removedSubTotal / originalSubTotal) * originalDiscounts;
    }
    
    // Calculate proportional tax for removed items (if applicable)
    let proportionalTaxOnRemoved = 0;
    if (originalSubTotal > 0 && removedSubTotal > 0 && originalTaxes > 0) {
      proportionalTaxOnRemoved = (removedSubTotal / originalSubTotal) * originalTaxes;
    }
    
    // Refund = removed items value - proportional discount on removed items
    // This ensures the refund accounts for the discount the patient actually received
    const refund = removedSubTotal + proportionalTaxOnRemoved - proportionalDiscountOnRemoved;
    setRefundAmount(refund > 0 ? refund : 0);
    
    return refund;
  };

  // ✅ NEW: Update edit bill item
  const updateEditBillItem = (idx, patch) => {
    setEditBillItems(prev => {
      const updated = prev.map((it, i) => i === idx ? { ...it, ...patch } : it);
      // Recalculate refund when items change
      if (selectedForEdit) {
        calculateRefund(selectedForEdit, updated, editBillTaxes, editBillDiscounts);
      }
      return updated;
    });
  };

  // ✅ NEW: Update edit bill taxes
  const updateEditBillTaxes = (value) => {
    setEditBillTaxes(value);
    if (selectedForEdit) {
      calculateRefund(selectedForEdit, editBillItems, value, editBillDiscounts);
    }
  };

  // ✅ NEW: Update edit bill discounts
  const updateEditBillDiscounts = (value) => {
    setEditBillDiscounts(value);
    if (selectedForEdit) {
      calculateRefund(selectedForEdit, editBillItems, editBillTaxes, value);
    }
  };

  const resolveLogoUrl = (value) => {
    if (!value) return '';
    if (/^https?:\/\//i.test(value) || value.startsWith('data:')) {
      return value;
    }
    const normalized = value.startsWith('/') ? value : `/${value}`;
    return `${API_CONFIG.BASE_URL}${normalized}`;
  };

  // ✅ NEW: Remove item from edit bill
  const removeEditBillItem = (idx) => {
    setEditBillItems(prev => {
      if (prev.length <= 1) {
        toast.error('At least one item must remain in the bill');
        return prev;
      }
      const updated = prev.filter((_, i) => i !== idx);
      // Keep the original discounts for proportional calculation
      // The refund will calculate proportional discount automatically
      // Recalculate refund when items change (with original discounts for proportional calc)
      if (selectedForEdit) {
        calculateRefund(selectedForEdit, updated, editBillTaxes, editBillDiscounts);
      }
      return updated;
    });
  };

  // ✅ NEW: Handle update paid bill
  const handleUpdatePaidBill = async () => {
    if (!selectedForEdit) return;

    // Validate items
    const validItems = editBillItems.filter(item => item.name && item.name.trim() && Number(item.unitPrice) > 0);
    if (validItems.length === 0) {
      toast.error('At least one item must remain in the bill');
      return;
    }

    // Calculate new amounts
    const newSubTotal = validItems.reduce((sum, item) => {
      return sum + (Number(item.quantity || 1) * Number(item.unitPrice || 0));
    }, 0);
    const newTaxes = Number(editBillTaxes || 0);
    const newDiscounts = Number(editBillDiscounts || 0);
    const newAmount = newSubTotal + newTaxes - newDiscounts;
    const originalAmount = selectedForEdit.billing?.amount || 0;

    if (newAmount >= originalAmount) {
      toast.error('New bill amount cannot be greater than or equal to original amount. Remove items to generate refund.');
      return;
    }

    if (refundAmount <= 0) {
      toast.error('No refund amount calculated. Please remove items to generate a refund.');
      return;
    }

    try {
      const cleanedItems = validItems.map(item => ({
        name: item.name.trim(),
        code: item.code || '',
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice)
      }));

      const payload = {
        items: cleanedItems,
        taxes: newTaxes,
        discounts: newDiscounts,
        notes: editNotes,
        refundAmount: refundAmount,
        newAmount: newAmount,
        originalAmount: originalAmount
      };

      await dispatch(updatePaidBill({ requestId: selectedForEdit._id, payload })).unwrap();
      toast.success(`Bill updated successfully! Refund amount: ${currencySymbol}${refundAmount.toFixed(2)}`);
      setShowEditBillModal(false);
      setSelectedForEdit(null);
      dispatch(fetchReceptionistBillingRequests());
    } catch (e) {
      toast.error(e || 'Failed to update bill and process refund');
    }
  };

  // ✅ NEW: Close edit bill modal
  const closeEditBillModal = () => {
    setShowEditBillModal(false);
    setSelectedForEdit(null);
    setEditBillItems([]);
    setEditBillTaxes(0);
    setEditBillDiscounts(0);
    setRefundAmount(0);
    setEditNotes('');
  };

  const updateItem = (idx, patch) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const addItem = () => setItems(prev => [...prev, { name: '', code: '', quantity: 1, unitPrice: '' }]);
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleGenerate = async () => {
    if (!selected) return;
    
    // Validate and clean items data
    const validItems = items.filter(item => item.name && item.name.trim() && Number(item.unitPrice) > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one item with a name and valid price greater than 0');
      return;
    }
    
    // Convert items to proper format for backend
    const cleanedItems = validItems.map(item => ({
      name: item.name.trim(),
      code: item.code || '',
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice)
    }));
    
    // Calculate discount value
    let calculatedDiscountValue = 0;
    if (discountType === 'percentage') {
      calculatedDiscountValue = subTotal * (discountPercentage / 100);
    } else if (discountType === 'amount') {
      calculatedDiscountValue = discountAmount || 0;
    } else {
      calculatedDiscountValue = Number(discounts || 0);
    }
    
    if (discountReason === 'other' && !customDiscountReason.trim()) {
      toast.error('Please enter a custom discount reason');
      return;
    }

    const roundingDetailsForPayload = applyRoundingAdjustment({
      subtotal: subTotal,
      taxes: Number(taxes || 0),
      discounts: calculatedDiscountValue
    });

    const roundingDiscountDelta = roundingDetailsForPayload.adjustedDiscounts - calculatedDiscountValue;
    const adjustedDiscountAmount =
      discountType === 'amount'
        ? Number(((discountAmount || 0) + roundingDiscountDelta).toFixed(2))
        : undefined;

    const payload = { 
      items: cleanedItems, 
      taxes: roundingDetailsForPayload.adjustedTaxes, 
      discounts: roundingDetailsForPayload.adjustedDiscounts, 
      discountType: discountType,
      discountPercentage: discountType === 'percentage' ? discountPercentage : undefined,
      discountAmount: adjustedDiscountAmount,
      discountReason: discountReason === 'other' ? customDiscountReason.trim() : discountReason,
      currency: 'INR', 
      notes,
      rounding: {
        rawTotal: roundingDetailsForPayload.rawTotal,
        roundedTotal: roundingDetailsForPayload.roundedTotal,
        roundingDifference: roundingDetailsForPayload.roundingDifference
      }
    };
    

    
    try {
      await dispatch(generateReceptionistBill({ requestId: selected._id, payload })).unwrap();
      toast.success('Bill generated successfully');
      closeBillModal();
      dispatch(fetchReceptionistBillingRequests());
    } catch (e) {
      toast.error(e || 'Failed to generate bill');
    }
  };

  // ✅ NEW: Mark paid with full payment requirement
  const handleMarkPaid = async () => {
    if (!selectedForPayment) return;
    
    // Validate payment details
    if (!paymentDetails.paymentMethod || !paymentDetails.transactionId) {
      toast.error('Payment method and transaction ID are required');
      return;
    }
    
    const totalAmount = selectedForPayment.billing?.amount || 0;
    const paidAmount = selectedForPayment.billing?.paidAmount || 0;
    const remainingAmount = totalAmount - paidAmount;
    
    // Enforce full payment - calculate remaining amount and use that
    if (remainingAmount <= 0) {
      toast.error('No remaining balance. This bill has already been paid in full.');
      return;
    }
    
    // Always use the full remaining amount (full payment required)
    const paymentAmount = remainingAmount;
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('paymentMethod', paymentDetails.paymentMethod);
      formData.append('transactionId', paymentDetails.transactionId);
      formData.append('paymentNotes', paymentDetails.paymentNotes || '');
      formData.append('paymentAmount', paymentAmount.toString());
      
      // Add current paid amount and total amount for backend calculation
      formData.append('currentPaidAmount', paidAmount.toString());
      formData.append('totalAmount', totalAmount.toString());
      
      // Add receipt file if uploaded
      if (paymentDetails.receiptUpload && paymentDetails.receiptUpload instanceof File) {
        formData.append('receiptFile', paymentDetails.receiptUpload);
      }
      
      
      // Try alternative API structure if the current one doesn't work
      let response;
      try {
        // First try: FormData approach
        response = await fetch(`${API_CONFIG.BASE_URL}/billing/test-requests/${selectedForPayment._id}/mark-paid`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });
      } catch (error) {
        // Second try: JSON approach
        const jsonPayload = {
          paymentMethod: paymentDetails.paymentMethod,
          transactionId: paymentDetails.transactionId,
          paymentNotes: paymentDetails.paymentNotes || '',
          paymentAmount: paymentAmount,
          currentPaidAmount: paidAmount,
          totalAmount: totalAmount
        };
        
        response = await fetch(`${API_CONFIG.BASE_URL}/billing/test-requests/${selectedForPayment._id}/mark-paid`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(jsonPayload)
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to record payment');
      }
      
      const responseData = await response.json();
      
      const newPaidAmount = paidAmount + paymentAmount;
      const isFullyPaid = newPaidAmount >= totalAmount;
      
      // Full payment is always required, so this should always be true
      if (isFullyPaid) {
        toast.success(`✅ Full payment completed! Test request #${selectedForPayment._id.slice(-6)} is now unlocked. Total paid: ${currencySymbol}${newPaidAmount.toFixed(2)}. Report access is now available.`);
      } else {
        toast.error(`Full payment required. Expected: ${currencySymbol}${remainingAmount.toFixed(2)}, but payment was recorded as ${currencySymbol}${paymentAmount.toFixed(2)}`);
        return;
      }
      
      closePaymentModal();
      dispatch(fetchReceptionistBillingRequests());
    } catch (e) {
      toast.error(e.message || 'Failed to record payment');
    }
  };

  // ✅ NEW: Handle file upload for receipt
  const handleReceiptUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a valid file type (PDF, JPEG, PNG, GIF, or WebP)');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      setPaymentDetails(prev => ({ ...prev, receiptUpload: file }));
    }
  };

  // ✅ NEW: Cancel bill functionality
  const openCancelModal = (req) => {
    setSelectedForCancel(req);
    const totalAmount = req.billing?.amount || 0;
    const paidAmount = req.billing?.paidAmount || 0;
    
    setCancelDetails({
      reason: '',
      initiateRefund: paidAmount > 0
    });
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setSelectedForCancel(null);
    setCancelDetails({
      reason: '',
      initiateRefund: false
    });
  };

  const handleCancelBill = async () => {
    if (!selectedForCancel) return;
    
    if (!cancelDetails.reason.trim()) {
      toast.error('Cancellation reason is required');
      return;
    }
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/billing/test-requests/${selectedForCancel._id}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cancellationReason: cancelDetails.reason
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel bill');
      }
      
      const responseData = await response.json();
      
      toast.success('Bill cancelled successfully');
      closeCancelModal();
      dispatch(fetchReceptionistBillingRequests());
      
      // If refund was initiated, show refund modal
      if (cancelDetails.initiateRefund && selectedForCancel.billing?.paidAmount > 0) {
        setTimeout(() => {
          openRefundModal(selectedForCancel);
        }, 1000);
      }
    } catch (error) {
      toast.error(`Failed to cancel bill: ${error.message}`);
    }
  };

  // ✅ NEW: Refund functionality
  const openRefundModal = (req) => {
    setSelectedForRefund(req);
    const totalAmount = req.billing?.amount || 0;
    const paidAmount = req.billing?.paidAmount || 0;
    
    setRefundDetails({
      amount: paidAmount,
      method: '',
      reason: '',
      notes: ''
    });
    setShowRefundModal(true);
  };

  const closeRefundModal = () => {
    setShowRefundModal(false);
    setSelectedForRefund(null);
    setRefundDetails({
      amount: 0,
      method: '',
      reason: '',
      notes: ''
    });
  };

  const handleProcessRefund = async () => {
    if (!selectedForRefund) return;
    
    if (!refundDetails.method || !refundDetails.reason || refundDetails.amount <= 0) {
      toast.error('Refund method, reason, and amount are required');
      return;
    }
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/billing/test-requests/${selectedForRefund._id}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: refundDetails.amount,
          refundMethod: refundDetails.method,
          reason: refundDetails.reason,
          notes: refundDetails.notes
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process refund');
      }
      
      const responseData = await response.json();
      
      toast.success(`Refund of ${currencySymbol}${refundDetails.amount.toFixed(2)} processed successfully`);
      closeRefundModal();
      
      // Refresh the billing requests to show updated status
      dispatch(fetchReceptionistBillingRequests());
    } catch (error) {
      toast.error(`Failed to process refund: ${error.message}`);
    }
  };

  // ✅ NEW: View invoice PDF in browser
  const handleViewInvoice = async (testRequestId) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/billing/test-requests/${testRequestId}/invoice`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
      
      // Create blob and open in new tab
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      toast.success('Invoice opened in new tab!');
    } catch (error) {
      toast.error(`Failed to view invoice: ${error.message}`);
    }
  };

  // ✅ NEW: Download invoice PDF
  const handleDownloadInvoice = async (testRequestId) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/billing/test-requests/${testRequestId}/invoice`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }
      
      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition ? 
        contentDisposition.split('filename=')[1]?.replace(/"/g, '') : 
        `invoice-${testRequestId}.pdf`;
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Invoice downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download invoice');
    }
  };

  // Error boundary for rendering
  const renderContent = () => {
    try {
      const selectedBillingTimestamp = selected
        ? resolveBillingTimestamp(selected.billing, selected.updatedAt || selected.createdAt)
        : null;
      const formattedSelectedBillingTimestamp = selectedBillingTimestamp
        ? formatServerDateTime(selectedBillingTimestamp)
        : null;

      const selectedForPaymentTimestamp = selectedForPayment
        ? resolveBillingTimestamp(selectedForPayment.billing, selectedForPayment.updatedAt || selectedForPayment.createdAt)
        : null;
      const formattedSelectedForPaymentTimestamp = selectedForPaymentTimestamp
        ? formatServerDateTime(selectedForPaymentTimestamp)
        : null;

      const selectedForCancelTimestamp = selectedForCancel
        ? resolveBillingTimestamp(selectedForCancel.billing, selectedForCancel.updatedAt || selectedForCancel.createdAt)
        : null;
      const formattedSelectedForCancelTimestamp = selectedForCancelTimestamp
        ? formatServerDateTime(selectedForCancelTimestamp)
        : null;

      const selectedForRefundTimestamp = selectedForRefund
        ? resolveBillingTimestamp(selectedForRefund.billing, selectedForRefund.updatedAt || selectedForRefund.createdAt)
        : null;
      const formattedSelectedForRefundTimestamp = selectedForRefundTimestamp
        ? formatServerDateTime(selectedForRefundTimestamp)
        : null;

      const selectedForEditTimestamp = selectedForEdit
        ? resolveBillingTimestamp(selectedForEdit.billing, selectedForEdit.updatedAt || selectedForEdit.createdAt)
        : null;
      const formattedSelectedForEditTimestamp = selectedForEditTimestamp
        ? formatServerDateTime(selectedForEditTimestamp)
        : null;
      
      return (
        <AccountantLayout>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                             {/* Professional Header */}
               <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-start gap-4">
                     {centerBranding.logoUrl && (
                       <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-lg border border-blue-100 bg-white shadow-sm">
                         <img
                           src={centerBranding.logoUrl}
                           alt={`${centerBranding.name || 'Center'} logo`}
                           className="object-contain max-h-full max-w-full p-1"
                         />
                       </div>
                     )}
                     <div>
                       <h1 className="text-2xl font-bold text-slate-800 mb-2">Billing Management</h1>
                       <p className="text-slate-600 text-sm">Generate bills, track payments, and manage test request workflow</p>
                       {(centerBranding.name || user?.centerId) && (
                         <div className="mt-2">
                           <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                             <Building className="mr-1 h-4 w-4" />
                             {centerBranding.name || user?.centerId?.name || 'Center'}
                           </span>
                         </div>
                       )}
                     </div>
                   </div>
                                     <div className="flex items-center space-x-3">
                     <button 
                       onClick={() => dispatch(fetchReceptionistBillingRequests())}
                       disabled={loading}
                       className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
                     >
                       <Search className="h-4 w-4 mr-2" />
                       Refresh
                     </button>
                     
                   </div>
                </div>
                
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <X className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-red-700 text-sm font-medium">{ultraSafeRender(error)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

                     {/* Billing Workflow Statistics */}
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
              <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100 hover:shadow-md transition-shadow duration-200">
               <div className="flex items-center justify-between">
                 <div>
                   <div className="text-2xl font-bold text-slate-800">{workflowStats.total}</div>
                   <div className="text-xs text-slate-600 mt-1">Total Requests</div>
                 </div>
                 <div className="bg-blue-100 rounded-lg p-2">
                   <FileText className="h-5 w-5 text-blue-600" />
                 </div>
               </div>
             </div>
             <div className="bg-white rounded-lg p-4 shadow-sm border border-yellow-100 hover:shadow-md transition-shadow duration-200">
               <div className="flex items-center justify-between">
                 <div>
                   <div className="text-2xl font-bold text-yellow-700">{workflowStats.pending + workflowStats.billingPending}</div>
                   <div className="text-xs text-slate-600 mt-1">Bill Pending</div>
                 </div>
                 <div className="bg-yellow-100 rounded-lg p-2">
                   <Clock className="h-5 w-5 text-yellow-600" />
                 </div>
               </div>
             </div>
             <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100 hover:shadow-md transition-shadow duration-200">
               <div className="flex items-center justify-between">
                 <div>
                   <div className="text-2xl font-bold text-blue-700">{workflowStats.billingGenerated}</div>
                   <div className="text-xs text-slate-600 mt-1">Bill Generated</div>
                 </div>
                 <div className="bg-blue-100 rounded-lg p-2">
                   <Receipt className="h-5 w-5 text-blue-600" />
                 </div>
               </div>
             </div>
             <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100 hover:shadow-md transition-shadow duration-200">
               <div className="flex items-center justify-between">
                 <div>
                   <div className="text-2xl font-bold text-green-700">{workflowStats.billingPaid}</div>
                   <div className="text-xs text-slate-600 mt-1">Bill Paid & Verified</div>
                 </div>
                 <div className="bg-green-100 rounded-lg p-2">
                   <CheckCircle className="h-5 w-5 text-green-600" />
                 </div>
               </div>
             </div>
             <div className="bg-white rounded-lg p-4 shadow-sm border border-emerald-100 hover:shadow-md transition-shadow duration-200">
               <div className="flex items-center justify-between">
                 <div>
                   <div className="text-2xl font-bold text-emerald-700">{workflowStats.completed}</div>
                   <div className="text-xs text-slate-600 mt-1">Completed</div>
                 </div>
                 <div className="bg-emerald-100 rounded-lg p-2">
                   <CheckCircle className="h-5 w-5 text-emerald-600" />
                 </div>
               </div>
             </div>
             <div className="bg-white rounded-lg p-4 shadow-sm border border-red-100 hover:shadow-md transition-shadow duration-200">
               <div className="flex items-center justify-between">
                 <div>
                   <div className="text-2xl font-bold text-red-700">{workflowStats.cancelled}</div>
                   <div className="text-xs text-slate-600 mt-1">Cancelled</div>
                 </div>
                 <div className="bg-red-100 rounded-lg p-2">
                   <X className="h-5 w-5 text-red-600" />
                 </div>
               </div>
             </div>
             <div className="bg-white rounded-lg p-4 shadow-sm border border-pink-100 hover:shadow-md transition-shadow duration-200">
               <div className="flex items-center justify-between">
                 <div>
                   <div className="text-2xl font-bold text-pink-700">{workflowStats.refunded}</div>
                   <div className="text-xs text-slate-600 mt-1">Refunded</div>
                 </div>
                 <div className="bg-pink-100 rounded-lg p-2">
                   <CreditCard className="h-5 w-5 text-pink-600" />
                 </div>
               </div>
             </div>
           </div>

          {/* Enhanced Search and Filter Section */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-100 p-4 mb-6">
            <div className="flex flex-col xl:flex-row gap-4">
              <div className="flex-1 relative min-w-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                  placeholder="Search by patient name, doctor name, or test type..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                />
              </div>
              <div className="relative min-w-[200px]">
                <select 
                  className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white" 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">All Billing Requests</option>
                  <option value="Pending">Bill Pending</option>
                  <option value="Billing_Pending">Billing Pending</option>
                  <option value="Billing_Generated">Bill Generated</option>
                  <option value="Billing_Paid">Bill Paid & Verified</option>
                  <option value="cancelled">Cancelled Bills</option>
                  <option value="refunded">Refunded Bills</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Filter className="h-5 w-5 text-slate-400" />
                </div>
              </div>
              <div className="relative min-w-[200px]">
                <select 
                  className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white" 
                  value={paymentStatus} 
                  onChange={(e) => setPaymentStatus(e.target.value)}
                >
                  <option value="all">All Payment Status</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="full">Fully Paid</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <DollarSign className="h-5 w-5 text-slate-400" />
                </div>
              </div>
              <button 
                onClick={() => dispatch(fetchReceptionistBillingRequests())}
                disabled={loading}
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm font-medium whitespace-nowrap"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Enhanced Main Table */}
          <div className="bg-white rounded-lg shadow-sm border border-blue-100 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600 text-lg">Loading billing requests...</p>
                <p className="text-slate-500 text-sm mt-2">Please wait while we fetch the latest data</p>
              </div>
            ) : filtered && filtered.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Patient</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Address</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Doctor</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Test</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.map((req, index) => {
                      const globalIndex = (currentPage - 1) * itemsPerPage + index;
                      const billingTimestamp = resolveBillingTimestamp(
                        req.billing,
                        req.updatedAt || req.createdAt,
                      );
                      const formattedBillingTimestamp = billingTimestamp
                        ? formatServerDateTime(billingTimestamp)
                        : null;
                      return (
                      <tr key={req._id} className={`hover:bg-slate-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                        <td className="px-3 py-2 text-xs">
                          <div className="font-medium text-slate-800">
                            #{globalIndex + 1} {ultraSafeRender(req.patientName) || ultraSafeRender(req.patientId?.name)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <div className="text-slate-700">
                            {ultraSafeRender(req.patientPhone) || ultraSafeRender(req.patientId?.phone)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <div className="text-slate-700 max-w-[150px] truncate" title={ultraSafeRender(req.patientAddress) || ultraSafeRender(req.patientId?.address)}>
                            {ultraSafeRender(req.patientAddress) || ultraSafeRender(req.patientId?.address)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <div className="font-medium text-slate-800 max-w-[120px] truncate" title={ultraSafeRender(req.doctorName) || ultraSafeRender(req.doctorId?.name)}>
                            {ultraSafeRender(req.doctorName) || ultraSafeRender(req.doctorId?.name)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <div className="text-slate-700 max-w-[150px] truncate" title={ultraSafeRender(req.testType)}>
                            {ultraSafeRender(req.testType)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            ultraSafeRender(req.status) === 'Pending' ? 'bg-gray-50 text-gray-700 border-gray-300' :
                            ultraSafeRender(req.status) === 'Billing_Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                            ultraSafeRender(req.status) === 'Billing_Generated' && ultraSafeRender(req.billing?.status) === 'payment_received' ? 'bg-orange-50 text-orange-700 border-orange-300' :
                            ultraSafeRender(req.status) === 'Billing_Generated' && ultraSafeRender(req.billing?.status) === 'cancelled' ? 'bg-red-50 text-red-700 border-red-300' :
                            ultraSafeRender(req.status) === 'Billing_Generated' && ultraSafeRender(req.billing?.status) === 'refunded' ? 'bg-pink-50 text-pink-700 border-pink-300' :
                            ultraSafeRender(req.status) === 'Billing_Generated' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                            ultraSafeRender(req.status) === 'Billing_Paid' ? 'bg-green-50 text-green-700 border-green-300' :
                            ultraSafeRender(req.status) === 'Report_Sent' ? 'bg-green-50 text-green-700 border-green-300' :
                            ultraSafeRender(req.status) === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                            'bg-slate-50 text-slate-700 border-slate-300'
                          }`}>
                            {ultraSafeRender(req.status) === 'Billing_Generated' && ultraSafeRender(req.billing?.status) === 'payment_received' 
                              ? 'Payment Received' 
                              : ultraSafeRender(req.status) === 'Billing_Generated' && ultraSafeRender(req.billing?.status) === 'cancelled'
                              ? 'Bill Cancelled'
                              : ultraSafeRender(req.status) === 'Billing_Generated' && ultraSafeRender(req.billing?.status) === 'refunded'
                              ? 'Bill Refunded'
                              : ultraSafeRender(req.status) === 'Report_Sent'
                              ? 'Bill Paid'
                              : ultraSafeRender(req.status)?.replace(/_/g, ' ') || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {req.billing && typeof req.billing.amount === 'number' ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-800">
                                {currencySymbol}{req.billing.amount.toFixed(2)}
                              </div>
                              {formattedBillingTimestamp && (
                                <div className="text-[10px] text-slate-500">
                                  Bill generated: {formattedBillingTimestamp}
                                </div>
                              )}
                              {(() => {
                                const backendPaidAmount = req.billing.paidAmount || 0;
                                const totalAmount = req.billing.amount;
                                
                                // Check if bill is fully paid by status
                                const isFullyPaidByStatus = req.billing?.status === 'paid' || 
                                                          req.billing?.status === 'verified' ||
                                                          req.status === 'Report_Sent';
                                
                                // If status indicates paid but paidAmount is 0, assume full amount was paid
                                let actualPaidAmount;
                                if (isFullyPaidByStatus && backendPaidAmount === 0) {
                                  actualPaidAmount = totalAmount;
                                } else {
                                  actualPaidAmount = backendPaidAmount;
                                }
                                
                                const remainingAmount = totalAmount - actualPaidAmount;
                                const isFullyPaid = isFullyPaidByStatus || actualPaidAmount >= totalAmount;
                                
                                return (
                                  <div className="text-[10px]">
                                    {!isFullyPaid && remainingAmount > 0 && (
                                      <div className="text-orange-600 font-medium">
                                        Rem: {currencySymbol}{remainingAmount.toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1.5">
                            {ultraSafeRender(req.status) === 'Pending' && (
                              <span className="inline-flex items-center text-gray-600 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                                Awaiting
                              </span>
                            )}
                            {ultraSafeRender(req.status) === 'Billing_Pending' && (
                              <button 
                                onClick={() => openBillModal(req)} 
                                className="inline-flex items-center px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-medium hover:bg-blue-700 transition-colors duration-200"
                              >
                                <Plus className="h-2.5 w-2.5 mr-0.5" /> Generate
                              </button>
                            )}
                            {ultraSafeRender(req.status) === 'Billing_Generated' && (
                              <>
                                
                                
                                <button 
                                  onClick={() => handleViewInvoice(req._id)} 
                                  className="inline-flex items-center px-2 py-1 bg-green-600 text-white rounded text-[10px] font-medium hover:bg-green-700 transition-colors duration-200"
                                  title="View Invoice"
                                >
                                  <FileText className="h-2.5 w-2.5 mr-0.5" /> View
                                </button>
                                
                                {/* Show payment button for bills with remaining balance */}
                                {(() => {
                                  const backendPaidAmount = req.billing?.paidAmount || 0;
                                  const totalAmount = req.billing?.amount || 0;
                                  
                                  // Check if bill is fully paid by status
                                  const isFullyPaidByStatus = req.billing?.status === 'paid' || 
                                                            req.billing?.status === 'verified' ||
                                                            req.status === 'Report_Sent';
                                  
                                  // Calculate actual paid amount
                                  let actualPaidAmount;
                                  if (isFullyPaidByStatus && backendPaidAmount === 0) {
                                    actualPaidAmount = totalAmount;
                                  } else {
                                    actualPaidAmount = backendPaidAmount;
                                  }
                                  
                                  const remainingAmount = totalAmount - actualPaidAmount;
                                  const hasRemainingBalance = remainingAmount > 0;
                                  
                                  // Show payment button if there's remaining balance (but only allow full payment)
                                  return hasRemainingBalance ? (
                                    <button 
                                      onClick={() => openPaymentModal(req)} 
                                      className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-medium transition-colors duration-200 ${
                                        actualPaidAmount > 0 ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                      }`}
                                      title={actualPaidAmount > 0 ? 'Add Payment' : 'Record Payment'}
                                    >
                                      <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> 
                                      Pay
                                    </button>
                                  ) : null;
                                })()}
                                
                                <button 
                                  onClick={() => handleDownloadInvoice(req._id)} 
                                  className="inline-flex items-center px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-medium hover:bg-blue-700 transition-colors duration-200"
                                  title="Download Invoice"
                                >
                                  <Download className="h-2.5 w-2.5 mr-0.5" /> Download
                                </button>
                                
                                {/* Cancel Bill Button - Only show if not already cancelled or refunded */}
                                {req.billing?.status !== 'cancelled' && req.billing?.status !== 'refunded' && !hasSampleBeenCollected(req) && (
                                  <button 
                                    onClick={() => openCancelModal(req)} 
                                    className="inline-flex items-center px-2 py-1 bg-red-600 text-white rounded text-[10px] font-medium hover:bg-red-700 transition-colors duration-200"
                                    title="Cancel Bill"
                                  >
                                    <X className="h-2.5 w-2.5 mr-0.5" /> Cancel
                                  </button>
                                )}
                              </>
                            )}
                                                                                     {ultraSafeRender(req.status) === 'Billing_Paid' && (
                              <>
                                
                                <button 
                                  onClick={() => handleViewInvoice(req._id)} 
                                  className="inline-flex items-center px-2 py-1 bg-green-600 text-white rounded text-[10px] font-medium hover:bg-green-700 transition-colors duration-200"
                                  title="View Invoice"
                                >
                                  <FileText className="h-2.5 w-2.5 mr-0.5" /> View
                                </button>
                                
                                {/* Edit Bill Button - Only for Center Admin to remove unperformed tests */}
                                {(user?.userType === 'centeradmin' || user?.role === 'Center Admin' || user?.userType === 'CenterAdmin') && (
                                  <button 
                                    onClick={() => openEditBillModal(req)} 
                                    className="inline-flex items-center px-2 py-1 bg-orange-600 text-white rounded text-[10px] font-medium hover:bg-orange-700 transition-colors duration-200"
                                    title="Edit Bill"
                                  >
                                    <Edit className="h-2.5 w-2.5 mr-0.5" /> Edit
                                  </button>
                                )}
                                
                                {/* Show payment button for bills with remaining balance */}
                                {(() => {
                                  const backendPaidAmount = req.billing?.paidAmount || 0;
                                  const totalAmount = req.billing?.amount || 0;
                                  
                                  // Check if bill is fully paid by status
                                  const isFullyPaidByStatus = req.billing?.status === 'paid' || 
                                                            req.billing?.status === 'verified' ||
                                                            req.status === 'Report_Sent';
                                  
                                  // Calculate actual paid amount
                                  let actualPaidAmount;
                                  if (isFullyPaidByStatus && backendPaidAmount === 0) {
                                    actualPaidAmount = totalAmount;
                                  } else {
                                    actualPaidAmount = backendPaidAmount;
                                  }
                                  
                                  const remainingAmount = totalAmount - actualPaidAmount;
                                  const hasRemainingBalance = remainingAmount > 0;
                                  
                                  // Show payment button if there's remaining balance (but only allow full payment)
                                  return hasRemainingBalance ? (
                                    <button 
                                      onClick={() => openPaymentModal(req)} 
                                      className="inline-flex items-center px-2 py-1 bg-purple-600 text-white rounded text-[10px] font-medium hover:bg-purple-700 transition-colors duration-200"
                                      title="Add Payment"
                                    >
                                      <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Pay
                                    </button>
                                  ) : null;
                                })()}
                                
                                <button 
                                  onClick={() => handleDownloadInvoice(req._id)} 
                                  className="inline-flex items-center px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-medium hover:bg-blue-700 transition-colors duration-200"
                                  title="Download Invoice"
                                >
                                  <Download className="h-2.5 w-2.5 mr-0.5" /> Download
                                </button>
                                
                                {/* Cancel Bill Button - Only show if not already cancelled or refunded */}
                                {req.billing?.status !== 'cancelled' && req.billing?.status !== 'refunded' && !hasSampleBeenCollected(req) && (
                                  <button 
                                    onClick={() => openCancelModal(req)} 
                                    className="inline-flex items-center px-2 py-1 bg-red-600 text-white rounded text-[10px] font-medium hover:bg-red-700 transition-colors duration-200"
                                    title="Cancel Bill"
                                  >
                                    <X className="h-2.5 w-2.5 mr-0.5" /> Cancel
                                  </button>
                                )}
                              </>
                            )}
                            {ultraSafeRender(req.status) === 'Report_Sent' && (
                              <>
                                
                                <button 
                                  onClick={() => handleViewInvoice(req._id)} 
                                  className="inline-flex items-center px-2 py-1 bg-green-600 text-white rounded text-[10px] font-medium hover:bg-green-700 transition-colors duration-200"
                                  title="View Invoice"
                                >
                                  <FileText className="h-2.5 w-2.5 mr-0.5" /> View
                                </button>
                                
                                {/* Edit Bill Button - Only for Center Admin to remove unperformed tests */}
                                {(user?.userType === 'centeradmin' || user?.role === 'Center Admin' || user?.userType === 'CenterAdmin') && (
                                  <button 
                                    onClick={() => openEditBillModal(req)} 
                                    className="inline-flex items-center px-2 py-1 bg-orange-600 text-white rounded text-[10px] font-medium hover:bg-orange-700 transition-colors duration-200"
                                    title="Edit Bill"
                                  >
                                    <Edit className="h-2.5 w-2.5 mr-0.5" /> Edit
                                  </button>
                                )}
                                
                                {/* Show payment button for bills with remaining balance */}
                                {(() => {
                                  const backendPaidAmount = req.billing?.paidAmount || 0;
                                  const totalAmount = req.billing?.amount || 0;
                                  
                                  // Check if bill is fully paid by status
                                  const isFullyPaidByStatus = req.billing?.status === 'paid' || 
                                                            req.billing?.status === 'verified' ||
                                                            req.status === 'Report_Sent';
                                  
                                  // Calculate actual paid amount
                                  let actualPaidAmount;
                                  if (isFullyPaidByStatus && backendPaidAmount === 0) {
                                    actualPaidAmount = totalAmount;
                                  } else {
                                    actualPaidAmount = backendPaidAmount;
                                  }
                                  
                                  const remainingAmount = totalAmount - actualPaidAmount;
                                  const hasRemainingBalance = remainingAmount > 0;
                                  
                                  // Show payment button if there's remaining balance (but only allow full payment)
                                  return hasRemainingBalance ? (
                                    <button 
                                      onClick={() => openPaymentModal(req)} 
                                      className="inline-flex items-center px-2 py-1 bg-purple-600 text-white rounded text-[10px] font-medium hover:bg-purple-700 transition-colors duration-200"
                                      title="Add Payment"
                                    >
                                      <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Pay
                                    </button>
                                  ) : null;
                                })()}
                                
                                <button 
                                  onClick={() => handleDownloadInvoice(req._id)} 
                                  className="inline-flex items-center px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-medium hover:bg-blue-700 transition-colors duration-200"
                                  title="Download Invoice"
                                >
                                  <Download className="h-2.5 w-2.5 mr-0.5" /> Download
                                </button>
                                
                                {/* Cancel Bill Button - Only show if not already cancelled or refunded */}
                                {req.billing?.status !== 'cancelled' && req.billing?.status !== 'refunded' && !hasSampleBeenCollected(req) && (
                                  <button 
                                    onClick={() => openCancelModal(req)} 
                                    className="inline-flex items-center px-2 py-1 bg-red-600 text-white rounded text-[10px] font-medium hover:bg-red-700 transition-colors duration-200"
                                    title="Cancel Bill"
                                  >
                                    <X className="h-2.5 w-2.5 mr-0.5" /> Cancel
                                  </button>
                                )}
                              </>
                            )}
                            {ultraSafeRender(req.status) === 'Completed' && (
                              <>
                                
                                <button 
                                  onClick={() => handleViewInvoice(req._id)} 
                                  className="inline-flex items-center px-2 py-1 bg-green-600 text-white rounded text-[10px] font-medium hover:bg-green-700 transition-colors duration-200"
                                  title="View Invoice"
                                >
                                  <FileText className="h-2.5 w-2.5 mr-0.5" /> View
                                </button>
                                
                                {/* Edit Bill Button - Only for Center Admin to remove unperformed tests */}
                                {(user?.userType === 'centeradmin' || user?.role === 'Center Admin' || user?.userType === 'CenterAdmin') && (
                                  <button 
                                    onClick={() => openEditBillModal(req)} 
                                    className="inline-flex items-center px-2 py-1 bg-orange-600 text-white rounded text-[10px] font-medium hover:bg-orange-700 transition-colors duration-200"
                                    title="Edit Bill"
                                  >
                                    <Edit className="h-2.5 w-2.5 mr-0.5" /> Edit
                                  </button>
                                )}
                                
                                {/* Show payment button for bills with remaining balance */}
                                {(() => {
                                  const backendPaidAmount = req.billing?.paidAmount || 0;
                                  const totalAmount = req.billing?.amount || 0;
                                  
                                  // Check if bill is fully paid by status
                                  const isFullyPaidByStatus = req.billing?.status === 'paid' || 
                                                            req.billing?.status === 'verified' ||
                                                            req.status === 'Report_Sent';
                                  
                                  // Calculate actual paid amount
                                  let actualPaidAmount;
                                  if (isFullyPaidByStatus && backendPaidAmount === 0) {
                                    actualPaidAmount = totalAmount;
                                  } else {
                                    actualPaidAmount = backendPaidAmount;
                                  }
                                  
                                  const remainingAmount = totalAmount - actualPaidAmount;
                                  const hasRemainingBalance = remainingAmount > 0;
                                  
                                  // Show payment button if there's remaining balance (but only allow full payment)
                                  return hasRemainingBalance ? (
                                    <button 
                                      onClick={() => openPaymentModal(req)} 
                                      className="inline-flex items-center px-2 py-1 bg-purple-600 text-white rounded text-[10px] font-medium hover:bg-purple-700 transition-colors duration-200"
                                      title="Add Payment"
                                    >
                                      <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Pay
                                    </button>
                                  ) : null;
                                })()}
                                
                                <button 
                                  onClick={() => handleDownloadInvoice(req._id)} 
                                  className="inline-flex items-center px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-medium hover:bg-blue-700 transition-colors duration-200"
                                  title="Download Invoice"
                                >
                                  <Download className="h-2.5 w-2.5 mr-0.5" /> Download
                                </button>
                                
                                {/* Cancel Bill Button - Only show if not already cancelled or refunded */}
                                {req.billing?.status !== 'cancelled' && req.billing?.status !== 'refunded' && !hasSampleBeenCollected(req) && (
                                  <button 
                                    onClick={() => openCancelModal(req)} 
                                    className="inline-flex items-center px-2 py-1 bg-red-600 text-white rounded text-[10px] font-medium hover:bg-red-700 transition-colors duration-200"
                                    title="Cancel Bill"
                                  >
                                    <X className="h-2.5 w-2.5 mr-0.5" /> Cancel
                                  </button>
                                )}
                              </>
                            )}
                            
                            {/* Special handling for cancelled bills */}
                            {req.billing?.status === 'cancelled' && (
                              <>
                                <button 
                                  onClick={() => handleViewInvoice(req._id)} 
                                  className="inline-flex items-center px-2 py-1 bg-gray-600 text-white rounded text-[10px] font-medium hover:bg-gray-700 transition-colors duration-200"
                                  title="View Invoice"
                                >
                                  <FileText className="h-2.5 w-2.5 mr-0.5" /> View
                                </button>
                                
                                {/* Process Refund Button - Only show if there was payment */}
                                {req.billing?.paidAmount > 0 && (
                                  <button 
                                    onClick={() => openRefundModal(req)} 
                                    className="inline-flex items-center px-2 py-1 bg-pink-600 text-white rounded text-[10px] font-medium hover:bg-pink-700 transition-colors duration-200"
                                    title="Process Refund"
                                  >
                                    <CreditCard className="h-2.5 w-2.5 mr-0.5" /> Refund
                                  </button>
                                )}
                              </>
                            )}
                            
                            {/* Special handling for refunded bills */}
                            {req.billing?.status === 'refunded' && (
                              <>
                                <button 
                                  onClick={() => handleViewInvoice(req._id)} 
                                  className="inline-flex items-center px-2 py-1 bg-gray-600 text-white rounded text-[10px] font-medium hover:bg-gray-700 transition-colors duration-200"
                                  title="View Invoice"
                                >
                                  <FileText className="h-2.5 w-2.5 mr-0.5" /> View
                                </button>
                                
                                <span className="inline-flex items-center px-2 py-1 bg-pink-100 text-pink-700 rounded text-[10px] font-medium">
                                  <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Refunded
                                </span>
                              </>
                            )}

                                                     </div>
                         </td>
                       </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="text-slate-400 mb-6">
                  <FileText className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-3">No billing requests found</h3>
                <p className="text-slate-600 mb-4 max-w-md mx-auto">
                  Billing requests will appear here when doctors create test requests. As a receptionist, you can handle the billing workflow for test requests.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">Billing Workflow:</h4>
                  <div className="flex flex-wrap justify-center items-center gap-2 text-xs text-blue-700">
                    <span className="bg-blue-100 px-2 py-1 rounded">Pending</span>
                    <span>→</span>
                    <span className="bg-blue-100 px-2 py-1 rounded">Bill Pending</span>
                    <span>→</span>
                    <span className="bg-blue-100 px-2 py-1 rounded">Bill Generated</span>
                    <span>→</span>
                    <span className="bg-blue-100 px-2 py-1 rounded">Bill Paid & Verified</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Pagination Controls */}
          <PaginationControls />

          {/* Enhanced Bill Generation Modal */}
          {selected && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
              <div className="bg-white w-full max-w-6xl max-h-[95vh] rounded-xl shadow-2xl border border-slate-200 flex flex-col my-4">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-start gap-4">
                    {centerBranding.logoUrl && (
                      <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-lg border border-blue-100 bg-white shadow-sm">
                        <img
                          src={centerBranding.logoUrl}
                          alt={`${centerBranding.name || 'Center'} logo`}
                          className="object-contain max-h-full max-w-full p-1"
                        />
                      </div>
                    )}
                    <div>
                      <div className="text-sm text-slate-500 font-medium">Generate Invoice</div>
                      <div className="text-xl font-bold text-slate-800 mt-1">
                        {ultraSafeRender(selected.patientName) || ultraSafeRender(selected.patientId?.name)} - {ultraSafeRender(selected.testType)}
                      </div>
                      <div className="text-sm text-slate-600 mt-2">
                        <span className="font-medium">Doctor:</span> {ultraSafeRender(selected.doctorName) || ultraSafeRender(selected.doctorId?.name)} | 
                        <span className="font-medium ml-2">Center:</span> {centerBranding.name || ultraSafeRender(selected.centerName)}
                      </div>
                      {selected?.billing?.invoiceNumber && formattedSelectedBillingTimestamp && (
                        <div className="text-xs text-slate-500 mt-1">
                          Bill generated on {formattedSelectedBillingTimestamp}
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={closeBillModal} className="p-2 rounded-lg hover:bg-white/50 transition-colors duration-200">
                    <X className="h-6 w-6 text-slate-600" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="text-left text-sm font-semibold text-slate-600 border-b border-slate-200">
                          <th className="py-3 px-4">Item</th>
                          <th className="py-3 px-4">Code</th>
                          <th className="py-3 px-4">Qty</th>
                          <th className="py-3 px-4">Unit Price</th>
                          <th className="py-3 px-4">Total</th>
                          <th className="py-3 px-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((it, idx) => (
                          <tr key={idx} className="text-sm hover:bg-slate-50 transition-colors duration-150">
                            <td className="py-3 px-4 relative">
                              <div className="relative">
                                <input 
                                  className={`w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                                    !it.name ? 'border-red-300 focus:ring-red-500' : 
                                    autoFetchingItems.has(idx) ? 'border-blue-300 focus:ring-blue-500 animate-pulse' :
                                    !it.code || !it.unitPrice || it.unitPrice <= 0 ? 'border-yellow-300 focus:ring-yellow-500' : 
                                    'border-green-300 focus:ring-green-500'
                                  }`} 
                                  value={activeItemIndex === idx && showTestDropdown ? testSearchTerm : it.name} 
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    setActiveItemIndex(idx);
                                    setTestSearchTerm(newValue);
                                    setShowTestDropdown(true);
                                    updateItem(idx, { name: newValue });
                                    
                                    // Auto-fetch if the name is complete and no code/price exists
                                    if (newValue.length >= 3 && (!it.code || !it.unitPrice || it.unitPrice <= 0)) {
                                      // Debounce the auto-fetch
                                      setTimeout(() => {
                                        autoFetchTestDetails(idx, newValue);
                                      }, 1000);
                                    }
                                  }}
                                  onFocus={() => {
                                    setActiveItemIndex(idx);
                                    setTestSearchTerm(it.name);
                                    setShowTestDropdown(true);
                                  }}
                                  onBlur={() => {
                                    // Auto-fetch on blur if still missing code/price
                                    if (it.name && it.name.length >= 2 && (!it.code || !it.unitPrice || it.unitPrice <= 0)) {
                                      setTimeout(() => {
                                        autoFetchTestDetails(idx, it.name);
                                      }, 500);
                                    }
                                  }}
                                  placeholder="Type to search tests..." 
                                />
                                {(!it.code || !it.unitPrice || it.unitPrice <= 0) && it.name && (
                                  <div className="absolute -top-1 -right-1">
                                    {autoFetchingItems.has(idx) ? (
                                      <div className="w-3 h-3 bg-blue-500 rounded-full border border-white animate-pulse" title="Auto-fetching code & price..."></div>
                                    ) : (
                                      <div className="w-3 h-3 bg-yellow-400 rounded-full border border-white" title="Auto-fetching code & price..."></div>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* Test Search Dropdown */}
                              {activeItemIndex === idx && showTestDropdown && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                  {labTestsLoading ? (
                                    <div className="px-4 py-3 text-center">
                                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                                      <p className="text-xs text-slate-500 mt-2">Searching...</p>
                                    </div>
                                  ) : labTests && labTests.length > 0 ? (
                                    labTests.map((test) => (
                                      <button
                                        key={test._id}
                                        type="button"
                                        onClick={() => handleTestSelect(test, idx)}
                                        className="w-full px-4 py-3 text-left border-b border-slate-100 last:border-b-0 hover:bg-blue-50 transition-colors"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="font-medium text-slate-800 text-sm">{test.testName}</div>
                                            <div className="text-xs text-slate-500">Code: {test.testCode}</div>
                                            {test.category && (
                                              <div className="text-xs text-slate-400">Category: {test.category}</div>
                                            )}
                                          </div>
                                          <div className="text-right ml-4">
                                            <div className="font-semibold text-blue-600 text-sm">{currencySymbol}{test.cost}</div>
                                          </div>
                                        </div>
                                      </button>
                                    ))
                                  ) : testSearchTerm && testSearchTerm.length >= 2 ? (
                                    <div className="px-4 py-3 text-slate-500 text-xs text-center">
                                      No tests found. Type at least 2 characters to search.
                                    </div>
                                  ) : (
                                    <div className="px-4 py-3 text-slate-500 text-xs text-center">
                                      Type at least 2 characters to search for tests
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <input 
                                className="w-full border border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                                value={it.code} 
                                onChange={(e) => updateItem(idx, { code: e.target.value })} 
                                placeholder="Code (optional)" 
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input 
                                type="number" 
                                className="w-24 border border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                                value={it.quantity} 
                                onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} 
                                min={1} 
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input 
                                type="number" 
                                className={`w-32 border border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${!it.unitPrice || it.unitPrice <= 0 ? 'border-red-300 focus:ring-red-500' : ''}`} 
                                value={it.unitPrice} 
                                onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })} 
                                min={0} 
                                step="0.01" 
                                placeholder="0.00"
                              />
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800">{currencySymbol}{(Number(it.quantity || 0) * Number(it.unitPrice || 0)).toFixed(2)}</td>
                            <td className="py-3 px-4">
                              <button 
                                onClick={() => removeItem(idx)} 
                                className="text-red-600 text-sm hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors duration-200"
                                disabled={items.length === 1}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button onClick={addItem} className="mt-4 inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors duration-200">
                      <Plus className="h-4 w-4 mr-2" /> Add Item
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Taxes</label>
                      <input 
                        type="number" 
                        className="w-full border border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                        value={taxes} 
                        onChange={(e) => setTaxes(Number(e.target.value))} 
                        min={0} 
                        step="0.01" 
                      />
                    </div>
                    <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Discount Type
                      </label>
                      <div className="flex gap-4 mb-3">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="discountType"
                            value="percentage"
                            checked={discountType === 'percentage'}
                            onChange={(e) => {
                              setDiscountType('percentage');
                              setDiscountPercentage(0);
                              setDiscountReason('');
                              setCustomDiscountReason('');
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-slate-700">By Percentage (%)</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="discountType"
                            value="amount"
                            checked={discountType === 'amount'}
                            onChange={(e) => {
                              setDiscountType('amount');
                              setDiscountAmount(0);
                              setDiscountReason('');
                              setCustomDiscountReason('');
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-slate-700">By Amount (₹)</span>
                        </label>
                      </div>

                      {/* Discount by Percentage */}
                      {discountType === 'percentage' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Select Discount Reason
                            </label>
                            <select
                              value={discountReason}
                              onChange={(e) => {
                                const selectedReason = e.target.value;
                                if (selectedReason) {
                                  const discountPercentage = selectedReason === 'other' ? 0 : centerDiscountSettings[selectedReason] || 0;
                                  setDiscountReason(selectedReason);
                                  setDiscountPercentage(discountPercentage);
                                  setCustomDiscountReason('');
                                } else {
                                  setDiscountReason('');
                                  setDiscountPercentage(0);
                                  setCustomDiscountReason('');
                                }
                              }}
                              className="w-full border border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                              <option value="">Select discount reason or enter custom %...</option>
                              <option value="staff">Staff Discount ({centerDiscountSettings.staff}%)</option>
                              <option value="senior">Senior Citizen Discount ({centerDiscountSettings.senior}%)</option>
                              <option value="student">Student Discount ({centerDiscountSettings.student}%)</option>
                              <option value="employee">Employee Discount ({centerDiscountSettings.employee}%)</option>
                              <option value="insurance">Insurance Coverage ({centerDiscountSettings.insurance}%)</option>
                              <option value="referral">Referral Discount ({centerDiscountSettings.referral}%)</option>
                              <option value="promotion">Promotional Discount ({centerDiscountSettings.promotion}%)</option>
                              <option value="charity">Charity Case ({centerDiscountSettings.charity}%)</option>
                              <option value="other">Custom Discount (Enter manually below)</option>
                            </select>
                            {discountReason && discountReason !== 'other' && (
                              <p className="text-xs text-green-600 mt-1">
                                ✅ Discount percentage automatically set to {discountPercentage}%
                              </p>
                            )}
                            {discountReason === 'other' && (
                              <p className="text-xs text-orange-600 mt-1">
                                📝 Enter custom discount percentage below
                              </p>
                            )}
                            {discountReason === 'other' && (
                              <div className="mt-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                  Custom Discount Reason
                                </label>
                                <input
                                  type="text"
                                  value={customDiscountReason}
                                  onChange={(e) => setCustomDiscountReason(e.target.value)}
                                  className="w-full border border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  placeholder="Enter custom discount reason"
                                />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Discount Percentage (%)
                            </label>
                            <input
                              type="number"
                              value={discountPercentage}
                              onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                              className={`w-full border border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                                discountReason && discountReason !== 'other' ? 'bg-blue-50 border-blue-300' : ''
                              }`}
                              placeholder={discountReason ? 'Auto-filled from reason' : '0'}
                              min="0"
                              max="100"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                              {discountReason 
                                ? `💡 Auto-filled from selected reason - you can edit this value if needed`
                                : '💡 Select a reason above to auto-fill, or enter a custom percentage'
                              }
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Discount by Amount */}
                      {discountType === 'amount' && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Discount Amount (₹)
                            </label>
                            <input
                              type="number"
                              value={discountAmount}
                              onChange={(e) => setDiscountAmount(Number(e.target.value))}
                              className="w-full border border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="0"
                              min="0"
                              step="0.01"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Discount Reason
                            </label>
                            <select
                              value={discountReason}
                              onChange={(e) => {
                                setDiscountReason(e.target.value);
                                if (e.target.value !== 'other') {
                                  setCustomDiscountReason('');
                                }
                              }}
                              className="w-full border border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                              <option value="">Select reason...</option>
                              <option value="staff">Staff Discount</option>
                              <option value="senior">Senior Citizen Discount</option>
                              <option value="student">Student Discount</option>
                              <option value="employee">Employee Discount</option>
                              <option value="insurance">Insurance Coverage</option>
                              <option value="referral">Referral Discount</option>
                              <option value="promotion">Promotional Discount</option>
                              <option value="charity">Charity Case</option>
                              <option value="other">Other (Please specify in notes)</option>
                            </select>
                            {discountReason === 'other' && (
                              <p className="text-xs text-orange-600 mt-1">
                                📝 Please specify the reason in the notes field below
                              </p>
                            )}
                            {discountReason === 'other' && (
                              <div className="mt-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                  Custom Discount Reason
                                </label>
                                <input
                                  type="text"
                                  value={customDiscountReason}
                                  onChange={(e) => setCustomDiscountReason(e.target.value)}
                                  className="w-full border border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  placeholder="Enter custom discount reason"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-end">
                      <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-4 py-3">
                        <div className="text-sm text-slate-600">Grand Total</div>
                        <div className="text-2xl font-bold text-slate-800">{currencySymbol}{grandTotal.toFixed(2)}</div>
                        {roundingDifference !== 0 && (
                          <div className="text-xs text-slate-500 mt-1">
                            Includes rounding adjustment of {roundingDifference > 0 ? '+' : '-'}{currencySymbol}{Math.abs(roundingDifference).toFixed(2)} (raw total {currencySymbol}{rawGrandTotal.toFixed(2)})
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                    <textarea 
                      className="w-full border border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                      rows={3} 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      placeholder="Optional notes for the invoice..." 
                    />
                                         <p className="text-sm text-slate-500 mt-2">
                       After generating the bill, the test request will be ready for payment recording. Once payment is recorded, it will be marked as "Payment Received" and await center admin verification before proceeding to lab processing.
                     </p>
                  </div>
                </div>
                <div className="p-6 border-t border-slate-200 flex items-center justify-between flex-shrink-0 bg-slate-50 sticky bottom-0">
                  <button 
                    onClick={closeBillModal} 
                    className="px-6 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleGenerate} 
                      disabled={loading} 
                      className="px-6 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 font-medium shadow-sm"
                    >
                      {loading ? 'Generating...' : 'Save Bill'}
                    </button>
                    {selected?.billing?.invoiceNumber && (
                      <>
                        <button 
                          onClick={() => handleViewInvoice(selected._id)} 
                          className="px-6 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors duration-200 font-medium shadow-sm"
                        >
                          <FileText className="h-4 w-4 mr-2 inline" />
                          View Invoice
                        </button>
                        <button 
                          onClick={() => handleDownloadInvoice(selected._id)} 
                          className="px-6 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 font-medium shadow-sm"
                        >
                          <Download className="h-4 w-4 mr-2 inline" />
                          Download Invoice
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ NEW: Payment Recording Modal */}
          {showPaymentModal && selectedForPayment && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
              <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-lg shadow-lg flex flex-col">
                <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
                  <div className="flex items-start gap-3">
                    {centerBranding.logoUrl && (
                      <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-blue-100 bg-white shadow-sm">
                        <img
                          src={centerBranding.logoUrl}
                          alt={`${centerBranding.name || 'Center'} logo`}
                          className="object-contain max-h-full max-w-full p-1"
                        />
                      </div>
                    )}
                    <div>
                      <div className="text-sm text-slate-500">Record Payment</div>
                      <div className="font-semibold text-slate-800">
                        {ultraSafeRender(selectedForPayment.patientName) || ultraSafeRender(selectedForPayment.patientId?.name)} - {ultraSafeRender(selectedForPayment.testType)}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Amount: {currencySymbol}{selectedForPayment.billing?.amount?.toFixed(2) || '0.00'} | Center: {centerBranding.name || ultraSafeRender(selectedForPayment.centerName)}
                      </div>
                      {selectedForPayment?.billing?.invoiceNumber && formattedSelectedForPaymentTimestamp && (
                        <div className="text-xs text-slate-500 mt-1">
                          Bill generated on {formattedSelectedForPaymentTimestamp}
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={closePaymentModal} className="p-1 rounded hover:bg-slate-100">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                  {/* Payment Amount Section */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-800 mb-3">Payment Amount</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Total Bill Amount</label>
                        <div className="text-lg font-bold text-slate-800">
                          {currencySymbol}{selectedForPayment.billing?.amount?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Already Paid</label>
                        <div className="text-lg font-bold text-green-600">
                          {currencySymbol}{(selectedForPayment.billing?.paidAmount || 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Remaining Balance</label>
                        <div className="text-lg font-bold text-orange-600">
                          {currencySymbol}{((selectedForPayment.billing?.amount || 0) - (selectedForPayment.billing?.paidAmount || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Payment Method <span className="text-red-500">*</span>
                      </label>
                      <select 
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={paymentDetails.paymentMethod}
                        onChange={(e) => setPaymentDetails(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        required
                      >
                        <option value="">Select payment method</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card (Credit/Debit)</option>
                        <option value="UPI">UPI</option>
                        <option value="Net Banking">Net Banking</option>
                        <option value="NEFT">NEFT</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Transaction ID <span className="text-red-500"></span>
                      </label>
                      <input 
                        type="text"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter transaction ID or reference number"
                        value={paymentDetails.transactionId}
                        onChange={(e) => setPaymentDetails(prev => ({ ...prev, transactionId: e.target.value }))}
                        
                      />
                    </div>
                  </div>

                  {/* Payment History */}
                  {(() => {
                    const partialData = getPartialPaymentData(selectedForPayment._id);
                    const totalPaidFromStorage = partialData.totalPaid;
                    const actualRemainingAmount = (selectedForPayment.billing?.amount || 0) - Math.max((selectedForPayment.billing?.paidAmount || 0), totalPaidFromStorage);
                    
                    return (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Payment Summary
                        </label>
                        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Total Amount:</span>
                            <span className="font-medium">{currencySymbol}{(selectedForPayment.billing?.amount || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Already Paid:</span>
                            <span className="font-medium text-green-600">{currencySymbol}{Math.max((selectedForPayment.billing?.paidAmount || 0), totalPaidFromStorage).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm border-t pt-2">
                            <span className="text-slate-600">Remaining:</span>
                            <span className="font-medium text-orange-600">{currencySymbol}{actualRemainingAmount.toFixed(2)}</span>
                          </div>
                          
                          {/* Enhanced Payment History */}
                          {partialData.payments.length > 0 && (
                            <div className="mt-3 pt-2 border-t">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-slate-700">Payment History ({partialData.paymentCount} payments):</p>
                                <span className="text-xs text-slate-500">Total: {currencySymbol}{partialData.totalPaid.toFixed(2)}</span>
                              </div>
                              <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                                {partialData.payments.map((payment, index) => (
                                  <div key={payment.id || index} className="bg-white rounded-lg border border-slate-200 p-2">
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-xs font-medium text-slate-700">
                                            Payment #{index + 1}
                                          </span>
                                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                            payment.status === 'recorded' ? 'bg-blue-100 text-blue-800' :
                                            payment.status === 'verified' ? 'bg-green-100 text-green-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {payment.status || 'recorded'}
                                          </span>
                                        </div>
                                        <div className="text-xs text-slate-600 mt-1">
                                        {formatServerDateTime(payment.timestamp)} - {payment.method || 'N/A'}
                                        </div>
                                        {payment.transactionId && (
                                          <div className="text-xs text-slate-500 mt-1">
                                            ID: {payment.transactionId}
                                          </div>
                                        )}
                                        {payment.notes && (
                                          <div className="text-xs text-slate-500 mt-1 italic">
                                            "{payment.notes}"
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm font-bold text-green-600">
                                          {currencySymbol}{payment.amount.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                          by {payment.recordedBy || 'Receptionist'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Payment Amount Input - Full Payment Required */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Payment Amount <span className="text-red-500">*</span>
                      <span className="text-xs text-slate-500 font-normal ml-2">(Full payment required)</span>
                    </label>
                    <input 
                      type="number"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={(() => {
                        const totalAmount = selectedForPayment.billing?.amount || 0;
                        const paidAmount = selectedForPayment.billing?.paidAmount || 0;
                        return (totalAmount - paidAmount).toFixed(2);
                      })()}
                      readOnly
                      disabled
                    />
                    <p className="text-xs text-blue-600 mt-1 font-medium">
                      Full payment of remaining balance is required to proceed
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Receipt Upload (Optional)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        id="receipt-upload"
                        onChange={handleReceiptUpload}
                      />
                      <label 
                        htmlFor="receipt-upload"
                        className="flex items-center px-3 py-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File
                      </label>
                      {paymentDetails.receiptUpload && (
                        <span className="text-sm text-slate-600 flex items-center">
                          <Receipt className="h-4 w-4 mr-1" />
                          {paymentDetails.receiptUpload instanceof File ? paymentDetails.receiptUpload.name : paymentDetails.receiptUpload}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Supported formats: PDF, JPG, JPEG, PNG
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Payment Notes (Optional)
                    </label>
                    <textarea 
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Additional notes about the payment..."
                      value={paymentDetails.paymentNotes}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, paymentNotes: e.target.value }))}
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Payment Workflow</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>1. Record payment details (you are here)</p>
                          <p>2. Payment will be marked as "Payment Received"</p>
                          <p>3. Center admin must verify the payment</p>
                          <p>4. Once verified, test request proceeds to lab</p>
                          <p className="mt-2 font-medium text-blue-800">
                            ⚠️ Full Payment Required: Only complete payment for the full remaining balance is accepted
                          </p>
                          <p className="mt-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            📝 Updating existing test request #{selectedForPayment._id.slice(-6)} - No new request will be created
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Scroll indicator */}
                  <div className="text-center py-2">
                    <div className="text-xs text-slate-400 flex items-center justify-center">
                      <div className="w-6 h-0.5 bg-slate-300 rounded-full mr-2"></div>
                      Scroll to see all fields
                      <div className="w-6 h-0.5 bg-slate-300 rounded-full ml-2"></div>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t flex items-center justify-between flex-shrink-0 bg-white">
                  <div className="text-xs text-slate-500">
                    <p>• Full payment of remaining balance is required</p>
                    <p>• Payment will be recorded and status updated accordingly</p>
                    <p>• Center admin must verify the payment before proceeding to lab</p>
                    <p>• Test request cannot proceed to lab without center admin verification</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={closePaymentModal} className="px-3 py-2 text-sm rounded bg-slate-100 hover:bg-slate-200">Cancel</button>
                    <button 
                      onClick={handleMarkPaid} 
                      disabled={!paymentDetails.paymentMethod || !paymentDetails.transactionId}
                      className="px-3 py-2 text-sm rounded text-white bg-emerald-600 hover:bg-emerald-700 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Record Full Payment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ NEW: Cancel Bill Modal */}
          {showCancelModal && selectedForCancel && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
              <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg">
                <div className="p-6 border-b flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    {centerBranding.logoUrl && (
                      <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-blue-100 bg-white shadow-sm">
                        <img
                          src={centerBranding.logoUrl}
                          alt={`${centerBranding.name || 'Center'} logo`}
                          className="object-contain max-h-full max-w-full p-1"
                        />
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-semibold text-slate-800">Cancel Bill</h2>
                      <p className="text-sm text-slate-600 mt-1">
                        Patient: {ultraSafeRender(selectedForCancel.patientName) || ultraSafeRender(selectedForCancel.patientId?.name)}
                      </p>
                      <p className="text-sm text-slate-600">
                        Amount: {currencySymbol}{selectedForCancel.billing?.amount?.toFixed(2) || '0.00'}
                      </p>
                      {selectedForCancel?.billing?.invoiceNumber && formattedSelectedForCancelTimestamp && (
                        <p className="text-xs text-slate-500 mt-1">
                          Bill generated on {formattedSelectedForCancelTimestamp}
                        </p>
                      )}
                    </div>
                  </div>
                  <button onClick={closeCancelModal} className="p-2 rounded-lg hover:bg-slate-100">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <X className="h-5 w-5 text-red-600 mt-0.5" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Warning: Bill Cancellation</h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>• This action will cancel the bill and prevent further processing</p>
                          <p>• The test request status will be reverted to "Pending"</p>
                          <p>• If payment was made, you can process a refund separately</p>
                          <p>• This action cannot be undone</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Cancellation Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea 
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      rows={4}
                      placeholder="Please provide a detailed reason for cancelling this bill..."
                      value={cancelDetails.reason}
                      onChange={(e) => setCancelDetails(prev => ({ ...prev, reason: e.target.value }))}
                      required
                    />
                  </div>

                  {selectedForCancel.billing?.paidAmount > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">Payment Refund Available</h3>
                          <div className="mt-2 text-sm text-blue-700">
                            <p>Amount paid: {currencySymbol}{selectedForCancel.billing.paidAmount.toFixed(2)}</p>
                            <p>After cancelling, you can process a refund for this amount.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-6 border-t flex items-center justify-between bg-slate-50">
                  <div className="text-sm text-slate-500">
                    <p>• Bill will be marked as cancelled</p>
                    <p>• Test request will revert to "Pending" status</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={closeCancelModal} className="px-4 py-2 text-sm rounded bg-slate-200 hover:bg-slate-300">
                      Cancel
                    </button>
                    <button 
                      onClick={handleCancelBill}
                      disabled={!cancelDetails.reason.trim()}
                      className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel Bill
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ NEW: Refund Modal */}
          {showRefundModal && selectedForRefund && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
              <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg">
                <div className="p-6 border-b flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    {centerBranding.logoUrl && (
                      <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-lg border border-blue-100 bg-white shadow-sm">
                        <img
                          src={centerBranding.logoUrl}
                          alt={`${centerBranding.name || 'Center'} logo`}
                          className="object-contain max-h-full max-w-full p-1"
                        />
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-semibold text-slate-800">Process Refund</h2>
                      <p className="text-sm text-slate-600 mt-1">
                        Patient: {ultraSafeRender(selectedForRefund.patientName) || ultraSafeRender(selectedForRefund.patientId?.name)}
                      </p>
                      <p className="text-sm text-slate-600">
                        Original Amount: {currencySymbol}{selectedForRefund.billing?.amount?.toFixed(2) || '0.00'}
                      </p>
                      {selectedForRefund?.billing?.invoiceNumber && formattedSelectedForRefundTimestamp && (
                        <p className="text-xs text-slate-500 mt-1">
                          Bill generated on {formattedSelectedForRefundTimestamp}
                        </p>
                      )}
                    </div>
                  </div>
                  <button onClick={closeRefundModal} className="p-2 rounded-lg hover:bg-slate-100">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <CreditCard className="h-5 w-5 text-green-600 mt-0.5" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">Refund Information</h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>• Refund will be processed for the specified amount</p>
                          <p>• Refund method will be recorded for audit purposes</p>
                          <p>• Bill status will be updated to "Refunded"</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Refund Amount <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="number"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Enter refund amount"
                        value={refundDetails.amount}
                        onChange={(e) => setRefundDetails(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                        min="0.01"
                        max={selectedForRefund.billing?.paidAmount || 0}
                        step="0.01"
                        required
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Maximum: {currencySymbol}{(selectedForRefund.billing?.paidAmount || 0).toFixed(2)}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Refund Method <span className="text-red-500">*</span>
                      </label>
                      <select 
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={refundDetails.method}
                        onChange={(e) => setRefundDetails(prev => ({ ...prev, method: e.target.value }))}
                        required
                      >
                        <option value="">Select refund method</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card (Credit/Debit)</option>
                        <option value="UPI">UPI</option>
                        <option value="Net Banking">Net Banking</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Refund Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea 
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      rows={3}
                      placeholder="Please provide a detailed reason for this refund..."
                      value={refundDetails.reason}
                      onChange={(e) => setRefundDetails(prev => ({ ...prev, reason: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Additional Notes (Optional)
                    </label>
                    <textarea 
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      rows={2}
                      placeholder="Any additional notes about the refund..."
                      value={refundDetails.notes}
                      onChange={(e) => setRefundDetails(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="p-6 border-t flex items-center justify-between bg-slate-50">
                  <div className="text-sm text-slate-500">
                    <p>• Refund will be recorded and tracked</p>
                    <p>• Bill status will be updated to "Refunded"</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={closeRefundModal} className="px-4 py-2 text-sm rounded bg-slate-200 hover:bg-slate-300">
                      Cancel
                    </button>
                    <button 
                      onClick={handleProcessRefund}
                      disabled={!refundDetails.method || !refundDetails.reason || refundDetails.amount <= 0}
                      className="px-4 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Process Refund
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ NEW: Edit Paid Bill Modal */}
          {showEditBillModal && selectedForEdit && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
              <div className="bg-white w-full max-w-6xl max-h-[95vh] rounded-xl shadow-2xl border border-slate-200 flex flex-col my-4">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50">
                  <div className="flex items-start gap-4">
                    {/* {centerBranding.logoUrl && (
                      <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-lg border border-orange-100 bg-white shadow-sm">
                        <img
                          src={centerBranding.logoUrl}
                          alt={`${centerBranding.name || 'Center'} logo`}
                          className="object-contain max-h-full max-w-full p-1"
                        />
                      </div>
                    )} */}
                    <div>
                      <div className="text-sm text-slate-500 font-medium">Edit Paid Bill & Process Refund</div>
                      <div className="text-xl font-bold text-slate-800 mt-1">
                        {ultraSafeRender(selectedForEdit.patientName) || ultraSafeRender(selectedForEdit.patientId?.name)} - {ultraSafeRender(selectedForEdit.testType)}
                      </div>
                      <div className="text-sm text-slate-600 mt-2">
                        <span className="font-medium">Original Amount:</span> {currencySymbol}{selectedForEdit.billing?.amount?.toFixed(2) || '0.00'} | 
                        <span className="font-medium ml-2">Paid:</span> {currencySymbol}{selectedForEdit.billing?.paidAmount?.toFixed(2) || '0.00'}
                      </div>
                      {selectedForEdit?.billing?.invoiceNumber && formattedSelectedForEditTimestamp && (
                        <div className="text-xs text-slate-500 mt-1">
                          Bill generated on {formattedSelectedForEditTimestamp}
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={closeEditBillModal} className="p-2 rounded-lg hover:bg-white/50 transition-colors duration-200">
                    <X className="h-6 w-6 text-slate-600" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Warning Message */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">Edit Paid Bill</h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>• Remove tests that could not be performed</p>
                          <p>• Refund amount will be automatically calculated</p>
                          <p>• New invoice will be generated after update</p>
                          <p className="font-semibold mt-2">• At least one item must remain in the bill</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="text-left text-sm font-semibold text-slate-600 border-b border-slate-200">
                          <th className="py-3 px-4">Item/Test Name</th>
                          <th className="py-3 px-4">Code</th>
                          <th className="py-3 px-4">Qty</th>
                          <th className="py-3 px-4">Unit Price</th>
                          <th className="py-3 px-4">Total</th>
                          <th className="py-3 px-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {editBillItems.map((it, idx) => {
                          const itemTotal = (Number(it.quantity || 1) * Number(it.unitPrice || 0));
                          return (
                            <tr key={idx} className="text-sm hover:bg-slate-50 transition-colors duration-150">
                              <td className="py-3 px-4">
                                <input 
                                  className="w-full border border-slate-300 px-3 py-2 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed" 
                                  value={it.name} 
                                  onChange={(e) => updateEditBillItem(idx, { name: e.target.value })} 
                                  placeholder="Test name" 
                                  readOnly
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input 
                                  className="w-full border border-slate-300 px-3 py-2 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed" 
                                  value={it.code} 
                                  onChange={(e) => updateEditBillItem(idx, { code: e.target.value })} 
                                  placeholder="Code" 
                                  readOnly
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input 
                                  type="number" 
                                  className="w-24 border border-slate-300 px-3 py-2 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed" 
                                  value={it.quantity} 
                                  onChange={(e) => updateEditBillItem(idx, { quantity: Number(e.target.value) })} 
                                  min={1} 
                                  readOnly
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input 
                                  type="number" 
                                  className="w-32 border border-slate-300 px-3 py-2 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed" 
                                  value={it.unitPrice} 
                                  onChange={(e) => updateEditBillItem(idx, { unitPrice: Number(e.target.value) })} 
                                  min={0} 
                                  step="0.01" 
                                  readOnly
                                />
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-800">{currencySymbol}{itemTotal.toFixed(2)}</td>
                              <td className="py-3 px-4">
                                <button 
                                  onClick={() => removeEditBillItem(idx)} 
                                  className="text-red-600 text-sm hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors duration-200 flex items-center gap-1"
                                  disabled={editBillItems.length <= 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  {editBillItems.length <= 1 ? 'Cannot Remove' : 'Remove'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Taxes</label>
                      <input 
                        type="number" 
                        className="w-full border border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-white" 
                        value={editBillTaxes} 
                        onChange={(e) => updateEditBillTaxes(Number(e.target.value))} 
                        min={0} 
                        step="0.01" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Discounts</label>
                      <input 
                        type="number" 
                        className="w-full border border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-white" 
                        value={editBillDiscounts} 
                        onChange={(e) => updateEditBillDiscounts(Number(e.target.value))} 
                        min={0} 
                        step="0.01" 
                      />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">New Bill Amount</label>
                        <div className="text-lg font-bold text-slate-800 bg-white border border-slate-300 px-3 py-2 rounded-lg">
                          {currencySymbol}{(() => {
                            const newSubTotal = editBillItems.reduce((sum, item) => {
                              return sum + (Number(item.quantity || 1) * Number(item.unitPrice || 0));
                            }, 0);
                            const newTotal = newSubTotal + Number(editBillTaxes || 0) - Number(editBillDiscounts || 0);
                            return newTotal.toFixed(2);
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Refund Amount Display */}
                  {refundAmount > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <CreditCard className="h-5 w-5 text-green-600 mr-3" />
                          <div>
                            <h3 className="text-sm font-medium text-green-800">Refund Amount</h3>
                            <p className="text-xs text-green-700 mt-1">Amount to be refunded to patient</p>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {currencySymbol}{refundAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
                    <textarea 
                      className="w-full border border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 resize-none" 
                      value={editNotes} 
                      onChange={(e) => setEditNotes(e.target.value)} 
                      rows={3}
                      placeholder="Add notes about the bill edit (e.g., reason for removing tests)..."
                    />
                  </div>
                </div>
                <div className="p-6 border-t flex items-center justify-between bg-slate-50">
                  <div className="text-sm text-slate-500">
                    <p>• Items will be removed from the bill</p>
                    <p>• Refund will be processed automatically</p>
                    <p>• New invoice will be generated</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={closeEditBillModal} className="px-4 py-2 text-sm rounded bg-slate-200 hover:bg-slate-300">
                      Cancel
                    </button>
                    <button 
                      onClick={handleUpdatePaidBill}
                      disabled={refundAmount <= 0 || editBillItems.length === 0}
                      className="px-4 py-2 text-sm rounded bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Update Bill & Process Refund
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AccountantLayout>
      );
    } catch (error) {
      console.error('Error rendering billing component:', error);
      return (
        <AccountantLayout>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <h2 className="text-lg font-semibold text-red-800 mb-2">Rendering Error</h2>
                <p className="text-red-700 mb-4">An error occurred while rendering the billing page.</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </AccountantLayout>
      );
    }
  };

  return renderContent();
}

export default AccountantBilling;
