import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Camera, Keyboard, ArrowLeft, Check, Clock, Copy, AlertCircle, Loader2, Car, MapPin, User, Mail, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabase';
import { extractVehicleFromImage, VehicleInfo } from '../services/ocr';
import type { ParkingTicket, ParkingPriceOption } from '../types';

type WizardStep = 'capture' | 'confirm' | 'buyer-info' | 'duration' | 'payment' | 'receipt';

interface PlateCaptureProps {
    isOpen: boolean;
    onClose: () => void;
    onTicketCreated?: (ticket: ParkingTicket) => void;
}

const PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

const WIZARD_STEPS: WizardStep[] = ['capture', 'confirm', 'buyer-info', 'duration', 'payment', 'receipt'];

/** Validate CPF check digits */
function isValidCpf(cpf: string): boolean {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    if (rest !== parseInt(digits[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    return rest === parseInt(digits[10]);
}

/** Format CPF with mask */
function formatCpfInput(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

const PlateCapture: React.FC<PlateCaptureProps> = ({ isOpen, onClose, onTicketCreated }) => {
    const { t } = useTranslation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Wizard state
    const [step, setStep] = useState<WizardStep>('capture');
    const [plate, setPlate] = useState('');
    const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
    const [manualEntry, setManualEntry] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isMvpFallback, setIsMvpFallback] = useState(false);

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

    // Geolocation state
    const [locationAddress, setLocationAddress] = useState<string>('');
    const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);

    // Vehicle info editável (pré-populado pelo OCR ou digitado manualmente)
    const [vehicleBrand, setVehicleBrand] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehicleColor, setVehicleColor] = useState('');

    // Buyer info state
    const [buyerName, setBuyerName] = useState('');
    const [buyerCpf, setBuyerCpf] = useState('');
    const [buyerEmail, setBuyerEmail] = useState('');

    // Payment polling
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    }, []);

    const reset = useCallback(() => {
        stopCamera();
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        setStep('capture');
        setPlate('');
        setVehicleInfo(null);
        setManualEntry(false);
        setLoading(false);
        setError('');
        setPrices([]);
        setSelectedDuration(null);
        setTicket(null);
        setPaymentConfirmed(false);
        setCopied(false);
        setCameraError(false);
        setLocationAddress('');
        setLocationCoords(null);
        setLocationLoading(false);
        setIsMvpFallback(false);
        setVehicleBrand('');
        setVehicleModel('');
        setVehicleColor('');
        setBuyerName('');
        setBuyerCpf('');
        setBuyerEmail('');
    }, [stopCamera]);

    const handleClose = () => {
        reset();
        onClose();
    };

    // Capture geolocation when modal opens
    useEffect(() => {
        if (!isOpen) return;
        setLocationLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setLocationCoords({ lat: latitude, lng: longitude });
                    try {
                        const res = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
                            { headers: { 'Accept-Language': 'pt-BR' } }
                        );
                        const data = await res.json();
                        const addr = data.address;
                        const street = addr?.road || addr?.pedestrian || '';
                        const number = addr?.house_number || '';
                        const neighbourhood = addr?.suburb || addr?.neighbourhood || '';
                        const parts = [street, number, neighbourhood].filter(Boolean);
                        setLocationAddress(parts.join(', ') || data.display_name?.split(',').slice(0, 3).join(',') || '');
                    } catch {
                        setLocationAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
                    } finally {
                        setLocationLoading(false);
                    }
                },
                () => { setLocationLoading(false); /* geolocation denied */ },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else {
            setLocationLoading(false);
        }
    }, [isOpen]);

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

            const result = await extractVehicleFromImage(base64);

            if (result.plate) {
                setPlate(result.plate);
                setVehicleInfo(result);
                setVehicleBrand(result.brand || '');
                setVehicleModel(result.model || '');
                setVehicleColor(result.color || '');
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
        setVehicleInfo(null);
        setVehicleBrand('');
        setVehicleModel('');
        setVehicleColor('');
        setError('');
        setStep('confirm');
    };

    // Price table: R$3.00 per period of 1h (Paraty Rotativo)
    // Parking hours: Dom-Qua 8h–19h (max 11h), Qui-Sab 8h–24h (max 16h)
    const MAX_PERIODS = 16;
    const PRICE_PER_PERIOD_CENTS = 300;
    const MVP_PRICES: ParkingPriceOption[] = Array.from({ length: MAX_PERIODS }, (_, i) => {
        const hours = i + 1;
        return {
            duration_minutes: hours * 60,
            amount_cents: hours * PRICE_PER_PERIOD_CENTS,
            label: hours === 1
                ? '1 hora — 1 período'
                : `${hours} horas — ${hours} períodos`,
        };
    });

    // Step 2 → 3: Go to buyer info
    const handleConfirmPlate = async () => {
        if (!vehicleBrand.trim()) {
            setError('Informe a marca do veículo.');
            return;
        }
        if (!vehicleColor.trim()) {
            setError('Informe a cor do veículo.');
            return;
        }
        setError('');
        setPrices(MVP_PRICES);
        setStep('buyer-info');
    };

    // Step 3 → 4: Validate buyer info and go to duration
    const handleConfirmBuyer = () => {
        setError('');
        if (!buyerName.trim() || buyerName.trim().length < 3) {
            setError(t('parking.buyer_name_required'));
            return;
        }
        if (!isValidCpf(buyerCpf)) {
            setError(t('parking.buyer_cpf_invalid'));
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(buyerEmail.trim())) {
            setError(t('parking.buyer_email_invalid'));
            return;
        }
        setStep('duration');
    };

    // Step 4 → 5: Buy ticket via rotativo-proxy
    const handleBuyTicket = async () => {
        if (!selectedDuration) return;

        const selectedPrice = prices.find(p => p.duration_minutes === selectedDuration);
        if (!selectedPrice) {
            console.error('[PlateCapture] selectedPrice not found for duration:', selectedDuration, 'available:', prices);
            setError('Preço não encontrado para o período selecionado.');
            return;
        }

        setLoading(true);
        setError('');

        const periods = selectedDuration / 60;
        console.log('[PlateCapture] handleBuyTicket start', { plate, periods, selectedDuration, amount: selectedPrice.amount_cents });

        try {
            // Call rotativo-proxy to login, register vehicle, generate PIX
            console.log('[PlateCapture] Calling rotativo-proxy generate-pix...');

            // Race the Edge Function call against a 20-second timeout
            const invokePromise = supabase.functions.invoke('rotativo-proxy', {
                body: {
                    action: 'generate-pix',
                    plate,
                    brand: vehicleBrand.trim() || 'N/I',
                    model: vehicleModel.trim() || undefined,
                    color: vehicleColor.trim() || 'N/I',
                    periods,
                    buyer_name: buyerName.trim(),
                    buyer_cpf: buyerCpf.replace(/\D/g, ''),
                    buyer_email: buyerEmail.trim().toLowerCase(),
                    location_description: locationAddress || undefined,
                    location_lat: locationCoords?.lat,
                    location_lng: locationCoords?.lng,
                },
            });
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Edge Function timeout after 45s')), 45000)
            );

            const { data, error: fnError } = await Promise.race([invokePromise, timeoutPromise]);

            console.log('[PlateCapture] rotativo-proxy response:', { data, fnError });

            if (fnError) throw fnError;

            const newTicket: ParkingTicket = {
                id: data.ticket_id,
                plate: data.plate,
                vehicle_brand: vehicleBrand.trim() || undefined,
                vehicle_model: vehicleModel.trim() || undefined,
                vehicle_color: vehicleColor.trim() || undefined,
                location_description: locationAddress || undefined,
                buyer_name: buyerName.trim(),
                buyer_cpf: buyerCpf.replace(/\D/g, ''),
                buyer_email: buyerEmail.trim().toLowerCase(),
                duration_minutes: selectedDuration,
                amount_cents: data.amount_cents,
                status: 'pending',
                payment_method: 'pix',
                payment_id: data.payment_id,
                pix_code: data.pix_code,
                qr_code_base64: data.qr_code_base64,
                created_at: data.created_at,
                expires_at: data.expires_at,
            };

            setTicket(newTicket);
            setStep('payment');

            // Poll payment via rotativo-proxy check-payment
            pollRef.current = setInterval(async () => {
                try {
                    const { data: checkData } = await supabase.functions.invoke('rotativo-proxy', {
                        body: { action: 'check-payment', ticket_id: newTicket.id },
                    });

                    if (checkData?.paid) {
                        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
                        setPaymentConfirmed(true);
                        newTicket.status = 'paid';
                        setTicket({ ...newTicket });

                        // Activate parking on Paraty Rotativo
                        try {
                            const { data: activateData } = await supabase.functions.invoke('rotativo-proxy', {
                                body: { action: 'activate-parking', ticket_id: newTicket.id },
                            });
                            if (activateData?.end_time) {
                                newTicket.expires_at = activateData.end_time;
                                newTicket.activated_at = activateData.start_time;
                            }
                        } catch { /* parking activation is best-effort */ }

                        // Send receipt email
                        sendReceiptEmail(newTicket);

                        setTicket({ ...newTicket });
                        localStorage.setItem('activeTicket', JSON.stringify(newTicket));
                        window.dispatchEvent(new Event('ticketUpdated'));
                        onTicketCreated?.(newTicket);
                        setTimeout(() => setStep('receipt'), 1500);
                    }
                } catch { /* ignore polling errors */ }
            }, 5000);

            // Timeout after 10 minutes
            setTimeout(() => {
                if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            }, 600000);
        } catch (err) {
            // MVP fallback: create ticket locally when Edge Function not deployed/reachable
            console.warn('[PlateCapture] Edge Function failed, using MVP fallback:', err);
            setIsMvpFallback(true);
            const now = new Date();
            const expiresAt = new Date(now.getTime() + selectedDuration * 60 * 1000);
            const mockId = crypto.randomUUID();
            const mockPaymentId = `PIX_${Date.now()}`;
            const mockPixCode = `00020126580014BR.GOV.BCB.PIX0136${mockId}5204000053039865406${(selectedPrice.amount_cents / 100).toFixed(2)}5802BR5913GO PARATY6007PARATY62070503***6304`;

            const newTicket: ParkingTicket = {
                id: mockId,
                plate,
                vehicle_brand: vehicleBrand.trim() || undefined,
                vehicle_model: vehicleModel.trim() || undefined,
                vehicle_color: vehicleColor.trim() || undefined,
                location_description: locationAddress || undefined,
                buyer_name: buyerName.trim(),
                buyer_cpf: buyerCpf.replace(/\D/g, ''),
                buyer_email: buyerEmail.trim().toLowerCase(),
                duration_minutes: selectedDuration,
                amount_cents: selectedPrice.amount_cents,
                status: 'pending',
                payment_method: 'pix',
                payment_id: mockPaymentId,
                pix_code: mockPixCode,
                created_at: now.toISOString(),
                expires_at: expiresAt.toISOString(),
            };

            setTicket(newTicket);
            setStep('payment');
            // No auto-confirm — user must pay or use the dev button
        } finally {
            setLoading(false);
        }
    };

    /** Send receipt email — works for both real (ticket_id) and MVP fallback (inline data) */
    const sendReceiptEmail = (paidTicket: ParkingTicket) => {
        const body = paidTicket.id && !isMvpFallback
            ? { ticket_id: paidTicket.id }
            : { ticket_data: paidTicket };
        console.log('[PlateCapture] sendReceiptEmail body:', JSON.stringify(body).slice(0, 120));
        supabase.functions.invoke('send-receipt', { body })
            .then((r) => console.log('[PlateCapture] send-receipt response:', r.data, r.error))
            .catch((e) => console.warn('[PlateCapture] send-receipt failed:', e));
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
                                    else if (step === 'buyer-info') { setStep('confirm'); setError(''); }
                                    else if (step === 'duration') { setStep('buyer-info'); setError(''); }
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
                    {WIZARD_STEPS.map((s, i) => (
                        <div
                            key={s}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                                i <= WIZARD_STEPS.indexOf(step)
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

                    {/* Step 2: Confirm plate + vehicle */}
                    {step === 'confirm' && (
                        <div className="space-y-4 text-center">
                            <p className="text-sm text-muted">{t('parking.confirm_desc')}</p>
                            <div className="inline-block bg-amber-50 border-2 border-amber-400 rounded-xl px-8 py-4">
                                <p className="text-3xl font-black tracking-[0.3em] text-ink">{plate}</p>
                            </div>

                            {/* Campos de marca e cor — obrigatórios */}
                            <div className="space-y-3 text-left">
                                <p className="text-xs font-semibold text-muted uppercase tracking-wide flex items-center gap-1.5">
                                    <Car className="w-3.5 h-3.5" />
                                    Dados do veículo
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-muted mb-1 block">Marca *</label>
                                        <input
                                            type="text"
                                            value={vehicleBrand}
                                            onChange={(e) => setVehicleBrand(e.target.value)}
                                            placeholder="Ex: Fiat, VW, GM"
                                            className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:border-coral focus:outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted mb-1 block">Cor *</label>
                                        <input
                                            type="text"
                                            value={vehicleColor}
                                            onChange={(e) => setVehicleColor(e.target.value)}
                                            placeholder="Ex: Branco, Prata"
                                            className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:border-coral focus:outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted mb-1 block">Modelo</label>
                                    <input
                                        type="text"
                                        value={vehicleModel}
                                        onChange={(e) => setVehicleModel(e.target.value)}
                                        placeholder="Ex: Uno, Gol, HB20"
                                        className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:border-coral focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="bg-surface rounded-xl p-3 flex items-start gap-2 text-left">
                                    <MapPin className="w-4 h-4 text-coral mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold text-muted uppercase tracking-wide">{t('parking.location')}</p>
                                        {locationLoading ? (
                                            <p className="text-sm text-muted flex items-center gap-1.5">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                Localizando...
                                            </p>
                                        ) : locationAddress ? (
                                            <p className="text-sm text-ink">{locationAddress}</p>
                                        ) : (
                                            <p className="text-sm text-muted">Localização não disponível</p>
                                        )}
                                    </div>
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

                    {/* Step 3: Buyer info */}
                    {step === 'buyer-info' && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <p className="text-sm text-muted">{t('parking.buyer_desc')}</p>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium text-ink flex items-center gap-1.5 mb-1">
                                        <User className="w-3.5 h-3.5" />
                                        {t('parking.buyer_name_label')}
                                    </label>
                                    <input
                                        type="text"
                                        value={buyerName}
                                        onChange={(e) => setBuyerName(e.target.value)}
                                        placeholder="João da Silva"
                                        className="w-full px-4 py-3 border-2 border-border rounded-xl text-sm focus:border-coral focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-ink flex items-center gap-1.5 mb-1">
                                        <CreditCard className="w-3.5 h-3.5" />
                                        {t('parking.buyer_cpf_label')}
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={buyerCpf}
                                        onChange={(e) => setBuyerCpf(formatCpfInput(e.target.value))}
                                        placeholder="000.000.000-00"
                                        maxLength={14}
                                        className="w-full px-4 py-3 border-2 border-border rounded-xl text-sm focus:border-coral focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-ink flex items-center gap-1.5 mb-1">
                                        <Mail className="w-3.5 h-3.5" />
                                        {t('parking.buyer_email_label')}
                                    </label>
                                    <input
                                        type="email"
                                        value={buyerEmail}
                                        onChange={(e) => setBuyerEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        className="w-full px-4 py-3 border-2 border-border rounded-xl text-sm focus:border-coral focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted text-center">
                                {t('parking.buyer_disclaimer')}
                            </p>
                            <button
                                onClick={handleConfirmBuyer}
                                className="w-full py-3 bg-coral text-white rounded-xl font-semibold hover:bg-coral/90 transition-colors flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                {t('parking.buyer_continue')}
                            </button>
                        </div>
                    )}

                    {/* Step 4: Choose duration */}
                    {step === 'duration' && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <p className="text-sm text-muted">{t('parking.duration_desc')}</p>
                                <p className="text-xs text-muted mt-1">
                                    {t('parking.plate_label')}: <span className="font-bold text-ink">{plate}</span>
                                </p>
                                <p className="text-xs text-muted mt-0.5">
                                    R$ 3,00 por hora ou fração • Dom-Qua 8h–19h • Qui-Sab 8h–24h
                                </p>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
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

                    {/* Step 5: Payment */}
                    {step === 'payment' && ticket && (
                        <div className="space-y-4 text-center">
                            {!paymentConfirmed ? (
                                <>
                                    <p className="text-sm text-muted">{t('parking.pix_desc')}</p>
                                    {ticket.qr_code_base64 && (
                                        <div className="flex justify-center">
                                            <img
                                                src={`data:image/png;base64,${ticket.qr_code_base64}`}
                                                alt="QR Code PIX"
                                                className="w-48 h-48 rounded-xl border border-border"
                                            />
                                        </div>
                                    )}
                                    <div className="bg-surface rounded-xl p-4 space-y-3">
                                        <p className="text-xs text-muted">{t('parking.pix_copy_label')}</p>
                                        <div className="bg-white rounded-lg p-3 font-mono text-xs break-all border border-border max-h-24 overflow-y-auto">
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
                                    {/* Dev-only: simulate payment when Edge Function is unavailable */}
                                    {isMvpFallback && window.location.hostname === 'localhost' && (
                                        <button
                                            onClick={() => {
                                                console.log('[PlateCapture] dev: simulating payment confirmed');
                                                if (!ticket) { console.warn('[PlateCapture] dev: ticket is null, aborting'); return; }
                                                const paid = { ...ticket, status: 'paid' as const };
                                                console.log('[PlateCapture] dev: setting paymentConfirmed, ticket:', paid.id);
                                                setPaymentConfirmed(true);
                                                setTicket(paid);
                                                localStorage.setItem('activeTicket', JSON.stringify(paid));
                                                window.dispatchEvent(new Event('ticketUpdated'));
                                                console.log('[PlateCapture] dev: calling onTicketCreated (modal stays open)');
                                                onTicketCreated?.(paid);
                                                console.log('[PlateCapture] dev: sending receipt email');
                                                sendReceiptEmail(paid);
                                                console.log('[PlateCapture] dev: scheduling setStep(receipt) in 800ms');
                                                setTimeout(() => {
                                                    console.log('[PlateCapture] dev: setStep(receipt) firing now');
                                                    setStep('receipt');
                                                }, 800);
                                            }}
                                            className="w-full py-2 border-2 border-dashed border-amber-400 text-amber-700 rounded-xl text-xs font-semibold hover:bg-amber-50 transition-colors"
                                        >
                                            ⚙️ Simular pagamento confirmado (dev)
                                        </button>
                                    )}
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

                    {/* Step 6: Receipt */}
                    {step === 'receipt' && ticket && (
                        <div className="space-y-4">
                            {console.log('[PlateCapture] rendering receipt step', ticket.id, ticket.status)}
                            <div className="text-center space-y-1">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Check className="w-6 h-6 text-emerald-600" />
                                </div>
                                <h3 className="font-bold text-lg">{t('parking.ticket_active')}</h3>
                            </div>

                            <div className="bg-surface rounded-xl p-4 space-y-3">
                                {ticket.buyer_name && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted">{t('parking.buyer_name_label')}</span>
                                        <span className="font-medium">{ticket.buyer_name}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted">{t('parking.plate_label')}</span>
                                    <span className="font-bold tracking-widest">{ticket.plate}</span>
                                </div>
                                {(ticket.vehicle_brand || ticket.vehicle_color) && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted">{t('parking.vehicle_label')}</span>
                                        <span className="font-medium">
                                            {[ticket.vehicle_color, ticket.vehicle_brand].filter(Boolean).join(' ')}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-sm text-muted">{t('parking.duration_label')}</span>
                                    <span className="font-medium">
                                        {ticket.duration_minutes >= 60
                                            ? `${ticket.duration_minutes / 60}h — ${ticket.duration_minutes / 60} ${ticket.duration_minutes / 60 === 1 ? 'período' : 'períodos'}`
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
                                {ticket.location_description && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted flex items-center gap-1"><MapPin className="w-3 h-3" />{t('parking.location')}</span>
                                        <span className="font-medium text-sm text-right max-w-[60%]">{ticket.location_description}</span>
                                    </div>
                                )}
                                <div className="border-t border-border pt-2">
                                    <p className="text-xs text-muted text-center">
                                        ID: {ticket.id.substring(0, 8)}
                                    </p>
                                </div>
                            </div>

                            {ticket.buyer_email && (
                                <div className="bg-blue-50 rounded-xl p-3 flex items-start gap-2">
                                    <Mail className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                    <p className="text-xs text-blue-700">
                                        {t('parking.receipt_email_sent', { email: ticket.buyer_email })}
                                    </p>
                                </div>
                            )}

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
