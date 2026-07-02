const STORAGE_KEY = 'markethub_cart';
const FAVORITES_KEY = 'markethub_favorites';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function updateCartCount() {
  const countNode = document.getElementById('cartCount');
  if (!countNode) return;
  const cart = getCart();
  const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  countNode.textContent = quantity.toString();
}

function normalizeProduct(product) {
  return {
    id: product.id,
    name: product.name,
    price: Number(product.price) || 0,
    old_price: product.old_price || null,
    image: product.image || 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=700&q=80',
    category: product.category || 'Другие',
    description: product.description || 'Описание в процессе обновления.',
    delivery: product.delivery || '3 дня',
    badge: product.badge || 'Новинка',
  };
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  saveCart(cart);
  updateCartCount();
}

function removeFromCart(productId) {
  let cart = getCart();
  cart = cart.filter((item) => item.id !== productId);
  saveCart(cart);
  renderCartPage();
  updateCartCount();
}

function changeQuantity(productId, delta) {
  const cart = getCart();
  const item = cart.find((it) => it.id === productId);
  if (!item) return;
  item.quantity = Math.max(1, item.quantity + delta);
  saveCart(cart);
  renderCartPage();
  updateCartCount();
}

function renderCartPage() {
  const cartTable = document.getElementById('cartItems');
  const totalNode = document.getElementById('cartTotal');
  const countNode = document.getElementById('cartTotalCount');
  const itemCountNode = document.getElementById('cartItemCount');
  if (!cartTable || !totalNode || !countNode) return;

  const cart = getCart();
  if (!cart.length) {
    cartTable.innerHTML = '<tr><td colspan="4">Ваша корзина пуста. Добавьте товары из каталога.</td></tr>';
    totalNode.textContent = '0 ₽';
    countNode.textContent = '0';
    if (itemCountNode) itemCountNode.textContent = '0';
    return;
  }

  const rows = cart.map((item) => {
    const itemTotal = item.price * item.quantity;
    return `
      <tr class="cart-item-row">
        <td>
          <div style="display:flex;align-items:center;gap:0.85rem;">
            <img src="${item.image}" alt="${item.name}" />
            <div>
              <strong>${item.name}</strong>
              <div style="color:#6b7280;font-size:0.95rem;margin-top:0.35rem;">${item.category}</div>
            </div>
          </div>
        </td>
        <td>${item.price.toLocaleString('ru-RU')} ₽</td>
        <td>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <button class="counter-button" type="button" onclick="changeQuantity(${item.id}, -1)">−</button>
            <span class="counter-display">${item.quantity}</span>
            <button class="counter-button" type="button" onclick="changeQuantity(${item.id}, 1)">+</button>
          </div>
        </td>
        <td>
          <strong>${itemTotal.toLocaleString('ru-RU')} ₽</strong>
          <button class="button button--secondary" style="margin-top:0.8rem;" type="button" onclick="removeFromCart(${item.id})">Удалить</button>
        </td>
      </tr>
    `;
  });

  cartTable.innerHTML = rows.join('');
  const totalSum = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  totalNode.textContent = `${totalSum.toLocaleString('ru-RU')} ₽`;
  countNode.textContent = totalCount.toString();
}

function isFavorite(productId) {
  return getFavorites().some((item) => item.id === productId);
}

function toggleFavorite(product) {
  const favorites = getFavorites();
  const exists = favorites.some((item) => item.id === product.id);
  const nextFavorites = exists
    ? favorites.filter((item) => item.id !== product.id)
    : [...favorites, product];
  saveFavorites(nextFavorites);
  updateFavoriteButtons();
  renderFavoritesPage();
  return nextFavorites;
}

function updateFavoriteButtons() {
  document.querySelectorAll('.favorite-btn').forEach((button) => {
    const productData = button.dataset.product;
    if (!productData) return;

    const product = normalizeProduct(JSON.parse(productData));
    const active = isFavorite(product.id);
    button.classList.toggle('is-active', active);
    button.textContent = active ? '♥' : '♡';
    button.setAttribute('aria-label', active ? 'Убрать из избранного' : 'Добавить в избранное');
    button.title = active ? 'Убрать из избранного' : 'Добавить в избранное';
  });
}

