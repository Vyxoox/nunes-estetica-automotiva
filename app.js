(() => {
  'use strict';

  const WHATSAPP_BASE = 'https://wa.me/5517982302704';
  const STUDIO_ADDRESS = 'R. Augusto Bortoluzzo, 82 - Jardim Urupês, São José do Rio Preto - SP';

  /* ------------------------------------------------------------------------
     1. Toast Helper
     ------------------------------------------------------------------------ */
  const toastEl = document.getElementById('app-toast');
  let toastTimer = null;

  function showToast(message, duration = 2800) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastEl.hidden = true;
    }, duration);
  }

  /* ------------------------------------------------------------------------
     2. Sticky Header & Active Section Scroll-Spy
     ------------------------------------------------------------------------ */
  const headerEl = document.getElementById('site-header');
  const navLinks = Array.from(document.querySelectorAll('[data-nav]'));
  const observedSections = ['inicio', 'servicos', 'antes-depois', 'orcamento', 'localizacao']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  function updateHeaderScrollState() {
    if (!headerEl) return;
    headerEl.classList.toggle('is-scrolled', window.scrollY > 18);
  }

  function setActiveNav(sectionId) {
    // Map section ids so mobile bottom bar falls back cleanly to closest group
    const targetNav = sectionId === 'antes-depois' ? 'servicos' : sectionId;
    navLinks.forEach((link) => {
      const linkTarget = link.getAttribute('data-nav');
      const isMobileTab = link.classList.contains('bottom-tab');
      const match = isMobileTab ? linkTarget === targetNav : linkTarget === sectionId;
      link.classList.toggle('is-active', match);
    });
  }

  window.addEventListener('scroll', updateHeaderScrollState, { passive: true });
  updateHeaderScrollState();

  if ('IntersectionObserver' in window && observedSections.length > 0) {
    const spyObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveNav(visible[0].target.id);
        }
      },
      {
        rootMargin: '-30% 0px -50% 0px',
        threshold: [0.1, 0.35, 0.6],
      }
    );

    observedSections.forEach((sec) => spyObserver.observe(sec));
  }

  /* ------------------------------------------------------------------------
     3. Interactive Before / After Paint Comparator
     ------------------------------------------------------------------------ */
  const compareStage = document.getElementById('compare-stage');
  const presetBtns = Array.from(document.querySelectorAll('[data-compare-set]'));
  let compareValue = 50;
  let isDragging = false;

  function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  }

  function syncPresetHighlight(val) {
    presetBtns.forEach((btn) => {
      const target = Number(btn.getAttribute('data-compare-set'));
      btn.classList.toggle('is-active', Math.abs(target - val) <= 4);
    });
  }

  function setComparePosition(percent) {
    if (!compareStage) return;
    compareValue = clamp(Math.round(percent * 10) / 10, 0, 100);
    compareStage.style.setProperty('--compare-pos', `${compareValue}%`);
    compareStage.setAttribute('aria-valuenow', String(Math.round(compareValue)));
    syncPresetHighlight(compareValue);
  }

  function updateCompareFromClientX(clientX) {
    if (!compareStage) return;
    const rect = compareStage.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setComparePosition(pct);
  }

  if (compareStage) {
    compareStage.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      isDragging = true;
      compareStage.classList.add('is-dragging');
      compareStage.setPointerCapture(event.pointerId);
      updateCompareFromClientX(event.clientX);
    });

    compareStage.addEventListener('pointermove', (event) => {
      if (!isDragging) return;
      updateCompareFromClientX(event.clientX);
    });

    const stopDragging = (event) => {
      if (!isDragging) return;
      isDragging = false;
      compareStage.classList.remove('is-dragging');
      if (event.pointerId !== undefined && compareStage.hasPointerCapture(event.pointerId)) {
        compareStage.releasePointerCapture(event.pointerId);
      }
    };

    compareStage.addEventListener('pointerup', stopDragging);
    compareStage.addEventListener('pointercancel', stopDragging);

    compareStage.addEventListener('keydown', (event) => {
      const step = event.shiftKey ? 10 : 4;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setComparePosition(compareValue - step);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setComparePosition(compareValue + step);
      } else if (event.key === 'Home') {
        event.preventDefault();
        setComparePosition(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        setComparePosition(100);
      }
    });
  }

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = Number(btn.getAttribute('data-compare-set'));
      if (!Number.isNaN(target)) {
        setComparePosition(target);
      }
    });
  });

  /* ------------------------------------------------------------------------
     4. 3-Click Pre-Quote Simulator -> WhatsApp encodeURIComponent
     ------------------------------------------------------------------------ */
  const sizeButtons = Array.from(document.querySelectorAll('[data-size]'));
  const serviceButtons = Array.from(document.querySelectorAll('[data-service]'));
  const modelInput = document.getElementById('car-model-input');
  const previewText = document.getElementById('sim-preview-text');
  const submitBtn = document.getElementById('simulator-submit-btn');
  const feedbackEl = document.getElementById('sim-feedback');
  const dotStep1 = document.getElementById('dot-step-1');
  const dotStep2 = document.getElementById('dot-step-2');
  const progressStatus = document.getElementById('progress-status');
  const step1Box = document.getElementById('sim-step-1');
  const step2Box = document.getElementById('sim-step-2');

  const simulatorState = {
    size: null,
    service: null,
    model: '',
  };

  function buildSimulatorMessage() {
    if (!simulatorState.size || !simulatorState.service) return '';
    const modelTrimmed = simulatorState.model.trim();
    const baseMsg = `Olá Nunes Car! Tenho um ${simulatorState.size} e gostaria de orçamento para ${simulatorState.service}.`;
    return modelTrimmed ? `${baseMsg} Veículo: ${modelTrimmed}.` : baseMsg;
  }

  function clearFeedback() {
    if (!feedbackEl) return;
    feedbackEl.hidden = true;
    feedbackEl.textContent = '';
  }

  function triggerAttention(el) {
    if (!el) return;
    el.classList.remove('is-attention');
    void el.offsetWidth;
    el.classList.add('is-attention');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function updateSimulatorUI() {
    const hasSize = Boolean(simulatorState.size);
    const hasService = Boolean(simulatorState.service);
    const isReady = hasSize && hasService;

    if (dotStep1) dotStep1.classList.toggle('is-done', hasSize);
    if (dotStep2) dotStep2.classList.toggle('is-done', hasService);

    if (progressStatus) {
      if (isReady) {
        progressStatus.textContent = 'Pronto para enviar no WhatsApp';
      } else if (hasSize || hasService) {
        progressStatus.textContent = hasSize ? 'Agora escolha o serviço' : 'Agora escolha o porte';
      } else {
        progressStatus.textContent = 'Escolha 1 e 2 abaixo';
      }
    }

    if (previewText) {
      if (isReady) {
        previewText.textContent = `"${buildSimulatorMessage()}"`;
      } else if (hasSize) {
        previewText.innerHTML = `Porte selecionado: <strong>${simulatorState.size}</strong>. Agora escolha o <strong>serviço</strong> no Passo 2.`;
      } else if (hasService) {
        previewText.innerHTML = `Serviço selecionado: <strong>${simulatorState.service}</strong>. Agora escolha o <strong>porte do veículo</strong> no Passo 1.`;
      } else {
        previewText.innerHTML = 'Selecione o <strong>porte do veículo</strong> e o <strong>serviço</strong> acima para gerar seu orçamento instantâneo.';
      }
    }

    if (submitBtn) {
      submitBtn.classList.toggle('is-ready', isReady);
      submitBtn.classList.toggle('is-pending', !isReady);
      if (isReady) {
        const encoded = encodeURIComponent(buildSimulatorMessage());
        submitBtn.href = `${WHATSAPP_BASE}?text=${encoded}`;
      } else {
        submitBtn.href = WHATSAPP_BASE;
      }
    }
  }

  sizeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      simulatorState.size = btn.getAttribute('data-size');
      sizeButtons.forEach((b) => {
        const selected = b === btn;
        b.classList.toggle('is-selected', selected);
        b.setAttribute('aria-checked', String(selected));
      });
      clearFeedback();
      updateSimulatorUI();
    });
  });

  serviceButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      simulatorState.service = btn.getAttribute('data-service');
      serviceButtons.forEach((b) => {
        const selected = b === btn;
        b.classList.toggle('is-selected', selected);
        b.setAttribute('aria-checked', String(selected));
      });
      clearFeedback();
      updateSimulatorUI();
    });
  });

  if (modelInput) {
    modelInput.addEventListener('input', () => {
      simulatorState.model = modelInput.value;
      updateSimulatorUI();
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', (event) => {
      if (!simulatorState.size || !simulatorState.service) {
        event.preventDefault();
        if (!simulatorState.size && !simulatorState.service) {
          if (feedbackEl) {
            feedbackEl.textContent = 'Selecione o porte do veículo (Passo 1) e o serviço desejado (Passo 2) para montar seu orçamento.';
            feedbackEl.hidden = false;
          }
          triggerAttention(step1Box);
        } else if (!simulatorState.size) {
          if (feedbackEl) {
            feedbackEl.textContent = 'Falta selecionar o porte do veículo no Passo 1.';
            feedbackEl.hidden = false;
          }
          triggerAttention(step1Box);
        } else {
          if (feedbackEl) {
            feedbackEl.textContent = 'Falta selecionar o serviço desejado no Passo 2.';
            feedbackEl.hidden = false;
          }
          triggerAttention(step2Box);
        }
      }
    });
  }

  updateSimulatorUI();

  /* ------------------------------------------------------------------------
     5. Copy Studio Address to Clipboard
     ------------------------------------------------------------------------ */
  const copyAddressBtn = document.getElementById('copy-address-btn');
  const copyAddressLabel = document.getElementById('copy-address-label');

  if (copyAddressBtn) {
    copyAddressBtn.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(STUDIO_ADDRESS);
        } else {
          const tempInput = document.createElement('input');
          tempInput.value = STUDIO_ADDRESS;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          tempInput.remove();
        }
        if (copyAddressLabel) copyAddressLabel.textContent = 'Endereço Copiado!';
        showToast('Endereço copiado para a área de transferência');
        window.setTimeout(() => {
          if (copyAddressLabel) copyAddressLabel.textContent = 'Copiar Endereço';
        }, 2500);
      } catch {
        showToast('Não foi possível copiar automaticamente');
      }
    });
  }

  /* ------------------------------------------------------------------------
     6. PWA Service Worker & "Instalar App Nunes Car" Prompt
     ------------------------------------------------------------------------ */
  const headerInstallBtn = document.getElementById('header-install-btn');
  const footerInstallBtn = document.getElementById('footer-install-btn');
  const installBanner = document.getElementById('pwa-install-banner');
  const bannerInstallBtn = document.getElementById('pwa-banner-install');
  const bannerDismissBtn = document.getElementById('pwa-banner-dismiss');
  const iosModal = document.getElementById('ios-install-modal');
  const iosModalBackdrop = document.getElementById('ios-modal-backdrop');
  const iosModalClose = document.getElementById('ios-modal-close');

  const BANNER_DISMISSED_KEY = 'nunesCarInstallDismissed';
  let deferredInstallPrompt = null;

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  const isIosSafari = /iPad|iPhone|iPod/.test(window.navigator.userAgent)
    && !window.MSStream
    && /Safari/.test(window.navigator.userAgent)
    && !/CriOS|FxiOS|EdgiOS/.test(window.navigator.userAgent);

  function hideAllInstallUI() {
    if (headerInstallBtn) headerInstallBtn.hidden = true;
    if (footerInstallBtn) footerInstallBtn.hidden = true;
    if (installBanner) installBanner.hidden = true;
  }

  function revealInstallTriggers(showBanner) {
    if (isStandalone) return;
    if (headerInstallBtn) headerInstallBtn.hidden = false;
    if (footerInstallBtn) footerInstallBtn.hidden = false;
    const wasDismissed = window.sessionStorage.getItem(BANNER_DISMISSED_KEY) === '1';
    if (showBanner && installBanner && !wasDismissed) {
      installBanner.hidden = false;
    }
  }

  async function handleInstallClick() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      if (choiceResult && choiceResult.outcome === 'accepted') {
        hideAllInstallUI();
        showToast('App Nunes Car instalado com sucesso!');
      } else if (installBanner) {
        installBanner.hidden = true;
      }
      return;
    }

    if (isIosSafari && iosModal) {
      iosModal.hidden = false;
    }
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    revealInstallTriggers(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    hideAllInstallUI();
    showToast('Nunes Car adicionada à sua tela inicial!');
  });

  if (isIosSafari && !isStandalone) {
    revealInstallTriggers(false);
  }

  [headerInstallBtn, footerInstallBtn, bannerInstallBtn].forEach((btn) => {
    if (btn) btn.addEventListener('click', handleInstallClick);
  });

  if (bannerDismissBtn) {
    bannerDismissBtn.addEventListener('click', () => {
      if (installBanner) installBanner.hidden = true;
      window.sessionStorage.setItem(BANNER_DISMISSED_KEY, '1');
    });
  }

  function closeIosModal() {
    if (iosModal) iosModal.hidden = true;
  }

  if (iosModalBackdrop) iosModalBackdrop.addEventListener('click', closeIosModal);
  if (iosModalClose) iosModalClose.addEventListener('click', closeIosModal);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && iosModal && !iosModal.hidden) {
      closeIosModal();
    }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // Silent fail on unsupported contexts (e.g., file://)
      });
    });
  }

  window.addEventListener('offline', () => {
    showToast('Modo offline ativo — catálogo e simulador disponíveis', 3600);
  });

  window.addEventListener('online', () => {
    showToast('Conexão restabelecida', 2200);
  });
})();
