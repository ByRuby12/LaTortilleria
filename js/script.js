const defaultMenu = {
    categories: []
};

const DEFAULT_DELIVERY_SERVICES = [
    { key: 'just-eat', name: 'Just Eat', logoUrl: 'https://cdn.simpleicons.org/justeat', icon: 'fas fa-motorcycle', url: '' },
    { key: 'uber-eats', name: 'Uber Eats', logoUrl: 'https://cdn.simpleicons.org/ubereats', icon: 'fab fa-uber', url: '' },
    { key: 'glovo', name: 'Glovo', logoUrl: 'https://cdn.simpleicons.org/glovo', icon: 'fas fa-bicycle', url: '' }
];

const DEFAULT_BRAND_ASSETS = {
    banner: 'images/banner-bar.jpeg',
    logo: 'images/logo-bar.png',
    icon: 'images/icono_web.png'
};

const DEFAULT_CONTACT_LABELS = {
    es: { address: 'Dirección', hours: 'Horario', email: 'Correo' },
    en: { address: 'Address', hours: 'Hours', email: 'Email' }
};

const defaultContent = {
    brand: {
        logo: '',
        logoImage: '',
        companyName: '',
        location: '',
        heroImage: '',
        heroEyebrow: '',
        heroTitle: '',
        heroText: '',
        heroButtons: []
    },
    contact: {
        heading: '',
        description: '',
        logoImage: '',
        companyName: '',
        address: '',
        hours: '',
        email: '',
        telephone: '',
        reviewUrl: '',
        bookUrl: '',
        social: [],
        labels: {
            address: '',
            hours: '',
            email: ''
        },
        buttons: {
            review: '',
            book: ''
        }
    },
    home: {
        heading: '',
        description: '',
        logoImage: '',
        companyName: '',
        blocks: []
    },
    footer: {
        text: '',
        socialTitle: '',
        social: []
    }
};

const allergenIconMap = {
    "🌾": "gluten",
    "🥛": "lacteos",
    "🥚": "huevos",
    "🥜": "cacahuetes",
    "🐟": "pescado",
    "🦐": "crustaceos",
    "🌰": "frutos",
    "🍤": "crustaceos",
    "🥬": "apio",
    "🍞": "gluten",
    "🍯": "mostaza",
    "🌶": "sulfitos",
    "🐄": "lacteos",
    "🥑": "frutos",
    "gluten": "gluten",
    "lacteos": "lacteos",
    "huevos": "huevos",
    "cacahuetes": "cacahuetes",
    "pescado": "pescado",
    "crustaceos": "crustaceos",
    "moluscos": "moluscos",
    "frutos": "frutos",
    "apio": "apio",
    "mostaza": "mostaza",
    "sulfitos": "sulfitos",
    "sesamo": "sesamo",
    "soja": "soja",
    "altramuces": "altramuces",
    "free-alergenos": "free-alergenos",
    "libre": "free-alergenos",
    "sin alergenos": "free-alergenos",
    "sin alergenos": "free-alergenos",
    "sin alérgenos": "free-alergenos"
};



function resolveAllergenIconName(allergen) {
    if (!allergen) return null;
    const normalized = String(allergen)
        .trim()
        .toLowerCase()
        .replace(/á/g, 'a')
        .replace(/é/g, 'e')
        .replace(/í/g, 'i')
        .replace(/ó/g, 'o')
        .replace(/ú/g, 'u')
        .replace(/ñ/g, 'n');

    return allergenIconMap[normalized] || allergenIconMap[allergen] || null;
}

function normalizeAssetPath(path) {
    if (!path) return '';
    const value = String(path).trim();
    if (!value) return '';
    if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('mailto:') || value.startsWith('tel:')) {
        return value;
    }
    return value.replace(/^\/+/, '');
}

function shouldRenderProductImage(itemImage) {
    const value = normalizeAssetPath(itemImage);
    if (!value) return false;
    // Render any valid image path. Previously some sample filenames were excluded
    // (e.g. 'imagen1.jpg') which prevented previews from showing when data
    // referenced that file. We now render any non-empty image path.
    return true;
}

