import React, { useState, useEffect } from 'react';

// Este componente calcula o tempo restante até as 23:30 do dia do vencimento
const ExpirationTimer = ({ dataVencimento, status }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    // Só mostramos o timer se a cobrança ainda estiver pendente ou atrasada
    if (status !== 'pendente' && status !== 'atrasado') return;

    const calculateTime = () => {
      const agora = new Date();
      // Criamos o alvo: Ano-Mês-Dia T 23:30:00
      const alvo = new Date(`${dataVencimento}T23:30:00`);
      const diff = alvo - agora;

      if (diff <= 0) {
        setTimeLeft("Expirado");
      } else {
        const horas = Math.floor(diff / (1000 * 60 * 60));
        const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diff % (1000 * 60)) / 1000);
        
        // Formata para sempre ter dois dígitos (ex: 02h 05m 09s)
        const h = String(horas).padStart(2, '0');
        const m = String(minutos).padStart(2, '0');
        const s = String(segundos).padStart(2, '0');
        
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    };

    calculateTime(); // Roda imediatamente
    const timer = setInterval(calculateTime, 1000); // Atualiza a cada segundo

    return () => clearInterval(timer);
  }, [dataVencimento, status]);

  if (status !== 'pendente' && status !== 'atrasado') return null;

  return (
    <div className={`flex items-center gap-1 text-[10px] font-black uppercase mt-1 px-2 py-0.5 rounded-md w-fit ${
      timeLeft === 'Expirado' 
      ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
    }`}>
      <span className="opacity-70">Expira em:</span>
      <span className="font-mono">{timeLeft}</span>
    </div>
  );
};

export default ExpirationTimer;