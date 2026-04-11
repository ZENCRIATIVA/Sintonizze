/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { 
  Trash2, 
  RotateCcw, 
  Download, 
  Check, 
  X, 
  Printer, 
  Music, 
  Heart, 
  Briefcase, 
  Frown, 
  Star, 
  Moon, 
  Sparkles,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FormData {
  modulo: string;
  modulo_outro_desc: string;
  intencao: string;
  nome: string;
  nascimento: string;
  email: string;
  telefone: string;
  nome_parceiro: string;
  nascimento_parceiro: string;
  historia: string;
  intencao_areas: string[];
  intencao_outra: string;
  intencao_detalhes: string;
  estilo_musical: string;
  momento_ouvir: string;
  observacoes: string;
}

const initialFormData: FormData = {
  modulo: '',
  modulo_outro_desc: '',
  intencao: '',
  nome: '',
  nascimento: '',
  email: '',
  telefone: '',
  nome_parceiro: '',
  nascimento_parceiro: '',
  historia: '',
  intencao_areas: [],
  intencao_outra: '',
  intencao_detalhes: '',
  estilo_musical: '',
  momento_ouvir: '',
  observacoes: '',
};

export default function App() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [showAutosave, setShowAutosave] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [modal, setModal] = useState<{ active: boolean; title: string; text: string; type?: 'info' | 'confirm_clear' | 'draft' }>({
    active: false,
    title: '',
    text: '',
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  
  // Cálculo de progresso simplificado para garantir atualização em tempo real
  const fieldsToTrack = [
    'intencao', 'nome', 'nascimento', 'email', 'telefone', 
    'historia', 'intencao_detalhes', 'estilo_musical', 
    'momento_ouvir', 'observacoes'
  ];
  
  let filledCount = 0;
  let totalCount = fieldsToTrack.length + 1; // +1 para o módulo

  // Lógica do módulo
  if (formData.modulo === 'OUTRO') {
    if (formData.modulo_outro_desc?.trim()) filledCount++;
  } else if (formData.modulo) {
    filledCount++;
  }

  // Campos padrão
  fieldsToTrack.forEach(field => {
    const val = formData[field as keyof FormData];
    if (typeof val === 'string' && val.trim()) filledCount++;
  });

  // Áreas (contadas como um campo)
  totalCount += 1;
  if (formData.intencao_areas && formData.intencao_areas.length > 0) filledCount++;

  // Extras do Módulo B
  if (formData.modulo === 'B') {
    totalCount += 2;
    if (formData.nome_parceiro?.trim()) filledCount++;
    if (formData.nascimento_parceiro) filledCount++;
  }

  const progress = totalCount === 0 ? 0 : Math.min(100, Math.round((filledCount / totalCount) * 100));

  // Helper to check if a field is filled
  const isFieldFilled = (name: keyof FormData) => {
    const value = formData[name];
    if (Array.isArray(value)) return value.length > 0;
    return typeof value === 'string' && value.trim() !== '';
  };

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem('sintonizze_formulario');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only show if it's not empty
      if (parsed.nome || parsed.email || parsed.intencao) {
        setModal({
          active: true,
          title: 'Rascunho Encontrado',
          text: 'Detectamos um rascunho salvo anteriormente. Deseja restaurar seus dados?',
          type: 'draft'
        });
      }
    }
  }, []);

  // Autosave
  useEffect(() => {
    if (formData === initialFormData) return;
    const timer = setTimeout(() => {
      localStorage.setItem('sintonizze_formulario', JSON.stringify(formData));
      setShowAutosave(true);
      setTimeout(() => setShowAutosave(false), 2000);
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const handleCheckboxChange = (value: string) => {
    setFormData(prev => {
      const areas = prev.intencao_areas.includes(value)
        ? prev.intencao_areas.filter(a => a !== value)
        : [...prev.intencao_areas, value];
      return { ...prev, intencao_areas: areas };
    });
    if (errors.intencao_areas) {
      setErrors(prev => ({ ...prev, intencao_areas: false }));
    }
  };

  const selectModule = (letter: string) => {
    setFormData(prev => ({ ...prev, modulo: letter }));
    if (errors.modulo) {
      setErrors(prev => ({ ...prev, modulo: false }));
    }
  };

  const carregarRascunho = () => {
    const saved = localStorage.getItem('sintonizze_formulario');
    if (saved) {
      setFormData(JSON.parse(saved));
      setErrors({});
      setIsSubmitted(false);
      setModal({ active: true, title: 'Rascunho Restaurado', text: 'Seus dados foram recuperados com sucesso.', type: 'info' });
    } else {
      setModal({ active: true, title: 'Nenhum Rascunho', text: 'Não encontramos nenhum rascunho salvo neste navegador.', type: 'info' });
    }
  };

  const confirmarLimpar = () => {
    setModal({
      active: true,
      title: 'Limpar Tudo?',
      text: 'Deseja apagar todos os campos e resetar o formulário? Esta ação é irreversível.',
      type: 'confirm_clear'
    });
  };

  const limparFormulario = () => {
    setFormData(initialFormData);
    setErrors({});
    setIsSubmitted(false);
    localStorage.removeItem('sintonizze_formulario');
    setModal({ active: true, title: 'Formulário Reiniciado', text: 'Todos os campos foram limpos e o rascunho foi removido.', type: 'info' });
  };

  const formatTelefone = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length <= 11) {
      if (v.length > 2) v = '(' + v.substring(0, 2) + ') ' + v.substring(2);
      if (v.length > 10) v = v.substring(0, 10) + '-' + v.substring(10);
    }
    return v;
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
  };

  const gerarPDF = async (silent = false) => {
    // Garantimos que silent seja booleano (evita erro se passar o evento do clique)
    const isSilent = silent === true;
    
    if (!isSilent) setIsLoading(true);
    try {
      // Pequeno delay para garantir que o overlay de carregamento apareça
      if (!isSilent) await new Promise(resolve => setTimeout(resolve, 500));

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const margin = 20;
      let y = 20;

      const addField = (label: string, value: string) => {
        if (!value || value.trim() === '') return;
        
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(11);
        doc.setTextColor(201, 168, 76);
        doc.text(label, margin, y);
        y += 6;

        doc.setFontSize(12);
        doc.setTextColor(14, 11, 8);
        const maxWidth = pageWidth - (margin * 2);
        const lines = doc.splitTextToSize(value, maxWidth);
        doc.text(lines, margin, y);
        y += (lines.length * 6) + 10;
      };

      // Header
      doc.setFillColor(14, 11, 8);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setFontSize(12);
      doc.setTextColor(201, 168, 76);
      doc.text('ENGENHARIA SÔNICA QUÂNTICA', pageWidth / 2, 14, { align: 'center' });
      doc.setFontSize(28);
      doc.setTextColor(250, 247, 242);
      doc.text('SINTONIZZE', pageWidth / 2, 26, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(201, 168, 76);
      doc.text('ONDAS TRANSCENDENTAIS', pageWidth / 2, 34, { align: 'center' });

      y = 50;
      doc.setFontSize(16);
      doc.setTextColor(201, 168, 76);
      doc.text('FORMULÁRIO DE CRIAÇÃO VIBRACIONAL PERSONALIZADA', pageWidth / 2, y, { align: 'center' });
      y += 12;

      const dataAtual = new Date().toLocaleDateString('pt-BR');
      doc.setFontSize(10);
      doc.setTextColor(74, 64, 53);
      doc.text(`Data de preenchimento: ${dataAtual}`, pageWidth / 2, y, { align: 'center' });
      y += 15;

      doc.setDrawColor(201, 168, 76);
      doc.setLineWidth(0.8);
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;

      // Content
      const modulos: Record<string, string> = {
        'A': 'Prosperidade',
        'B': 'Amor',
        'C': 'Carreira',
        'D': 'Ansiedade',
        'E': 'Propósito',
        'F': 'Sono',
        'OUTRO': 'Personalizado'
      };
      let moduloTexto = modulos[formData.modulo] || formData.modulo;
      if (formData.modulo === 'OUTRO') moduloTexto += ': ' + formData.modulo_outro_desc;
      
      addField('MÓDULO SOLICITADO', moduloTexto);
      addField('TÍTULO E INTENÇÃO CENTRAL', formData.intencao);
      
      doc.setFontSize(14);
      doc.setTextColor(201, 168, 76);
      doc.text('IDENTIDADE BIOGRÁFICA', margin, y);
      y += 10;

      addField('Nome completo', formData.nome);
      addField('Data de nascimento', formatDateBR(formData.nascimento));
      addField('E-mail', formData.email);
      addField('Telefone', formData.telefone);

      if (formData.modulo === 'B') {
        addField('Nome do(a) parceiro(a)', formData.nome_parceiro);
        addField('Data de nascimento do(a) parceiro(a)', formatDateBR(formData.nascimento_parceiro));
      }

      addField('HISTÓRIA PESSOAL E BLOQUEIOS', formData.historia);

      if (formData.intencao_areas.length > 0) {
        const areasNomes: Record<string, string> = {
          'prosperidade': 'Prosperidade',
          'amor': 'Amor',
          'carreira': 'Carreira',
          'ansiedade': 'Ansiedade',
          'proposito': 'Propósito',
          'sono': 'Sono'
        };
        addField('ÁREAS DE TRANSFORMAÇÃO', formData.intencao_areas.map(a => areasNomes[a]).join(', '));
      }

      addField('Outra área', formData.intencao_outra);
      addField('INTENÇÃO DETALHADA', formData.intencao_detalhes);
      addField('Preferências de estilo musical', formData.estilo_musical);
      addField('Momento ideal para ouvir', formData.momento_ouvir);
      addField('Observações finais', formData.observacoes);

      // Footer
      y = Math.max(y, 260);
      doc.setDrawColor(201, 168, 76);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;
      doc.setFontSize(9);
      doc.setTextColor(74, 64, 53);
      doc.text('© 2025 Sintonizze — Ondas Transcendentais. Todos os direitos reservados.', pageWidth / 2, y, { align: 'center' });

      // Sanitizar nome do arquivo
      const safeName = (formData.nome.split(' ')[0] || 'Cliente').replace(/[^a-z0-9]/gi, '_').toUpperCase();
      const nomeArquivo = `Sintonizze_Formulario_${safeName}.pdf`;
      
      doc.save(nomeArquivo);
      
      if (!isSilent) {
        setModal({ 
          active: true, 
          title: 'PDF Gerado com Sucesso!', 
          text: `O arquivo "${nomeArquivo}" foi baixado. Verifique sua pasta de downloads.`, 
          type: 'info' 
        });
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      if (!isSilent) {
        setModal({ 
          active: true, 
          title: 'Falha na Geração', 
          text: 'Não foi possível gerar o PDF. Tente novamente ou entre em contato com o suporte.', 
          type: 'info' 
        });
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, boolean> = {};
    
    if (!formData.modulo) newErrors.modulo = true;
    if (!formData.nome.trim()) newErrors.nome = true;
    if (!formData.nascimento) newErrors.nascimento = true;
    if (!formData.email.trim()) newErrors.email = true;
    
    if (formData.modulo === 'B') {
      if (!formData.nome_parceiro.trim()) newErrors.nome_parceiro = true;
      if (!formData.nascimento_parceiro) newErrors.nascimento_parceiro = true;
    }
    
    if (formData.modulo === 'OUTRO' && !formData.modulo_outro_desc.trim()) {
      newErrors.modulo_outro_desc = true;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setModal({ active: true, title: 'Campos Obrigatórios', text: 'Por favor, preencha todos os campos marcados com * para prosseguir.', type: 'info' });
      
      // Scroll to first error
      const firstError = Object.keys(newErrors)[0];
      const element = document.getElementById(firstError) || document.getElementsByName(firstError)[0];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsLoading(true);
    try {
      // 1. Enviar por e-mail via FormSubmit (AJAX)
      const response = await fetch("https://formsubmit.co/ajax/sintonizzey@gmail.com", {
        method: "POST",
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            _subject: `NOVO FORMULÁRIO: ${formData.nome} - Sintonizze`,
            _captcha: "false",
            _honey: "", // Honeypot para evitar spam
            Nome: formData.nome,
            Nascimento: formatDateBR(formData.nascimento),
            Email: formData.email,
            Telefone: formData.telefone,
            Modulo: formData.modulo,
            Intencao: formData.intencao,
            Historia: formData.historia,
            Areas: formData.intencao_areas.join(', '),
            Estilo: formData.estilo_musical,
            Observacoes: formData.observacoes,
            _template: 'table'
        })
      });

      // 2. Gerar PDF automaticamente (silenciosamente)
      await gerarPDF(true);

      if (!response.ok) {
        throw new Error('Erro no servidor de e-mail');
      }

      setIsSubmitted(true);
      localStorage.removeItem('sintonizze_formulario');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Erro no envio:', error);
      
      // Fallback: Geramos o PDF mesmo com erro no e-mail
      await gerarPDF(true);

      setModal({ 
        active: true, 
        title: 'Atenção: Ativação Necessária', 
        text: 'O envio automático falhou. IMPORTANTE: Verifique se você recebeu um e-mail de "Ativação" do FormSubmit em sintonizzey@gmail.com e clique no link. O PDF foi baixado com sucesso.', 
        type: 'info' 
      });
      
      setIsSubmitted(true); // Mostramos a tela de sucesso para o cliente
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream text-ink font-sans">
      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/95 z-[2000] flex flex-col items-center justify-center gap-6"
          >
            <div className="w-[60px] h-[60px] border-3 border-gold/30 border-t-gold rounded-full animate-spin" />
            <p className="text-cream text-xl tracking-[0.25em] uppercase">Gerando seu PDF...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Autosave Indicator */}
      <AnimatePresence>
        {showAutosave && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-[25px] right-[25px] bg-ink text-gold px-7 py-[15px] rounded-lg border-2 border-gold shadow-2xl flex items-center gap-3 z-[500]"
          >
            <Check size={20} />
            <span className="text-sm tracking-widest uppercase">Salvo automaticamente</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {modal.active && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/90 z-[1000] flex items-center justify-center p-6 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-cream border-2 border-gold rounded-xl max-width-[550px] w-full p-10 relative"
            >
              <button onClick={() => setModal({ ...modal, active: false })} className="absolute top-4 right-4 text-ink-mid hover:text-gold transition-colors">
                <X size={32} />
              </button>
              <h3 className="font-serif text-[2.2rem] text-ink mb-6 text-center">{modal.title}</h3>
              <p className="text-xl text-ink-mid leading-relaxed mb-8 text-center">{modal.text}</p>
              <div className="flex justify-center gap-4">
                {modal.type === 'draft' ? (
                  <>
                    <button onClick={() => {
                      localStorage.removeItem('sintonizze_formulario');
                      setModal({ active: false, title: '', text: '' });
                    }} className="toolbar-btn">Ignorar</button>
                    <button onClick={carregarRascunho} className="toolbar-btn primary">Restaurar</button>
                  </>
                ) : modal.type === 'confirm_clear' ? (
                  <>
                    <button onClick={() => setModal({ ...modal, active: false })} className="toolbar-btn">Cancelar</button>
                    <button onClick={limparFormulario} className="toolbar-btn primary">Sim, Limpar</button>
                  </>
                ) : (
                  <button onClick={() => setModal({ ...modal, active: false })} className="toolbar-btn primary">Entendi</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-ink py-20 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, #C9A84C 40px, #C9A84C 41px)' }} />
        <div className="relative z-10">
          <p className="text-gold uppercase tracking-[0.5em] text-base md:text-lg mb-4 opacity-90 font-medium">Engenharia Sônica Quântica</p>
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="h-[2px] w-20 bg-gold/40" />
            <Sparkles className="text-gold" size={32} />
            <div className="h-[2px] w-20 bg-gold/40" />
          </div>
          <h1 className="font-serif text-6xl md:text-9xl tracking-[0.2em] text-cream mb-4">SINTONIZZE<span className="text-gold">·</span></h1>
          <div className="gold-rule" />
          <p className="text-gold/70 uppercase tracking-[0.4em] text-lg md:text-xl mt-6 font-light">Ondas Transcendentais</p>
          <p className="font-serif italic text-2xl md:text-4xl text-cream/75 tracking-wider mt-5 leading-relaxed">Formulário de Criação Vibracional Personalizada</p>
          <div className="inline-block bg-gradient-to-br from-gold to-gold-light text-ink px-10 py-4 rounded-full text-lg tracking-[0.3em] uppercase font-bold mt-10 shadow-[0_8px_30px_rgba(201,168,76,0.5)]">
            ✦ PDF Editável ✦
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-ink-soft py-8 px-6 flex justify-center gap-6 flex-wrap border-b border-gold/25">
        <button onClick={confirmarLimpar} className="toolbar-btn">
          <Trash2 size={24} /> Limpar
        </button>
        <button onClick={carregarRascunho} className="toolbar-btn">
          <RotateCcw size={24} /> Recuperar Rascunho
        </button>
        <button onClick={() => gerarPDF(false)} className="toolbar-btn primary">
          <Download size={24} /> Baixar PDF Editável
        </button>
      </div>

      <main className="max-w-[1100px] mx-auto py-20 px-6 pb-32">
        {/* Progress Bar */}
        <div className="sticky top-0 bg-cream/95 backdrop-blur-md py-8 z-[100] border-b border-gold/25 mb-16 shadow-sm">
          <div className="h-3 bg-cream-dark rounded-full overflow-hidden shadow-inner max-w-[900px] mx-auto">
            <motion.div 
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 50, damping: 15 }}
              className="h-full bg-gradient-to-r from-gold via-gold-light to-gold"
            />
          </div>
          <p className="text-center text-lg tracking-[0.3em] uppercase text-gold mt-4 font-bold">
            {progress}% da sua frequência sintonizada
          </p>
        </div>

        <div className="text-center mb-20 border-b border-gold/25 pb-16">
          <p className="text-gold uppercase tracking-[0.5em] text-lg mb-6 font-medium">✦ Sua frequência única ✦</p>
          <p className="font-serif text-2xl md:text-4xl text-ink-mid leading-[1.8] max-w-[850px] mx-auto italic">
            Cada composição criada pela Sintonizze nasce da sua essência. Preencha com cuidado e verdade — quanto mais profundo o que você compartilha, mais poderosa e precisa será a sua música vibracional.
          </p>
        </div>

        {isSubmitted ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-16 border-2 border-gold/55 bg-gold-pale rounded-lg max-w-[900px] mx-auto"
          >
            <div className="flex justify-center mb-10">
              <div className="w-24 h-24 bg-gold rounded-full flex items-center justify-center shadow-lg">
                <Check size={48} className="text-ink" />
              </div>
            </div>
            <h3 className="font-serif text-5xl md:text-7xl text-ink mb-8 tracking-tight">Frequência Recebida ✦</h3>
            <div className="gold-rule mb-10" />
            
            <div className="space-y-8 mb-12">
              <p className="text-2xl text-ink-mid font-serif italic leading-relaxed">
                Sua intenção foi enviada com sucesso para nossa equipe em <span className="text-gold font-bold">sintonizzey@gmail.com</span>.
              </p>
              <p className="text-xl text-ink-mid leading-relaxed max-w-[700px] mx-auto">
                O seu formulário em PDF foi baixado automaticamente. Caso o download não tenha iniciado, utilize o botão abaixo.
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6 mt-10">
              <button onClick={() => gerarPDF()} className="toolbar-btn primary w-full md:w-auto py-6 px-10 text-xl">
                <Download size={28} /> Baixar PDF Novamente
              </button>
              <button onClick={() => setIsSubmitted(false)} className="toolbar-btn w-full md:w-auto py-6 px-10 text-xl">
                <RotateCcw size={28} /> Novo Formulário
              </button>
            </div>

            <div className="mt-16 p-8 bg-ink text-cream rounded-lg border border-gold/30">
              <p className="text-lg tracking-widest uppercase text-gold mb-4">Próximos Passos</p>
              <p className="text-lg opacity-80 leading-relaxed">
                Nossa equipe de Engenharia Sônica analisará sua biografia e intenções para compor sua obra exclusiva. 
                Você receberá um contato em breve.
              </p>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-14">
            {/* Section 1: Module */}
            <section className="animate-fadeInUp">
              <div className="flex items-center gap-6 mb-12">
                <div className="section-num">1</div>
                <div>
                  <p className="text-gold uppercase tracking-[0.5em] text-sm md:text-base mb-2 font-semibold">Campo 01</p>
                  <h2 className="font-serif text-3xl md:text-5xl text-ink leading-tight">Módulo Solicitado</h2>
                </div>
                <div className="flex-1 h-[3px] bg-gradient-to-r from-gold/55 to-transparent" />
              </div>

              <div className="space-y-10">
                <p className="field-hint">Selecione o tipo de composição que você deseja receber:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { id: 'A', icon: <DollarSign size={32} />, name: 'Código da Alma — Prosperidade', desc: 'O dinheiro nunca fica. Você trabalha muito, mas a abundância parece sempre escapar.' },
                    { id: 'B', icon: <Heart size={32} />, name: 'Sinfonia das Almas — Amor', desc: 'Amor que não vem ou não fica. Relacionamentos que terminam, solidão que persiste.' },
                    { id: 'C', icon: <Briefcase size={32} />, name: 'Primeira Melodia — Carreira', desc: 'Carreira estagnada. Você tem talento, mas não avança. Faltam oportunidades.' },
                    { id: 'D', icon: <Frown size={32} />, name: 'Business Soundscape — Ansiedade', desc: 'Ansiedade e exaustão mental. A mente não para, o sono é raso.' },
                    { id: 'E', icon: <Star size={32} />, name: 'Ciclo da Evolução — Propósito', desc: 'Sem propósito claro. Você sente que foi feito para mais, mas não sabe qual é o seu caminho.' },
                    { id: 'F', icon: <Moon size={32} />, name: 'Renascimento — Sono', desc: 'Sono que não restaura. Acorda cansado, sem energia para o dia.' },
                    { id: 'OUTRO', icon: <Sparkles size={32} />, name: 'Outro — Personalizado', desc: 'Descreva abaixo o que você busca e criaremos uma composição exclusiva para você.' },
                  ].map((mod) => (
                    <div 
                      key={mod.id}
                      onClick={() => selectModule(mod.id)}
                      className={`module-card ${formData.modulo === mod.id ? 'selected' : ''} ${errors.modulo && !formData.modulo ? 'border-red-500' : ''}`}
                    >
                      <div className={`mb-4 transition-colors ${formData.modulo === mod.id ? 'text-gold' : 'text-ink-mid/40'}`}>
                        {mod.icon}
                      </div>
                      <p className="text-2xl font-semibold text-ink mb-3">{mod.name}</p>
                      <p className="text-lg text-ink-mid font-serif italic leading-relaxed">{mod.desc}</p>
                    </div>
                  ))}
                </div>

                {errors.modulo && !formData.modulo && (
                  <p className="text-red-500 text-sm mt-2">Por favor, selecione um módulo.</p>
                )}

                {formData.modulo === 'OUTRO' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                  >
                    <label className="font-serif text-lg text-ink-mid mb-3 block">Descreva o tipo de composição personalizada:</label>
                    <input 
                      type="text" 
                      name="modulo_outro_desc" 
                      value={formData.modulo_outro_desc}
                      onChange={handleInputChange}
                      placeholder="Descreva aqui sua necessidade..."
                      className={`${isFieldFilled('modulo_outro_desc') ? 'filled' : ''} ${errors.modulo_outro_desc ? 'border-red-500' : ''}`}
                      required
                    />
                    {errors.modulo_outro_desc && <p className="text-red-500 text-sm mt-2">Este campo é obrigatório.</p>}
                  </motion.div>
                )}
              </div>
            </section>

            <div className="ornamental-sep"><div className="sep-diamond" /></div>

            {/* Section 2: Intention */}
            <section className="animate-fadeInUp">
              <div className="flex items-center gap-6 mb-12">
                <div className="section-num">2</div>
                <div>
                  <p className="text-gold uppercase tracking-[0.5em] text-sm md:text-base mb-2 font-semibold">Campo 02</p>
                  <h2 className="font-serif text-3xl md:text-5xl text-ink leading-tight">Título e Intenção Central</h2>
                </div>
                <div className="flex-1 h-[3px] bg-gradient-to-r from-gold/55 to-transparent" />
              </div>
              <div className="space-y-6">
                <label className="field-label">Título ou essência da música</label>
                <p className="field-hint">Qual é o nome, a essência e o poder que essa música deve carregar?</p>
                <textarea 
                  name="intencao" 
                  value={formData.intencao}
                  onChange={handleInputChange}
                  placeholder="Ex: Uma música que dissolva meu medo de prosperar..." 
                  className={isFieldFilled('intencao') ? 'filled' : ''}
                  rows={5} 
                />
              </div>
            </section>

            <div className="ornamental-sep"><div className="sep-diamond" /></div>

            {/* Section 3: Identity */}
            <section className="animate-fadeInUp">
              <div className="flex items-center gap-6 mb-12">
                <div className="section-num">3</div>
                <div>
                  <p className="text-gold uppercase tracking-[0.5em] text-sm md:text-base mb-2 font-semibold">Campo 03</p>
                  <h2 className="font-serif text-3xl md:text-5xl text-ink leading-tight">Identidade Biográfica</h2>
                </div>
                <div className="flex-1 h-[3px] bg-gradient-to-r from-gold/55 to-transparent" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="field-label">Nome completo *</label>
                  <input 
                    type="text" 
                    name="nome" 
                    id="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    placeholder="Seu nome completo" 
                    className={`${isFieldFilled('nome') ? 'filled' : ''} ${errors.nome ? 'border-red-500' : ''}`}
                    required 
                  />
                  {errors.nome && <p className="text-red-500 text-sm">Nome é obrigatório.</p>}
                </div>
                <div className="space-y-4">
                  <label className="field-label">Data de nascimento *</label>
                  <input 
                    type="date" 
                    name="nascimento" 
                    id="nascimento"
                    value={formData.nascimento}
                    onChange={handleInputChange}
                    className={`${isFieldFilled('nascimento') ? 'filled' : ''} ${errors.nascimento ? 'border-red-500' : ''}`}
                    required 
                  />
                  {errors.nascimento && <p className="text-red-500 text-sm">Data de nascimento é obrigatória.</p>}
                </div>
              </div>

              <div className="mt-8 space-y-8">
                <div className="space-y-4">
                  <label className="field-label">E-mail para contato *</label>
                  <input 
                    type="email" 
                    name="email" 
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="seu@email.com" 
                    className={`${isFieldFilled('email') ? 'filled' : ''} ${errors.email ? 'border-red-500' : ''}`}
                    required 
                  />
                  {errors.email && <p className="text-red-500 text-sm">E-mail válido é obrigatório.</p>}
                </div>
                <div className="space-y-4">
                  <label className="field-label">Telefone / WhatsApp</label>
                  <input 
                    type="tel" 
                    name="telefone" 
                    value={formData.telefone}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefone: formatTelefone(e.target.value) }))}
                    placeholder="(00) 00000-0000" 
                    className={isFieldFilled('telefone') ? 'filled' : ''}
                  />
                </div>
              </div>

              {formData.modulo === 'B' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-8 p-8 bg-cream-dark border-2 border-gold/25 rounded-lg space-y-6"
                >
                  <p className="text-gold uppercase tracking-[0.3em] font-medium mb-4">Dados do(a) parceiro(a) — Módulo B</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="field-label">Nome completo do(a) parceiro(a) *</label>
                      <input 
                        type="text" 
                        name="nome_parceiro" 
                        value={formData.nome_parceiro}
                        onChange={handleInputChange}
                        placeholder="Nome completo" 
                        className={`${isFieldFilled('nome_parceiro') ? 'filled' : ''} ${errors.nome_parceiro ? 'border-red-500' : ''}`}
                        required 
                      />
                      {errors.nome_parceiro && <p className="text-red-500 text-sm">Nome do parceiro é obrigatório.</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="field-label">Data de nascimento *</label>
                      <input 
                        type="date" 
                        name="nascimento_parceiro" 
                        value={formData.nascimento_parceiro}
                        onChange={handleInputChange}
                        className={`${isFieldFilled('nascimento_parceiro') ? 'filled' : ''} ${errors.nascimento_parceiro ? 'border-red-500' : ''}`}
                        required 
                      />
                      {errors.nascimento_parceiro && <p className="text-red-500 text-sm">Data de nascimento do parceiro é obrigatória.</p>}
                    </div>
                  </div>
                </motion.div>
              )}
            </section>

            <div className="ornamental-sep"><div className="sep-diamond" /></div>

            {/* Section 4: History */}
            <section className="animate-fadeInUp">
              <div className="flex items-center gap-6 mb-12">
                <div className="section-num">4</div>
                <div>
                  <p className="text-gold uppercase tracking-[0.5em] text-sm md:text-base mb-2 font-semibold">Campo 04</p>
                  <h2 className="font-serif text-3xl md:text-5xl text-ink leading-tight">História Pessoal e Bloqueios</h2>
                </div>
                <div className="flex-1 h-[3px] bg-gradient-to-r from-gold/55 to-transparent" />
              </div>
              <div className="space-y-6">
                <p className="field-hint">Compartilhe livremente sua história: desafios, bloqueios, dores e o que deseja transformar.</p>
                <textarea 
                  name="historia" 
                  value={formData.historia}
                  onChange={handleInputChange}
                  placeholder="Escreva com liberdade. Tudo será mantido em absoluta confidencialidade..." 
                  className={isFieldFilled('historia') ? 'filled' : ''}
                  rows={10} 
                />
              </div>
            </section>

            <div className="ornamental-sep"><div className="sep-diamond" /></div>

            {/* Section 5: Transformation */}
            <section className="animate-fadeInUp">
              <div className="flex items-center gap-6 mb-12">
                <div className="section-num">5</div>
                <div>
                  <p className="text-gold uppercase tracking-[0.5em] text-sm md:text-base mb-2 font-semibold">Campo 05</p>
                  <h2 className="font-serif text-3xl md:text-5xl text-ink leading-tight">Intenção de Transformação</h2>
                </div>
                <div className="flex-1 h-[3px] bg-gradient-to-r from-gold/55 to-transparent" />
              </div>

              <div className="space-y-12">
                <div className="space-y-6">
                  <label className="field-label">Selecione as áreas de transformação</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { id: 'prosperidade', label: 'Prosperidade / Abundância', icon: '💰' },
                      { id: 'amor', label: 'Amor / Relacionamentos', icon: '❤️' },
                      { id: 'carreira', label: 'Carreira / Reconhecimento', icon: '💼' },
                      { id: 'ansiedade', label: 'Ansiedade / Exaustão', icon: '😔' },
                      { id: 'proposito', label: 'Propósito / Conexão', icon: '🌟' },
                      { id: 'sono', label: 'Sono / Restauração', icon: '😴' },
                    ].map((area) => (
                      <div 
                        key={area.id}
                        onClick={() => handleCheckboxChange(area.id)}
                        className={`check-item ${formData.intencao_areas.includes(area.id) ? 'checked' : ''}`}
                      >
                        <div className={`w-8 h-8 border-2 border-gold/55 rounded-md flex items-center justify-center transition-colors ${formData.intencao_areas.includes(area.id) ? 'bg-gold border-gold' : ''}`}>
                          {formData.intencao_areas.includes(area.id) && <Check size={20} className="text-white" />}
                        </div>
                        <span className="text-xl text-ink font-medium">
                          <span className="mr-3 text-2xl">{area.icon}</span> {area.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="field-label">Outra área</label>
                  <input 
                    type="text" 
                    name="intencao_outra" 
                    value={formData.intencao_outra}
                    onChange={handleInputChange}
                    placeholder="Descreva outra área de transformação..." 
                    className={isFieldFilled('intencao_outra') ? 'filled' : ''}
                  />
                </div>

                <div className="space-y-6">
                  <label className="field-label">Descreva sua intenção em detalhes</label>
                  <p className="field-hint">O que você quer sentir, conquistar ou transmutar?</p>
                  <textarea 
                    name="intencao_detalhes" 
                    value={formData.intencao_detalhes}
                    onChange={handleInputChange}
                    placeholder="Descreva com profundidade sua intenção..." 
                    className={isFieldFilled('intencao_detalhes') ? 'filled' : ''}
                    rows={8} 
                  />
                </div>
              </div>
            </section>

            <div className="ornamental-sep"><div className="sep-diamond" /></div>

            {/* Section 6: Additional Info */}
            <section className="animate-fadeInUp">
              <div className="flex items-center gap-6 mb-12">
                <div className="section-num">6</div>
                <div>
                  <p className="text-gold uppercase tracking-[0.5em] text-sm md:text-base mb-2 font-semibold">Campo 06</p>
                  <h2 className="font-serif text-3xl md:text-5xl text-ink leading-tight">Informações Adicionais</h2>
                </div>
                <div className="flex-1 h-[3px] bg-gradient-to-r from-gold/55 to-transparent" />
              </div>

              <div className="space-y-10">
                <div className="space-y-4">
                  <label className="field-label">Preferências de estilo musical</label>
                  <input 
                    type="text" 
                    name="estilo_musical" 
                    value={formData.estilo_musical}
                    onChange={handleInputChange}
                    placeholder="Ex: instrumental, new age, clássica..." 
                    className={isFieldFilled('estilo_musical') ? 'filled' : ''}
                  />
                </div>
                <div className="space-y-4">
                  <label className="field-label">Momento ideal para ouvir</label>
                  <input 
                    type="text" 
                    name="momento_ouvir" 
                    value={formData.momento_ouvir}
                    onChange={handleInputChange}
                    placeholder="Ex: ao acordar, antes de dormir..." 
                    className={isFieldFilled('momento_ouvir') ? 'filled' : ''}
                  />
                </div>
                <div className="space-y-4">
                  <label className="field-label">Observações finais</label>
                  <textarea 
                    name="observacoes" 
                    value={formData.observacoes}
                    onChange={handleInputChange}
                    placeholder="Compartilhe qualquer informação adicional..." 
                    className={isFieldFilled('observacoes') ? 'filled' : ''}
                    rows={6} 
                  />
                </div>
              </div>
            </section>

            {/* Submit Area */}
            <div className="mt-16 p-10 bg-cream-dark border-2 border-gold/25 rounded-lg text-center">
              <p className="font-serif text-xl italic text-ink-mid mb-10 leading-loose">
                Ao enviar este formulário, você autoriza a Sintonizze — Ondas Transcendentais<br />
                a utilizar as informações acima exclusivamente para a criação da sua composição vibracional personalizada.
              </p>
              <div className="space-y-4">
                <button type="submit" className="btn-submit w-full md:w-auto">
                  <Check size={22} /> Enviar Meu Formulário
                </button>
                <div className="block">
                  <button type="button" onClick={() => window.print()} className="btn-print w-full md:w-auto">
                    <Printer size={18} className="mr-2" /> Imprimir / Salvar PDF
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-ink py-24 px-6 text-center">
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="h-[2px] w-20 bg-gold/30" />
          <div className="w-4 h-4 bg-gold rotate-45" />
          <div className="h-[2px] w-20 bg-gold/30" />
        </div>
        <p className="font-serif text-4xl md:text-6xl tracking-[0.3em] text-cream mb-4">SINTONIZZE<span className="text-gold">·</span></p>
        <p className="text-gold/70 uppercase tracking-[0.5em] text-lg md:text-xl mb-10 font-light">Ondas Transcendentais</p>
        <div className="gold-rule mb-10" />
        <p className="text-cream/40 text-lg md:text-xl tracking-widest leading-[2] max-w-[850px] mx-auto font-light">
          © 2025 Sintonizze — Ondas Transcendentais. Todos os direitos reservados.<br />
          Formulário de uso exclusivo para criação de composições vibracionais personalizadas.<br />
          As informações fornecidas são confidenciais e protegidas por nossa política de privacidade.
        </p>
      </footer>
    </div>
  );
}
