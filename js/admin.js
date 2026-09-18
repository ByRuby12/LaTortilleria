const defaultMenu = { categories: [] };
const defaultContent = { brand: {}, contact: {}, footer: {} };
const ALLERGEN_OPTIONS = [
    ['gluten', 'Gluten'],
    ['lacteos', 'Lácteos'],
    ['huevos', 'Huevos'],
    ['cacahuetes', 'Cacahuetes'],
    ['pescado', 'Pescado'],
    ['crustaceos', 'Crustáceos'],
    ['moluscos', 'Moluscos'],
    ['frutos', 'Frutos secos'],
    ['apio', 'Apio'],
    ['mostaza', 'Mostaza'],
    ['sesamo', 'Sésamo'],
    ['soja', 'Soja'],
    ['sulfitos', 'Sulfitos'],
    ['altramuces', 'Altramuces'],
    ['free-alergenos', 'Sin alérgenos']
];
const MANAGED_LINKS = {
    social: [
        { key: 'instagram', name: 'Instagram', icon: 'fab fa-instagram', color: '#E4405F' },
        { key: 'tiktok', name: 'TikTok', icon: 'fab fa-tiktok', color: '#000000' },
        { key: 'facebook', name: 'Facebook', icon: 'fab fa-facebook-f', color: '#1877F2' },
        { key: 'whatsapp', name: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25D366' }
    ],
    delivery: [
        { key: 'just-eat', name: 'Just Eat', logoUrl: 'https://cdn.simpleicons.org/justeat', icon: 'fas fa-motorcycle', url: '' },
        { key: 'uber-eats', name: 'Uber Eats', logoUrl: 'https://cdn.simpleicons.org/ubereats', icon: 'fab fa-uber', url: '' },
        { key: 'glovo', name: 'Glovo', logoUrl: 'https://cdn.simpleicons.org/glovo', icon: 'fas fa-bicycle', url: '' }
    ]
};

let adminContent = defaultContent;
let adminMenu = defaultMenu;
let selectedCategoryIndex = 0;
let selectedProductPage = 0;
const PRODUCTS_PER_PAGE = 3;
let cloudSaveTimer;
let firebaseReachable = Boolean(window.firebaseDb);

const languageSelect = document.getElementById('adminLanguage');
const contentEditor = document.getElementById('adminContentEditor');
const menuEditor = document.getElementById('adminMenuEditor');
const socialEditor = document.getElementById('adminSocialEditor');
const categorySelect = document.getElementById('adminCategorySelect');
const categoryEditor = document.getElementById('adminCategoryEditor');
const status = document.getElementById('adminStatus');
const statusText = document.getElementById('adminStatusText');
const statusIcon = document.getElementById('adminStatusIcon');
const categoryDeleteModal = document.getElementById('adminCategoryDeleteModal');
const categoryDeleteMessage = document.getElementById('adminCategoryDeleteMessage');
let pendingCategoryDeleteIndex = -1;
const passwordForm = document.getElementById('adminPasswordForm');
const passwordStatus = document.getElementById('adminPasswordStatus');

async function loadAdminJson(path, fallback) {
    const firebaseKey = path.includes('content_en') ? 'content-en' : path.includes('menu_en') ? 'menu-en' : path.includes('content') ? 'content-es' : 'menu-es';
    if (!window.firebaseDb) return fallback;
    try {
        const snapshot = await window.firebaseDb.collection('siteData').doc(firebaseKey).get();
        if (snapshot.exists && snapshot.data()?.payload) return snapshot.data().payload;
        console.warn(`No existe el documento siteData/${firebaseKey} en Firebase.`);
    } catch (error) {
        firebaseReachable = false;
        console.warn('No se pudo leer Firebase.', error);
    }
    return fallback;
}

function getPathValue(object, path) {
    return path.split('.').reduce((value, key) => value?.[key], object) || '';
}

function setPathValue(object, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => current[key] ||= {}, object);
    target[lastKey] = value;
}

function syncContactPhoneLink() {
    const telephone = adminContent.contact?.telephone || '';
    adminContent.contact ||= {};
    adminContent.contact.bookUrl = telephone ? `tel:${String(telephone).replace(/[^\d+]/g, '')}` : '';
}

function ensureDeliveryServices() {
    adminContent.contact ||= {};
    const existingServices = Array.isArray(adminContent.contact.deliveryServices)
        ? adminContent.contact.deliveryServices
        : Array.isArray(adminContent.contact.serviciosEntrega)
            ? adminContent.contact.serviciosEntrega
            : [];

    MANAGED_LINKS.delivery.forEach(definition => {
        const exists = existingServices.some(service => service.key === definition.key || service.name?.toLowerCase() === definition.name.toLowerCase());
        if (!exists) existingServices.push({ ...definition });
    });

    adminContent.contact.deliveryServices = existingServices;
}