function formatProductPrice(price) {
    const value = String(price ?? '').trim();
    if (!value) return '';
    return /€|eur(?:os?)?/i.test(value) ? value : `${value} €`;
}

function applyLazyBackgroundImage(element) {
    if (!element || !element.dataset.src) return;
    const src = normalizeAssetPath(element.dataset.src);
    if (!src) return;
    element.style.backgroundImage = `url('${src}')`;
    element.classList.remove('lazy-image');
    delete element.dataset.src;
}

function setupLazyProductImages() {
    const images = Array.from(document.querySelectorAll('.product-image[data-src]'));
    if (!images.length) return;

    if (!('IntersectionObserver' in window)) {
        images.forEach(applyLazyBackgroundImage);
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            applyLazyBackgroundImage(entry.target);
            obs.unobserve(entry.target);
        });
    }, { rootMargin: '200px 0px' });

    images.forEach(image => observer.observe(image));
}

function buildSocialArray(redes) {
    if (!redes || typeof redes !== 'object') return [];
    return Object.entries(redes)
        .filter(([, url]) => Boolean(url))
        .map(([key, url]) => {
            const iconMap = {
                instagram: 'fab fa-instagram',
                tiktok: 'fab fa-tiktok',
                whatsapp: 'fab fa-whatsapp',
                facebook: 'fab fa-facebook-f',
                google: 'fab fa-google'
            };
            return {
                name: key.charAt(0).toUpperCase() + key.slice(1),
                icon: iconMap[key.toLowerCase()] || '',
                url
            };
        });
}

function mergeSocialLinks(primaryContent, fallbackContent) {
    const primary = Array.isArray(primaryContent?.footer?.social) ? primaryContent.footer.social : [];
    const fallback = Array.isArray(fallbackContent?.footer?.social) ? fallbackContent.footer.social : [];
    const keys = [...new Set([...primary, ...fallback].map(link => link.key || link.name?.toLowerCase()).filter(Boolean))];

    return keys.map(key => {
        const primaryLink = primary.find(link => (link.key || link.name?.toLowerCase()) === key);
        const fallbackLink = fallback.find(link => (link.key || link.name?.toLowerCase()) === key) || {};
        const preferred = primaryLink || fallbackLink;
        return {
            ...fallbackLink,
            ...primaryLink,
            name: preferred.name || primaryLink.name || fallbackLink.name || key,
            icon: preferred.icon || primaryLink.icon || fallbackLink.icon || '',
            color: preferred.color || primaryLink.color || fallbackLink.color || '',
            url: preferred.url || ''
        };
    });
}

function mergeDeliveryServices(primaryContent, fallbackContent) {
    const primary = Array.isArray(primaryContent?.contact?.deliveryServices) ? primaryContent.contact.deliveryServices : [];
    const fallback = Array.isArray(fallbackContent?.contact?.deliveryServices) ? fallbackContent.contact.deliveryServices : [];
    return DEFAULT_DELIVERY_SERVICES.map(defaultService => {
        const primaryService = primary.find(service => service.key === defaultService.key || service.name?.toLowerCase() === defaultService.name.toLowerCase());
        const fallbackService = fallback.find(service => service.key === defaultService.key || service.name?.toLowerCase() === defaultService.name.toLowerCase()) || {};
        const preferred = primaryService || fallbackService;
        return {
            ...defaultService,
            ...fallbackService,
            ...primaryService,
            key: defaultService.key,
            name: defaultService.name,
            logoUrl: defaultService.logoUrl,
            url: preferred.url || ''
        };
    });
}

function updatePageMetadata(contentData) {
    const titleText = contentData.pageTitle || contentData.brand?.companyName || contentData.nombreBar || 'Carta Digital';
    const titleEl = document.getElementById('meta-title');
    if (titleEl) titleEl.textContent = titleText;
    document.title = titleText;

    const descriptionMeta = document.getElementById('meta-description') || document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
        descriptionMeta.content = contentData.pageDescription || contentData.descripcion || contentData.brand?.heroText || '';
    }

    const keywordsMeta = document.getElementById('meta-keywords');
    if (keywordsMeta) {
        keywordsMeta.content = contentData.keywords || '';
    }

    const authorMeta = document.getElementById('meta-author');
    if (authorMeta) {
        authorMeta.content = contentData.author || contentData.desarrollador || contentData.developer || '';
    }

}

