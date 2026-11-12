/* -------------------------------------------------------------------------- */
/* ROUGE Cold-Pressed Strawberry Juice - Interactive Frame Sequence & Auth    */
/* -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  // Configuration
  const CONFIG = {
    startFrame: 34,
    endFrame: 192,
    totalFrames: 159, // (192 - 34 + 1)
    framePath: (index) => `./${String(index).padStart(5, '0')}.png`,
    lerpFactor: 0.12, // Smoothness of scroll interpolation
    scenes: [
      { id: 1, range: [34, 50], title: 'Hero Bottle', text: 'Sealed with a matte black cap, chilling condensation sparkles under luxury studio lighting.' },
      { id: 2, range: [51, 65], title: '100% Certified Purity', text: 'Rigorous chemical lab testing approved. Free from added sugars, artificial preservatives & additives.' },
      { id: 3, range: [66, 80], title: 'Raw Cold-Pressed Vitality', text: 'Hydraulically slow-pressed to preserve raw Vitamin C, live active enzymes, and natural antioxidants.' },
      { id: 4, range: [81, 95], title: 'Bioactive Nutrients', text: 'Packed with polyphenols and potassium for heart health, glowing skin, and natural daily energy.' },
      { id: 5, range: [96, 148], title: 'Ingredients Burst', text: 'Fresh strawberry slices, ice cubes, and mint leaves burst outward from the center.' },
      { id: 6, range: [149, 160], title: 'Peak Motion', text: 'Droplets separate in high-speed slow motion with ice cubes spinning gracefully.' },
      { id: 7, range: [161, 175], title: 'Gravity Takes Over', text: 'Liquid ribbons and fresh fruit descend under realistic gravitational momentum.' },
      { id: 8, range: [176, 185], title: 'Bottle Motion', text: 'The camera tracks downward smoothly as the bottle remains the centerpiece.' },
      { id: 9, range: [186, 192], title: 'Final Hero Shot', text: 'Liquid settles onto reflective glass floor with soft pink ambient rim light.' }
    ]
  };

  // State Management
  const state = {
    images: [],
    imagesLoaded: 0,
    currentFrameFloat: CONFIG.startFrame,
    targetFrameFloat: CONFIG.startFrame,
    currentFrameIndex: CONFIG.startFrame,
    currentUser: null
  };

  // DOM Elements - Canvas & UI
  const preloader = document.getElementById('preloader');
  const loaderBar = document.getElementById('loader-bar');
  const loaderStatus = document.getElementById('loader-status');
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const timelineDots = document.querySelectorAll('.timeline-dot');
  const sceneSections = document.querySelectorAll('.scene-section');

  // DOM Elements - Auth & Modal
  const btnLoginModal = document.getElementById('btn-login-modal');
  const authModal = document.getElementById('auth-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const tabLoginBtn = document.getElementById('tab-login-btn');
  const tabRegisterBtn = document.getElementById('tab-register-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const authAlert = document.getElementById('auth-alert');
  const authModalTitle = document.getElementById('auth-modal-title');
  const userProfileBadge = document.getElementById('user-profile');
  const userAvatarInitials = document.getElementById('user-avatar-initials');
  const userDisplayName = document.getElementById('user-display-name');
  const btnLogout = document.getElementById('btn-logout');

  // --------------------------------------------------------------------------
  // 1. Image Preloader Engine
  // --------------------------------------------------------------------------
  function preloadImages() {
    return new Promise((resolve) => {
      for (let i = CONFIG.startFrame; i <= CONFIG.endFrame; i++) {
        const img = new Image();
        img.src = CONFIG.framePath(i);
        
        img.onload = () => {
          state.imagesLoaded++;
          const percentage = Math.floor((state.imagesLoaded / CONFIG.totalFrames) * 100);
          loaderBar.style.width = `${percentage}%`;
          loaderStatus.textContent = `LOADING 8K ASSETS... ${percentage}% (${state.imagesLoaded}/${CONFIG.totalFrames})`;
          
          if (state.imagesLoaded === CONFIG.totalFrames) {
            setTimeout(() => {
              preloader.classList.add('loaded');
              resolve();
            }, 300);
          }
        };

        img.onerror = () => {
          console.warn(`Failed to load frame ${i}`);
          state.imagesLoaded++;
        };

        state.images[i] = img;
      }
    });
  }

  // --------------------------------------------------------------------------
  // 2. High-DPI Canvas Rendering Engine
  // --------------------------------------------------------------------------
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderFrame(Math.round(state.currentFrameFloat));
  }

  function renderFrame(frameIndex) {
    const img = state.images[frameIndex];
    if (!img || !img.complete) return;

    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    // Fill background with obsidian studio black
    ctx.fillStyle = '#08080a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Calculate aspect ratios
    const imgRatio = img.width / img.height;
    const canvasRatio = canvasWidth / canvasHeight;
    const isPortrait = canvasRatio < 1.0;

    let renderW, renderH, renderX, renderY;

    if (!isPortrait) {
      // ----------------------------------------------------------------------
      // DESKTOP & LANDSCAPE: Exact preservation of existing composition
      // ----------------------------------------------------------------------
      if (canvasRatio > imgRatio) {
        renderH = canvasHeight * 0.95;
        renderW = renderH * imgRatio;
      } else {
        renderW = canvasWidth * 0.95;
        renderH = renderW / imgRatio;
      }

      renderX = (canvasWidth - renderW) / 2;
      renderY = (canvasHeight - renderH) / 2;
    } else {
      // ----------------------------------------------------------------------
      // MOBILE & PORTRAIT: Full-screen vertical advertisement composition
      // ----------------------------------------------------------------------
      // In portrait orientation, the animation covers the full vertical screen
      // so the juice product fills the mobile viewport like a full-screen vertical ad.
      // Zero landscape letterbox, zero empty margins, 100% full-screen immersive.
      renderH = Math.max(canvasHeight, canvasWidth * (16 / 9));
      renderW = renderH * imgRatio;
      renderX = (canvasWidth - renderW) / 2;
      renderY = (canvasHeight - renderH) / 2;
    }

    // Soft reflective floor gradient glow (anchored relative to bottle base)
    const floorGlowY = isPortrait ? renderY + renderH - 24 : renderY + renderH - 40;
    const floorGlowRadius = isPortrait ? renderW * 0.45 : renderW * 0.6;
    const floorGlow = ctx.createRadialGradient(
      canvasWidth / 2, floorGlowY, 20,
      canvasWidth / 2, floorGlowY, floorGlowRadius
    );
    floorGlow.addColorStop(0, 'rgba(255, 77, 109, 0.18)');
    floorGlow.addColorStop(1, 'rgba(8, 8, 10, 0)');
    ctx.fillStyle = floorGlow;
    ctx.fillRect(0, floorGlowY - 80, canvasWidth, 160);

    // Draw main frame image
    ctx.drawImage(img, renderX, renderY, renderW, renderH);

    // Subtle dark studio vignette overlay
    const vignetteInner = isPortrait 
      ? Math.min(canvasWidth, canvasHeight) * 0.45 
      : Math.min(canvasWidth, canvasHeight) * 0.35;
    const vignetteOuter = isPortrait 
      ? Math.max(canvasWidth, canvasHeight) * 0.85 
      : Math.max(canvasWidth, canvasHeight) * 0.75;

    const vignette = ctx.createRadialGradient(
      canvasWidth / 2, canvasHeight / 2, vignetteInner,
      canvasWidth / 2, canvasHeight / 2, vignetteOuter
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(5, 5, 7, 0.7)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // --------------------------------------------------------------------------
  // 3. Scroll & Lerp Animation Controller
  // --------------------------------------------------------------------------
  function updateScrollTarget() {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scrollFraction = Math.max(0, Math.min(1, maxScroll > 0 ? scrollY / maxScroll : 0));

    state.targetFrameFloat = CONFIG.startFrame + (scrollFraction * (CONFIG.totalFrames - 1));
  }

  function animationLoop() {
    // Smooth Lerp
    state.currentFrameFloat += (state.targetFrameFloat - state.currentFrameFloat) * CONFIG.lerpFactor;
    
    const intFrame = Math.round(state.currentFrameFloat);
    if (intFrame !== state.currentFrameIndex) {
      state.currentFrameIndex = intFrame;
      renderFrame(state.currentFrameIndex);
      updateActiveScene(state.currentFrameIndex);
    }

    requestAnimationFrame(animationLoop);
  }

  function updateActiveScene(frameIndex) {
    const activeScene = CONFIG.scenes.find(s => frameIndex >= s.range[0] && frameIndex <= s.range[1]) || CONFIG.scenes[0];

    // Highlight timeline dots
    timelineDots.forEach(dot => {
      const dotScene = parseInt(dot.getAttribute('data-scene'), 10);
      if (dotScene === activeScene.id) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    // Toggle active scene card class
    sceneSections.forEach(section => {
      const sectionScene = parseInt(section.getAttribute('data-scene'), 10);
      if (sectionScene === activeScene.id) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });
  }

  // --------------------------------------------------------------------------
  // 4. Authentication & Modal Controller
  // --------------------------------------------------------------------------
  function openModal(tab = 'login') {
    hideAlert();
    switchTab(tab);
    authModal.classList.add('active');
    authModal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    authModal.classList.remove('active');
    authModal.setAttribute('aria-hidden', 'true');
    hideAlert();
  }

  function switchTab(tab) {
    hideAlert();
    if (tab === 'login') {
      tabLoginBtn.classList.add('active');
      tabRegisterBtn.classList.remove('active');
      loginForm.classList.add('active');
      registerForm.classList.remove('active');
      authModalTitle.textContent = 'Welcome Back';
    } else {
      tabRegisterBtn.classList.add('active');
      tabLoginBtn.classList.remove('active');
      registerForm.classList.add('active');
      loginForm.classList.remove('active');
      authModalTitle.textContent = 'Create Account';
    }
  }

  function showAlert(message, type = 'error') {
    authAlert.textContent = message;
    authAlert.className = `auth-alert ${type}`;
    authAlert.style.display = 'block';
  }

  function hideAlert() {
    authAlert.style.display = 'none';
  }

  function updateHeaderAuthUI(user) {
    if (user) {
      state.currentUser = user;
      btnLoginModal.style.display = 'none';
      userProfileBadge.style.display = 'flex';
      userDisplayName.textContent = user.fullName || user.email.split('@')[0];
      const initials = (user.fullName || user.email).charAt(0).toUpperCase();
      userAvatarInitials.textContent = initials;
    } else {
      state.currentUser = null;
      btnLoginModal.style.display = 'inline-block';
      userProfileBadge.style.display = 'none';
    }
  }

  // Safe API fetch helper with fallback for static hosts
  async function safeApiCall(endpoint, method = 'GET', body = null, headers = {}) {
    let targetUrl = endpoint;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      if (window.location.port !== '8085') {
        targetUrl = 'http://localhost:8085' + endpoint;
      }
    }
    try {
      const fetchOptions = {
        method,
        headers: { 'Content-Type': 'application/json', ...headers }
      };
      if (body) fetchOptions.body = JSON.stringify(body);
      const res = await fetch(targetUrl, fetchOptions);
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        return { ok: res.ok, data };
      }
    } catch (err) {
      console.warn('Backend API request failed, using client fallback:', err);
    }
    return null;
  }

  // Check Active Session on Startup
  async function checkActiveSession() {
    const token = localStorage.getItem('rouge_auth_token');
    if (!token) return;

    try {
      const apiRes = await safeApiCall('/api/me', 'GET', null, { 'Authorization': `Bearer ${token}` });
      if (apiRes && apiRes.ok && apiRes.data.success && apiRes.data.user) {
        updateHeaderAuthUI(apiRes.data.user);
        return;
      }
      const activeUserStr = localStorage.getItem('juice_active_user');
      if (activeUserStr) {
        try {
          updateHeaderAuthUI(JSON.parse(activeUserStr));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Auth check error:', err);
    }
  }

  // --------------------------------------------------------------------------
  // 5. Auth API Forms Submissions
  // --------------------------------------------------------------------------
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const btnSubmit = document.getElementById('btn-submit-login');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'AUTHENTICATING...';

    try {
      // 1. Try Backend API
      const apiRes = await safeApiCall('/api/login', 'POST', { email, password });
      if (apiRes && apiRes.data) {
        if (apiRes.data.success) {
          localStorage.setItem('rouge_auth_token', apiRes.data.token);
          if (apiRes.data.user) localStorage.setItem('juice_active_user', JSON.stringify(apiRes.data.user));
          updateHeaderAuthUI(apiRes.data.user);
          showAlert(apiRes.data.message || 'Logged in successfully!', 'success');
          setTimeout(() => {
            closeModal();
            loginForm.reset();
          }, 1200);
        } else {
          showAlert(apiRes.data.message || 'Login failed.', 'error');
        }
        return;
      }

      // 2. Client-side Fallback for Static Web Hosts (Firebase Hosting / Vercel)
      const users = JSON.parse(localStorage.getItem('juice_users') || '[]');
      let user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      
      // Auto-register mock session if user logging in for first time on static host
      if (!user && email && password) {
        user = { id: 'usr_' + Date.now(), fullName: email.split('@')[0], email: email.toLowerCase(), password };
        users.push(user);
        localStorage.setItem('juice_users', JSON.stringify(users));
      }

      if (user) {
        const token = 'token_' + Date.now();
        localStorage.setItem('rouge_auth_token', token);
        localStorage.setItem('juice_active_user', JSON.stringify(user));
        updateHeaderAuthUI(user);
        showAlert('Logged in successfully!', 'success');
        setTimeout(() => {
          closeModal();
          loginForm.reset();
        }, 1200);
      } else {
        showAlert('Invalid email or password.', 'error');
      }
    } catch (err) {
      showAlert('Login error. Please try again.', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'SIGN IN TO STRAWBERRY';
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    const fullName = document.getElementById('reg-fullname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phoneInput = document.getElementById('reg-phone');
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const password = document.getElementById('reg-password').value;

    const btnSubmit = document.getElementById('btn-submit-register');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'CREATING ACCOUNT...';

    try {
      // 1. Try Backend API
      const apiRes = await safeApiCall('/api/register', 'POST', { fullName, email, phone, password });
      if (apiRes && apiRes.data) {
        if (apiRes.data.success) {
          showAlert('Account created successfully! Please sign in to proceed with your order.', 'success');
          setTimeout(() => {
            switchTab('login');
            document.getElementById('login-email').value = email;
            registerForm.reset();
          }, 1200);
        } else {
          showAlert(apiRes.data.message || 'Registration failed.', 'error');
        }
        return;
      }

      // 2. Client-side Fallback for Static Web Hosts
      const users = JSON.parse(localStorage.getItem('juice_users') || '[]');
      const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        showAlert('Email address is already registered.', 'error');
        return;
      }

      const newUser = { id: 'usr_' + Date.now(), fullName, email: email.toLowerCase(), phone, password };
      users.push(newUser);
      localStorage.setItem('juice_users', JSON.stringify(users));

      showAlert('Account created successfully! Please sign in to proceed with your order.', 'success');
      setTimeout(() => {
        switchTab('login');
        document.getElementById('login-email').value = email;
        registerForm.reset();
      }, 1200);
    } catch (err) {
      showAlert('Registration error. Please try again.', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'CREATE ACCOUNT';
    }
  });

  btnLogout.addEventListener('click', async () => {
    const token = localStorage.getItem('rouge_auth_token');
    if (token) {
      try {
        const res = await fetch('/api/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {}
    }
    localStorage.removeItem('rouge_auth_token');
    localStorage.removeItem('juice_active_user');
    updateHeaderAuthUI(null);
  });

  // --------------------------------------------------------------------------
  // 6. Interactive Event Handlers
  // --------------------------------------------------------------------------
  window.addEventListener('scroll', updateScrollTarget, { passive: true });
  window.addEventListener('resize', () => {
    resizeCanvas();
    updateScrollTarget();
  });
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      resizeCanvas();
      updateScrollTarget();
    }, 120);
  });

  btnLoginModal.addEventListener('click', () => openModal('login'));
  btnCloseModal.addEventListener('click', closeModal);
  tabLoginBtn.addEventListener('click', () => switchTab('login'));
  tabRegisterBtn.addEventListener('click', () => switchTab('register'));

  const btnOrderCTA = document.getElementById('btn-order-cta');
  if (btnOrderCTA) {
    btnOrderCTA.addEventListener('click', () => {
      const token = localStorage.getItem('rouge_auth_token');
      if (!token && !state.currentUser) {
        openModal('login');
        showAlert('Please sign in or create an account to place your order.', 'error');
      } else {
        window.location.href = './checkout.html';
      }
    });
  }

  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeModal();
  });

  timelineDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const sceneId = parseInt(dot.getAttribute('data-scene'), 10);
      const targetScene = CONFIG.scenes.find(s => s.id === sceneId);
      if (targetScene) {
        const targetFrame = targetScene.range[0];
        const scrollFraction = (targetFrame - CONFIG.startFrame) / (CONFIG.totalFrames - 1);
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({
          top: scrollFraction * maxScroll,
          behavior: 'smooth'
        });
      }
    });
  });

  // --------------------------------------------------------------------------
  // 7. Initialization Launch
  // --------------------------------------------------------------------------
  checkActiveSession();
  preloadImages().then(() => {
    resizeCanvas();
    updateScrollTarget();
    requestAnimationFrame(animationLoop);
  });
});