function syncSharedSocialLinks(firstContent, secondContent) {
    firstContent.footer ||= {};
    secondContent.footer ||= {};
    const firstSocials = Array.isArray(firstContent.footer.social) ? firstContent.footer.social : [];
    const secondSocials = Array.isArray(secondContent.footer.social) ? secondContent.footer.social : [];
    const merged = [];
    const keys = [...new Set([...firstSocials, ...secondSocials].map(link => link.key || link.name?.toLowerCase()).filter(Boolean))];

    keys.forEach(key => {
        const firstLink = firstSocials.find(link => (link.key || link.name?.toLowerCase()) === key) || {};
        const secondLink = secondSocials.find(link => (link.key || link.name?.toLowerCase()) === key) || {};
        const preferred = Object.keys(firstLink).length ? firstLink : secondLink;
        merged.push({
            ...secondLink,
            ...firstLink,
            name: preferred.name || firstLink.name || secondLink.name || key,
            icon: preferred.icon || firstLink.icon || secondLink.icon || '',
            color: preferred.color || firstLink.color || secondLink.color || '',
            url: preferred.url || ''
        });
    });

    firstContent.footer.social = merged.map(link => ({ ...link }));
    secondContent.footer.social = merged.map(link => ({ ...link }));
}

function syncSharedDeliveryLinks(firstContent, secondContent) {
    firstContent.contact ||= {};
    secondContent.contact ||= {};
    const firstServices = Array.isArray(firstContent.contact.deliveryServices) ? firstContent.contact.deliveryServices : [];
    const secondServices = Array.isArray(secondContent.contact.deliveryServices) ? secondContent.contact.deliveryServices : [];
    const merged = MANAGED_LINKS.delivery.map(definition => {
        const firstService = firstServices.find(service => service.key === definition.key || service.name?.toLowerCase() === definition.name.toLowerCase()) || {};
        const secondService = secondServices.find(service => service.key === definition.key || service.name?.toLowerCase() === definition.name.toLowerCase()) || {};
        const preferred = Object.keys(firstService).length ? firstService : secondService;
        return {
            ...definition,
            ...secondService,
            ...firstService,
            key: definition.key,
            name: definition.name,
            logoUrl: definition.logoUrl,
            url: preferred.url || ''
        };
    });

    firstContent.contact.deliveryServices = merged.map(service => ({ ...service }));
    secondContent.contact.deliveryServices = merged.map(service => ({ ...service }));
}

function getCategories() {
    return Array.isArray(adminMenu.categories) ? adminMenu.categories : [];
}

function getCategoryName(category) {
    return category?.nombre || category?.name || '';
}

function getProducts(category) {
    return Array.isArray(category?.productos) ? category.productos : Array.isArray(category?.items) ? category.items : [];
}

function getCategoryId(category, index) {
    return category?.identificador || category?.id || `category-${index}`;
}

function copySharedProductFields(sourceProduct, targetProduct) {
    const sourcePrice = getProductValue(sourceProduct, 'price');
    const targetPrice = getProductValue(targetProduct, 'price');
    const sourceImage = getProductValue(sourceProduct, 'image');
    const targetImage = getProductValue(targetProduct, 'image');
    setProductValue(targetProduct, 'price', sourcePrice || targetPrice);
    setProductValue(targetProduct, 'image', sourceImage || targetImage);

    const allergens = getProductAllergens(sourceProduct);
    const targetAllergens = getProductAllergens(targetProduct);
    const allergenKey = Object.prototype.hasOwnProperty.call(targetProduct, 'allergens') ? 'allergens' : 'alergenos';
    targetProduct[allergenKey] = allergens.length ? [...allergens] : [...targetAllergens];
}

