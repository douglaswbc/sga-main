import React from 'react';
import { X, Copy, Check } from 'lucide-react';
import { toast } from 'react-toastify';

const PixModal = ({ isOpen, onClose, pixData }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !pixData) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(pixData.copyPaste);
    setCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-card w-full max-w-sm rounded-xl border border-slate-700 shadow-2xl p-6 text-center">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">Taxa de Reserva</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <p className="text-slate-400 text-sm mb-4">Escaneie o QR Code abaixo para pagar a reserva (R$ 25,00):</p>
        
        <div className="bg-white p-3 rounded-lg inline-block mb-4">
          <img 
            src={`data:image/png;base64,${pixData.qrCode}`} 
            alt="QR Code PIX" 
            className="w-48 h-48"
          />
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-500 uppercase font-semibold">Pix Copia e Cola</p>
          <div className="flex gap-2">
            <input 
              readOnly 
              value={pixData.copyPaste}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-slate-300 truncate outline-none"
            />
            <button 
              onClick={handleCopy}
              className="bg-accent p-2 rounded hover:bg-indigo-700 transition-colors text-white"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <p className="mt-6 text-[10px] text-slate-500 italic">
          O status será atualizado automaticamente após a confirmação do pagamento.
        </p>
      </div>
    </div>
  );
};

export default PixModal;