async function loadJson(path, fallback) {
    const firebaseKey = path.includes('content_en') ? 'content-en' : path.includes('menu_en') ? 'menu-en' : path.includes('content') ? 'content-es' : 'menu-es';
    if (!window.firebaseDb) return fallback;
    try {
        const snapshot = await window.firebaseDb.collection('siteData').doc(firebaseKey).get();
        if (snapshot.exists && snapshot.data()?.payload) return snapshot.data().payload;
        console.warn(`No existe el documento siteData/${firebaseKey} en Firebase.`);
    } catch (error) {
        console.warn('No se pudo leer el contenido de Firebase.', error);
    }
    return fallback;
}

const CACHE_TTL_MS = 3600 * 1000;
function setCachedPref(key, value) {
    const payload = { value, ts: Date.now() };
    localStorage.setItem(key, JSON.stringify(payload));
}

function getCachedPref(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const payload = JSON.parse(raw);
        if (!payload || typeof payload.ts !== 'number') {
            localStorage.removeItem(key);
            return null;
        }
        if (Date.now() - payload.ts > CACHE_TTL_MS) {
            localStorage.removeItem(key);
            return null;
        }
        return payload.value;
    } catch {
        localStorage.removeItem(key);
        return null;
    }
}

function clearExpiredPrefs() {
    getCachedPref('selectedLang');
    getCachedPref('themeMode');
}

async function init() {
    clearExpiredPrefs();
    const storedLang = getCachedPref('selectedLang');
    currentLang = storedLang || 'es';
    const menuPath = currentLang === 'en' ? 'data/menu_en.json' : 'data/menu.json';
    const contentPath = currentLang === 'en' ? 'data/content_en.json' : 'data/content.json';
    const rawMenuData = await loadJson(menuPath, defaultMenu);
    const menuData = normalizeMenu(rawMenuData);
    const rawContent = await loadJson(contentPath, defaultContent);
    const alternateContentPath = currentLang === 'en' ? 'data/content.json' : 'data/content_en.json';
    const alternateContent = await loadJson(alternateContentPath, defaultContent);
    rawContent.footer ||= {};
    rawContent.footer.social = mergeSocialLinks(rawContent, alternateContent);
    rawContent.contact ||= {};
    rawContent.contact.deliveryServices = mergeDeliveryServices(rawContent, alternateContent);
    const contentData = normalizeContent(rawContent);

    const titleText = contentData.pageTitle || contentData.brand?.companyName || contentData.nombreBar || 'Carta Digital';
    const titleEl = document.getElementById('meta-title');
    if (titleEl) titleEl.textContent = titleText;
    document.title = titleText;

    const descriptionMeta = document.getElementById('meta-description') || document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
        descriptionMeta.content = contentData.pageDescription || contentData.brand?.heroText || contentData.descripcion || '';
    }

    const keywordsMeta = document.getElementById('meta-keywords');
    if (keywordsMeta) {
        keywordsMeta.content = contentData.keywords || '';
    }

    const authorMeta = document.getElementById('meta-author');
    if (authorMeta) {
        authorMeta.content = contentData.author || contentData.desarrollador || contentData.developer || '';
    }

    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') || document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.href = normalizeAssetPath(contentData.brand?.iconImage || 'images/icono_web.png?v=2');
    if (!appleIcon.parentNode) document.head.appendChild(appleIcon);

    renderHero(contentData.brand);
    renderMenu(menuData.categories, contentData);
    renderFooter(contentData);
    updatePageMetadata(contentData);

    const storedTheme = getCachedPref('themeMode');
    const isDark = storedTheme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.classList.toggle('fa-sun', isDark);
        themeIcon.classList.toggle('fa-moon', !isDark);
    }

    setupImageModal();
    setupThemeMenu();
}

let currentLang = 'es';

