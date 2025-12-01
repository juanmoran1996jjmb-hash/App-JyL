import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, doc, setDoc, collection, query, onSnapshot, 
    runTransaction, increment, addDoc, deleteDoc, getDocs, writeBatch 
} from 'firebase/firestore';
import { 
    Package, ShoppingCart, Users, DollarSign, X, CheckCircle, 
    ArrowRight, ArrowDownLeft, Search, Zap, Trash2, BarChart, 
    Settings, Image as ImageIcon, MinusCircle, PlusCircle, Home, 
    Camera, UploadCloud, FileText, Pencil, RotateCcw, Cloud, HardDrive, 
    Wallet, AlertCircle, Plus
} from 'lucide-react';

// ==========================================
// ⚙️ CONFIGURACIÓN DE FIREBASE (EDITAR AQUÍ)
// ==========================================
// Ve a la consola de Firebase -> Configuración del Proyecto -> General -> Tus apps
// Copia los valores y pégalos aquí abajo.
const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUI",             // Ejemplo: "AIzaSyD..."
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO_ID",
    storageBucket: "TU_PROYECTO.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

// ID Único para tu aplicación (puedes cambiarlo si quieres reiniciar la base de datos)
const APP_COLLECTION_ID = 'mi-sistema-finanzas-v1'; 

// ==========================================
// 🚀 INICIALIZACIÓN DEL SISTEMA
// ==========================================

// Validación simple para evitar que la app explote si no has puesto las keys
const isConfigured = firebaseConfig.apiKey !== "TU_API_KEY_AQUI";

const app = isConfigured ? initializeApp(firebaseConfig) : null;
const dbAuth = app ? getAuth(app) : null;
const dbStore = app ? getFirestore(app) : null;

// Constantes Globales
const LOW_STOCK_THRESHOLD = 5;
const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"; 

// --- Helpers ---
const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount || 0);

