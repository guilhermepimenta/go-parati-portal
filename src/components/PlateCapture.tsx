import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Camera, Keyboard, ArrowLeft, Check, Clock, Copy, AlertCircle, Loader2, Car } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabase';
import { extractPlateFromImage } from '../services/ocr';
import type { ParkingTicket, ParkingPriceOption } from '../types';

type WizardStep = 'capture' | 'confirm' | 'duration' | 'payment' | 'receipt';

interface PlateCaptureProps {
    isOpen: boolean;
    onClose: () => void;
    onTicketCreated?: (ticket: ParkingTicket) => void;
}

const PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

const PlateCapture: React.FC<PlateCaptureProps> = ({ isOpen, onClose, onTicketCreated }) => {
    const { t } = useTranslation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Wizard state
    const [step, setStep] = useState<WizardStep>('capture');
    const [plate, setPlate] = useState('');
    const [manualEntry, setManualEntry] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Price/duration state
    const [prices, setPrices] = useState<ParkingPriceOption[]>([]);
    const [selectedDuration, setSelectedDuration] = useState<number | null>(null);

    // Ticket state
    const [ticket, setTicket] = useState<ParkingTicket | null>(null);
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);
    const [copied, setCopied] = useState(false);

    // Camera state
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState(false);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    }, []);

    const reset = useCallback(() => {
        stopCamera();
        setStep('capture');
        setPlate('');
        setManualEntry(false);
        setLoading(false);
        setError('');
        setPrices([]);
        setSelectedDuration(null);
        setTicket(null);
        setPaymentConfirmed(false);
        setCopied(false);
        setCameraError(false);
    }, [stopCamera]);

    const handleClose = () => {
        reset();
        onClose();
    };

    // Stop camera when leaving capture step
    useEffect(() => {
        if (step !== 'capture') stopCamera();
    }, [step, stopCamera]);

    // Stop camera when modal closes
    useEffect(() => {
        if (!isOpen) stopCamera();
    }, [isOpen, stopCamera]);

    // Start live camera viewfinder
    const startCamera = async () => {
        setCameraError(false);
        setError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            streamRef.current = stream;
            setCameraActive(true);
            // Wait for ref to be available after render
            requestAnimationFrame(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            });
        } catch {
            setCameraError(true);
            setManualEntry(true);
            setError(t('parking.camera_denied'));
        }
    };

    // Capture frame from video and send to OCR
    const captureFrame = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setLoading(true);
        setError('');

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);

        try {
            const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

            const result = await extractPlateFromImage(base64);

            if (result.plate) {
                setPlate(result.plate);
                setStep('confirm');
            } else {
                stopCamera();
                setManualEntry(true);
                setError(t('parking.ocr_failed'));
            }
        } catch {
            stopCamera();
            setManualEntry(true);
            setError(t('parking.ocr_failed'));
        } finally {
            setLoading(false);
        }
    };

    // Step 1b: Manual entry submit
    const handleManualSubmit = () => {
        const normalized = plate.replace(/[-\s]/g, '').toUpperCase();
        if (!PLATE_REGEX.test(normalized)) {
            setError(t('parking.invalid_plate'));
            return;
        }
        setPlate(normalized);
        setError('');
        setStep('confirm');
    };

    // Step 2 → 3: Load prices and go to duration
    const handleConfirmPlate = async () => {
        setLoading(true);
        setError('');
        try {
            const { data, error: fetchError } = await supabase
                .from('parking_prices')
                .select('duration_minutes, amount_cents, label')
                .eq('active', true)
                .order('duration_minutes');

            if (fetchError) throw new Error(fetchError.message);

            setPrices(data || []);
            setStep('duration');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 3 → 4: Buy ticket
    const handleBuyTicket = async () => {
        if (!selectedDuration) return;
        setLoading(true);
        setError('');

        try {
            const { data, error: fnError } = await supabase.functions.invoke('buy-ticket', {
                body: {
                    plate,
                    duration_minutes: selectedDuration,
                    payment_method: 'pix',
                },
            });

            if (fnError) throw new Error(fnError.message);

            const newTicket: ParkingTicket = {
                id: data.ticket_id,
                plate: data.plate,
                duration_minutes: data.duration_minutes,
                amount_cents: data.amount_cents,
                status: data.status,
                payment_method: 'pix',
                payment_id: data.payment_id,
                pix_code: data.pix_code,
                created_at: data.created_at,
                expires_at: data.expires_at,
            };

            setTicket(newTicket);
            setStep('payment');

            // Poll for payment confirmation (MVP: auto-confirms after ~3s on backend)
            const pollInterval = setInterval(async () => {
                const { data: updated } = await supabase
                    .from('parking_tickets')
                    .select('status')
                    .eq('id', newTicket.id)
                    .single();

                if (updated?.status === 'paid') {
                    clearInterval(pollInterval);
                    setPaymentConfirmed(true);
                    newTicket.status = 'paid';
                    setTicket({ ...newTicket });

                    // Save to local storage for ActiveTicket widget
                    localStorage.setItem('activeTicket', JSON.stringify(newTicket));
                    window.dispatchEvent(new Event('ticketUpdated'));
                    onTicketCreated?.(newTicket);

                    // Auto-advance to receipt
                    setTimeout(() => setStep('receipt'), 1000);
                }
            }, 2000);

            // Stop polling after 5 minutes
            setTimeout(() => clearInterval(pollInterval), 300000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyPix = async () => {
        if (ticket?.pix_code) {
            await navigator.clipboard.writeText(ticket.pix_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        {step !== 'capture' && step !== 'receipt' && (
                            <button
                                onClick={() => {
                                    if (step === 'confirm') { setStep('capture'); setManualEntry(false); setError(''); }
                                    else if (step === 'duration') setStep('confirm');
                                    else if (step === 'payment') setStep('duration');
                                }}
                                className="p-1 hover:bg-surface rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex items-center gap-2">
                            <Car className="w-5 h-5 text-coral" />
                            <h2 className="font-bold text-ink">{t('parking.title')}</h2>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-1 hover:bg-surface rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress indicator */}
                <div className="flex gap-1 px-4 pt-3">
                    {(['capture', 'confirm', 'duration', 'payment', 'receipt'] as WizardStep[]).map((s, i) => (
                        <div
                            key={s}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                                i <= ['capture', 'confirm', 'duration', 'payment', 'receipt'].indexOf(step)
                                    ? 'bg-coral'
                                    : 'bg-border'
                            }`}
                        />
                    ))}
                </div>

                {/* Error banner */}
                {error && (
                    <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                <div className="p-4">
                    {/* Step 1: Capture */}
                    {step === 'capture' && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted text-center">
                                {t('parking.capture_desc')}
                            </p>

                            {!manualEntry ? (
                                <div className="space-y-3">
                                    {cameraActive ? (
                                        <>
                                            <div className="relative rounded-xl overflow-hidden bg-black">
                                                <video
                                                    ref={videoRef}
                                                    autoPlay
                                                    playsInline
                                                    muted
                                                    className="w-full h-48 object-cover"
                                                />
                                                {/* Plate guide overlay */}
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <div className="w-3/4 h-12 border-2 border-white/70 rounded-lg" />
                                                </div>
                                            </div>
                                            <canvas ref={canvasRef} className="hidden" />
                                            <button
                                                onClick={captureFrame}
                                                disabled={loading}
                                                className="w-full flex items-center justify-center gap-3 py-4 bg-coral text-white rounded-xl font-semibold hover:bg-coral/90 transition-colors disabled:opacity-50"
                                            >
                                                {loading ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <Camera className="w-5 h-5" />
                                                )}
                                                {loading ? t('parking.analyzing') : t('parking.snap')}
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={startCamera}
                                            disabled={loading}
                                            className="w-full flex items-center justify-center gap-3 py-4 bg-coral text-white rounded-xl font-semibold hover:bg-coral/90 transition-colors disabled:opacity-50"
                                        >
                                            <Camera className="w-5 h-5" />
                                            {t('parking.take_photo')}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { stopCamera(); setManualEntry(true); }}
                                        className="w-full flex items-center justify-center gap-2 py-3 border border-border rounded-xl text-sm text-muted hover:bg-surface transition-colors"
                                    >
                                        <Keyboard className="w-4 h-4" />
                                        {t('parking.type_plate')}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-ink">{t('parking.plate_label')}</label>
                                    <input
                                        type="text"
                                        value={plate}
                                        onChange={(e) => setPlate(e.target.value.toUpperCase())}
                                        placeholder="ABC1D23"
                                        maxLength={7}
                                        className="w-full px-4 py-3 border-2 border-border rounded-xl text-center text-2xl font-bold tracking-[0.3em] uppercase focus:border-coral focus:outline-none transition-colors"
                                    />
                                    <button
                                        onClick={handleManualSubmit}
                                        disabled={plate.length < 7}
                                        className="w-full py-3 bg-coral text-white rounded-xl font-semibold hover:bg-coral/90 transition-colors disabled:opacity-50"
                                    >
                                        {t('parking.confirm_plate')}
                                    </button>
                                    <button
                                        onClick={() => { setManualEntry(false); setError(''); setCameraError(false); }}
                                        className="w-full text-center text-sm text-muted hover:text-ink transition-colors"
                                    >
                                        {t('parking.back_to_camera')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Confirm plate */}
                    {step === 'confirm' && (
                        <div className="space-y-4 text-center">
                            <p className="text-sm text-muted">{t('parking.confirm_desc')}</p>
                            <div className="inline-block bg-amber-50 border-2 border-amber-400 rounded-xl px-8 py-4">
                                <p className="text-3xl font-black tracking-[0.3em] text-ink">{plate}</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setStep('capture'); setManualEntry(true); }}
                                    className="flex-1 py-3 border border-border rounded-xl text-sm font-medium hover:bg-surface transition-colors"
                                >
                                    {t('parking.edit_plate')}
                                </button>
                                <button
                                    onClick={handleConfirmPlate}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-coral text-white rounded-xl font-semibold hover:bg-coral/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {t('parking.plate_correct')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Choose duration */}
                    {step === 'duration' && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <p className="text-sm text-muted">{t('parking.duration_desc')}</p>
                                <p className="text-xs text-muted mt-1">
                                    {t('parking.plate_label')}: <span className="font-bold text-ink">{plate}</span>
                                </p>
                            </div>
                            <div className="space-y-2">
                                {prices.map((option) => (
                                    <button
                                        key={option.duration_minutes}
                                        onClick={() => setSelectedDuration(option.duration_minutes)}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                                            selectedDuration === option.duration_minutes
                                                ? 'border-coral bg-coral/5'
                                                : 'border-border hover:border-coral/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Clock className={`w-5 h-5 ${selectedDuration === option.duration_minutes ? 'text-coral' : 'text-muted'}`} />
                                            <span className="font-medium">{option.label}</span>
                                        </div>
                                        <span className="font-bold text-coral text-lg">
                                            {formatCurrency(option.amount_cents)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={handleBuyTicket}
                                disabled={!selectedDuration || loading}
                                className="w-full py-3 bg-coral text-white rounded-xl font-semibold hover:bg-coral/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {t('parking.pay_now')}
                            </button>
                        </div>
                    )}

                    {/* Step 4: Payment */}
                    {step === 'payment' && ticket && (
                        <div className="space-y-4 text-center">
                            {!paymentConfirmed ? (
                                <>
                                    <p className="text-sm text-muted">{t('parking.pix_desc')}</p>
                                    <div className="bg-surface rounded-xl p-4 space-y-3">
                                        <p className="text-xs text-muted">{t('parking.pix_copy_label')}</p>
                                        <div className="bg-white rounded-lg p-3 font-mono text-xs break-all border border-border">
                                            {ticket.pix_code}
                                        </div>
                                        <button
                                            onClick={handleCopyPix}
                                            className="w-full flex items-center justify-center gap-2 py-2 bg-coral text-white rounded-lg text-sm font-medium hover:bg-coral/90 transition-colors"
                                        >
                                            <Copy className="w-4 h-4" />
                                            {copied ? t('parking.copied') : t('parking.copy_pix')}
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-center gap-2 text-sm text-muted">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {t('parking.waiting_payment')}
                                    </div>
                                </>
                            ) : (
                                <div className="py-4 space-y-3">
                                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                        <Check className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <p className="font-bold text-lg text-emerald-700">{t('parking.payment_confirmed')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 5: Receipt */}
                    {step === 'receipt' && ticket && (
                        <div className="space-y-4">
                            <div className="text-center space-y-1">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Check className="w-6 h-6 text-emerald-600" />
                                </div>
                                <h3 className="font-bold text-lg">{t('parking.ticket_active')}</h3>
                            </div>

                            <div className="bg-surface rounded-xl p-4 space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted">{t('parking.plate_label')}</span>
                                    <span className="font-bold tracking-widest">{ticket.plate}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted">{t('parking.duration_label')}</span>
                                    <span className="font-medium">
                                        {ticket.duration_minutes >= 60
                                            ? `${ticket.duration_minutes / 60}h`
                                            : `${ticket.duration_minutes}min`
                                        }
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted">{t('parking.amount_label')}</span>
                                    <span className="font-bold text-coral">{formatCurrency(ticket.amount_cents)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted">{t('parking.expires_at')}</span>
                                    <span className="font-medium">
                                        {new Date(ticket.expires_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="border-t border-border pt-2">
                                    <p className="text-xs text-muted text-center">
                                        ID: {ticket.id.substring(0, 8)}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleClose}
                                className="w-full py-3 bg-coral text-white rounded-xl font-semibold hover:bg-coral/90 transition-colors"
                            >
                                {t('parking.done')}
                            </button>

                            <p className="text-xs text-center text-muted">
                                {t('parking.receipt_note')}
                            </p>
                        </div>
                    )}
                </div>

                {/* WhatsApp fallback link */}
                {step === 'capture' && (
                    <div className="px-4 pb-4 pt-0">
                        <div className="border-t border-border pt-3">
                            <a
                                href="https://wa.me/5524999999999?text=Ol%C3%A1%20Agente%20Paty!%20Preciso%20de%20ajuda%20com%20o%20rotativo."
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted hover:text-ink flex items-center justify-center gap-1 transition-colors"
                            >
                                {t('parking.need_help')}
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlateCapture;