async function loadMenuForLang(lang) {
    // preserve currently active category index so the view doesn't jump
    const navBtnsBefore = Array.from(document.querySelectorAll('#categoryNav a'));
    const activeIndex = navBtnsBefore.findIndex(btn => btn.classList.contains('active'));

    currentLang = lang || 'es';
    setCachedPref('selectedLang', currentLang);

    const menuPath = currentLang === 'en' ? 'data/menu_en.json' : 'data/menu.json';
    const contentPath = currentLang === 'en' ? 'data/content_en.json' : 'data/content.json';
    const raw = await loadJson(menuPath, defaultMenu);
    const menuData = normalizeMenu(raw);
    const rawContent = await loadJson(contentPath, defaultContent);
    const alternateContentPath = currentLang === 'en' ? 'data/content.json' : 'data/content_en.json';
    const alternateContent = await loadJson(alternateContentPath, defaultContent);
    rawContent.footer ||= {};
    rawContent.footer.social = mergeSocialLinks(rawContent, alternateContent);
    rawContent.contact ||= {};
    rawContent.contact.deliveryServices = mergeDeliveryServices(rawContent, alternateContent);
    const contentData = normalizeContent(rawContent);
    renderMenu(menuData.categories, contentData);

    // also re-render hero, footer and update metadata when language changes
    renderHero(contentData.brand);
    renderFooter(contentData);
    updatePageMetadata(contentData);

    // restore previously active category by index when possible
    const navBtnsAfter = Array.from(document.querySelectorAll('#categoryNav a'));
    if (activeIndex >= 0 && activeIndex < navBtnsAfter.length) {
        const targetHref = navBtnsAfter[activeIndex].getAttribute('href');
        if (targetHref) {
            const targetId = targetHref.replace('#', '');
            activateSection(targetId);
        }
    }
}

function toggleTheme() {
    const isDark = !document.body.classList.contains('dark-mode');
    document.body.classList.toggle('dark-mode', isDark);
    document.body.classList.contains('dark-mode')
        ? document.getElementById('theme-icon').classList.replace('fa-moon', 'fa-sun')
        : document.getElementById('theme-icon').classList.replace('fa-sun', 'fa-moon');
    setCachedPref('themeMode', isDark ? 'dark' : 'light');
}

function normalizeMenu(menu) {
    if (!menu || !Array.isArray(menu.categories)) {
        return { categories: [] };
    }

    return {
        categories: menu.categories.map(category => ({
            id: category.id || category.identificador || '',
            name: category.name || category.nombre || '',
            items: Array.isArray(category.items ? category.items : category.productos)
                ? (category.items || category.productos).map(item => ({
                    name: item.name || item.nombre || '',
                    description: item.description || item.descripcion || '',
                    price: item.price || item.precio || '',
                    allergens: item.allergens || item.alergenos || [],
                    image: item.image || item.imagen || ''
                }))
                : []
        }))
    };
}