function syncSharedMenuFields(sourceMenu, targetMenu, targetLanguage) {
    targetMenu.categories ||= [];
    const sourceCategories = getCategoriesFromMenu(sourceMenu);

    targetMenu.categories = targetMenu.categories.filter((targetCategory, targetIndex) => {
        const targetId = getCategoryId(targetCategory, targetIndex);
        return sourceCategories.some((sourceCategory, sourceIndex) => getCategoryId(sourceCategory, sourceIndex) === targetId)
            || targetIndex < sourceCategories.length;
    });

    sourceCategories.forEach((sourceCategory, categoryIndex) => {
        const categoryId = getCategoryId(sourceCategory, categoryIndex);
        let targetCategory = targetMenu.categories.find((category, index) => getCategoryId(category, index) === categoryId)
            || targetMenu.categories[categoryIndex];
        if (!targetCategory) {
            targetCategory = {
                identificador: sourceCategory.identificador || sourceCategory.id || categoryId,
                nombre: targetLanguage === 'en' ? 'New category' : 'Nueva categoría',
                productos: []
            };
            targetMenu.categories.push(targetCategory);
        }

        const sourceProducts = getProducts(sourceCategory);
        const targetProducts = getProducts(targetCategory);
        sourceProducts.forEach((sourceProduct, productIndex) => {
            let targetProduct = targetProducts[productIndex];
            if (!targetProduct) {
                targetProduct = {
                    nombre: '',
                    descripcion: '',
                    precio: '',
                    imagen: '',
                    alergenos: []
                };
                if (Array.isArray(targetCategory.productos)) targetCategory.productos.push(targetProduct);
                else {
                    targetCategory.items ||= [];
                    targetCategory.items.push(targetProduct);
                }
            }
            copySharedProductFields(sourceProduct, targetProduct);
        });
    });
}

function syncSharedMenuPairFields(firstMenu, secondMenu, secondLanguage) {
    syncSharedMenuFields(firstMenu, secondMenu, secondLanguage);
    syncSharedMenuFields(secondMenu, firstMenu, languageSelect.value === 'en' ? 'es' : 'en');
}

function getCategoriesFromMenu(menu) {
    return Array.isArray(menu?.categories) ? menu.categories : [];
}

function setProductValue(product, field, value) {
    const fieldMap = {
        name: ['name', 'nombre'],
        description: ['description', 'descripcion'],
        price: ['price', 'precio'],
        image: ['image', 'imagen']
    };
    const keys = fieldMap[field] || [field];
    const key = Object.prototype.hasOwnProperty.call(product, keys[0]) ? keys[0] : keys[keys.length - 1];
    product[key] = value;
}

function getProductValue(product, field) {
    const fieldMap = {
        name: ['name', 'nombre'],
        description: ['description', 'descripcion'],
        price: ['price', 'precio'],
        image: ['image', 'imagen']
    };
    return (fieldMap[field] || [field]).map(key => product?.[key]).find(value => value !== undefined) || '';
}

function formatAdminPrice(price) {
    const value = String(price ?? '').trim();
    if (!value) return '';
    return /€|eur(?:os?)?/i.test(value) ? value : `${value} €`;
}

function getProductAllergens(product) {
    const values = product?.alergenos ?? product?.allergens;
    return Array.isArray(values) ? values : [];
}

function getAllergenLabel(value) {
    return ALLERGEN_OPTIONS.find(([optionValue]) => optionValue === value)?.[1] || value;
}

function createAllergenSelect(product, index) {
    const selected = getProductAllergens(product);
    const options = ALLERGEN_OPTIONS
        .filter(([value]) => !selected.includes(value))
        .map(([value, label]) => `<button type="button" class="admin-allergen-option" data-add-allergen data-allergen="${escapeHtml(value)}" data-product-index="${index}"><i class="fas fa-plus"></i>${escapeHtml(label)}</button>`)
        .join('');
    const chips = selected.length
        ? selected.map(value => `<span class="admin-allergen-chip">${escapeHtml(getAllergenLabel(value))}<button type="button" data-remove-allergen="${escapeHtml(value)}" data-product-index="${index}" aria-label="Quitar ${escapeHtml(getAllergenLabel(value))}">&times;</button></span>`).join('')
        : '<span class="admin-allergen-empty">Todavía no hay alérgenos seleccionados.</span>';
    return `<div class="admin-field-wide admin-allergen-field"><span class="admin-field-label">Alérgenos</span><details class="admin-allergen-dropdown"><summary><span><i class="fas fa-plus"></i> Añadir alérgeno</span><i class="fas fa-chevron-down"></i></summary><div class="admin-allergen-options">${options || '<span class="admin-allergen-empty">Todos los alérgenos están añadidos.</span>'}</div></details><div class="admin-allergen-list">${chips}</div></div>`;
}

