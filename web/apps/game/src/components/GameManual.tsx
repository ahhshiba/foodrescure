import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

export function GameManual() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn-cyber btn-cyber-cyan rounded-none border border-neon-cyan/50 px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs text-neon-cyan flex items-center gap-1 font-bold tracking-widest shadow-[0_0_5px_rgba(0,255,255,0.3)]"
      >
        <span className="animate-pulse">▶</span> {t('manual.button')}
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="panel max-w-4xl w-full max-h-[90vh] overflow-y-auto p-0 border border-neon-cyan shadow-[0_0_30px_rgba(0,255,255,0.4)] bg-[#050a0f] flex flex-col">
            
            {/* Header */}
            <div className="sticky top-0 bg-[#050a0f]/95 backdrop-blur z-10 border-b border-neon-cyan/40 p-4 md:p-6 flex justify-between items-start">
              <div>
                <div className="text-[10px] text-neon-cyan/60 font-mono tracking-widest mb-1">{t('manual.classification')}</div>
                <h2 className="glitch-text text-2xl md:text-4xl font-bold text-neon-cyan tracking-widest">{t('manual.title')}</h2>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-neon-magenta hover:text-white text-2xl md:text-3xl font-mono leading-none drop-shadow-[0_0_8px_#ff2a6d]"
              >
                [X]
              </button>
            </div>
            
            <div className="p-4 md:p-8 space-y-10 text-sm md:text-base text-white/90 font-mono leading-relaxed">
              
              {/* Introduction */}
              <div className="border-l-4 border-neon-cyan pl-4 bg-neon-cyan/5 p-4 rounded-r">
                <p className="text-neon-cyan font-bold tracking-widest mb-2">{t('manual.intro_title')}</p>
                <p>{t('manual.intro_desc')}</p>
              </div>

              {/* Section 1 */}
              <section>
                <h3 className="text-neon-cyan font-bold text-xl mb-4 flex items-center gap-2 border-b border-neon-cyan/30 pb-2">
                  {t('manual.step1_title')}
                </h3>
                <div className="space-y-3 pl-4 md:pl-8">
                  <p>{t('manual.step1_desc1')}</p>
                  <ul className="list-disc pl-5 space-y-2 text-white/70">
                    <li>{t('manual.step1_li1')}</li>
                    <li>{t('manual.step1_li2')}</li>
                  </ul>
                  <p className="mt-2 text-xs text-neon-cyan/50 italic">{t('manual.step1_hint')}</p>
                </div>
              </section>

              {/* Section 2 */}
              <section>
                <h3 className="text-amber-400 font-bold text-xl mb-4 flex items-center gap-2 border-b border-amber-400/30 pb-2">
                  {t('manual.step2_title')}
                </h3>
                <div className="space-y-3 pl-4 md:pl-8">
                  <p>{t('manual.step2_desc1')}</p>
                  <ol className="list-decimal pl-5 space-y-2 text-white/70">
                    <li><strong className="text-white">{t('manual.step2_li1')}</strong></li>
                    <li><strong className="text-white">{t('manual.step2_li2')}</strong></li>
                    <li><strong className="text-white">{t('manual.step2_li3')}</strong></li>
                  </ol>
                </div>
              </section>

              {/* Section 3 */}
              <section>
                <h3 className="text-neon-magenta font-bold text-xl mb-4 flex items-center gap-2 border-b border-neon-magenta/30 pb-2">
                  {t('manual.step3_title')}
                </h3>
                <div className="space-y-4 pl-4 md:pl-8">
                  <p>{t('manual.step3_desc1')}</p>
                  <p className="text-white/70">{t('manual.step3_desc2')}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="border border-neon-cyan/40 bg-black p-3 rounded shadow-[inset_0_0_10px_rgba(0,255,255,0.2)]">
                      <h4 className="text-neon-cyan font-bold mb-1">{t('manual.nano_crab_title')}</h4>
                      <p className="text-[10px] text-white/60 mb-2">{t('manual.nano_crab_food')}</p>
                      <p className="text-xs">{t('manual.nano_crab_desc')}</p>
                    </div>
                    <div className="border border-neon-green/40 bg-black p-3 rounded shadow-[inset_0_0_10px_rgba(57,255,20,0.2)]">
                      <h4 className="text-neon-green font-bold mb-1">{t('manual.nano_spider_title')}</h4>
                      <p className="text-[10px] text-white/60 mb-2">{t('manual.nano_spider_food')}</p>
                      <p className="text-xs">{t('manual.nano_spider_desc')}</p>
                    </div>
                    <div className="border border-neon-magenta/40 bg-black p-3 rounded shadow-[inset_0_0_10px_rgba(255,0,255,0.2)]">
                      <h4 className="text-neon-magenta font-bold mb-1">{t('manual.nano_jelly_title')}</h4>
                      <p className="text-[10px] text-white/60 mb-2">{t('manual.nano_jelly_food')}</p>
                      <p className="text-xs">{t('manual.nano_jelly_desc')}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Footer / Action */}
              <div className="mt-12 pt-6 border-t border-neon-cyan/40 text-center">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="btn-cyber btn-cyber-cyan px-10 py-3 bg-neon-cyan/10 text-neon-cyan border-2 border-neon-cyan font-bold tracking-widest uppercase rounded shadow-[0_0_15px_rgba(0,255,255,0.4)]"
                >
                  {t('manual.start_btn')}
                </button>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