function normalizeContent(content) {
    const brand = content.brand || content.marca || {};
    const contact = content.contact || content.contacto || {};
    const home = content.home || content.inicio || {};
    const footer = content.footer || content.pie || {};
    const contactLabels = DEFAULT_CONTACT_LABELS[currentLang] || DEFAULT_CONTACT_LABELS.es;

    return {
        pageTitle: content.pageTitle || content.tituloPagina || content.nombreBar || '',
        pageDescription: content.pageDescription || content.descripcionPagina || content.description || content.descripcion || '',
        keywords: content.keywords || '',
        author: content.author || content.autor || content.desarrollador || content.developer || '',
        favicon: content.favicon || content.iconoFavicon || contact.iconoFavicon || brand.iconImage || DEFAULT_BRAND_ASSETS.icon,
        brand: {
            logoImage: content.logo || brand.logoImage || brand.logoImagen || DEFAULT_BRAND_ASSETS.logo,
            iconImage: content.iconoFavicon || brand.iconImage || brand.logoIcon || brand.logoImagen || DEFAULT_BRAND_ASSETS.icon,
            companyName: content.nombreBar || brand.companyName || brand.nombreEmpresa,
            location: content.direccion || brand.location || brand.ubicacion,
            heroImage: content.banner || brand.heroImage || brand.imagenHero || DEFAULT_BRAND_ASSETS.banner,
            heroEyebrow: brand.heroEyebrow || brand.subtituloHero,
            heroTitle: content.pageTitle || content.tituloPagina || brand.heroTitle || brand.tituloHero,
            heroText: content.descripcion || content.pageDescription || brand.heroText || brand.textoHero,
            heroButtons: brand.heroButtons || brand.botonesHero || []
        },
        contact: {
            heading: contact.heading || contact.encabezado,
            description: contact.description || contact.descripcion,
            logoImage: contact.logoImage || contact.logoImagen || content.logo || '',
            companyName: contact.companyName || contact.nombreEmpresa || content.nombreBar,
            address: contact.address || contact.direccion || content.direccion,
            hours: contact.hours || contact.horario || content.horario,
            email: contact.email || contact.correo || content.email,
            telephone: contact.telephone || contact.telefono || content.telefono,
            reviewUrl: contact.reviewUrl || contact.urlResenas || content.enlaceGoogleMaps,
            bookUrl: contact.bookUrl || contact.urlReserva || contact.urlReservar || content.urlReserva || `tel:${contact.telephone || contact.telefono || content.telefono || ''}`,
            social: contact.social || contact.redes || buildSocialArray(content.redes) || buildSocialArray(contact.redes) || [],
            deliveryServices: (Array.isArray(contact.deliveryServices)
                ? contact.deliveryServices
                : Array.isArray(contact.serviciosEntrega)
                    ? contact.serviciosEntrega
                    : DEFAULT_DELIVERY_SERVICES).map(service => {
                        const defaultService = DEFAULT_DELIVERY_SERVICES.find(item => item.key === service.key || item.name === service.name) || {};
                        return { ...defaultService, ...service, logoUrl: service.logoUrl || defaultService.logoUrl || '' };
                    }),
            labels: {
                address: contactLabels.address,
                hours: contactLabels.hours,
                email: contactLabels.email,
                services: contact.labels?.services || contact.labels?.servicios || (currentLang === 'en' ? 'Services' : 'Servicios')
            },
            buttons: {
                review: contact.buttons?.review || contact.buttons?.reseña || (currentLang === 'en' ? 'Review us now' : 'Califícanos ahora'),
                book: contact.buttons?.book || contact.buttons?.reservar || (currentLang === 'en' ? 'Contact us now' : 'Contáctanos ahora')
            }
        },
        home: {
            heading: home.heading || home.encabezado,
            description: home.description || home.descripcion,
            logoImage: home.logoImage || home.logoImagen || contact.logoImage || contact.logoImagen || brand.logoImage || brand.logoImagen,
            companyName: home.companyName || home.nombreEmpresa || contact.companyName || contact.nombreEmpresa || brand.companyName || brand.nombreEmpresa,
            blocks: Array.isArray(home.blocks)
                ? home.blocks
                : Array.isArray(home.bloques)
                    ? home.bloques.map(block => ({
                        icon: block.icon || block.icono || '',
                        title: block.title || block.titulo || '',
                        text: block.text || block.texto || ''
                    }))
                    : []
        },
        footer: {
            text: footer.text || footer.texto || content.footerDerechos || content.footerRights || content.pie?.texto || '',
            socialTitle: footer.socialTitle || footer.tituloRedes || 'Redes sociales',
            social: footer.social || footer.redes || buildSocialArray(content.redes) || buildSocialArray(contact.redes) || []
        }
    };
}