function createInput(label, value, attributes = '') {
    return `<label>${label}<input value="${escapeHtml(value)}" ${attributes}></label>`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderBusinessForm() {
    document.querySelectorAll('[data-content-field]').forEach(field => {
        const value = getPathValue(adminContent, field.dataset.contentField);
        field.value = value;
    });
}

function renderSocials() {
    adminContent.footer ||= {};
    adminContent.footer.social ||= [];
    adminContent.contact ||= {};
    adminContent.contact.deliveryServices ||= [];

    const findLink = (links, definition) => links.find(link => link.key === definition.key || link.name?.toLowerCase() === definition.name.toLowerCase()) || definition;
    const linkMarkup = (definition, link, type) => `
        <article class="admin-repeat-card">
            <div class="admin-repeat-icon ${type === 'delivery' ? 'admin-delivery-icon' : ''}" style="--social-color: ${escapeHtml(link.color || definition.color || '#e85d04')};">
                ${type === 'delivery' && definition.logoUrl
                    ? `<img src="${escapeHtml(definition.logoUrl)}" alt="Logotipo de ${escapeHtml(definition.name)}">`
                    : `<i class="${escapeHtml(definition.icon)}"></i>`}
            </div>
            <div class="admin-repeat-fields">
                <strong>${definition.name}</strong>
                ${createInput('Enlace', link.url, `data-managed-link="${type}" data-link-key="${definition.key}"`)}
            </div>
        </article>
    `;

    const socialMarkup = MANAGED_LINKS.social
        .map(definition => linkMarkup(definition, findLink(adminContent.footer.social, definition), 'social'))
        .join('');
    const deliveryMarkup = MANAGED_LINKS.delivery
        .map(definition => linkMarkup(definition, findLink(adminContent.contact.deliveryServices, definition), 'delivery'))
        .join('');

    socialEditor.innerHTML = socialMarkup + deliveryMarkup;
}

function renderCategorySelector() {
    const categories = getCategories();
    if (!categories.length) {
        categorySelect.innerHTML = '<option value="">Sin categorías</option>';
        categoryEditor.innerHTML = '<p class="admin-empty-state">Crea una categoría para empezar la carta.</p>';
        return;
    }
    selectedCategoryIndex = Math.min(selectedCategoryIndex, categories.length - 1);
    categorySelect.innerHTML = categories.map((category, index) => `<option value="${index}">${escapeHtml(getCategoryName(category) || `Categoría ${index + 1}`)}</option>`).join('');
    categorySelect.value = String(selectedCategoryIndex);
    renderCategoryEditor();
}

function renderCategoryEditor() {
    const category = getCategories()[selectedCategoryIndex];
    if (!category) return;
    const products = getProducts(category);
    const totalPages = Math.max(1, Math.ceil(products.length / PRODUCTS_PER_PAGE));
    selectedProductPage = Math.min(selectedProductPage, totalPages - 1);
    const pageStart = selectedProductPage * PRODUCTS_PER_PAGE;
    const visibleProducts = products.slice(pageStart, pageStart + PRODUCTS_PER_PAGE);
    const productMarkup = visibleProducts.map((product, visibleIndex) => {
        const index = pageStart + visibleIndex;
        return `
        <details class="admin-product-card" ${visibleIndex === 0 ? 'open' : ''}>
            <summary class="admin-product-summary">
                <span><strong>${escapeHtml(getProductValue(product, 'name') || `Producto ${index + 1}`)}</strong><small>Producto ${index + 1} · ${escapeHtml(formatAdminPrice(getProductValue(product, 'price')))}</small></span>
                <i class="fas fa-chevron-down"></i>
            </summary>
            <div class="admin-product-body">
                <div class="admin-product-heading">
                    <strong>Datos del producto</strong>
                    <div class="admin-product-heading-actions">
                        ${index > 0 ? '<button class="admin-secondary-button admin-small-button" type="button" data-move-product-up="' + index + '" title="Subir producto"><i class="fas fa-arrow-up"></i> Subir</button>' : ''}
                        ${index < products.length - 1 ? '<button class="admin-secondary-button admin-small-button" type="button" data-move-product-down="' + index + '" title="Bajar producto"><i class="fas fa-arrow-down"></i> Bajar</button>' : ''}
                    <button class="admin-danger-button" type="button" data-remove-product="${index}"><i class="fas fa-trash"></i> Eliminar</button>
                    </div>
                </div>
                <div class="admin-form-grid">
                ${createInput('Nombre', getProductValue(product, 'name'), `data-product-field="name" data-product-index="${index}"`)}
                ${createInput('Precio o rango', getProductValue(product, 'price'), `data-product-field="price" data-product-index="${index}" type="text" inputmode="text" placeholder="Ej.: 3 a 15 € o 3, 8 y 2 €"`)}
                <label class="admin-field-wide">Descripción<textarea rows="2" data-product-field="description" data-product-index="${index}">${escapeHtml(getProductValue(product, 'description'))}</textarea></label>
                ${createInput('Imagen o URL', getProductValue(product, 'image'), `data-product-field="image" data-product-index="${index}" type="url" placeholder="https://ejemplo.com/imagen.jpg"`)}
                ${createAllergenSelect(product, index)}
                </div>
            </div>
        </details>
        `;
    }).join('');

    categoryEditor.innerHTML = `
        <div class="admin-category-fields">
            ${createInput('Nombre de la categoría', getCategoryName(category), 'data-category-field="name"')}
            ${createInput('Identificador interno', category.identificador || category.id || '', 'data-category-field="id"')}
            <div class="admin-category-delete">
                <button class="admin-danger-button" id="adminDeleteCategoryButton" type="button"><i class="fas fa-trash"></i> Eliminar categoría</button>
            </div>
        </div>
        <div class="admin-section-heading admin-products-heading">
            <div><h2>Productos <span class="admin-count">${products.length}</span></h2></div>
            <button class="admin-secondary-button" id="adminAddProductButton" type="button"><i class="fas fa-plus"></i> Añadir producto</button>
        </div>
        <div class="admin-product-list">${productMarkup || '<p class="admin-empty-state">Todavía no hay productos en esta categoría.</p>'}</div>
        ${products.length > PRODUCTS_PER_PAGE ? `
            <nav class="admin-pagination" aria-label="Páginas de productos">
                <button class="admin-page-button" type="button" data-product-page="prev" ${selectedProductPage === 0 ? 'disabled' : ''} aria-label="Página anterior"><i class="fas fa-chevron-left"></i></button>
                <span>Página ${selectedProductPage + 1} de ${totalPages}</span>
                <button class="admin-page-button" type="button" data-product-page="next" ${selectedProductPage === totalPages - 1 ? 'disabled' : ''} aria-label="Página siguiente"><i class="fas fa-chevron-right"></i></button>
            </nav>
        ` : ''}
    `;
}

function renderAdvancedEditors() {
    contentEditor.value = JSON.stringify(adminContent, null, 2);
    menuEditor.value = JSON.stringify(adminMenu, null, 2);
}

function renderAll() {
    renderBusinessForm();
    renderSocials();
    renderCategorySelector();
    renderAdvancedEditors();
}

function setStatus(message, state = '') {
    if (!status) return;
    if (statusText) statusText.textContent = message;
    else status.textContent = message;
    status.classList.remove('is-saving', 'is-success', 'is-error');
    if (state) status.classList.add(`is-${state}`);
    if (statusIcon) {
        statusIcon.className = 'admin-status-icon';
        if (state === 'saving') statusIcon.classList.add('fas', 'fa-spinner', 'fa-spin');
        if (state === 'success') statusIcon.classList.add('fas', 'fa-check');
        if (state === 'error') statusIcon.classList.add('fas', 'fa-circle-exclamation');
        if (state === 'pending') statusIcon.classList.add('fas', 'fa-xmark');
    }
}

function setPasswordStatus(message, isError = false) {
    if (!passwordStatus) return;
    passwordStatus.textContent = message;
    passwordStatus.classList.toggle('admin-error', isError);
}

function setSaveState(connected, message) {
    const state = document.getElementById('adminSaveState');
    const text = document.getElementById('adminSaveStateText');
    if (!state || !text) return;
    state.classList.toggle('is-local', !connected);
    state.classList.toggle('is-connected', connected);
    text.textContent = message;
}

function openCategoryDeleteModal(index) {
    const category = getCategories()[index];
    if (!category || !categoryDeleteModal) return;
    pendingCategoryDeleteIndex = index;
    const productCount = getProducts(category).length;
    categoryDeleteMessage.textContent = productCount
        ? `La categoría "${getCategoryName(category)}" tiene ${productCount} producto${productCount === 1 ? '' : 's'} asociado${productCount === 1 ? '' : 's'}. ¿Quieres eliminar la categoría y todos sus productos?`
        : `La categoría "${getCategoryName(category)}" no tiene productos. ¿Quieres eliminarla?`;
    categoryDeleteModal.hidden = false;
    document.getElementById('adminCancelCategoryDelete')?.focus();
}

function closeCategoryDeleteModal() {
    if (!categoryDeleteModal) return;
    categoryDeleteModal.hidden = true;
    pendingCategoryDeleteIndex = -1;
}

function deletePendingCategory() {
    if (pendingCategoryDeleteIndex < 0) return;
    adminMenu.categories.splice(pendingCategoryDeleteIndex, 1);
    selectedCategoryIndex = Math.max(0, pendingCategoryDeleteIndex - 1);
    selectedProductPage = 0;
    closeCategoryDeleteModal();
    renderCategorySelector();
    saveData(true);
}

async function saveData(silent = false) {
    const language = languageSelect.value;
    const contentPath = language === 'en' ? 'data/content_en.json' : 'data/content.json';
    const menuPath = language === 'en' ? 'data/menu_en.json' : 'data/menu.json';
    renderAdvancedEditors();
    if (silent) {
        clearTimeout(cloudSaveTimer);
        setStatus('Cambios pendientes de guardar.', 'pending');
        cloudSaveTimer = setTimeout(() => {
            cloudSaveTimer = null;
            saveData(false);
        }, 800);
        return;
    }

    if (window.firebaseDb) {
        try {
            const firebaseKey = path => path.includes('content_en') ? 'content-en' : path.includes('menu_en') ? 'menu-en' : path.includes('content') ? 'content-es' : 'menu-es';
            const otherLanguage = language === 'en' ? 'es' : 'en';
            const otherContentPath = otherLanguage === 'en' ? 'data/content_en.json' : 'data/content.json';
            const otherMenuPath = otherLanguage === 'en' ? 'data/menu_en.json' : 'data/menu.json';
            const otherContent = await loadAdminJson(otherContentPath, defaultContent);
            const otherMenu = await loadAdminJson(otherMenuPath, defaultMenu);
            syncSharedSocialLinks(adminContent, otherContent);
            syncSharedDeliveryLinks(adminContent, otherContent);
            syncSharedMenuPairFields(adminMenu, otherMenu, otherLanguage);
            renderAdvancedEditors();
            await Promise.all([
                window.firebaseDb.collection('siteData').doc(firebaseKey(contentPath)).set({ payload: adminContent, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() }),
                window.firebaseDb.collection('siteData').doc(firebaseKey(otherContentPath)).set({ payload: otherContent, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() }),
                window.firebaseDb.collection('siteData').doc(firebaseKey(menuPath)).set({ payload: adminMenu, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() }),
                window.firebaseDb.collection('siteData').doc(firebaseKey(otherMenuPath)).set({ payload: otherMenu, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() })
            ]);
            setStatus('Cambios guardados en Firebase.', 'success');
            firebaseReachable = true;
            setSaveState(true, 'Sincronizado con Firebase');
            return;
        } catch (error) {
            console.error('No se pudieron guardar los cambios en Firebase.', error);
            setStatus('No se pudieron guardar los cambios en Firebase. Revisa las reglas y la sesión.', 'error');
            setSaveState(false, 'Firebase necesita revisar sus reglas');
            return;
        }
    }

    setStatus('Firebase no está disponible; no se guardaron los cambios.');
    setSaveState(false, 'Firebase no está disponible');
}

async function loadEditors() {
    const language = languageSelect.value;
    const contentPath = language === 'en' ? 'data/content_en.json' : 'data/content.json';
    const menuPath = language === 'en' ? 'data/menu_en.json' : 'data/menu.json';
    const otherLanguage = language === 'en' ? 'es' : 'en';
    const otherContentPath = otherLanguage === 'en' ? 'data/content_en.json' : 'data/content.json';
    let otherContent;
    [adminContent, adminMenu, otherContent] = await Promise.all([
        loadAdminJson(contentPath, defaultContent),
        loadAdminJson(menuPath, defaultMenu),
        loadAdminJson(otherContentPath, defaultContent)
    ]);
    syncSharedSocialLinks(adminContent, otherContent);
    syncSharedDeliveryLinks(adminContent, otherContent);
    ensureDeliveryServices();
    syncContactPhoneLink();
    selectedCategoryIndex = 0;
    selectedProductPage = 0;
    renderAll();
    setSaveState(firebaseReachable, firebaseReachable ? 'Conectado a Firebase' : 'Firebase no está disponible');
    setStatus(`Editando versión ${language === 'en' ? 'inglesa' : 'española'}.`);
}

function downloadJson(value, filename) {
    const blob = new Blob([value], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus(`Descargado ${filename}.`);
}

function setupTabs() {
    document.querySelectorAll('[data-admin-tab]').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.adminTab;
            document.querySelectorAll('[data-admin-tab]').forEach(button => button.classList.toggle('active', button === tab));
            document.querySelectorAll('[data-admin-panel]').forEach(panel => {
                const active = panel.dataset.adminPanel === target;
                panel.classList.toggle('active', active);
                panel.hidden = !active;
            });
        });
    });
}

