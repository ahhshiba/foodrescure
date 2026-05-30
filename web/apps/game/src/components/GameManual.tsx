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
        className="rounded-md border border-zen-border px-3 py-1 text-xs text-zen-text bg-white hover:bg-[#f8f6f2] shadow-sm font-medium flex items-center gap-2"
      >
        <span>📖</span> {t('manual.button')}
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="max-w-4xl w-full max-h-[90vh] bg-[#fdfbf7] rounded-xl shadow-xl border border-zen-border flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="bg-[#fdfbf7]/90 backdrop-blur-md z-10 border-b border-zen-border p-4 md:p-6 flex justify-between items-start shrink-0">
              <div>
                <div className="text-[10px] text-zen-light font-medium tracking-wide mb-1">{t('manual.classification')}</div>
                <h2 className="text-2xl md:text-4xl font-bold text-zen-text tracking-tight">{t('manual.title')}</h2>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-zen-light hover:text-zen-text text-3xl font-light leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar flex-1 min-h-0 p-4 md:p-8 space-y-10 text-sm md:text-base text-zen-text leading-relaxed overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              
              {/* Introduction */}
              <div className="border-l-4 border-zen-primary pl-4 bg-white p-5 rounded-r-lg shadow-sm">
                <p className="text-zen-primary font-bold text-lg mb-2">{t('manual.intro_title')}</p>
                <p className="text-zen-text">{t('manual.intro_desc')}</p>
              </div>

              {/* Section 1 */}
              <section>
                <h3 className="text-zen-text font-bold text-xl mb-4 flex items-center gap-2 border-b border-zen-border pb-2">
                  <span className="text-zen-primary">1.</span> {t('manual.step1_title')}
                </h3>
                <div className="space-y-3 pl-4 md:pl-8 text-zen-text">
                  <p>{t('manual.step1_desc1')}</p>
                  <ul className="list-disc pl-5 space-y-2 text-zen-light">
                    <li>{t('manual.step1_li1')}</li>
                    <li>{t('manual.step1_li2')}</li>
                  </ul>
                  <p className="mt-2 text-xs text-zen-light italic">{t('manual.step1_hint')}</p>
                </div>
              </section>

              {/* Section 2 */}
              <section>
                <h3 className="text-zen-text font-bold text-xl mb-4 flex items-center gap-2 border-b border-zen-border pb-2">
                  <span className="text-amber-500">2.</span> {t('manual.step2_title')}
                </h3>
                <div className="space-y-3 pl-4 md:pl-8">
                  <p>{t('manual.step2_desc1')}</p>
                  <ol className="list-decimal pl-5 space-y-2 text-zen-light">
                    <li><strong className="text-zen-text">{t('manual.step2_li1')}</strong></li>
                    <li><strong className="text-zen-text">{t('manual.step2_li2')}</strong></li>
                    <li><strong className="text-zen-text">{t('manual.step2_li3')}</strong></li>
                  </ol>
                </div>
              </section>

              {/* Section 3 */}
              <section>
                <h3 className="text-zen-text font-bold text-xl mb-4 flex items-center gap-2 border-b border-zen-border pb-2">
                  <span className="text-zen-accent">3.</span> {t('manual.step3_title')}
                </h3>
                <div className="space-y-4 pl-4 md:pl-8">
                  <p>{t('manual.step3_desc1')}</p>
                  <p className="text-zen-light">{t('manual.step3_desc2')}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="border border-zen-border bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                      <h4 className="text-zen-primary font-bold mb-1 text-lg">{t('manual.nano_crab_title')}</h4>
                      <p className="text-xs text-zen-light mb-3 font-medium">{t('manual.nano_crab_food')}</p>
                      <p className="text-sm text-zen-text leading-relaxed">{t('manual.nano_crab_desc')}</p>
                    </div>
                    <div className="border border-zen-border bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                      <h4 className="text-zen-accent font-bold mb-1 text-lg">{t('manual.nano_spider_title')}</h4>
                      <p className="text-xs text-zen-light mb-3 font-medium">{t('manual.nano_spider_food')}</p>
                      <p className="text-sm text-zen-text leading-relaxed">{t('manual.nano_spider_desc')}</p>
                    </div>
                    <div className="border border-zen-border bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                      <h4 className="text-zen-alert font-bold mb-1 text-lg">{t('manual.nano_jelly_title')}</h4>
                      <p className="text-xs text-zen-light mb-3 font-medium">{t('manual.nano_jelly_food')}</p>
                      <p className="text-sm text-zen-text leading-relaxed">{t('manual.nano_jelly_desc')}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Footer / Action */}
              <div className="mt-12 pt-8 border-t border-zen-border text-center pb-4">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="px-10 py-3 bg-zen-primary text-white font-bold rounded-lg shadow-md hover:bg-zen-primary/90 transition-colors"
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