function renderHero(brand) {
    const heroBanner = document.getElementById('heroBanner');
    const logo = document.getElementById('brandLogo');
    const company = document.getElementById('brandCompany');
    const location = document.getElementById('brandLocation');
    const eyebrow = document.getElementById('heroEyebrow');
    const title = document.getElementById('heroTitle');
    const heroText = document.getElementById('heroText');
    const actions = document.getElementById('heroActions');

    if (heroBanner) {
        const heroImage = brand.heroImage ? `, url('${normalizeAssetPath(brand.heroImage)}')` : '';
        heroBanner.style.backgroundImage = `linear-gradient(rgba(10,10,10,0.45), rgba(10,10,10,0.45))${heroImage}`;
        if (brand.heroImage) {
            requestAnimationFrame(() => {
                if (heroBanner) {
                    heroBanner.style.backgroundImage = `linear-gradient(rgba(10,10,10,0.45), rgba(10,10,10,0.45)), url('${normalizeAssetPath(brand.heroImage)}')`;
                }
            });
        }
    }
    if (logo) {
        if (brand.logoImage) {
            logo.innerHTML = `<img src="${normalizeAssetPath(brand.logoImage)}" alt="${brand.companyName || 'Logo'}">`;
        } else {
            logo.textContent = brand.logo || '';
        }
    }
    if (company) company.textContent = brand.companyName || '';
    if (location) location.textContent = brand.location || '';
    if (eyebrow) eyebrow.textContent = brand.heroEyebrow;
    if (title) title.textContent = brand.heroTitle;
    if (heroText) heroText.textContent = brand.heroText;

    if (actions) {
        actions.innerHTML = '';
        brand.heroButtons.forEach(button => {
            const anchor = document.createElement('a');
            anchor.href = button.url;
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
            anchor.className = 'btn-action btn-hero';
            anchor.innerHTML = `<i class="${button.icon}"></i> ${button.label}`;
            actions.appendChild(anchor);
        });
    }
}

function renderMenu(categories, content) {
    const navContainer = document.getElementById('categoryNav');
    const menuContainer = document.getElementById('menuContainer');
    const contact = content.contact || {};
    const home = content.home || {};

    navContainer.innerHTML = '';
    menuContainer.innerHTML = '';

    const sections = [
        ...categories,
        { id: 'contacto', name: currentLang === 'en' ? 'Contact' : 'Contacto', isContact: true }
    ];

    sections.forEach((sectionData, index) => {
        const btn = document.createElement('a');
        btn.href = `#${sectionData.id}`;
        btn.className = `cat-btn ${sectionData.isHome ? 'home-btn' : ''} ${sectionData.isContact ? 'home-btn' : ''} ${index === 0 ? 'active' : ''}`;
        btn.textContent = sectionData.name;
        btn.addEventListener('click', event => {
            event.preventDefault();
            activateSection(sectionData.id);
            scrollNavButtonIntoView(btn);
        });
        navContainer.appendChild(btn);

        const section = document.createElement('section');
        section.id = sectionData.id;
        section.className = `category-section ${index !== 0 ? 'hidden-section' : ''}`;

        if (sectionData.isContact) {
            section.innerHTML += renderContactSection(contact);
        } else {
            const grid = document.createElement('div');
            grid.className = 'product-grid';

            sectionData.items.forEach(item => {
                const card = document.createElement('article');
                card.className = 'product-card';

                const allergens = Array.isArray(item.allergens) ? item.allergens : [];
                const displayAllergens = allergens.length ? allergens : ['libre'];
                const allergensHtml = displayAllergens
                    .filter(allergen => Boolean(allergen && String(allergen).trim()))
                    .map(a => {
                        const iconName = resolveAllergenIconName(a);
                        if (iconName) {
                            return `<span class="allergen-icon" title="Alérgeno ${a}"><img src="images/alergenos/${iconName}.png" alt="${iconName}" loading="lazy"></span>`;
                        }
                        return `<span class="allergen-icon" title="Alérgeno">${a}</span>`;
                    })
                    .join('');

                const itemImage = normalizeAssetPath(item.image);
                const shouldUseImage = shouldRenderProductImage(itemImage);
                const imageClass = shouldUseImage ? 'product-image lazy-image' : 'product-image product-image-placeholder';
                card.innerHTML = `
                    <div class="${imageClass}"${shouldUseImage ? ` data-src="${itemImage}"` : ''}></div>
                    <div class="product-info">
                        <div class="product-header">
                            <h3 class="product-title">${item.name}</h3>
                            <span class="product-price">${formatProductPrice(item.price)}</span>
                        </div>
                        <p class="product-desc">${item.description}</p>
                        <div class="allergens">${allergensHtml}</div>
                    </div>
                `;

                const imageDiv = card.querySelector('.product-image');
                if (imageDiv) {
                    imageDiv.style.cursor = 'zoom-in';
                    imageDiv.addEventListener('click', () => openImageModal(itemImage, item.name));
                }

                grid.appendChild(card);
            });

            section.appendChild(grid);
        }

        menuContainer.appendChild(section);
    });

    setupLazyProductImages();
}

