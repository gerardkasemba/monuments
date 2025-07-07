// Sample monument data (for demo; replace with WordPress AJAX data)
const monuments = [
    {
        id: 1,
        name: "Paul Revere Statue",
        image: "https://images.unsplash.com/photo-1627293594741-cf3f6d88cfed",
        history: "Revolutionary",
        event: "Independence",
        lat: 42.3656,
        lng: -71.0676,
        description: "A statue honoring Paul Revere's midnight ride in 1775."
    },
    {
        id: 2,
        name: "Bunker Hill Monument",
        image: "https://media.istockphoto.com/id/146718158/photo/bunker-hill-monument-at-night.webp?s=2048x2048&w=is&k=20&c=7DauzU9uYDO8PO5eTvGz5Ez90jnnT7MxVAAji5RMA5Q=",
        history: "Revolutionary",
        event: "War",
        lat: 42.3763,
        lng: -71.0609,
        description: "Commemorates the Battle of Bunker Hill in 1775."
    },
    {
        id: 3,
        name: "Boston Common Soldiers and Sailors Monument",
        image: "https://images.unsplash.com/photo-1593201147442-434cb1d3ac83",
        history: "Modern",
        event: "War",
        lat: 42.3523,
        lng: -71.0650,
        description: "Honors Civil War soldiers and sailors."
    }
    // Assume 1000+ similar entries
];

const itemsPerPage = 20;
let currentPage = 1;
let markers = L.markerClusterGroup(); // Initialize marker cluster group
let monumentMarkers = {}; // Store markers by monument ID for easy access

// Initialize map centered on Boston, MA
let map;
try {
    map = L.map('map').setView([42.3601, -71.0589], 13); // Boston coordinates
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
} catch (error) {
    console.error('Error initializing map:', error);
    document.getElementById('map').innerHTML = '<p>Error loading map. Please try again later.</p>';
}

// Lazy load images for cards
function lazyLoadCardImages() {
    const images = document.querySelectorAll('.monument-card img');
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                observer.unobserve(img);
            }
        });
    }, { rootMargin: '0px 0px 50px 0px' });
    images.forEach(img => observer.observe(img));
}

// Display monuments for current page and update map markers
function displayMonuments(monuments, page = 1) {
    const grid = document.getElementById('monuments-grid');
    if (!grid) {
        console.error('Monuments grid element not found');
        return;
    }
    grid.innerHTML = '';
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedMonuments = monuments.slice(start, end);

    // Clear existing markers and reset storage
    map.removeLayer(markers);
    markers = L.markerClusterGroup();
    monumentMarkers = {};

    paginatedMonuments.forEach(monument => {
        // Create grid card
        const card = document.createElement('div');
        card.className = 'monument-card';
        card.innerHTML = `
            <img data-src="${monument.image}" alt="${monument.name}">
            <h3>${monument.name}</h3>
            <p>${monument.history} | ${monument.event}</p>
        `;
        card.addEventListener('click', () => showMonumentDetails(monument));
        grid.appendChild(card);

        // Create custom marker with monument image
        try {
            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: `<img src="${monument.image}" alt="${monument.name}" style="width: 32px; height: 32px;">`,
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });

            const marker = L.marker([monument.lat, monument.lng], { icon: customIcon })
                .bindPopup(`
                    <h3>${monument.name}</h3>
                    <img data-src="${monument.image}" alt="${monument.name}" class="popup-image">
                    <p><strong>History:</strong> ${monument.history}</p>
                    <p><strong>Event:</strong> ${monument.event}</p>
                    <p><strong>Description:</strong> ${monument.description}</p>
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${monument.lat},${monument.lng}" target="_blank">Get Directions</a>
                `, { maxWidth: 300 });
            markers.addLayer(marker);
            monumentMarkers[monument.id] = marker; // Store marker for later access
        } catch (error) {
            console.error(`Error creating marker for ${monument.name}:`, error);
        }
    });

    // Add markers to map
    map.addLayer(markers);

    updatePagination(monuments.length, page);
    lazyLoadCardImages();
}

// Update pagination controls
function updatePagination(totalItems, currentPage) {
    const pagination = document.getElementById('pagination');
    if (!pagination) {
        console.error('Pagination element not found');
        return;
    }
    pagination.innerHTML = '';
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        if (i === currentPage) button.classList.add('active');
        button.addEventListener('click', () => {
            currentPage = i;
            filterMonuments();
        });
        pagination.appendChild(button);
    }
}

// Show monument details in map popup
function showMonumentDetails(monument) {
    const title = document.getElementById('monument-title');
    if (!title) {
        console.error('Monument title element not found');
        return;
    }
    title.textContent = monument.name;

    try {
        // Close any open popups
        map.closePopup();

        // Find the marker for the selected monument
        const marker = monumentMarkers[monument.id];
        if (!marker) {
            console.error(`Marker not found for monument ID ${monument.id}`);
            return;
        }

        // Open the popup for the selected marker
        marker.openPopup();
        map.setView([monument.lat, monument.lng], 15);

        // Lazy load popup image
        setTimeout(() => {
            const popupImage = document.querySelector('.leaflet-popup-content img.popup-image');
            if (popupImage && popupImage.dataset.src) {
                popupImage.src = popupImage.dataset.src;
                popupImage.removeAttribute('data-src');
            }
        }, 0);
    } catch (error) {
        console.error('Error displaying monument details:', error);
    }
}

// Filter and search monuments
function filterMonuments() {
    const searchInput = document.getElementById('search');
    const historyFilter = document.getElementById('history-filter');
    const eventFilter = document.getElementById('event-filter');

    if (!searchInput || !historyFilter || !eventFilter) {
        console.error('Filter elements not found');
        return;
    }

    const search = searchInput.value.toLowerCase();
    const historyFilterValue = historyFilter.value;
    const eventFilterValue = eventFilter.value;

    const filteredMonuments = monuments.filter(monument => {
        return (
            (!search || monument.name.toLowerCase().includes(search)) &&
            (!historyFilterValue || monument.history === historyFilterValue) &&
            (!eventFilterValue || monument.event === eventFilterValue)
        );
    });

    displayMonuments(filteredMonuments, currentPage);
}

// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search');
    const historyFilter = document.getElementById('history-filter');
    const eventFilter = document.getElementById('event-filter');

    if (searchInput && historyFilter && eventFilter) {
        searchInput.addEventListener('input', debounce(filterMonuments, 300));
        historyFilter.addEventListener('change', () => { currentPage = 1; filterMonuments(); });
        eventFilter.addEventListener('change', () => { currentPage = 1; filterMonuments(); });
    } else {
        console.error('One or more filter elements not found');
    }

    // Initial display
    displayMonuments(monuments);
});