import { useState, useCallback } from 'react';
import { useJournalStore } from '@/store/useJournalStore';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';

export default function TradeForm() {
  const accounts = useJournalStore(state => state.accounts);
  const addTrade = useJournalStore(state => state.addTrade);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultAccountId = searchParams.get('accountId') || '';

  const [accountId, setAccountId] = useState(defaultAccountId);
  const [asset, setAsset] = useState('NQ');
  const [direction, setDirection] = useState<'Long' | 'Short'>('Long');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [pnl, setPnl] = useState('');
  const [strategy, setStrategy] = useState('');
  const [riskReward, setRiskReward] = useState('');
  const [images, setImages] = useState<string[]>([]);

  // Simulate image upload using File API (base64) for now, until Firebase Storage is hooked
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 3
  });

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      alert("Por favor selecciona una cuenta.");
      return;
    }

    addTrade({
      accountId,
      asset,
      direction,
      entryPrice: Number(entryPrice),
      exitPrice: Number(exitPrice),
      pnl: Number(pnl),
      strategy,
      riskRewardRatio: Number(riskReward),
      images,
      status: 'Closed' // Asumimos cerrado por ahora
    });

    navigate(`/accounts/${accountId}`);
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Registrar Nuevo Trade</CardTitle>
          <CardDescription>Añade los detalles de tu operación y adjunta capturas de pantalla.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Selección de Cuenta */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Cuenta Asociada</label>
              <select 
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              >
                <option value="" disabled>Selecciona una cuenta</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} - {acc.firm}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Activo */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Activo</label>
                <input 
                  type="text" 
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  placeholder="ej. NQ, ES, EURUSD"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              {/* Dirección */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Dirección</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setDirection('Long')}
                    className={`flex-1 py-2.5 rounded-lg border font-semibold transition-colors ${direction === 'Long' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
                  >
                    Long
                  </button>
                  <button 
                    type="button"
                    onClick={() => setDirection('Short')}
                    className={`flex-1 py-2.5 rounded-lg border font-semibold transition-colors ${direction === 'Short' ? 'bg-rose-500/10 border-rose-500 text-rose-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
                  >
                    Short
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Precios y PnL */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Entrada</label>
                <input type="number" step="0.01" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} required className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Salida</label>
                <input type="number" step="0.01" value={exitPrice} onChange={e => setExitPrice(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">PnL Neto ($)</label>
                <input type="number" step="0.01" value={pnl} onChange={e => setPnl(e.target.value)} required className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Estrategia y R:R */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Estrategia</label>
                <input type="text" value={strategy} onChange={e => setStrategy(e.target.value)} placeholder="ej. SMC, Breakout" className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Riesgo / Beneficio</label>
                <input type="number" step="0.1" value={riskReward} onChange={e => setRiskReward(e.target.value)} placeholder="ej. 2.5" className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            {/* Subida de Imágenes */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Evidencia (Imágenes)</label>
              
              <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-900/50'}`}>
                <input {...getInputProps()} />
                <UploadCloud className="size-10 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-300 font-medium">Arrastra tus capturas aquí o haz clic para buscar</p>
                <p className="text-slate-400 text-xs mt-1">Soporta JPG, PNG (Max 3 imágenes)</p>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {images.map((src, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 aspect-video bg-slate-100">
                      <img src={src} alt="Trade preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-sm transition-colors cursor-pointer">
              Guardar Trade
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