function activateSection(activeId) {
    document.querySelectorAll('.category-section').forEach(section => {
        const isActive = section.id === activeId;
        section.classList.toggle('hidden-section', !isActive);
        section.classList.toggle('fade-in', isActive);
    });
    document.querySelectorAll('.cat-btn').forEach(btn => {
        const isActive = btn.getAttribute('href') === `#${activeId}`;
        btn.classList.toggle('active', isActive);
        if (isActive) {
            scrollNavButtonIntoView(btn);
        }
    });
    scrollToTop();
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollNavButtonIntoView(button) {
    if (!button || !button.scrollIntoView) return;
    button.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

function renderHomeSection(home) {
    const blocks = Array.isArray(home.blocks) && home.blocks.length > 0 ? home.blocks : [];
    const blocksHtml = blocks.map(block => `
                    <article class="contact-info-card">
                        <span class="contact-info-icon">${block.icon || '✨'}</span>
                        <div>
                            <strong>${block.title || 'Título'}</strong>
                            <p>${block.text || 'Descripción del bloque.'}</p>
                        </div>
                    </article>
                `).join('');

    return `
        <div class="contact-grid">
            <div class="contact-card contact-main-card">
                <div class="contact-logo-block">
                    <div class="contact-logo">
                        ${home.logoImage ? `<img src="${normalizeAssetPath(home.logoImage)}" alt="${home.companyName} logo" />` : ''}
                    </div>
                    <h2>${home.heading || ''}</h2>
                    <p class="contact-description">${home.description || ''}</p>
                </div>
                <div class="contact-info-grid">
                    ${blocksHtml}
                </div>
            </div>
        </div>
    `;
}

function renderContactSection(contact) {
    const deliveryServices = Array.isArray(contact.deliveryServices)
        ? contact.deliveryServices.filter(service => service?.url && service.url.trim() && service.url.trim() !== '#')
        : [];
    const deliveryMarkup = deliveryServices.length ? `
                <div class="contact-services">
                    <strong class="section-label">${contact.labels.services}</strong>
                    <div class="contact-services-list">
                    ${deliveryServices.map(service => `
                        <a href="${service.url}" target="_blank" rel="noopener noreferrer" class="contact-service-link">
                            <span class="contact-service-logo"><img src="${normalizeAssetPath(service.logoUrl)}" alt="Logotipo de ${service.name}" loading="lazy"></span>
                            <span class="contact-service-name">${service.name}</span>
                        </a>
                    `).join('')}
                    </div>
                </div>
            ` : '';

    return `
        <div class="contact-grid">
            <div class="contact-card contact-main-card">
                <div class="contact-logo-block">
                    <div class="contact-logo">
                        ${contact.logoImage ? `<img src="${normalizeAssetPath(contact.logoImage)}" alt="${contact.companyName} logo" />` : ''}
                    </div>
                    <h2>${contact.companyName || ''}</h2>
                    <p class="contact-description">${contact.description || ''}</p>
                </div>
                <div class="contact-info-grid">
                    <article class="contact-info-card">
                        <span class="contact-info-icon">📍</span>
                        <div>
                            <strong>${contact.labels.address || ''}</strong>
                            <p>${contact.address}</p>
                        </div>
                    </article>
                    <article class="contact-info-card">
                        <span class="contact-info-icon">⏰</span>
                        <div>
                            <strong>${contact.labels.hours || ''}</strong>
                            <p>${contact.hours}</p>
                        </div>
                    </article>
                    <article class="contact-info-card">
                        <span class="contact-info-icon">📧</span>
                        <div>
                            <strong>${contact.labels.email || ''}</strong>
                            <p><a href="mailto:${contact.email}">${contact.email}</a></p>
                        </div>
                    </article>
                </div>
                ${deliveryMarkup}
                <div class="contact-actions contact-actions-large">
                    <a href="${contact.reviewUrl}" target="_blank" rel="noopener noreferrer" class="btn-action btn-hero"><i class="fas fa-star"></i> ${contact.buttons.review || ''}</a>
                    <a href="${contact.bookUrl}" class="btn-action btn-contact-simple"><i class="fas fa-phone"></i> ${contact.buttons.book || ''}</a>
                </div>
            </div>
        </div>
    `;
}

function setupImageModal() {
    const modal = document.getElementById('imageModal');
    const closeButton = document.getElementById('modalClose');

    if (!modal || !closeButton) return;

    closeButton.addEventListener('click', closeImageModal);
    modal.addEventListener('click', event => {
        if (event.target === modal) {
            closeImageModal();
        }
    });
}

function setupThemeMenu() {
    const toggleBtn = document.getElementById('themeToggleBtn');
    const menu = document.getElementById('themeMenu');
    const themeToggleInside = document.getElementById('themeMenuToggle');

    if (!toggleBtn || !menu) return;

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('open');
    });

    // toggle dark mode from inside menu
    if (themeToggleInside) {
        themeToggleInside.addEventListener('click', () => {
            toggleTheme();
            menu.classList.remove('open');
        });
    }

    // language buttons
    menu.querySelectorAll('[data-lang]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const lang = btn.getAttribute('data-lang');
            await loadMenuForLang(lang);
            menu.classList.remove('open');
        });
    });

    // close when clicking outside
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== toggleBtn) {
            menu.classList.remove('open');
        }
    });
}