const arrayToCSV = (arr) => {
    if (!arr.length) return '';
    const allKeys = new Set();
    arr.forEach(item => Object.keys(item).forEach(key => allKeys.add(key)));
    const headers = Array.from(allKeys);
    const csvRows = [headers.join(',')];

    for (const row of arr) {
        const values = headers.map(header => {
            const value = row[header];
            let stringValue = (typeof value === 'object' && value !== null && !Array.isArray(value)) 
                ? JSON.stringify(value).replace(/"/g, '""') 
                : (Array.isArray(value) ? JSON.stringify(value).replace(/"/g, '""') : String(value).replace(/"/g, '""'));
            
            if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
                stringValue = `"${stringValue}"`;
            }
            return stringValue;
        });
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
};

const downloadCSV = (csvData, filename) => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

// --- Componentes UI ---
const NavButton = ({ isActive, onClick, icon: Icon, label }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex flex-col items-center justify-center h-16 transition-all touch-manipulation 
            ${isActive 
            ? 'text-purple-700 bg-purple-50/50 border-t-2 border-purple-700' 
            : 'text-gray-400 bg-white border-t-2 border-transparent hover:bg-gray-50'
        }`}
    >
        <Icon className={`mb-1 ${isActive ? 'w-5 h-5' : 'w-5 h-5'}`} strokeWidth={isActive ? 2.5 : 2} />
        <span className={`text-[10px] font-bold ${isActive ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
    </button>
);

const CardStat = ({ title, value, color, icon: Icon, onClick, actionLabel }) => (
    <div 
        onClick={onClick}
        className={`relative overflow-hidden bg-white rounded-xl p-4 shadow-sm border active:scale-[0.97] cursor-pointer transition-all flex flex-col justify-between h-28
            ${color === 'blue' ? 'border-blue-100 shadow-blue-50/50' : color === 'orange' ? 'border-orange-100 shadow-orange-50/50' : color === 'green' ? 'border-green-100 shadow-green-50/50' : 'border-purple-100 shadow-purple-50/50'}
        `}
    >
        <div className={`absolute -right-2 -top-2 opacity-10 
            ${color === 'blue' ? 'text-blue-600' : color === 'orange' ? 'text-orange-600' : color === 'green' ? 'text-green-600' : 'text-purple-600'}
        `}>
            <Icon className={`w-16 h-16`} />
        </div>
        
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center 
                    ${color === 'blue' ? 'bg-blue-50 text-blue-600' : color === 'orange' ? 'bg-orange-50 text-orange-600' : color === 'green' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'}
                `}>
                    <Icon className="w-3.5 h-3.5" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{title}</p>
            </div>
            <p className={`text-xl font-black text-gray-800`}>{formatCurrency(value)}</p>
        </div>
        
        {actionLabel && (
            <div className={`mt-2 w-full py-1.5 text-[10px] font-bold rounded-lg flex items-center justify-center relative z-10 transition-colors 
                ${color === 'blue' ? 'bg-blue-50 text-blue-700' : color === 'orange' ? 'bg-orange-50 text-orange-700' : color === 'green' ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}
            `}>
                {actionLabel} <ArrowRight className="w-3 h-3 ml-1"/>
            </div>
        )}
    </div>
);

// --- Componente Modal Exportación ---
const ExportModal = ({ show, onClose, onExport, exportDataName, setExportDataName, archiveEmail }) => {
    const [exportTarget, setExportTarget] = useState('local'); 
    const [isExporting, setIsExporting] = useState(false);

    if (!show) return null;
    
    const handleAction = async () => {
        setIsExporting(true);
        try {
            await onExport(exportTarget, exportDataName);
            onClose();
        } catch (error) {
            console.error("Export error:", error);
        } finally {
            setIsExporting(false);
        }
    };

    const isCloudDisabled = !archiveEmail || archiveEmail.length < 5;
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                <h3 className="font-bold text-lg mb-4 text-green-700 flex items-center gap-2"><UploadCloud className="w-5 h-5"/> Gestión de Datos</h3>
                
                <div className='mb-6'>
                    <label className="text-xs font-bold text-gray-500">Nombre Base del Archivo</label>
                    <input 
                        className="w-full p-3 bg-gray-50 rounded-xl border focus:border-green-300 outline-none font-bold" 
                        value={exportDataName} 
                        onChange={e => setExportDataName(e.target.value)} 
                    />
                    <p className='text-[10px] text-gray-400 mt-1'>Ejemplo: {exportDataName}_ventas.csv</p>
                </div>

                <div className='space-y-3 mb-6'>
                    <h4 className='text-sm font-bold text-gray-600'>Seleccionar Destino</h4>
                    <div className='flex gap-3'>
                        <label className={`flex-1 flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${exportTarget === 'local' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                            <HardDrive className='w-5 h-5 mb-1 text-gray-600'/>
                            <span className='text-xs font-bold'>Local (CSV)</span>
                            <input type="radio" name="exportTarget" className="hidden" value="local" checked={exportTarget === 'local'} onChange={() => setExportTarget('local')} />
                        </label>
                        <label className={`flex-1 flex flex-col items-center p-3 rounded-xl border-2 transition-all ${isCloudDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${exportTarget === 'cloud' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                            <Cloud className='w-5 h-5 mb-1 text-gray-600'/>
                            <span className='text-xs font-bold'>Nube (Backup)</span>
                            <input type="radio" name="exportTarget" className="hidden" value="cloud" checked={exportTarget === 'cloud'} onChange={() => !isCloudDisabled && setExportTarget('cloud')} disabled={isCloudDisabled}/>
                        </label>
                    </div>
                </div>

                <div className="flex gap-2 mt-6">
                    <button onClick={onClose} className="flex-1 py-3 bg-gray-100 font-bold text-gray-500 rounded-xl text-xs" disabled={isExporting}>Cancelar</button>
                    <button 
                        onClick={handleAction} 
                        className={`flex-1 py-3 font-bold text-white rounded-xl shadow-lg text-xs flex items-center justify-center gap-2 ${isExporting ? 'bg-gray-400' : exportTarget === 'local' ? 'bg-green-600' : 'bg-blue-600'}`}
                        disabled={isExporting}
                    >
                        {isExporting ? 'Procesando...' : (exportTarget === 'local' ? 'Descargar' : 'Archivar')}
                        {isExporting ? <Zap className='w-4 h-4 animate-spin-slow' /> : exportTarget === 'local' ? <ArrowDownLeft className='w-4 h-4' /> : <Cloud className='w-4 h-4'/>}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- APP PRINCIPAL ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState(null);

    // Estados Globales
    const [config, setConfig] = useState({ name: 'Leidi y Juan', subtitle: 'Sistema de Gestión', logoUrl: '', archiveEmail: '' });
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [showResetConfirmation, setShowResetConfirmation] = useState(false); 
    
    // Estados Exportación
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportDataName, setExportDataName] = useState('Respaldo_Sistema'); 

    // Navegación
    const [activeTab, setActiveTab] = useState('Inicio'); 
    const [subTabInventory, setSubTabInventory] = useState('Listado');
    const [subTabCuentas, setSubTabCuentas] = useState('Por Pagar');
    
    // Datos Firestore
    const [stock, setStock] = useState([]);
    const [clients, setClients] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [receivables, setReceivables] = useState([]);
    const [sales, setSales] = useState([]);
    const [capital, setCapital] = useState({ initial: 0, current: 0, profit: 0 });

    // UI States Caja
    const [showCapitalForm, setShowCapitalForm] = useState(false);
    const [capitalInput, setCapitalInput] = useState({ type: 'Aporte', amount: '', withdrawSource: 'profit' });

    // --- Memos ---
    const totalStockValue = useMemo(() => stock.reduce((total, item) => total + (item.costoUnitario * item.cantidadStock || 0), 0), [stock]);
    const grossProfitFromSales = useMemo(() => sales.reduce((total, sale) => total + (sale.totalUtility || 0), 0), [sales]);
    const lowStockCount = useMemo(() => stock.filter(item => item.cantidadStock > 0 && item.cantidadStock <= LOW_STOCK_THRESHOLD).length, [stock]);

    // Listener de Auth y Datos
    useEffect(() => {
        // Si no hay configuración, detener carga
        if (!isConfigured) {
            setLoading(false);
            return;
        }

        const initAuth = async () => {
            try {
                // Inicio de sesión anónimo (Persistente en el navegador)
                await signInAnonymously(dbAuth);
            } catch(e) { console.error("Error auth:", e); }
        };
        initAuth();
        
        return onAuthStateChanged(dbAuth, (u) => {
            if (u) {
                setUser(u);
                // Ruta base usando el ID definido al inicio del archivo
                const basePath = `artifacts/${APP_COLLECTION_ID}/users/${u.uid}`;
                
                // Suscripciones a Firestore en Tiempo Real
                const unsub1 = onSnapshot(collection(dbStore, `${basePath}/inventario`), s => setStock(s.docs.map(d => ({id:d.id, ...d.data()}))));
                const unsub2 = onSnapshot(collection(dbStore, `${basePath}/clientes`), s => setClients(s.docs.map(d => ({id:d.id, ...d.data()}))));
                const unsub3 = onSnapshot(collection(dbStore, `${basePath}/ventas`), s => setSales(s.docs.map(d => ({id:d.id, ...d.data()}))));
                const unsub4 = onSnapshot(collection(dbStore, `${basePath}/gastos`), s => setExpenses(s.docs.map(d => ({id:d.id, ...d.data()}))));
                const unsub5 = onSnapshot(collection(dbStore, `${basePath}/cuentasPorCobrar`), s => setReceivables(s.docs.map(d => ({id:d.id, ...d.data()}))));
                const unsub6 = onSnapshot(doc(dbStore, `${basePath}/finanzas/capital_status`), d => {
                    if(d.exists()) setCapital({ initial: d.data().initialCapital||0, current: d.data().currentCapital||0, profit: d.data().totalProfit||0 });
                });
                const unsub7 = onSnapshot(doc(dbStore, `${basePath}/config/general`), d => {
                    if(d.exists()) setConfig({ ...d.data(), archiveEmail: d.data().archiveEmail || '' }); 
                });
                
                setLoading(false);
                return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); };
            }
        });
    }, []);

    const showMessage = (text, type = 'success') => {
        setMsg({ text, type });
        setTimeout(() => setMsg(null), 3000);
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 800000) { 
                showMessage("La imagen es muy grande. Intenta con una más pequeña.", "error");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setConfig({ ...config, logoUrl: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    // --- Lógica de Caja ---
    const handleCapital = async () => {
        const amount = parseFloat(capitalInput.amount);
        if (isNaN(amount) || amount <= 0) { showMessage("Monto inválido.", 'error'); return; }

        try {
            const ref = doc(dbStore, `artifacts/${APP_COLLECTION_ID}/users/${user.uid}/finanzas/capital_status`);
            await runTransaction(dbStore, async (t) => {
                const docSnap = await t.get(ref);
                if (!docSnap.exists()) {
                     if (capitalInput.type === 'Inicial') t.set(ref, { initialCapital: amount, currentCapital: amount, totalProfit: 0 });
                     return;
                } 
                const data = docSnap.data();
                if (capitalInput.type === 'Retiro') {
                    if (amount > data.currentCapital) throw new Error("FONDOS INSUFICIENTES en caja.");
                    if (capitalInput.withdrawSource === 'profit' && amount > data.totalProfit) throw new Error("GANANCIA INSUFICIENTE para retiro.");
                }

                let updateData = {};
                if (capitalInput.type === 'Aporte') {
                    updateData = { currentCapital: increment(amount), initialCapital: increment(amount) };
                } else if (capitalInput.type === 'Inicial') {
                    updateData = { initialCapital: amount, currentCapital: amount, totalProfit: 0 };
                } else if (capitalInput.type === 'Retiro') {
                    updateData.currentCapital = increment(-amount);
                    if (capitalInput.withdrawSource === 'profit') updateData.totalProfit = increment(-amount);
                    else updateData.initialCapital = increment(-amount);
                }
                t.update(ref, updateData);
            });
            showMessage("Caja actualizada");
            setShowCapitalForm(false);
            setCapitalInput({ type: 'Aporte', amount: '', withdrawSource: 'profit' });
        } catch (e) { showMessage(e.message, 'error'); }
    };

    const saveConfig = async (newConfig) => {
        try {
            await setDoc(doc(dbStore, `artifacts/${APP_COLLECTION_ID}/users/${user.uid}/config/general`), newConfig);
            showMessage("Configuración guardada");
            setShowConfigModal(false);
        } catch(e) { showMessage("Error guardando config", "error"); }
    };

    // --- Lógica de Exportación ---
    const handleDataExport = async (target, baseFilename) => { 
        if (!user || !dbStore) { showMessage("Error de autenticación", 'error'); return; }
        
        try {
            const basePath = `artifacts/${APP_COLLECTION_ID}/users/${user.uid}`;
            const dateSuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            let totalExports = 0;

            if (target === 'local' || target === 'both') {
                const collectionsToExport = [
                    { name: 'ventas', filenameSuffix: 'ventas_realizadas' },
                    { name: 'gastos', filenameSuffix: 'gastos_por_pagar' },
                    { name: 'cuentasPorCobrar', filenameSuffix: 'cuentas_por_cobrar' }
                ];
                
                for (const { name, filenameSuffix } of collectionsToExport) {
                    const snap = await getDocs(collection(dbStore, `${basePath}/${name}`));
                    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    if (data.length > 0) {
                        const csvData = arrayToCSV(data);
                        const finalFilename = `${baseFilename}_${filenameSuffix}_${dateSuffix}.csv`; 
                        downloadCSV(csvData, finalFilename);
                        totalExports++;
                    }
                }
                if (totalExports > 0) showMessage(`Descarga de ${totalExports} archivos CSV completada.`, 'success');
            }

            if (target === 'cloud' || target === 'both') {
                const email = config.archiveEmail;
                if (!email) { 
                    showMessage("Falta el email de archivo. Configúralo en Ajustes.", 'error'); 
                    return; 
                }

                const allDataSnapshot = {
                    sales: sales, expenses: expenses, receivables: receivables,
                    stock: stock, clients: clients, capitalStatus: capital, 
                    config: config, userId: user.uid, appId: APP_COLLECTION_ID
                };
                
                const archiveDoc = {
                    timestamp: new Date().toISOString(),
                    filename: baseFilename,
                    dataSnapshot: allDataSnapshot,
                    archiveEmail: email,
                };

                const archiveRef = collection(dbStore, `artifacts/${APP_COLLECTION_ID}/public/archives`);
                await addDoc(archiveRef, archiveDoc);

                showMessage(`Respaldo archivado en nube para: ${email}`, 'success');
            }
            
            if (totalExports === 0 && target === 'local') showMessage("No hay datos históricos para exportar.", 'warning');
        } catch (e) {
            console.error("Error exporting:", e);
            showMessage("Error al gestionar datos: " + e.message, 'error');
        } finally {
            setShowExportModal(false);
        }
    };
    
    // --- Lógica de Reinicio ---
    const handleDataReset = async () => {
        if (!user || !dbStore) { showMessage("Error de autenticación", 'error'); return; }
        setShowResetConfirmation(false);
        const collectionsToClear = ['ventas', 'gastos', 'cuentasPorCobrar'];

        try {
            for (const colName of collectionsToClear) {
                const q = query(collection(dbStore, `artifacts/${APP_COLLECTION_ID}/users/${user.uid}/${colName}`));
                const snap = await getDocs(q);
                
                if (snap.docs.length > 0) {
                    const batch = writeBatch(dbStore);
                    snap.docs.forEach((d) => batch.delete(d.ref));
                    await batch.commit();
                }
            }

            const clientSnap = await getDocs(collection(dbStore, `artifacts/${APP_COLLECTION_ID}/users/${user.uid}/clientes`));
            if (clientSnap.docs.length > 0) {
                const clientBatch = writeBatch(dbStore);
                clientSnap.docs.forEach((d) => {
                    if (d.data().currentDebt > 0) {
                        clientBatch.update(d.ref, { currentDebt: 0 });
                    }
                });
                await clientBatch.commit();
            }
            showMessage("Mantenimiento realizado exitosamente.", 'success');
        } catch (e) {
            console.error("Error:", e);
            showMessage("Error: " + e.message, 'error');
        }
    };

    // --- PANTALLA DE ERROR DE CONFIGURACIÓN ---
    if (!isConfigured) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-red-500">
                    <Zap className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-black text-slate-800 mb-2">Configuración Necesaria</h1>
                    <p className="text-slate-600 mb-6">
                        Para usar esta App en Vercel, necesitas conectar tu base de datos de Firebase.
                    </p>
                    <div className="bg-slate-100 p-4 rounded-lg text-left text-xs font-mono text-slate-700 mb-6 overflow-x-auto">
                        <p className="text-red-600 font-bold mb-2">// Edita src/App.jsx línea 19:</p>
                        const firebaseConfig = {'{'}<br/>
                        &nbsp;&nbsp;apiKey: "TU_API_KEY_AQUI",<br/>
                        &nbsp;&nbsp;...<br/>
                        {'}'};
                    </div>
                    <a href="https://console.firebase.google.com/" target="_blank" className="block w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
                        Ir a Consola Firebase
                    </a>
                </div>
            </div>
        );
    }

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center font-bold text-purple-600 bg-white">
            <Zap className="w-10 h-10 animate-bounce mb-4"/>
            <p>Conectando Sistema...</p>
        </div>
    );

    const logoSrc = config.logoUrl || DEFAULT_LOGO;

    return (
        <div className="min-h-screen bg-slate-50 text-gray-900 pb-20 font-sans selection:bg-purple-200">
            
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md shadow-sm border-b px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-purple-100 shadow-sm bg-white">
                         <img src={logoSrc} alt="Logo" className="w-full h-full object-cover" onError={(e) => e.target.src = DEFAULT_LOGO} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-purple-900 uppercase leading-none">{config.name}</h1>
                        <p className="text-[10px] text-purple-400 font-bold">{config.subtitle}</p>
                    </div>
                </div>
                <button onClick={() => setShowConfigModal(true)} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all">
                    <Settings className="w-5 h-5" />
                </button>
            </div>

            {/* Modal Configuración */}
            {showConfigModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="font-bold text-lg mb-4 text-purple-900 flex items-center gap-2"><Settings className="w-5 h-5"/> Ajustes Empresa</h3>
                        
                        <div className="space-y-4">
                            <div className="flex flex-col items-center justify-center space-y-2 mb-4">
                                <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 overflow-hidden relative group cursor-pointer">
                                    <img src={config.logoUrl || DEFAULT_LOGO} className="w-full h-full object-cover opacity-80" onError={(e) => e.target.src = DEFAULT_LOGO} />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-all">
                                        <Camera className="text-white drop-shadow-md w-6 h-6"/>
                                    </div>
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoUpload}/>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold">Toca para cambiar logo</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500">Nombre del Negocio</label>
                                <input className="w-full p-3 bg-gray-50 rounded-xl border focus:border-purple-300 outline-none font-bold" value={config.name} onChange={e => setConfig({...config, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500">Subtítulo / Slogan</label>
                                <input className="w-full p-3 bg-gray-50 rounded-xl border focus:border-purple-300 outline-none" value={config.subtitle} onChange={e => setConfig({...config, subtitle: e.target.value})} />
                            </div>
                            
                            <div className='pt-2'>
                                <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><Cloud className='w-3 h-3 text-blue-500'/> Email de Archivo en Nube (Gmail)</label>
                                <input className="w-full p-3 bg-blue-50 rounded-xl border focus:border-blue-300 outline-none text-sm" placeholder="correo@gmail.com" value={config.archiveEmail} onChange={e => setConfig({...config, archiveEmail: e.target.value})} />
                            </div>

                            <div className="pt-4 border-t border-gray-100 space-y-3">
                                <button onClick={() => { setShowConfigModal(false); setShowExportModal(true); }} className="w-full py-3 bg-purple-500 text-white rounded-xl font-bold shadow-md text-xs flex items-center justify-center gap-2 active:scale-95 transition-all">
                                    <Cloud className="w-4 h-4"/> Gestión de Exportación y Respaldo
                                </button>
                                <button onClick={() => setShowResetConfirmation(true)} className="w-full py-3 bg-red-100 text-red-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-red-200">
                                    <Trash2 className="w-4 h-4"/> Limpiar Historial de Operaciones
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setShowConfigModal(false)} className="flex-1 py-3 bg-gray-100 font-bold text-gray-500 rounded-xl text-xs">Cerrar</button>
                            <button onClick={() => saveConfig(config)} className="flex-1 py-3 bg-purple-600 font-bold text-white rounded-xl shadow-lg text-xs">Guardar Cambios</button>
                        </div>
                    </div>
                </div>
            )}
            
            <ExportModal 
                show={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleDataExport}
                exportDataName={exportDataName}
                setExportDataName={setExportDataName}
                archiveEmail={config.archiveEmail}
            />
            
            {showResetConfirmation && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border-t-4 border-red-500">
                        <h3 className="font-bold text-lg mb-2 text-red-800 flex items-center gap-2"><AlertCircle className="w-6 h-6"/> Confirmar Mantenimiento</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Estás a punto de eliminar permanentemente todos los registros de <span className='font-bold'>Ventas, Gastos y Cuentas</span>.
                            <br/><br/>
                            <span className='font-bold text-green-700'>Se conservarán:</span> Inventario, Clientes, Capital Inicial y Ganancia.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowResetConfirmation(false)} className="flex-1 py-3 bg-gray-200 font-bold text-gray-700 rounded-xl text-xs">Cancelar</button>
                            <button onClick={handleDataReset} className="flex-1 py-3 bg-red-600 font-bold text-white rounded-xl shadow-lg text-xs flex items-center justify-center gap-2 active:scale-95">
                                <RotateCcw className='w-4 h-4'/> Limpiar Historial Ahora
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notificaciones */}
            {msg && (
                <div className={`fixed top-20 left-4 right-4 p-4 rounded-xl shadow-2xl z-50 text-white font-bold text-center transition-all duration-300 ${msg.type === 'error' ? 'bg-red-500 animate-wiggle' : msg.type === 'warning' ? 'bg-orange-500' : 'bg-green-600 animate-in fade-in slide-in-from-top'}`}>
                    {msg.text}
                </div>
            )}

            <main className="p-4 max-w-lg mx-auto space-y-5">
                
                {activeTab === 'Inicio' && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                        {lowStockCount > 0 && (
                            <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-3 shadow-sm">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0"/>
                                <div className='flex-grow leading-tight'>
                                    <p className="font-bold text-red-800 text-sm">Stock Bajo</p>
                                    <p className="text-xs text-red-600">Revisar <span className='font-black'>{lowStockCount} productos</span>.</p>
                                </div>
                                <button onClick={() => { setSubTabInventory('Entrada'); setActiveTab('Inventario'); }} className='text-red-500 text-xs font-bold underline px-2'>Ver</button>
                            </div>
                        )}

                        {/* Caja Principal */}
                        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-purple-100/50 border border-purple-50 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 via-pink-500 to-purple-400"></div>
                            <h2 className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-1">Efectivo Disponible</h2>
                            <p className="text-4xl font-black text-gray-800 mb-4 tracking-tighter">{formatCurrency(capital.current)}</p>
                            
                            <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-4">
                                <div className="text-center">
                                    <p className="text-[9px] text-gray-400 font-bold uppercase">Base</p>
                                    <p className="font-bold text-gray-600 text-xs">{formatCurrency(capital.initial)}</p>
                                </div>
                                <div className="text-center border-l border-gray-100">
                                    <p className="text-[9px] text-green-600 font-bold uppercase">Ganancia</p>
                                    <p className="font-bold text-green-600 text-sm">{formatCurrency(capital.profit)}</p>
                                </div>
                                <div className="text-center border-l border-gray-100">
                                    <p className="text-[9px] text-gray-400 font-bold uppercase">Ventas</p>
                                    <p className="font-bold text-gray-600 text-xs">{formatCurrency(sales.reduce((a,b) => a + (b.subtotal||0), 0))}</p>
                                </div>
                            </div>

                            <button onClick={() => setShowCapitalForm(!showCapitalForm)} className="mt-4 w-full py-2 bg-gray-50 text-gray-600 hover:bg-purple-50 hover:text-purple-700 rounded-lg text-xs font-bold transition-colors">
                                {showCapitalForm ? 'Cerrar Gestión' : 'Gestionar Dinero'}
                            </button>
                        </div>

                        {showCapitalForm && (
                            <div className="bg-white border border-purple-200 p-4 rounded-xl shadow-lg animate-in zoom-in-95 relative overflow-hidden">
                                <div className="flex bg-gray-100 p-1 rounded-lg mb-4 relative z-10">
                                    {['Aporte', 'Retiro', 'Inicial'].map(t => (
                                        <button key={t} onClick={() => setCapitalInput({...capitalInput, type: t})} className={`flex-1 py-1.5 rounded-md font-bold text-xs transition-all ${capitalInput.type === t ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}>{t}</button>
                                    ))}
                                </div>
                                {capitalInput.type === 'Retiro' && (
                                    <div className="mb-3 bg-red-50 p-2 rounded-lg border border-red-100 flex gap-2">
                                        <label className={`flex-1 text-center py-2 rounded border cursor-pointer text-[10px] font-bold ${capitalInput.withdrawSource === 'profit' ? 'bg-green-100 border-green-300 text-green-800' : 'bg-white text-gray-400'}`}>
                                            <input type="radio" className="hidden" checked={capitalInput.withdrawSource === 'profit'} onChange={() => setCapitalInput({...capitalInput, withdrawSource: 'profit'})}/>
                                            Ganancia
                                        </label>
                                        <label className={`flex-1 text-center py-2 rounded border cursor-pointer text-[10px] font-bold ${capitalInput.withdrawSource === 'capital' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white text-gray-400'}`}>
                                            <input type="radio" className="hidden" checked={capitalInput.withdrawSource === 'capital'} onChange={() => setCapitalInput({...capitalInput, withdrawSource: 'capital'})}/>
                                            Capital
                                        </label>
                                    </div>
                                )}
                                <div className="flex gap-2 relative z-10">
                                    <input type="number" placeholder="0.00" className="flex-grow p-2 rounded-lg border-2 border-gray-100 font-bold outline-none focus:border-purple-300 bg-gray-50" value={capitalInput.amount} onChange={e => setCapitalInput({...capitalInput, amount: e.target.value})} />
                                    <button onClick={handleCapital} className="bg-purple-600 text-white px-4 rounded-lg shadow-lg active:scale-95"><CheckCircle size={20} /></button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <CardStat title="Inventario" value={totalStockValue} color="blue" icon={Package} actionLabel="Ver Stock" onClick={() => { setSubTabInventory('Listado'); setActiveTab('Inventario'); }}/>
                            <CardStat title="Por Cobrar" value={receivables.filter(r => r.status === 'Por Cobrar' || r.status === 'Parcial').reduce((a,b) => a + (b.currentBalance||0), 0)} color="orange" icon={Users} actionLabel="Ver Cuentas" onClick={() => { setSubTabCuentas('Por Cobrar'); setActiveTab('Cuentas'); }}/>
                            <CardStat title="Deudas" value={expenses.filter(e => e.status !== 'Pagada').reduce((a,b) => a + (b.currentBalance||0), 0)} color="red" icon={DollarSign} actionLabel="Ver Pagos" onClick={() => { setSubTabCuentas('Nuevo Gasto'); setActiveTab('Cuentas'); }}/>
                            <CardStat title="Utilidad Ventas" value={grossProfitFromSales} color="green" icon={BarChart} actionLabel="Historial" onClick={() => setActiveTab('Ventas')}/>
                        </div>
                    </div>
                )}

                {activeTab === 'Inventario' && <InventoryView stock={stock} user={user} db={dbStore} onMsg={showMessage} appId={APP_COLLECTION_ID} initialTab={subTabInventory} setInitialTab={setSubTabInventory}/>}
                {activeTab === 'Ventas' && <SalesView stock={stock} clients={clients} user={user} db={dbStore} onMsg={showMessage} onSaleComplete={() => setActiveTab('Inicio')} appId={APP_COLLECTION_ID} />}
                {activeTab === 'Cuentas' && <CuentasView expenses={expenses} receivables={receivables} user={user} db={dbStore} onMsg={showMessage} appId={APP_COLLECTION_ID} initialTab={subTabCuentas} setInitialTab={setSubTabCuentas}/>}
                {activeTab === 'Clientes' && <ClientsView clients={clients} user={user} db={dbStore} onMsg={showMessage} appId={APP_COLLECTION_ID} />}

            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-purple-50 z-40 pb-safe shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around max-w-lg mx-auto">
                    <NavButton isActive={activeTab === 'Inicio'} onClick={() => setActiveTab('Inicio')} icon={Home} label="Inicio" />
                    <NavButton isActive={activeTab === 'Inventario'} onClick={() => setActiveTab('Inventario')} icon={Package} label="Stock" />
                    <NavButton isActive={activeTab === 'Ventas'} onClick={() => setActiveTab('Ventas')} icon={ShoppingCart} label="Ventas" />
                    <NavButton isActive={activeTab === 'Cuentas'} onClick={() => setActiveTab('Cuentas')} icon={Wallet} label="Cuentas" />
                    <NavButton isActive={activeTab === 'Clientes'} onClick={() => setActiveTab('Clientes')} icon={Users} label="Clientes" />
                </div>
            </nav>
        </div>
    );
}