function renderFavoritesPage() {
  const grid = document.getElementById('favoritesGrid');
  const emptyState = document.getElementById('favoritesEmptyState');
  const countLabel = document.getElementById('favoritesCountLabel');

  if (!grid) return;

  const favorites = getFavorites();
  if (countLabel) {
    countLabel.textContent = `${favorites.length} товаров`;
  }

  if (!favorites.length) {
    grid.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  grid.innerHTML = favorites.map((product) => `
    <article class="product-card glass-panel">
      <div class="product-card__image-wrap">
        <img class="product-card__image" src="${product.image}" alt="${product.name}" />
      </div>
      <div class="product-card__top">
        <span class="badge">${product.badge}</span>
        <span class="rating">★ ${product.rating || '4.8'}</span>
      </div>
      <h3 class="gradient-text">${product.name}</h3>
      <p>${product.description}</p>
      <div class="product-card__meta">
        <span>${product.category}</span>
        <span>${product.delivery}</span>
      </div>
      <div class="price-row">
        <div>
          <strong>${product.price} ₽</strong>
          ${product.old_price ? `<span class="old-price">${product.old_price} ₽</span>` : ''}
        </div>
      </div>
      <div class="card-actions">
        <button class="button button--primary" data-add-to-cart data-product='${JSON.stringify(product).replace(/'/g, "&apos;")}'>В корзину</button>
        <button class="button button--secondary remove-favorite-btn" type="button" data-product='${JSON.stringify(product).replace(/'/g, "&apos;")}'>Удалить</button>
        <button class="button button--secondary favorite-btn is-active" type="button" data-product='${JSON.stringify(product).replace(/'/g, "&apos;")}'>♥</button>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('[data-add-to-cart]').forEach((button) => {
    button.addEventListener('click', () => {
      const productData = button.dataset.product;
      if (!productData) return;
      const product = normalizeProduct(JSON.parse(productData));
      addToCart(product);
      if (button.classList.contains('button--primary')) {
        button.textContent = 'Добавлено';
        setTimeout(() => {
          button.textContent = 'Купить сейчас';
        }, 900);
      }
    });
  });

  grid.querySelectorAll('.remove-favorite-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const productData = button.dataset.product;
      if (!productData) return;
      const product = normalizeProduct(JSON.parse(productData));
      toggleFavorite(product);
    });
  });

  grid.querySelectorAll('.favorite-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const productData = button.dataset.product;
      if (!productData) return;
      const product = normalizeProduct(JSON.parse(productData));
      toggleFavorite(product);
    });
  });
}

function handleAddToCartButtons() {
  const addButtons = document.querySelectorAll('[data-add-to-cart]');
  addButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const productData = button.dataset.product;
      if (!productData) return;
      const product = normalizeProduct(JSON.parse(productData));
      addToCart(product);
      if (button.classList.contains('button--primary')) {
        button.textContent = 'Добавлено';
        setTimeout(() => {
          button.textContent = 'Купить сейчас';
        }, 900);
      }
    });
  });

  document.querySelectorAll('.favorite-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const productData = button.dataset.product;
      if (!productData) return;
      const product = normalizeProduct(JSON.parse(productData));
      toggleFavorite(product);
    });
  });
}

function attachCategoryFilters() {
  const filterChips = document.querySelectorAll('.filter-chip');
  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      filterChips.forEach((btn) => btn.classList.remove('active'));
      chip.classList.add('active');
      const query = chip.textContent === 'Все категории' ? '' : chip.textContent;
      const searchInput = document.querySelector('.search-box input[name="q"]');
      if (searchInput) {
        searchInput.value = query;
        searchInput.form.submit();
      }
    });
  });
}

function handleProductForm() {
  const form = document.getElementById('newProductForm');
  const photoInput = document.getElementById('photoInput');
  const videoInput = document.getElementById('videoInput');
  const preview = document.getElementById('mediaPreview');
  if (!form) return;

  let selectedFiles = { photos: [], videos: [] };

  if (photoInput) {
    photoInput.addEventListener('change', () => {
      updateMediaPreview();
    });
  }

  if (videoInput) {
    videoInput.addEventListener('change', () => {
      updateMediaPreview();
    });
  }

  function updateMediaPreview() {
    selectedFiles.photos = Array.from(photoInput?.files || []);
    selectedFiles.videos = Array.from(videoInput?.files || []);

    const totalFiles = selectedFiles.photos.length + selectedFiles.videos.length;

    if (totalFiles === 0) {
      preview.innerHTML = '<div class="media-preview-empty">Предпросмотр медиа появится здесь</div>';
      return;
    }

    preview.innerHTML = '';
    let loadedCount = 0;

    selectedFiles.photos.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const item = document.createElement('div');
        item.className = 'media-item';
        item.innerHTML = `
          <img src="${event.target.result}" alt="Фото ${index + 1}" />
          <span class="media-item-type">ФОТО</span>
          <button type="button" class="media-item-remove" data-type="photo" data-index="${index}">✕</button>
        `;
        preview.appendChild(item);
        loadedCount++;
      };
      reader.readAsDataURL(file);
    });

    selectedFiles.videos.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const item = document.createElement('div');
        item.className = 'media-item';
        item.innerHTML = `
          <video src="${event.target.result}"></video>
          <span class="media-item-type">ВИДЕО</span>
          <button type="button" class="media-item-remove" data-type="video" data-index="${index}">✕</button>
        `;
        preview.appendChild(item);
        loadedCount++;
      };
      reader.readAsDataURL(file);
    });

    // Attach remove handlers
    setTimeout(() => {
      preview.querySelectorAll('.media-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const type = btn.dataset.type;
          const idx = parseInt(btn.dataset.index);
          if (type === 'photo') {
            selectedFiles.photos.splice(idx, 1);
            photoInput.files = createFileList(selectedFiles.photos);
          } else {
            selectedFiles.videos.splice(idx, 1);
            videoInput.files = createFileList(selectedFiles.videos);
          }
          updateMediaPreview();
        });
      });
    }, 100);
  }

  function createFileList(files) {
    const dt = new DataTransfer();
    files.forEach(file => dt.items.add(file));
    return dt.files;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);

    if (!data.get('name') || !data.get('price') || !data.get('category')) {
      alert('Заполните поля: название, цена и категория.');
      return;
    }

    const response = await fetch('/api/add_product', {
      method: 'POST',
      body: data,
    });

    if (!response.ok) {
      const error = await response.json();
      alert('Ошибка: ' + (error.error || 'Не удалось добавить товар'));
      return;
    }

    const result = await response.json();
    if (result.success) {
      form.reset();
      preview.innerHTML = '<div class="media-preview-empty">Предпросмотр медиа появится здесь</div>';
      selectedFiles = { photos: [], videos: [] };
      alert('Товар добавлен в каталог. Откройте каталог, чтобы увидеть его.');
    }
  });
}

function renderQRCode() {
  const qrContainer = document.getElementById('qrCode');
  if (!qrContainer) return;
  const text = 'order:' + (Math.random() + 1).toString(36).substring(2, 10);
  qrContainer.innerHTML = '';
  const hash = Array.from(text).map((char) => char.charCodeAt(0));
  const cells = 144;
  for (let index = 0; index < cells; index += 1) {
    const dot = document.createElement('div');
    dot.className = 'qr-dot';
    const active = hash[index % hash.length] % 3 === 0 || index % 7 === 0;
    if (active) dot.classList.add('active');
    qrContainer.appendChild(dot);
  }
}

function renderSettingsNotice() {
  const quickStatus = document.getElementById('settingsStatus');
  if (!quickStatus) return;
  quickStatus.textContent = `Вы вошли как Дараев Абдул-Малик — персональные рекомендации и QR-коды готовы.`;
}

function initThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  const savedTheme = localStorage.getItem('markethub_theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    toggle.textContent = '☀️';
  }
  toggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('markethub_theme', isDark ? 'dark' : 'light');
    toggle.textContent = isDark ? '☀️' : '🌙';
  });
}

window.changeQuantity = changeQuantity;
window.removeFromCart = removeFromCart;

window.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  updateFavoriteButtons();
  renderFavoritesPage();
  handleAddToCartButtons();
  attachCategoryFilters();
  handleProductForm();
  renderCartPage();
  renderQRCode();
  renderSettingsNotice();
  initThemeToggle();
});
