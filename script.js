document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const doctorSearch = document.getElementById('doctor-search');
    const suggestionsDropdown = document.getElementById('suggestions-dropdown');
    const doctorList = document.getElementById('doctor-list');
    const specialtyFiltersContainer = document.getElementById('specialty-filters');
    
    // State variables
    let doctors = [];
    let filteredDoctors = [];
    const allSpecialties = new Set();
    
    // API URL - This is where you place your API endpoint
    const API_URL = 'https://srijandubey.github.io/campus-api-mock/SRM-C1-25.json';
    
    // Initialize the page
    fetchDoctors();
    setupEventListeners();
    
    // Fetch doctors from API
    async function fetchDoctors() {
        try {
            showLoadingState();
            
            const response = await fetch(API_URL);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            doctors = await response.json();
            
            // Extract all unique specialties
            doctors.forEach(doctor => {
                if (doctor.specialties && Array.isArray(doctor.specialties)) {
                    doctor.specialties.forEach(specialty => {
                        allSpecialties.add(specialty);
                    });
                }
            });
            
            // Create specialty filter checkboxes
            createSpecialtyFilters();
            
            // Apply any existing URL filters
            applyUrlFilters();
            
            // Render initial doctor list
            filterAndRenderDoctors();
        } catch (error) {
            console.error('Error fetching doctors:', error);
            showErrorState();
        }
    }
    
    function showLoadingState() {
        doctorList.innerHTML = '<p>Loading doctors...</p>';
    }
    
    function showErrorState() {
        doctorList.innerHTML = '<p>Failed to load doctors. Please try again later.</p>';
    }
    
    // Create specialty filter checkboxes
    function createSpecialtyFilters() {
        specialtyFiltersContainer.innerHTML = ''; // Clear existing
        
        const sortedSpecialties = Array.from(allSpecialties).sort();
        
        sortedSpecialties.forEach(specialty => {
            const sanitizedSpecialty = specialty.replace(/\s+/g, '-').replace(/\//g, '-');
            const filterId = `filter-specialty-${sanitizedSpecialty}`;
            
            const label = document.createElement('label');
            label.innerHTML = `
                <input 
                    type="checkbox" 
                    name="specialty" 
                    value="${specialty}" 
                    data-testid="${filterId}"
                > ${specialty}
            `;
            
            specialtyFiltersContainer.appendChild(label);
        });
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Search input events
        doctorSearch.addEventListener('input', handleSearchInput);
        doctorSearch.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                filterAndRenderDoctors();
                updateUrlParams();
            }
        });
        
        // Filter change events
        document.addEventListener('change', function(e) {
            if (e.target.name === "specialty" || 
                e.target.name === "consultation-mode" || 
                e.target.name === "sort") {
                filterAndRenderDoctors();
                updateUrlParams();
            }
        });
        
        // Handle browser back/forward navigation
        window.addEventListener('popstate', function() {
            applyUrlFilters();
            filterAndRenderDoctors();
        });
    }
    
    // Handle search input for autocomplete
    function handleSearchInput() {
        const searchTerm = doctorSearch.value.toLowerCase();
        
        if (searchTerm.length === 0) {
            suggestionsDropdown.style.display = 'none';
            return;
        }
        
        const matches = doctors
            .filter(doctor => doctor.name && doctor.name.toLowerCase().includes(searchTerm))
            .slice(0, 3);
        
        if (matches.length > 0) {
            suggestionsDropdown.innerHTML = '';
            matches.forEach(doctor => {
                const suggestionItem = document.createElement('div');
                suggestionItem.classList.add('suggestion-item');
                suggestionItem.textContent = doctor.name;
                suggestionItem.setAttribute('data-testid', 'suggestion-item');
                suggestionItem.addEventListener('click', function() {
                    doctorSearch.value = doctor.name;
                    suggestionsDropdown.style.display = 'none';
                    filterAndRenderDoctors();
                    updateUrlParams();
                });
                suggestionsDropdown.appendChild(suggestionItem);
            });
            suggestionsDropdown.style.display = 'block';
        } else {
            suggestionsDropdown.style.display = 'none';
        }
    }
    
    // Filter and render doctors based on current filters
    function filterAndRenderDoctors() {
        // Get current filter values
        const nameSearch = doctorSearch.value.toLowerCase();
        const selectedSpecialties = Array.from(document.querySelectorAll('input[name="specialty"]:checked')).map(el => el.value);
        const consultationMode = document.querySelector('input[name="consultation-mode"]:checked')?.value;
        const sortOption = document.querySelector('input[name="sort"]:checked')?.value;
        
        // Filter doctors
        filteredDoctors = doctors.filter(doctor => {
            // Name filter
            if (nameSearch && (!doctor.name || !doctor.name.toLowerCase().includes(nameSearch))) {
                return false;
            }
            
            // Specialty filter
            if (selectedSpecialties.length > 0) {
                if (!doctor.specialties || !Array.isArray(doctor.specialties)) return false;
                
                const hasSelectedSpecialty = selectedSpecialties.some(specialty => 
                    doctor.specialties.includes(specialty)
                );
                if (!hasSelectedSpecialty) return false;
            }
            
            // Consultation mode filter
            if (consultationMode === 'video' && !doctor.video_consultation) {
                return false;
            }
            if (consultationMode === 'clinic' && !doctor.in_clinic) {
                return false;
            }
            
            return true;
        });
        
        // Sort doctors
        if (sortOption === 'fees') {
            filteredDoctors.sort((a, b) => (a.fees || 0) - (b.fees || 0));
        } else if (sortOption === 'experience') {
            filteredDoctors.sort((a, b) => (b.experience || 0) - (a.experience || 0));
        }
        
        // Render doctors
        renderDoctors();
    }
    
    // Render doctors to the DOM
    function renderDoctors() {
        doctorList.innerHTML = '';
        
        if (filteredDoctors.length === 0) {
            doctorList.innerHTML = '<p>No doctors found matching your criteria.</p>';
            return;
        }
        
        filteredDoctors.forEach(doctor => {
            const card = document.createElement('div');
            card.classList.add('doctor-card');
            card.setAttribute('data-testid', 'doctor-card');
            
            const specialties = doctor.specialties ? doctor.specialties.join(', ') : 'Not specified';
            const experienceText = doctor.experience ? `${doctor.experience} yrs exp.` : 'Experience not specified';
            const feeText = doctor.fees ? `₹${doctor.fees}` : 'Fee not specified';
            
            card.innerHTML = `
                <div class="doctor-name" data-testid="doctor-name">${doctor.name || 'Name not available'}</div>
                <div class="doctor-specialty" data-testid="doctor-specialty">${specialties}</div>
                <div class="doctor-experience" data-testid="doctor-experience">${experienceText}</div>
                <div class="doctor-fee">
                    <span data-testid="doctor-fee">${feeText}</span>
                    <button class="book-btn">Book Appointment</button>
                </div>
            `;
            
            doctorList.appendChild(card);
        });
    }
    
    // Update URL with current filter params
    function updateUrlParams() {
        const params = new URLSearchParams();
        
        if (doctorSearch.value) {
            params.set('name', doctorSearch.value);
        }
        
        const selectedSpecialties = Array.from(document.querySelectorAll('input[name="specialty"]:checked')).map(el => el.value);
        if (selectedSpecialties.length > 0) {
            params.set('specialties', selectedSpecialties.join(','));
        }
        
        const consultationMode = document.querySelector('input[name="consultation-mode"]:checked')?.value;
        if (consultationMode && consultationMode !== 'all') {
            params.set('mode', consultationMode);
        }
        
        const sortOption = document.querySelector('input[name="sort"]:checked')?.value;
        if (sortOption) {
            params.set('sort', sortOption);
        }
        
        const newUrl = window.location.pathname + '?' + params.toString();
        window.history.pushState({}, '', newUrl);
    }
    
    // Apply filters from URL params
    function applyUrlFilters() {
        const params = new URLSearchParams(window.location.search);
        
        // Name filter
        const nameParam = params.get('name');
        if (nameParam) {
            doctorSearch.value = nameParam;
        }
        
        // Specialty filters
        const specialtiesParam = params.get('specialties');
        if (specialtiesParam) {
            const specialties = specialtiesParam.split(',');
            document.querySelectorAll('input[name="specialty"]').forEach(input => {
                input.checked = specialties.includes(input.value);
            });
        }
        
        // Consultation mode filter
        const modeParam = params.get('mode');
        if (modeParam) {
            const radio = document.querySelector(`input[name="consultation-mode"][value="${modeParam}"]`);
            if (radio) {
                radio.checked = true;
            }
        }
        
        // Sort option
        const sortParam = params.get('sort');
        if (sortParam) {
            const radio = document.querySelector(`input[name="sort"][value="${sortParam}"]`);
            if (radio) {
                radio.checked = true;
            }
        }
    }
});