// --- SUB-COMPONENTES (Lógica Interna) ---

const InventoryView = ({ stock, user, db, onMsg, initialTab, setInitialTab, appId }) => {
    const [tab, setTab] = useState(initialTab || 'Listado');
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ code: '', description: '', quantity: '', cost: '', margin: 0.5, currentStock: 0, imageUrl: '' }); 
    
    useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);

    const handleProductImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 200000) { 
                onMsg("La imagen es muy grande. Máximo 200KB.", "error");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm({ ...form, imageUrl: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        const netMovement = parseFloat(form.quantity || 0);
        const newCostInput = parseFloat(form.cost);
        const margin = parseFloat(form.margin);
        
        if (!form.code || isNaN(newCostInput) || isNaN(margin)) { 
            onMsg("Completa campos básicos (Costo, Margen, Código)", "error"); return; 
        }

        try {
            await runTransaction(db, async (t) => {
                const ref = doc(db, `artifacts/${appId}/users/${user.uid}/inventario/${form.code}`);
                const snap = await t.get(ref);
                
                let currentData = snap.exists() ? snap.data() : { cantidadStock: 0, costoUnitario: 0, valorTotal: 0 };
                const finalQty = currentData.cantidadStock + netMovement;
                if (finalQty < 0) throw new Error("El stock no puede quedar en negativo.");
                
                let finalUnitCost = currentData.costoUnitario;
                let newTotalCostValue = currentData.valorTotal; 
                
                if (netMovement > 0) {
                    const costOfNewUnits = netMovement * newCostInput;
                    newTotalCostValue = currentData.valorTotal + costOfNewUnits;
                    if (finalQty > 0) finalUnitCost = newTotalCostValue / finalQty;
                    else finalUnitCost = newCostInput;
                } else if (netMovement < 0) {
                    newTotalCostValue = currentData.valorTotal + (netMovement * currentData.costoUnitario);
                } else {
                    if (!isEditing) finalUnitCost = newCostInput;
                }
                
                const price = finalUnitCost * (1 + margin); 
                
                t.set(ref, { 
                    code: form.code, description: form.description, 
                    cantidadStock: finalQty, costoUnitario: finalUnitCost, 
                    precioVenta: price, valorTotal: newTotalCostValue,
                    imageUrl: form.imageUrl || '',
                    lastUpdate: new Date().toISOString()
                }, { merge: true }); 
            });

            onMsg(isEditing ? "Producto Actualizado" : "Producto Registrado");
            setForm({ code: '', description: '', quantity: '', cost: '', margin: 0.5, currentStock: 0, imageUrl: '' });
            setIsEditing(false);
            setTab('Listado');
            if (setInitialTab) setInitialTab('Listado');
        } catch (e) { onMsg(e.message, "error"); }
    };

    const handleEdit = (item) => {
        const margin = item.costoUnitario > 0 ? (item.precioVenta / item.costoUnitario) - 1 : 0.5;
        setIsEditing(true);
        setForm({
            code: item.code, description: item.description,
            quantity: '', 
            cost: item.costoUnitario.toFixed(2), 
            margin: margin.toFixed(2),
            currentStock: item.cantidadStock,
            imageUrl: item.imageUrl || ''
        });
        setTab('Entrada');
    };

    const handleDelete = async (item) => {
        if (item.cantidadStock > 0) { onMsg("Ajusta el stock a 0 antes de borrar.", "error"); return; }
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/inventario/${item.id}`));
            onMsg(`Eliminado: ${item.description}`);
        } catch (e) { onMsg("Error: " + e.message, "error"); }
    };

    const calculatedPrice = (parseFloat(form.cost || 0) * (1 + parseFloat(form.margin || 0))).toFixed(2);
    const marginPercentage = (parseFloat(form.margin||0) * 100).toFixed(0);

    return (
        <div className="space-y-4">
             <div className="flex bg-gray-200 p-1 rounded-xl">
                {['Listado', 'Entrada'].map(t => (
                    <button key={t} onClick={() => { setTab(t); setIsEditing(false); setForm({ code: '', description: '', quantity: '', cost: '', margin: 0.5, currentStock: 0, imageUrl: '' }); }} 
                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${tab === t ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            {t === 'Listado' ? 'Inventario' : isEditing ? 'Editando...' : '+ Nuevo Producto'}
                    </button>
                ))}
            </div>

            {tab === 'Entrada' ? (
                <div className="bg-white p-5 rounded-2xl shadow-lg border border-purple-50 space-y-4 animate-in slide-in-from-right-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        {isEditing ? <Pencil className="text-blue-500 w-5 h-5"/> : <PlusCircle className="text-purple-500 w-5 h-5"/>}
                        {isEditing ? 'Editar Ficha Producto' : 'Registrar Mercancía'}
                    </h3>
                    
                    {isEditing && (
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-blue-800 uppercase">Stock Actual</span>
                            <span className="text-2xl font-black text-blue-900">{form.currentStock}</span>
                        </div>
                    )}

                    <div className="space-y-3">
                        <input placeholder="Código / ID *" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border focus:border-purple-300" value={form.code} onChange={e => setForm({...form, code: e.target.value})} disabled={isEditing}/>
                        <input placeholder="Nombre / Descripción *" className="w-full p-3 bg-gray-50 rounded-xl outline-none text-sm border focus:border-purple-300" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 ml-1 block mb-1">
                                    {isEditing ? 'Ajuste Stock (+/-)' : 'Cantidad Inicial'}
                                </label>
                                <input type="number" placeholder={isEditing ? 'Ej: +5 o -2' : '0'} className={`w-full p-3 rounded-xl outline-none font-bold text-sm border ${isEditing ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'}`} value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 ml-1 block mb-1">Costo Unitario ($)</label>
                                <input type="number" placeholder="0.00" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} />
                            </div>
                        </div>

                        <div>
                             <label className="text-[10px] font-bold text-gray-400 ml-1 block mb-1">Foto del Producto (Galería/URL)</label>
                             <div className="flex gap-2 items-center">
                                <label className="w-1/3 py-3 bg-gray-100 rounded-xl border border-dashed border-gray-300 text-center text-xs font-bold text-gray-500 cursor-pointer hover:bg-gray-200 transition-colors flex items-center justify-center gap-1">
                                    <Camera className='w-4 h-4'/>
                                    Galería
                                    <input type="file" accept="image/*" className="hidden" onChange={handleProductImageUpload} />
                                </label>
                                
                                <input placeholder="O pegar enlace URL..." className="flex-grow p-3 bg-gray-50 rounded-xl outline-none text-xs border focus:border-purple-300" value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} />
                                <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center border overflow-hidden">
                                    {form.imageUrl ? <img src={form.imageUrl} className="w-full h-full object-cover" onError={(e) => e.target.src = ''} /> : <ImageIcon className="text-gray-300 w-5 h-5"/>}
                                </div>
                             </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                            <div className='flex items-center gap-2'>
                                <span className="text-xs font-bold text-gray-500">Margen</span>
                                <input type="number" step="0.1" className="w-14 p-1 text-center font-bold rounded border" value={form.margin} onChange={e => setForm({...form, margin: e.target.value})}/>
                                <span className="text-[10px] text-gray-400">({marginPercentage}%)</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-gray-400 uppercase font-bold block">Precio Venta</span>
                                <span className="text-lg font-black text-purple-600">{formatCurrency(calculatedPrice)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <button onClick={handleSave} className={`w-full py-3.5 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all ${isEditing ? 'bg-blue-600' : 'bg-purple-600'}`}>
                        {isEditing ? 'Guardar Cambios' : 'Registrar Producto'}
                    </button>
                </div>
            ) : (
                <div className="space-y-3 pb-20 animate-in fade-in">
                    {stock.length === 0 && <div className="text-center py-10 opacity-50 text-sm">Inventario vacío</div>}
                    {stock.map(item => {
                        const isLow = item.cantidadStock <= LOW_STOCK_THRESHOLD && item.cantidadStock > 0;
                        return (
                        <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 relative overflow-hidden">
                            {isLow && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>}
                            
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden border border-gray-200">
                                {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" onError={(e) => e.target.src = ''} /> : <Package className="w-6 h-6 m-auto text-gray-300"/>}
                            </div>

                            <div className="flex-grow min-w-0">
                                <h4 className="font-bold text-gray-800 text-sm truncate">{item.description}</h4>
                                <div className="flex gap-2 text-[10px] text-gray-500 mt-0.5">
                                    <span className="bg-gray-100 px-1.5 py-0.5 rounded">{item.code}</span>
                                    <span className={item.cantidadStock === 0 ? 'text-gray-400' : isLow ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>Stock: {item.cantidadStock}</span>
                                </div>
                            </div>

                            <div className="text-right flex flex-col items-end gap-1">
                                <span className="text-sm font-black text-purple-700">{formatCurrency(item.precioVenta)}</span>
                                <div className='flex gap-2'>
                                    <button onClick={() => handleEdit(item)} className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"><Pencil className="w-3.5 h-3.5"/></button>
                                    <button onClick={() => handleDelete(item)} className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100"><Trash2 className="w-3.5 h-3.5"/></button>
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </div>
    );
};

const SalesView = ({ stock, clients, user, db, onMsg, onSaleComplete, appId }) => {
    const [cart, setCart] = useState([]);
    const [clientId, setClientId] = useState('');
    const [searchTerm, setSearchTerm] = useState(''); 
    const [showProductModal, setShowProductModal] = useState(false);

    const availableProducts = useMemo(() => {
        return stock.filter(item => item.cantidadStock > 0 && (item.description?.toLowerCase().includes(searchTerm.toLowerCase()) || item.code?.toLowerCase().includes(searchTerm.toLowerCase())));
    }, [stock, searchTerm]);

    const updateCart = (prod, delta) => {
        const existing = cart.find(i => i.code === prod.code);
        const currentQty = existing ? existing.quantity : 0;
        const newQty = currentQty + delta;
        
        if (newQty > prod.cantidadStock) { onMsg("Max stock alcanzado", "error"); return; }
        if (newQty <= 0) {
            setCart(cart.filter(i => i.code !== prod.code));
        } else {
            if (existing) setCart(cart.map(i => i.code === prod.code ? {...i, quantity: newQty} : i));
            else setCart([...cart, { ...prod, quantity: newQty, price: prod.precioVenta, cost: prod.costoUnitario }]);
        }
    };

    const processSale = async (type) => {
        if (!cart.length || !clientId) { onMsg("Selecciona Cliente y Productos", "error"); return; }
        const total = cart.reduce((a, b) => a + (b.price * b.quantity), 0);
        const totalCost = cart.reduce((a, b) => a + (b.cost * b.quantity), 0);
        const utility = total - totalCost;
        const clientName = clients.find(c => c.id === clientId)?.name;
        
        try {
            await runTransaction(db, async (t) => {
                for (const item of cart) {
                    const ref = doc(db, `artifacts/${appId}/users/${user.uid}/inventario/${item.code}`);
                    t.update(ref, { 
                        cantidadStock: increment(-item.quantity),
                        valorTotal: increment(-(item.cost * item.quantity))
                    });
                }
                const saleRef = doc(collection(db, `artifacts/${appId}/users/${user.uid}/ventas`));
                t.set(saleRef, { clientId, clientName, type, items: cart, subtotal: total, totalUtility: utility, date: new Date().toISOString(), id: saleRef.id });
                
                const capRef = doc(db, `artifacts/${appId}/users/${user.uid}/finanzas/capital_status`);
                if (type === 'Contado') {
                    t.update(capRef, { currentCapital: increment(total), totalProfit: increment(utility) });
                } else {
                    const debtRef = doc(collection(db, `artifacts/${appId}/users/${user.uid}/cuentasPorCobrar`));
                    t.set(debtRef, { clientId, clientName, amount: total, currentBalance: total, originalUtility: utility, status: 'Por Cobrar', saleId: saleRef.id, createdAt: new Date().toISOString() });
                    t.update(doc(db, `artifacts/${appId}/users/${user.uid}/clientes/${clientId}`), { currentDebt: increment(total) });
                }
            });
            onMsg("Venta Exitosa!");
            setCart([]);
            onSaleComplete();
        } catch (e) { onMsg(e.message, "error"); }
    };

    return (
        <div className="bg-white p-4 rounded-2xl shadow-lg border border-purple-50 space-y-4 h-full flex flex-col">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><ShoppingCart className="text-purple-600 w-5 h-5"/> Punto de Venta</h2>
            
            <div className="flex gap-2">
                <select className="flex-grow p-2.5 bg-purple-50 rounded-xl outline-none text-sm font-bold text-gray-700" value={clientId} onChange={e => setClientId(e.target.value)}>
                    <option value="">-- Seleccionar Cliente --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={() => setShowProductModal(true)} className='bg-purple-600 text-white px-4 rounded-xl shadow-md active:scale-95'><Search size={20}/></button>
            </div>

            <div className="flex-grow bg-gray-50 rounded-xl p-2 overflow-y-auto space-y-2 min-h-[200px]">
                {cart.length === 0 && <p className="text-center text-gray-400 text-sm mt-10">Carrito vacío. Añade productos.</p>}
                {cart.map((item) => (
                    <div key={item.code} className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 grid grid-cols-[auto_1fr_auto] gap-3 items-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border">
                             {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" onError={(e) => e.target.src = ''}/> : <Package className="w-5 h-5 m-auto mt-3 text-gray-300"/>}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate leading-tight">{item.description}</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{formatCurrency(item.price)} x unidad</p>
                            <p className="text-xs font-black text-purple-700">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <button onClick={() => updateCart(item, 1)} className="text-green-500 hover:text-green-600 bg-green-50 rounded p-0.5"><Plus size={16}/></button>
                            <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                            <button onClick={() => updateCart(item, -1)} className="text-red-400 hover:text-red-600 bg-red-50 rounded p-0.5"><MinusCircle size={16}/></button>
                        </div>
                    </div>
                ))}
            </div>

            {cart.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-dashed">
                    <div className="flex justify-between items-end">
                         <span className='text-xs text-gray-400 font-bold uppercase'>Total a Pagar</span>
                         <span className='text-2xl font-black text-purple-800 leading-none'>{formatCurrency(cart.reduce((a, b) => a + (b.price*b.quantity), 0))}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => processSale('Contado')} className="py-3 bg-green-500 text-white rounded-xl font-bold text-sm shadow active:scale-95">Cobrar Efectivo</button>
                        <button onClick={() => processSale('Crédito')} className="py-3 bg-purple-600 text-white rounded-xl font-bold text-sm shadow active:scale-95">A Crédito</button>
                    </div>
                </div>
            )}

            {showProductModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm animate-in slide-in-from-bottom">
                    <div className="bg-white rounded-t-3xl w-full max-w-lg h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <input 
                                placeholder="🔍 Buscar producto..." 
                                className="w-full bg-white p-3 rounded-xl border outline-none font-bold text-sm"
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus
                            />
                            <button onClick={() => setShowProductModal(false)} className="ml-3 p-2 bg-gray-200 rounded-full text-gray-500"><X size={20}/></button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-4 space-y-3 pb-20">
                            {availableProducts.map(prod => {
                                const inCart = cart.find(i => i.code === prod.code)?.quantity || 0;
                                return (
                                <div key={prod.code} className="flex gap-3 bg-white p-3 rounded-xl border shadow-sm items-center">
                                    <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border">
                                        {prod.imageUrl ? <img src={prod.imageUrl} className="w-full h-full object-cover" onError={(e) => e.target.src = ''}/> : <Package className="w-6 h-6 m-auto mt-4 text-gray-300"/>}
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-bold text-sm text-gray-800">{prod.description}</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-xs font-bold text-purple-600">{formatCurrency(prod.precioVenta)}</span>
                                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500">Stock: {prod.cantidadStock}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => updateCart(prod, 1)} className="bg-green-500 text-white p-2 rounded-lg font-bold text-xs shadow-sm active:scale-90">Añadir</button>
                                        {inCart > 0 && <span className="text-center text-xs font-bold text-green-600">En carro: {inCart}</span>}
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CuentasView = ({ expenses, receivables, user, db, onMsg, initialTab, setInitialTab, appId }) => {
    const [tab, setTab] = useState(initialTab || 'Por Pagar');
    const [gastoForm, setGastoForm] = useState({ provider: '', concept: '', amount: '' });
    const [abonoModal, setAbonoModal] = useState(null); 
    const [abonoAmount, setAbonoAmount] = useState('');

    useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);

    const handleNewExpense = async () => {
        const amount = parseFloat(gastoForm.amount);
        if (!gastoForm.provider || isNaN(amount) || amount <= 0) { onMsg("Datos inválidos", "error"); return; }
        try {
            await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/gastos`), { ...gastoForm, amount, currentBalance: amount, status: 'Por Pagar', createdAt: new Date().toISOString() });
            onMsg("Gasto registrado"); setGastoForm({ provider: '', concept: '', amount: '' }); setTab('Por Pagar');
        } catch (e) { onMsg(e.message, "error"); }
    };

    const handleAbonoSubmit = async () => {
        const amount = parseFloat(abonoAmount);
        if (isNaN(amount) || amount <= 0 || amount > abonoModal.currentBalance + 0.01) { onMsg("Monto inválido", "error"); return; }
        try {
            await runTransaction(db, async (t) => {
                const path = abonoModal.type === 'Cobrar' ? 'cuentasPorCobrar' : 'gastos';
                const docRef = doc(db, `artifacts/${appId}/users/${user.uid}/${path}/${abonoModal.id}`);
                const capRef = doc(db, `artifacts/${appId}/users/${user.uid}/finanzas/capital_status`);
                
                const newBalance = abonoModal.currentBalance - amount;
                const isTotalized = newBalance <= 0.1; 
                
                t.update(docRef, { currentBalance: isTotalized ? 0 : newBalance, status: isTotalized ? (abonoModal.type === 'Cobrar' ? 'Cobrada' : 'Pagada') : 'Parcial' });
                
                if (abonoModal.type === 'Cobrar') {
                    t.update(capRef, { currentCapital: increment(amount) });
                    if (isTotalized && abonoModal.originalUtility > 0) t.update(capRef, { totalProfit: increment(abonoModal.originalUtility) });
                    if (abonoModal.clientId) t.update(doc(db, `artifacts/${appId}/users/${user.uid}/clientes/${abonoModal.clientId}`), { currentDebt: increment(-amount) });
                } else {
                    t.update(capRef, { currentCapital: increment(-amount) });
                }
            });
            onMsg("Abono Exitoso"); setAbonoModal(null); setAbonoAmount('');
        } catch (e) { onMsg(e.message, "error"); }
    };

    const getList = () => {
        if (tab === 'Por Pagar') return expenses.filter(e => e.status !== 'Pagada').sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
        if (tab === 'Por Cobrar') return receivables.filter(r => r.status !== 'Cobrada').sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
        if (tab === 'Historial') return [...expenses, ...receivables].filter(i => i.status === 'Pagada' || i.status === 'Cobrada').sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
        return [];
    };

    const list = getList();

    return (
        <div className="space-y-4">
             <div className="flex bg-gray-100 p-1 rounded-xl gap-1 overflow-x-auto">
                {['Por Pagar', 'Por Cobrar', '+ Gasto', 'Historial'].map(t => (
                    <button key={t} onClick={() => { setTab(t); if(t === '+ Gasto') setTab('Nuevo Gasto'); }} 
                        className={`flex-1 py-2 px-3 whitespace-nowrap rounded-lg font-bold text-xs transition-all ${tab === t || (t === '+ Gasto' && tab === 'Nuevo Gasto') ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-400'}`}>
                        {t}
                    </button>
                ))}
            </div>

            {abonoModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="font-bold text-gray-800 text-lg mb-4 text-center">{abonoModal.type === 'Cobrar' ? 'Cobrar Deuda' : 'Pagar Gasto'}</h3>
                        <p className="text-center text-3xl font-black text-gray-800 mb-6">{formatCurrency(abonoModal.currentBalance)}</p>
                        <input type="number" autoFocus className="w-full p-3 bg-gray-50 rounded-xl mb-4 text-center font-bold text-lg outline-none border focus:border-purple-400" placeholder="Monto Abono" value={abonoAmount} onChange={e => setAbonoAmount(e.target.value)} />
                        <button onClick={() => setAbonoAmount(abonoModal.currentBalance.toFixed(2))} className="w-full mb-3 text-xs font-bold text-purple-500 underline">Abonar Todo</button>
                        <div className="flex gap-2">
                            <button onClick={() => setAbonoModal(null)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-500">Cancelar</button>
                            <button onClick={handleAbonoSubmit} className="flex-1 py-3 bg-purple-600 rounded-xl font-bold text-white shadow-lg">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'Nuevo Gasto' ? (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-orange-100 space-y-4">
                    <h3 className="font-bold text-orange-600 flex gap-2"><AlertCircle size={20}/> Registrar Salida</h3>
                    <input placeholder="¿A quién le debes?" className="w-full p-3 bg-orange-50 rounded-xl outline-none" value={gastoForm.provider} onChange={e => setGastoForm({...gastoForm, provider: e.target.value})} />
                    <input placeholder="Concepto" className="w-full p-3 bg-orange-50 rounded-xl outline-none" value={gastoForm.concept} onChange={e => setGastoForm({...gastoForm, concept: e.target.value})} />
                    <input type="number" placeholder="Monto" className="w-full p-3 bg-orange-50 rounded-xl outline-none font-bold" value={gastoForm.amount} onChange={e => setGastoForm({...gastoForm, amount: e.target.value})} />
                    <button onClick={handleNewExpense} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold shadow-lg">Guardar Deuda</button>
                </div>
            ) : (
                <div className="space-y-3 pb-20">
                    {list.length === 0 && <p className="text-center text-gray-300 py-10">No hay registros.</p>}
                    {list.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-gray-800">{item.clientName || item.provider}</p>
                                <p className="text-xs text-gray-400">{item.concept || (item.clientName ? 'Venta Crédito' : 'Gasto')}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-gray-800">{formatCurrency(item.currentBalance || item.amount)}</p>
                                {tab !== 'Historial' && (
                                    <button onClick={() => setAbonoModal({ id: item.id, currentBalance: item.currentBalance, type: item.clientName ? 'Cobrar' : 'Pagar', originalUtility: item.originalUtility, clientId: item.clientId })} 
                                        className={`text-[10px] font-bold px-3 py-1 rounded-full mt-1 ${item.clientName ? 'bg-purple-100 text-purple-600' : 'bg-red-100 text-red-600'}`}>
                                        {item.clientName ? 'COBRAR' : 'PAGAR'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ClientsView = ({ clients, user, db, onMsg, appId }) => {
    const [form, setForm] = useState({ name: '', id: '' });
    const [search, setSearch] = useState('');
    
    const handleSave = async () => {
        if (!form.name || !form.id) { onMsg("Faltan datos", "error"); return; }
        if (clients.some(c => c.id === form.id)) { onMsg("ID repetida", "error"); return; }
        try { await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/clientes/${form.id}`), { ...form, currentDebt: 0 }); onMsg("Cliente Guardado"); setForm({name:'', id:''}); } catch(e){ onMsg(e.message, 'error'); }
    };
    
    const list = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).sort((a,b) => b.currentDebt - a.currentDebt);

    return (
        <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl shadow-lg border border-purple-50 space-y-3">
                <h3 className="font-bold text-gray-700">Nuevo Cliente</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-gray-400 ml-1">Nombre Completo</label>
                        <input placeholder="Ej: María Pérez" className="w-full p-3 bg-gray-50 rounded-xl outline-none text-sm focus:border-purple-300 border border-transparent transition-all" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    </div>
                    <div>
                         <label className="text-xs font-bold text-gray-400 ml-1">ID / Cédula</label>
                        <input placeholder="Ej: V-12345678" className="w-full p-3 bg-gray-50 rounded-xl outline-none text-sm focus:border-purple-300 border border-transparent transition-all" value={form.id} onChange={e => setForm({...form, id: e.target.value})} />
                    </div>
                </div>
                <button onClick={handleSave} className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-sm shadow mt-2">Guardar Ficha</button>
            </div>
            
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input placeholder="Buscar cliente..." className="w-full p-3 pl-10 bg-white rounded-xl border border-gray-200 outline-none text-sm" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            
            <div className="pb-20 space-y-2">
                {list.map(c => (
                    <div key={c.id} className="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-sm">{c.name}</p>
                            <p className="text-xs text-gray-400">ID: {c.id}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-[10px] uppercase font-bold text-gray-400">Deuda</p>
                             <span className={`font-black ${c.currentDebt > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(c.currentDebt)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