if (!window.firebaseAuth) {
    window.location.replace('../login/');
} else {
    window.firebaseAuth.onAuthStateChanged(user => {
        if (!user) {
            window.location.replace('../login/');
            return;
        }

    setupTabs();
    loadEditors();

    languageSelect.addEventListener('change', loadEditors);
    categorySelect.addEventListener('change', () => {
        selectedCategoryIndex = Number(categorySelect.value);
        selectedProductPage = 0;
        renderCategoryEditor();
    });

    socialEditor.addEventListener('input', event => {
        const type = event.target.dataset.managedLink;
        const key = event.target.dataset.linkKey;
        if (!type || !key) return;

        const definitions = MANAGED_LINKS[type];
        const collection = type === 'social' ? adminContent.footer.social : adminContent.contact.deliveryServices;
        const definition = definitions.find(item => item.key === key);
        let index = collection.findIndex(link => link.key === key || link.name?.toLowerCase() === definition.name.toLowerCase());
        if (index < 0) {
            collection.push({ ...definition, url: '' });
            index = collection.length - 1;
        }
        collection[index].url = event.target.value;
        saveData(true);
    });

    categoryEditor.addEventListener('input', event => {
        const category = getCategories()[selectedCategoryIndex];
        if (!category) return;
        const productIndex = event.target.dataset.productIndex;
        if (event.target.dataset.categoryField === 'name') {
            category[Object.prototype.hasOwnProperty.call(category, 'name') ? 'name' : 'nombre'] = event.target.value;
        }
        if (event.target.dataset.categoryField === 'id') {
            category[Object.prototype.hasOwnProperty.call(category, 'id') ? 'id' : 'identificador'] = event.target.value;
        }
        if (productIndex !== undefined) {
            const product = getProducts(category)[Number(productIndex)];
            const field = event.target.dataset.productField;
            setProductValue(product, field, event.target.value);
        }
        if (event.target.dataset.categoryField === 'name') categorySelect.options[selectedCategoryIndex].textContent = event.target.value || `Categoría ${selectedCategoryIndex + 1}`;
        saveData(true);
    });

    categoryEditor.addEventListener('click', event => {
        const addAllergenButton = event.target.closest('[data-add-allergen]');
        if (addAllergenButton) {
            const category = getCategories()[selectedCategoryIndex];
            const product = getProducts(category)[Number(addAllergenButton.dataset.productIndex)];
            const value = addAllergenButton.dataset.allergen;
            if (product && value) {
                const key = Object.prototype.hasOwnProperty.call(product, 'allergens') ? 'allergens' : 'alergenos';
                const values = getProductAllergens(product);
                if (!values.includes(value)) product[key] = [...values, value];
                renderCategoryEditor();
                saveData(true);
            }
            return;
        }

        const removeAllergenButton = event.target.closest('[data-remove-allergen]');
        if (removeAllergenButton) {
            const category = getCategories()[selectedCategoryIndex];
            const product = getProducts(category)[Number(removeAllergenButton.dataset.productIndex)];
            if (product) {
                const key = Object.prototype.hasOwnProperty.call(product, 'allergens') ? 'allergens' : 'alergenos';
                product[key] = getProductAllergens(product).filter(value => value !== removeAllergenButton.dataset.removeAllergen);
                renderCategoryEditor();
                saveData(true);
            }
            return;
        }

        const removeButton = event.target.closest('[data-remove-product]');
        if (removeButton) {
            getProducts(getCategories()[selectedCategoryIndex]).splice(Number(removeButton.dataset.removeProduct), 1);
            selectedProductPage = Math.min(selectedProductPage, Math.max(0, Math.ceil(getProducts(getCategories()[selectedCategoryIndex]).length / PRODUCTS_PER_PAGE) - 1));
            renderCategoryEditor();
            saveData(true);
            return;
        }
        const moveUpButton = event.target.closest('[data-move-product-up]');
        if (moveUpButton) {
            const products = getProducts(getCategories()[selectedCategoryIndex]);
            const productIndex = Number(moveUpButton.dataset.moveProductUp);
            if (productIndex > 0 && productIndex < products.length) {
                [products[productIndex - 1], products[productIndex]] = [products[productIndex], products[productIndex - 1]];
                selectedProductPage = Math.floor((productIndex - 1) / PRODUCTS_PER_PAGE);
                renderCategoryEditor();
                saveData(true);
            }
            return;
        }
        const moveDownButton = event.target.closest('[data-move-product-down]');
        if (moveDownButton) {
            const products = getProducts(getCategories()[selectedCategoryIndex]);
            const productIndex = Number(moveDownButton.dataset.moveProductDown);
            if (productIndex >= 0 && productIndex < products.length - 1) {
                [products[productIndex], products[productIndex + 1]] = [products[productIndex + 1], products[productIndex]];
                selectedProductPage = Math.floor((productIndex + 1) / PRODUCTS_PER_PAGE);
                renderCategoryEditor();
                saveData(true);
            }
            return;
        }
        if (event.target.closest('#adminAddProductButton')) {
            const category = getCategories()[selectedCategoryIndex];
            const products = getProducts(category);
            if (!Array.isArray(category.productos)) category.productos = products;
            category.productos.push({ nombre: 'Nuevo producto', descripcion: '', precio: '0.00', alergenos: ['free-alergenos'], imagen: '' });
            selectedProductPage = Math.ceil(products.length / PRODUCTS_PER_PAGE) - 1;
            renderCategoryEditor();
            saveData(true);
        }
        const pageButton = event.target.closest('[data-product-page]');
        if (pageButton && !pageButton.disabled) {
            selectedProductPage += pageButton.dataset.productPage === 'next' ? 1 : -1;
            renderCategoryEditor();
        }
        if (event.target.closest('#adminDeleteCategoryButton')) {
            openCategoryDeleteModal(selectedCategoryIndex);
        }
    });

    document.getElementById('adminAddCategoryButton').addEventListener('click', () => {
        adminMenu.categories ||= [];
        adminMenu.categories.push({ identificador: `nueva-categoria-${adminMenu.categories.length + 1}`, nombre: 'Nueva categoría', productos: [] });
        selectedCategoryIndex = adminMenu.categories.length - 1;
        selectedProductPage = 0;
        renderCategorySelector();
        categorySelect.focus();
        saveData(true);
    });

    document.querySelectorAll('[data-content-field]').forEach(field => {
        field.addEventListener('input', () => {
            setPathValue(adminContent, field.dataset.contentField, field.value);
            if (field.dataset.contentField === 'contact.telephone') syncContactPhoneLink();
            saveData(true);
        });
    });

    document.getElementById('adminSaveButton').addEventListener('click', () => {
        try {
            if (document.querySelector('.admin-advanced[open]')) {
                adminContent = JSON.parse(contentEditor.value);
                adminMenu = JSON.parse(menuEditor.value);
                renderAll();
            }
            saveData(false);
        } catch (error) {
            setStatus(`JSON no válido: ${error.message}`);
        }
    });

    document.getElementById('adminCancelCategoryDelete').addEventListener('click', closeCategoryDeleteModal);
    document.getElementById('adminConfirmCategoryDelete').addEventListener('click', deletePendingCategory);
    categoryDeleteModal.addEventListener('click', event => {
        if (event.target === categoryDeleteModal) closeCategoryDeleteModal();
    });

    document.getElementById('adminExportButton').addEventListener('click', () => {
        const filename = languageSelect.value === 'en' ? 'content_en.json' : 'content.json';
        downloadJson(JSON.stringify(adminContent, null, 2), filename);
    });

    document.getElementById('adminExportMenuButton').addEventListener('click', () => {
        const filename = languageSelect.value === 'en' ? 'menu_en.json' : 'menu.json';
        downloadJson(JSON.stringify(adminMenu, null, 2), filename);
    });

    document.getElementById('adminLogoutButton').addEventListener('click', () => {
        window.firebaseAuth.signOut().finally(() => window.location.replace('../login/'));
    });

    passwordForm.addEventListener('submit', async event => {
        event.preventDefault();
        const currentPassword = document.getElementById('adminCurrentPassword').value;
        const newPassword = document.getElementById('adminNewPassword').value;
        const confirmPassword = document.getElementById('adminConfirmPassword').value;
        const user = window.firebaseAuth.currentUser;

        if (newPassword.length < 6) {
            setPasswordStatus('La nueva contraseña debe tener al menos 6 caracteres.', true);
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordStatus('Las nuevas contraseñas no coinciden.', true);
            return;
        }
        if (!user?.email) {
            setPasswordStatus('No hay una sesión de administrador activa.', true);
            return;
        }

        try {
            setPasswordStatus('Actualizando contraseña...');
            const credential = window.firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(newPassword);
            passwordForm.reset();
            setPasswordStatus('Contraseña actualizada correctamente.');
        } catch (error) {
            const messages = {
                'auth/invalid-credential': 'La contraseña actual no es correcta.',
                'auth/wrong-password': 'La contraseña actual no es correcta.',
                'auth/weak-password': 'La nueva contraseña es demasiado débil.',
                'auth/requires-recent-login': 'Vuelve a iniciar sesión y prueba de nuevo.'
            };
            setPasswordStatus(messages[error.code] || 'No se pudo actualizar la contraseña.', true);
            console.error('No se pudo actualizar la contraseña.', error);
        }
    });
    });
}
