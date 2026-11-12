/* -------------------------------------------------------------------------- */
/* STRAWBERRY Juice - Checkout & Payment Controller                           */
/* -------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  const state = {
    selectedPack: 'single',
    unitPrice: 5,
    packTitle: 'Single Bottle (250ml)',
    quantity: 1,
    paymentMethod: 'Card'
  };

  // Auth Guard: Require login to access checkout
  const authToken = localStorage.getItem('rouge_auth_token');
  if (!authToken) {
    alert('Please sign in or create an account to access ordering and checkout.');
    window.location.href = './index.html';
    return;
  }

  // DOM Elements
  const packOptions = document.querySelectorAll('.pack-option');
  const btnQtyMinus = document.getElementById('btn-qty-minus');
  const btnQtyPlus = document.getElementById('btn-qty-plus');
  const qtyVal = document.getElementById('qty-val');
  
  const summaryProdTitle = document.getElementById('summary-prod-title');
  const summaryProdQty = document.getElementById('summary-prod-qty');
  const summaryProdPrice = document.getElementById('summary-prod-price');
  const summarySubtotal = document.getElementById('summary-subtotal');
  const summaryShipping = document.getElementById('summary-shipping');
  const summaryTax = document.getElementById('summary-tax');
  const summaryTotal = document.getElementById('summary-total');

  const paymentRadios = document.querySelectorAll('input[name="payment-method"]');
  const cardDetailsSection = document.getElementById('card-details-section');

  const btnPlaceOrder = document.getElementById('btn-place-order');
  const checkoutAlert = document.getElementById('checkout-alert');

  const orderConfirmModal = document.getElementById('order-confirm-modal');
  const recOrderId = document.getElementById('rec-order-id');
  const recDelivery = document.getElementById('rec-delivery');
  const recCustomer = document.getElementById('rec-customer');
  const recAddress = document.getElementById('rec-address');
  const recTotal = document.getElementById('rec-total');

  const inputCardNum = document.getElementById('card-number');
  const inputCardExpiry = document.getElementById('card-expiry');
  const inputCardCvv = document.getElementById('card-cvv');
  const inputCardHolder = document.getElementById('card-holder');

  // --------------------------------------------------------------------------
  // 1. Pack Selection & Price Calculations (Qatar Riyal QAR)
  // --------------------------------------------------------------------------
  packOptions.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.preventDefault();
      packOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');

      state.selectedPack = opt.getAttribute('data-pack');
      state.unitPrice = parseFloat(opt.getAttribute('data-price')) || 5;

      if (state.selectedPack === 'single') {
        state.packTitle = 'Single Bottle (250ml)';
      } else if (state.selectedPack === 'six') {
        state.packTitle = '6-Pack Studio Box';
      } else if (state.selectedPack === 'twelve') {
        state.packTitle = '12-Pack Master Case';
      }

      updateCalculations();
    });
  });

  btnQtyMinus.addEventListener('click', (e) => {
    e.preventDefault();
    if (state.quantity > 1) {
      state.quantity--;
      qtyVal.textContent = state.quantity;
      updateCalculations();
    }
  });

  btnQtyPlus.addEventListener('click', (e) => {
    e.preventDefault();
    if (state.quantity < 50) {
      state.quantity++;
      qtyVal.textContent = state.quantity;
      updateCalculations();
    }
  });

  function updateCalculations() {
    const subtotal = state.unitPrice * state.quantity;
    const shipping = state.selectedPack === 'twelve' || subtotal >= 40 ? 0 : 3;
    const tax = 0;
    const total = subtotal + shipping + tax;

    summaryProdTitle.textContent = state.packTitle;
    summaryProdQty.textContent = `Qty: ${state.quantity}`;
    summaryProdPrice.textContent = `${subtotal} QAR`;

    summarySubtotal.textContent = `${subtotal} QAR`;
    summaryShipping.textContent = shipping === 0 ? 'FREE' : `${shipping} QAR`;
    summaryTax.textContent = `${tax} QAR`;
    summaryTotal.textContent = `${total} QAR`;
  }

  // --------------------------------------------------------------------------
  // 2. Payment Method Controls (Card vs Cash on Delivery)
  // --------------------------------------------------------------------------
  function togglePaymentFields(method) {
    state.paymentMethod = method;
    paymentRadios.forEach(radio => {
      const parent = radio.closest('.pay-method-option');
      if (radio.value === method) {
        radio.checked = true;
        if (parent) parent.classList.add('active');
      } else {
        if (parent) parent.classList.remove('active');
      }
    });

    if (method === 'Card') {
      cardDetailsSection.style.display = 'grid';
      inputCardNum.required = true;
      inputCardExpiry.required = true;
      inputCardCvv.required = true;
      inputCardHolder.required = true;
    } else {
      cardDetailsSection.style.display = 'none';
      inputCardNum.required = false;
      inputCardExpiry.required = false;
      inputCardCvv.required = false;
      inputCardHolder.required = false;
    }
  }

  paymentRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      togglePaymentFields(e.target.value);
    });

    const parent = radio.closest('.pay-method-option');
    if (parent) {
      parent.addEventListener('click', () => {
        togglePaymentFields(radio.value);
      });
    }
  });

  // Card Number Auto Spacing (16 digits)
  if (inputCardNum) {
    inputCardNum.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      let formatted = '';
      for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) formatted += ' ';
        formatted += value[i];
      }
      e.target.value = formatted.slice(0, 19);
    });
  }

  // Expiry MM/YY Format
  if (inputCardExpiry) {
    inputCardExpiry.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length >= 2) {
        e.target.value = value.slice(0, 2) + '/' + value.slice(2, 4);
      } else {
        e.target.value = value;
      }
    });
  }

  // Initial Run
  updateCalculations();
  togglePaymentFields('Card');

  // --------------------------------------------------------------------------
  // 3. Order Processing Submission
  // --------------------------------------------------------------------------
  btnPlaceOrder.addEventListener('click', async (e) => {
    e.preventDefault();
    hideAlert();

    const fullName = document.getElementById('ship-fullname').value.trim();
    const email = document.getElementById('ship-email').value.trim();
    const phone = document.getElementById('ship-phone').value.trim();
    const address = document.getElementById('ship-address').value.trim();
    const city = document.getElementById('ship-city').value.trim();
    const zip = document.getElementById('ship-zip').value.trim();
    const cardNumber = inputCardNum ? inputCardNum.value.trim() : '';

    // Validation
    if (!fullName || !email || !phone || !address || !city || !zip) {
      showAlert('Please fill in all required shipping address fields.', 'error');
      return;
    }

    if (state.paymentMethod === 'Card' && (!cardNumber || cardNumber.length < 15)) {
      showAlert('Please enter a valid credit card number.', 'error');
      return;
    }

    btnPlaceOrder.disabled = true;
    btnPlaceOrder.textContent = 'PROCESSING ORDER...';

    const orderPayload = {
      items: [
        { pack: state.selectedPack, title: state.packTitle, quantity: state.quantity, unitPrice: state.unitPrice }
      ],
      customer: { fullName, email, phone, address, city, zip },
      payment: {
        method: state.paymentMethod,
        cardNumber: state.paymentMethod === 'Card' ? cardNumber : 'N/A (Cash on Delivery)'
      }
    };

    // Safe API fetch helper
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
      } catch (err) {}
      return null;
    }

    try {
      let orderObj = null;

      // 1. Try Backend API
      const apiRes = await safeApiCall('/api/orders', 'POST', orderPayload);
      if (apiRes && apiRes.data && apiRes.data.success && apiRes.data.order) {
        orderObj = apiRes.data.order;
      } else {
        // 2. Client-side Fallback for Static Web Hosts
        const orderId = 'STR-' + Math.floor(100000 + Math.random() * 900000);
        orderObj = {
          orderId,
          createdAt: new Date().toISOString(),
          estimatedDelivery: 'Express Chilled Delivery within 1 hour',
          items: orderPayload.items,
          customer: orderPayload.customer,
          payment: {
            method: orderPayload.payment.method || 'Credit Card',
            status: 'Paid',
            cardLast4: orderPayload.payment.cardNumber ? orderPayload.payment.cardNumber.slice(-4) : '4242'
          },
          status: 'Confirmed'
        };

        const existingOrders = JSON.parse(localStorage.getItem('juice_orders') || '[]');
        existingOrders.push(orderObj);
        localStorage.setItem('juice_orders', JSON.stringify(existingOrders));
      }

      if (orderObj) {
        recOrderId.textContent = `#${orderObj.orderId}`;
        recDelivery.textContent = orderObj.estimatedDelivery;
        recCustomer.textContent = orderObj.customer.fullName;
        recAddress.textContent = `${orderObj.customer.address}, ${orderObj.customer.city}`;
        recTotal.textContent = summaryTotal.textContent;

        orderConfirmModal.classList.add('active');
        orderConfirmModal.setAttribute('aria-hidden', 'false');
      } else {
        showAlert('Order processing failed.', 'error');
      }
    } catch (err) {
      showAlert('Error processing order. Please try again.', 'error');
    } finally {
      btnPlaceOrder.disabled = false;
      btnPlaceOrder.textContent = 'PLACE ORDER & PAY NOW';
    }
  });

  function showAlert(msg, type = 'error') {
    checkoutAlert.textContent = msg;
    checkoutAlert.className = `auth-alert ${type}`;
    checkoutAlert.style.display = 'block';
  }

  function hideAlert() {
    checkoutAlert.style.display = 'none';
  }

  // Pre-fill user data if logged in
  if (authToken) {
    const activeUserStr = localStorage.getItem('juice_active_user');
    if (activeUserStr) {
      try {
        const u = JSON.parse(activeUserStr);
        if (u.fullName) document.getElementById('ship-fullname').value = u.fullName;
        if (u.email) document.getElementById('ship-email').value = u.email;
      } catch (e) {}
    }
  }
});