function openImageModal(src, alt) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    if (!modal || !modalImage) return;
    modalImage.src = normalizeAssetPath(src);
    modalImage.alt = alt;
    modal.classList.add('open');
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    if (!modal || !modalImage) return;

    modal.classList.remove('open');
    modalImage.src = '';
}

function renderFooter(content) {
    const footerCopy = document.getElementById('footerCopy');
    const footerSocial = document.getElementById('footerSocial');
    const footerSocialLabel = document.getElementById('footerSocialLabel');
    const copyText = content.footer?.text || content.contact?.footerNote || 'Diseñado y desarrollado por ByRuby12 - V4.0.0. Copyright ©2026 Derechos reservados para Bohio Bar.';
    if (footerCopy) footerCopy.textContent = copyText;
    if (footerSocialLabel) footerSocialLabel.textContent = content.footer?.socialTitle || 'Redes sociales';
    // collect social links from footer.social or contact.social
    let socialLinks = Array.isArray(content.footer?.social) ? content.footer.social.slice() : Array.isArray(content.contact?.social) ? content.contact.social.slice() : [];

    // merge footer.redes object placeholders (e.g. { instagram: "" }) into links
    if (content.footer?.redes && typeof content.footer.redes === 'object') {
        const fromRedes = buildSocialArray(content.footer.redes || {});
        socialLinks = socialLinks.concat(fromRedes);
    }

    // Keep only configured social networks with a valid entry.
    socialLinks = socialLinks.filter(link => {
        if (!link || typeof link.name !== 'string' || typeof link.icon !== 'string') return false;
        return typeof link.url === 'string' && link.url.trim() !== '' && link.url.trim() !== '#';
    });

    if (footerSocial) {
        if (socialLinks.length === 0) {
            footerSocial.innerHTML = '';
            if (footerSocialLabel) footerSocialLabel.style.display = 'none';
        } else {
            if (footerSocialLabel) footerSocialLabel.style.display = '';
            footerSocial.innerHTML = socialLinks.map(link => {
                const color = link.color || getBrandColor(link.name);
                return `
                    <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="footer-social-link" aria-label="${link.name}" style="--social-color: ${color};">
                        <i class="${link.icon}"></i>
                    </a>
                `;
            }).join('');
        }
    }
}

function getBrandColor(name) {
    const brandColors = {
        instagram: '#E4405F',
        whatsapp: '#25D366',
        google: '#4285F4',
        facebook: '#1877F2',
        twitter: '#1DA1F2',
        tiktok: '#000000',
        youtube: '#FF0000'
    };
    return brandColors[name?.toLowerCase()] || '#e85d04';
}

window.onload = init;

console.log('¡Gracias por visitar Bar Bohio! Disfruta de nuestra comida y bebidas.');
console.log('Página Web realizada por: ByRuby12 - https://github.com/ByRuby12 ');
console.log('Contactame por email: byruby12.contacto@gmail.com');