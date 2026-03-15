class BusinessDirectory {
  constructor() {
    this.businesses = [];
    this.filteredBusinesses = [];
    this.contactsByCompanyId = new Map();
    this.outreachByCompanyId = new Map();
    this.currentView = 'grid';
    this.map = null;
    this.markers = [];

    this.searchInput = document.getElementById('searchInput');
    this.clearSearchBtn = document.getElementById('clearSearch');
    this.regionFilter = document.getElementById('regionFilter');
    this.countryFilter = document.getElementById('countryFilter');
    this.sortBy = document.getElementById('sortBy');
    this.resetFiltersBtn = document.getElementById('resetFilters');
    this.resultsGrid = document.getElementById('resultsGrid');
    this.resultsList = document.getElementById('resultsList');
    this.mapContainer = document.getElementById('mapContainer');
    this.resultsCount = document.getElementById('resultsCount');
    this.loading = document.getElementById('loading');
    this.noResults = document.getElementById('noResults');
    this.gridViewBtn = document.getElementById('gridView');
    this.listViewBtn = document.getElementById('listView');
    this.mapViewBtn = document.getElementById('mapView');

    this.init();
  }

  async init() {
    try {
      this.setupEventListeners();
      await this.loadData();
      await this.loadContacts();
      await this.loadOutreachShortlist();
      this.populateRegionFilter();
      this.populateCountryFilter();
      this.sort();
      this.render();
    } catch (error) {
      console.error('Initialization error:', error);
      if (this.loading) this.loading.style.display = 'none';
      if (this.noResults) {
        this.noResults.style.display = 'block';
        this.noResults.innerHTML = '<h3>Directory failed to initialize</h3><p>Please refresh once. If it persists, deployment cache may still be updating.</p>';
      }
    }
  }

  setupEventListeners() {
    this.searchInput?.addEventListener('input', () => {
      this.clearSearchBtn.style.display = this.searchInput.value ? 'flex' : 'none';
      this.filter();
    });

    this.clearSearchBtn?.addEventListener('click', () => {
      this.searchInput.value = '';
      this.clearSearchBtn.style.display = 'none';
      this.filter();
    });

    this.regionFilter?.addEventListener('change', () => {
      this.populateCountryFilter();
      this.filter();
    });

    this.countryFilter?.addEventListener('change', () => this.filter());

    this.sortBy?.addEventListener('change', () => {
      this.sort();
      this.render();
    });

    this.resetFiltersBtn?.addEventListener('click', () => this.resetFilters());

    this.gridViewBtn?.addEventListener('click', () => this.setView('grid'));
    this.listViewBtn?.addEventListener('click', () => this.setView('list'));
    this.mapViewBtn?.addEventListener('click', () => this.setView('map'));
  }

  async loadData() {
    try {
      const dataFile = document.body?.dataset?.dataFile || 'data/directory-data.json';
      const response = await fetch(dataFile);
      this.businesses = await response.json();
      this.filteredBusinesses = [...this.businesses];
    } catch (error) {
      console.error('Error loading data:', error);
      this.loading.innerHTML = '<p>Error loading directory data. Please refresh.</p>';
    }
  }

  async loadContacts() {
    try {
      const response = await fetch('data/company-contacts.json');
      if (!response.ok) return;
      const rows = await response.json();
      this.contactsByCompanyId.clear();
      rows.forEach(row => {
        if (typeof row.companyId === 'number' && Array.isArray(row.contacts)) {
          this.contactsByCompanyId.set(row.companyId, row.contacts);
        }
      });
    } catch (error) {
      console.warn('Contacts file not loaded:', error);
    }
  }

  async loadOutreachShortlist() {
    try {
      const response = await fetch('data/outreach-shortlist.json');
      if (!response.ok) return;
      const rows = await response.json();
      this.outreachByCompanyId.clear();
      rows.forEach(row => {
        if (typeof row.companyId === 'number') {
          this.outreachByCompanyId.set(row.companyId, row);
        }
      });
    } catch (error) {
      console.warn('Outreach shortlist not loaded:', error);
    }
  }

  getRegionForCountry(country) {
    const c = (country || '').trim();
    const regionMap = {
      'UK': 'Europe',
      'Ireland': 'Europe',
      'France': 'Europe',
      'Germany': 'Europe',
      'Italy': 'Europe',
      'Spain': 'Europe',
      'Portugal': 'Europe',
      'Netherlands': 'Europe',
      'Belgium': 'Europe',
      'Switzerland': 'Europe',
      'Austria': 'Europe',
      'Denmark': 'Europe',
      'Sweden': 'Europe',
      'Norway': 'Europe',
      'Finland': 'Europe',
      'UAE': 'Middle East',
      'Saudi Arabia': 'Middle East',
      'Qatar': 'Middle East',
      'Kuwait': 'Middle East',
      'Bahrain': 'Middle East',
      'Oman': 'Middle East',
      'USA': 'North America',
      'Canada': 'North America',
      'Mexico': 'North America',
      'Singapore': 'Asia Pacific',
      'Japan': 'Asia Pacific',
      'China': 'Asia Pacific',
      'Hong Kong': 'Asia Pacific',
      'South Korea': 'Asia Pacific',
      'Australia': 'Asia Pacific',
      'New Zealand': 'Asia Pacific'
    };
    return regionMap[c] || 'Other';
  }

  populateRegionFilter() {
    const regions = [...new Set(this.businesses.map(b => this.getRegionForCountry(b.county)))].sort();
    this.regionFilter.innerHTML = '<option value="">All Regions</option>';
    regions.forEach(region => {
      const option = document.createElement('option');
      option.value = region;
      option.textContent = region;
      this.regionFilter.appendChild(option);
    });
  }

  populateCountryFilter() {
    const selectedRegion = this.regionFilter.value;
    const countries = [...new Set(
      this.businesses
        .filter(b => !selectedRegion || this.getRegionForCountry(b.county) === selectedRegion)
        .map(b => b.county)
    )].sort();

    const current = this.countryFilter.value;
    this.countryFilter.innerHTML = '<option value="">All Countries</option>';
    countries.forEach(country => {
      const option = document.createElement('option');
      option.value = country;
      option.textContent = country;
      this.countryFilter.appendChild(option);
    });

    if (countries.includes(current)) {
      this.countryFilter.value = current;
    }
  }

  filter() {
    const searchTerm = this.searchInput.value.toLowerCase().trim();
    const region = this.regionFilter.value;
    const country = this.countryFilter.value;

    this.filteredBusinesses = this.businesses.filter(business => {
      const matchesSearch = !searchTerm ||
        (business.company && business.company.toLowerCase().includes(searchTerm)) ||
        (business.county && business.county.toLowerCase().includes(searchTerm)) ||
        (business.category && business.category.toLowerCase().includes(searchTerm)) ||
        (business.website && business.website.toLowerCase().includes(searchTerm));

      const matchesRegion = !region || this.getRegionForCountry(business.county) === region;
      const matchesCountry = !country || business.county === country;

      return matchesSearch && matchesRegion && matchesCountry;
    });

    this.sort();
    this.render();
  }

  sort() {
    const sortValue = this.sortBy.value;
    this.filteredBusinesses.sort((a, b) => {
      switch (sortValue) {
        case 'name-asc': return (a.company || '').localeCompare(b.company || '');
        case 'name-desc': return (b.company || '').localeCompare(a.company || '');
        case 'country-asc': return (a.county || '').localeCompare(b.county || '');
        case 'country-desc': return (b.county || '').localeCompare(a.county || '');
        default: return 0;
      }
    });
  }

  resetFilters() {
    this.searchInput.value = '';
    this.clearSearchBtn.style.display = 'none';
    this.regionFilter.value = '';
    this.populateCountryFilter();
    this.countryFilter.value = '';
    this.sortBy.value = 'name-asc';
    this.filteredBusinesses = [...this.businesses];
    this.sort();
    this.render();
  }

  setView(view) {
    this.currentView = view;
    this.gridViewBtn.classList.toggle('active', view === 'grid');
    this.listViewBtn.classList.toggle('active', view === 'list');
    this.mapViewBtn.classList.toggle('active', view === 'map');
    this.resultsGrid.style.display = view === 'grid' ? 'grid' : 'none';
    this.resultsList.style.display = view === 'list' ? 'flex' : 'none';
    this.mapContainer.style.display = view === 'map' ? 'block' : 'none';
    if (view === 'map') this.renderMap();
  }

  render() {
    if (this.loading) this.loading.style.display = 'none';
    const count = this.filteredBusinesses.length;
    if (this.resultsCount) this.resultsCount.textContent = count.toLocaleString();

    if (count === 0) {
      if (this.noResults) this.noResults.style.display = 'block';
      if (this.resultsGrid) this.resultsGrid.innerHTML = '';
      if (this.resultsList) this.resultsList.innerHTML = '';
      return;
    }

    if (this.noResults) this.noResults.style.display = 'none';
    this.renderGrid();
    this.renderList();
    if (this.currentView === 'map') this.renderMap();
  }

  renderGrid() {
    this.resultsGrid.innerHTML = this.filteredBusinesses.map(b => this.createCardHTML(b)).join('');
  }

  renderList() {
    this.resultsList.innerHTML = this.filteredBusinesses.map(b => this.createListItemHTML(b)).join('');
  }

  renderMap() {
    const countryCoords = {
      'UK': [54.0, -2.0],
      'USA': [39.8, -98.6],
      'UAE': [24.4, 54.3],
      'Denmark': [56.26, 9.50],
      'Sweden': [60.12, 18.64],
      'Norway': [60.47, 8.46],
      'Finland': [61.92, 25.74]
    };

    if (!this.map) {
      this.map = L.map('map').setView([30, 10], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);
    }

    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];

    const countryCounts = {};
    this.filteredBusinesses.forEach(b => {
      countryCounts[b.county] = (countryCounts[b.county] || 0) + 1;
    });

    Object.entries(countryCounts).forEach(([country, count]) => {
      const coords = countryCoords[country] || [20, 0];
      const marker = L.circleMarker(coords, {
        radius: Math.min(8 + count * 1.5, 24),
        fillColor: '#d4af37',
        color: '#8b6b1e',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.75
      }).addTo(this.map);

      marker.bindPopup(`<h4>${country}</h4><p><strong>${count}</strong> consultancies</p>`);
      this.markers.push(marker);
    });

    setTimeout(() => this.map.invalidateSize(), 100);
  }

  createCardHTML(business) {
    const links = [];
    if (business.website) links.push(this.createLinkHTML(business.website, 'Website', 'globe'));
    if (business.linkedin) links.push(this.createLinkHTML(business.linkedin, 'LinkedIn', 'linkedin'));
    if (business.instagram) links.push(this.createLinkHTML(business.instagram, 'Instagram', 'instagram'));

    const region = this.getRegionForCountry(business.county);
    const wayfindingFlag = this.isWayfindingConsultancy(business)
      ? '<span class="wayfinding-flag">Wayfinding</span>'
      : '';
    const outreachRoute = this.createOutreachRouteHTML(business);
    const contactsSection = this.createContactsSectionHTML(business);

    return `
      <article class="business-card">
        <div class="card-header">
          <div class="card-title-area">
            <h3 class="card-title">${this.escapeHtml(business.company)}</h3>
            <div class="meta-row">
              <span class="card-region">${this.escapeHtml(region)}</span>
              <span class="card-country">${this.escapeHtml(business.county)}</span>
              ${wayfindingFlag}
            </div>
          </div>
        </div>
        <div class="card-links">${links.join('')}</div>
        ${outreachRoute}
        ${contactsSection}
      </article>
    `;
  }

  createListItemHTML(business) {
    const region = this.getRegionForCountry(business.county);
    const wayfindingFlag = this.isWayfindingConsultancy(business)
      ? '<span class="wayfinding-flag">Wayfinding</span>'
      : '';
    const outreachRoute = this.createOutreachRouteHTML(business);
    const contactsSection = this.createContactsSectionHTML(business);

    return `
      <article class="business-list-item">
        <div class="list-item-main">
          <div class="list-item-header">
            <h3 class="card-title">${this.escapeHtml(business.company)}</h3>
            <span class="card-region">${this.escapeHtml(region)}</span>
            <span class="card-country">${this.escapeHtml(business.county)}</span>
            ${wayfindingFlag}
          </div>
          <div class="card-links">
            ${business.website ? `<a href="${business.website}" target="_blank" class="card-link">Website</a>` : ''}
          </div>
          ${outreachRoute}
          ${contactsSection}
        </div>
      </article>
    `;
  }

  createOutreachRouteHTML(business) {
    const route = this.outreachByCompanyId.get(business.id);
    if (!route) return '';

    const confidence = (route.confidence || 'medium').toLowerCase();
    const confidenceClass = `confidence-${confidence}`;
    const contact = route.primaryContactName ? this.escapeHtml(route.primaryContactName) : 'Best route identified';
    const role = route.primaryContactRole ? this.escapeHtml(route.primaryContactRole) : 'Target contact';
    const primary = route.primaryEmail ? `<a href="mailto:${this.escapeHtml(route.primaryEmail)}">${this.escapeHtml(route.primaryEmail)}</a>` : '';
    const backup = route.backupEmail ? `<a href="mailto:${this.escapeHtml(route.backupEmail)}">${this.escapeHtml(route.backupEmail)}</a>` : '';

    return `
      <div class="outreach-route ${confidenceClass}">
        <div class="outreach-title">✦ Best outreach route <span class="confidence-pill">${confidence}</span></div>
        <div class="outreach-person">${contact} — ${role}</div>
        <div class="outreach-emails">
          ${primary ? `Primary: ${primary}` : ''}
          ${backup ? `${primary ? '<span class="sep"> · </span>' : ''}Backup: ${backup}` : ''}
        </div>
      </div>
    `;
  }

  createContactsSectionHTML(business) {
    const contacts = this.contactsByCompanyId.get(business.id) || [];
    if (!contacts.length) {
      return `
        <details class="contacts-panel">
          <summary>⊕ Contacts</summary>
          <p class="contacts-empty">No validated person contacts yet.</p>
        </details>
      `;
    }

    const items = contacts.map(c => {
      const name = this.escapeHtml(c.name || 'Unknown');
      const title = this.escapeHtml(c.title || '');
      const email = c.email ? `<a href="mailto:${this.escapeHtml(c.email)}">Email</a>` : '';
      const linkedin = c.linkedin ? `<a href="${this.escapeHtml(c.linkedin)}" target="_blank">LinkedIn</a>` : '';
      const source = c.source ? `<a href="${this.escapeHtml(c.source)}" target="_blank">Source</a>` : '';
      const links = [email, linkedin, source].filter(Boolean).join(' · ');
      return `<li><strong>${name}</strong>${title ? ` — ${title}` : ''}${links ? `<div class="contact-links">${links}</div>` : ''}</li>`;
    }).join('');

    return `
      <details class="contacts-panel">
        <summary>⊕ Contacts (${contacts.length})</summary>
        <ul class="contacts-list">${items}</ul>
      </details>
    `;
  }

  createLinkHTML(url, label, icon) {
    const icons = { globe: '🌐', linkedin: '💼', instagram: '📷' };
    return `<a href="${url}" target="_blank" class="card-link">${icons[icon] || ''} ${label}</a>`;
  }

  isWayfindingConsultancy(business) {
    if (business.isWayfinding === true) return true;
    const text = `${business.company || ''} ${business.website || ''}`.toLowerCase();
    return ['wayfinding', 'sign system', 'placemaking', 'environmental graphics'].some(k => text.includes(k));
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => new BusinessDirectory());
