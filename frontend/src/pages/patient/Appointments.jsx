import { useState, useEffect, useRef } from 'react';
import {
  Calendar, Plus, Clock, X, CheckCircle, XCircle,
  Stethoscope, ChevronDown, User2,
} from 'lucide-react';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';

function formatSlot(slot) {
  const [hh, mm] = slot.split(':');
  const hour = parseInt(hh, 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${mm} ${suffix}`;
}

function getNextFourteenDays() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDateISO(d) {
  return d.toISOString().split('T')[0];
}

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [booking, setBooking] = useState(false);
  const [modalView, setModalView] = useState('form');
  const [modalMessage, setModalMessage] = useState('');
  const [successData, setSuccessData] = useState(null);
  const autoCloseTimer = useRef(null);

  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [doctorUnavailableMsg, setDoctorUnavailableMsg] = useState('');

  const [reason, setReason] = useState('');

  const dates = getNextFourteenDays();
  const isGeneral = selectedDepartment === 'General Medicine';
  const selectedDoctor = doctors.find((d) => d._id === selectedDoctorId) || null;

  useEffect(() => { fetchAppointments(); }, []);
  useEffect(() => {
    return () => { if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current); };
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchDoctors(selectedDepartment);
      setSelectedDoctorId('');
      setSelectedDate(null);
      setSelectedSlot(null);
      setAvailableSlots([]);
      setDoctorUnavailableMsg('');
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (isGeneral && doctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctors[0]._id);
    }
  }, [doctors, isGeneral]);

  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      fetchDoctorSlots(selectedDoctorId, selectedDate);
    } else {
      setAvailableSlots([]);
      setDoctorUnavailableMsg('');
    }
    setSelectedSlot(null);
  }, [selectedDoctorId, selectedDate]);

  const fetchAppointments = async () => {
    try {
      const res = await API.get('/patient/appointments');
      setAppointments(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    setLoadingDepts(true);
    try {
      const res = await API.get('/patient/departments');
      setDepartments(res.data.data || []);
    } catch {
      setDepartments([]);
    } finally {
      setLoadingDepts(false);
    }
  };

  const fetchDoctors = async (dept) => {
    setLoadingDoctors(true);
    try {
      const res = await API.get(`/patient/doctors-by-department?department=${encodeURIComponent(dept)}`);
      setDoctors(res.data.data || []);
    } catch {
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const fetchDoctorSlots = async (doctorId, date) => {
    setLoadingSlots(true);
    setDoctorUnavailableMsg('');
    try {
      const dateStr = formatDateISO(date);
      const res = await API.get(`/patient/doctor-slots?doctorId=${doctorId}&date=${dateStr}`);
      const data = res.data.data;
      if (!data.doctorAvailable) {
        setAvailableSlots([]);
        setDoctorUnavailableMsg(data.message || 'Doctor not available on this day');
      } else {
        const now = new Date();
        const isToday = formatDateISO(date) === formatDateISO(now);
        const filtered = isToday
          ? data.available.filter((s) => {
              const [hh, mm] = s.split(':').map(Number);
              return hh * 60 + mm > now.getHours() * 60 + now.getMinutes();
            })
          : data.available;
        setAvailableSlots(filtered);
        setDoctorUnavailableMsg('');
      }
    } catch {
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const openBooking = () => {
    setSelectedDepartment('');
    setSelectedDoctorId('');
    setSelectedDate(null);
    setSelectedSlot(null);
    setReason('');
    setDoctors([]);
    setAvailableSlots([]);
    setDoctorUnavailableMsg('');
    setModalView('form');
    setModalMessage('');
    setSuccessData(null);
    setShowModal(true);
    fetchDepartments();
  };

  const closeModal = () => {
    setShowModal(false);
    if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
  };

  const canBook = () => {
    if (!selectedDepartment || !selectedDate || !selectedSlot) return false;
    if (isGeneral) return true;
    return !!selectedDoctorId;
  };

  const bookAppointment = async () => {
    if (!canBook()) return;
    setBooking(true);
    try {
      const dateStr = formatDateISO(selectedDate);
      const appointment_date = `${dateStr}T${selectedSlot}:00.000Z`;
      const body = {
        appointment_date,
        reason,
        department: selectedDepartment,
        time_slot: selectedSlot,
      };
      if (!isGeneral && selectedDoctorId) {
        body.doctor_id = selectedDoctorId;
      }

      const res = await API.post('/patient/book-appointment', body);
      const serverMsg = res.data?.message || 'Appointment booked!';
      setSuccessData({
        message: serverMsg,
        date: selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        slot: formatSlot(selectedSlot),
        department: selectedDepartment,
        doctor: selectedDoctor?.name || null,
      });
      setModalView('success');
      fetchAppointments();
      autoCloseTimer.current = setTimeout(() => setShowModal(false), 5000);
    } catch (err) {
      setModalView('error');
      setModalMessage(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
          <p className="text-gray-500 mt-1">Manage and book appointments</p>
        </div>
        <button
          onClick={openBooking}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-teal-200"
        >
          <Plus className="h-5 w-5" />
          Book Appointment
        </button>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {/* Appointments List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {appointments.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No appointments yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {appointments.map((appt) => (
              <div key={appt._id} className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{appt.reason || 'General Checkup'}</p>
                    {appt.department && (
                      <span className="inline-block text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium mt-0.5">
                        {appt.department}
                      </span>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(appt.appointment_date).toLocaleString()}
                      {appt.time_slot && (
                        <span className="text-teal-600 font-medium">({formatSlot(appt.time_slot)})</span>
                      )}
                    </div>
                    {appt.doctor_id?.user_id?.name && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        <span className="font-medium text-gray-700">Dr. {appt.doctor_id.user_id.name}</span>
                        {appt.doctor_id?.specialization && (
                          <span className="text-gray-400 ml-1">• {appt.doctor_id.specialization}</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    appt.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : appt.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-teal-100 text-teal-700'
                  }`}
                >
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============ BOOKING MODAL ============ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-modal-in">

            {/* ---- SUCCESS ---- */}
            {modalView === 'success' && (
              <div className="text-center py-10 px-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-5">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Appointment Booked!</h3>
                <p className="text-gray-500 mb-1">Your appointment is confirmed for</p>
                <p className="text-lg font-semibold text-teal-600">{successData?.date} at {successData?.slot}</p>
                <p className="text-sm text-gray-600 mt-2 bg-teal-50 inline-block px-4 py-2 rounded-lg">{successData?.message}</p>
                <div className="mt-6">
                  <button onClick={closeModal} className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-green-200">
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* ---- ERROR ---- */}
            {modalView === 'error' && (
              <div className="text-center py-10 px-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-5">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Booking Failed</h3>
                <p className="text-red-600 mb-6">{modalMessage}</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => { setModalView('form'); setSelectedSlot(null); }} className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium">
                    Try Again
                  </button>
                  <button onClick={closeModal} className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50">
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* ---- FORM ---- */}
            {modalView === 'form' && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                      <Stethoscope className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Book Appointment</h3>
                      <p className="text-xs text-gray-400">Fill the details below</p>
                    </div>
                  </div>
                  <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {/* Form Body */}
                <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5" style={{ maxHeight: '62vh' }}>

                  {/* Department Dropdown */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Department / Specialty</label>
                    <div className="relative">
                      <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="w-full appearance-none bg-white px-4 py-3 pr-10 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                      >
                        <option value="">-- Select Department --</option>
                        {loadingDepts ? (
                          <option disabled>Loading...</option>
                        ) : (
                          departments.map((d) => (
                            <option key={d.name} value={d.name}>
                              {d.name} ({d.doctorCount} doctor{d.doctorCount !== 1 ? 's' : ''})
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Doctor Selection — hidden for General Medicine */}
                  {selectedDepartment && !isGeneral && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Doctor</label>
                      {loadingDoctors ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                          Loading doctors...
                        </div>
                      ) : doctors.length === 0 ? (
                        <p className="text-sm text-gray-400 py-2">No doctors in this department</p>
                      ) : (
                        <div className="space-y-2">
                          {doctors.map((doc) => {
                            const isSelected = selectedDoctorId === doc._id;
                            return (
                              <button
                                key={doc._id}
                                type="button"
                                onClick={() => {
                                  setSelectedDoctorId(doc._id);
                                  setSelectedDate(null);
                                  setSelectedSlot(null);
                                }}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                  isSelected
                                    ? 'border-teal-500 bg-teal-50'
                                    : 'border-gray-100 hover:border-teal-200 hover:bg-gray-50'
                                }`}
                              >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                                  isSelected ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-600'
                                }`}>
                                  {doc.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-semibold text-sm ${isSelected ? 'text-teal-700' : 'text-gray-900'}`}>{doc.name}</p>
                                  <p className="text-xs text-gray-500">{doc.specialization} • ₹{doc.consultation_fee}</p>
                                </div>
                                {isSelected && (
                                  <CheckCircle className="h-5 w-5 text-teal-600 flex-shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* General Medicine auto-assign message */}
                  {isGeneral && doctors.length > 0 && (
                    <div className="flex items-center gap-3 bg-teal-50 border border-teal-100 rounded-xl p-3">
                      <User2 className="h-5 w-5 text-teal-600 flex-shrink-0" />
                      <p className="text-sm text-teal-700">
                        A doctor will be <span className="font-semibold">automatically assigned</span> based on availability (least patients first).
                      </p>
                    </div>
                  )}

                  {/* Date Selection */}
                  {selectedDepartment && (isGeneral ? doctors.length > 0 : !!selectedDoctorId) && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Date</label>
                      {!isGeneral && selectedDoctor?.available_days && (
                        <p className="text-xs text-gray-400 mb-2">
                          Available: {selectedDoctor.available_days.join(', ')}
                        </p>
                      )}
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                        {dates.map((d) => {
                          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                          const fullDay = d.toLocaleDateString('en-US', { weekday: 'long' });
                          const dayNum = d.getDate();
                          const monthName = d.toLocaleDateString('en-US', { month: 'short' });
                          const isSelected = selectedDate && formatDateISO(d) === formatDateISO(selectedDate);
                          const isAvailable = isGeneral || (selectedDoctor?.available_days?.includes(fullDay));
                          return (
                            <button
                              key={formatDateISO(d)}
                              type="button"
                              onClick={() => {
                                if (!isAvailable) return;
                                setSelectedDate(d);
                                if (isGeneral && doctors.length > 0) {
                                  setSelectedDoctorId(doctors[0]._id);
                                }
                              }}
                              disabled={!isAvailable}
                              className={`flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border-2 transition-all min-w-[62px] ${
                                !isAvailable
                                  ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-200'
                                    : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50'
                              }`}
                            >
                              <span className={`text-[10px] font-medium ${isSelected ? 'text-teal-100' : 'text-gray-500'}`}>{dayName}</span>
                              <span className={`text-base font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>{dayNum}</span>
                              <span className={`text-[10px] ${isSelected ? 'text-teal-200' : 'text-gray-400'}`}>{monthName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Time Slots */}
                  {selectedDate && selectedDoctorId && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Time Slot</label>
                      {loadingSlots ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                          Loading available slots...
                        </div>
                      ) : doctorUnavailableMsg ? (
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
                          <p className="text-orange-600 text-sm">{doctorUnavailableMsg}</p>
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-gray-500 text-sm">No slots available. Try another date.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                          {availableSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-2 px-2 rounded-lg text-xs font-medium border-2 transition-all ${
                                selectedSlot === slot
                                  ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-200'
                                  : 'border-gray-200 text-gray-700 hover:border-teal-300 hover:bg-teal-50'
                              }`}
                            >
                              {formatSlot(slot)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reason */}
                  {selectedSlot && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reason for Visit</label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        placeholder="e.g., Fever, skin rash, chest pain, regular checkup..."
                      />
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                  <button
                    onClick={bookAppointment}
                    disabled={!canBook() || booking}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all text-sm ${
                      canBook() && !booking
                        ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {booking ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Calendar className="h-4 w-4" />
                        {canBook()
                          ? `Book Appointment — ${formatSlot(selectedSlot)}`
                          : 'Fill all fields to book'}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
